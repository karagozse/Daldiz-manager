import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateCriticalWarningDto } from './dto/create-critical-warning.dto';
import { UpdateCriticalWarningDto } from './dto/update-critical-warning.dto';
import { CriticalWarningDto, CriticalWarningStatus, CriticalWarningSeverity } from './dto/critical-warning.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class CriticalWarningsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  /**
   * Maps Prisma CriticalWarning to CriticalWarningDto
   */
  private mapToDto(warning: any): CriticalWarningDto {
    return {
      id: warning.id,
      topicId: warning.topicId,
      title: warning.title,
      description: warning.description,
      status: warning.status as CriticalWarningStatus,
      openedDate: warning.openedAt.toISOString(),
      closedDate: warning.closedAt?.toISOString(),
      closureNote: warning.closureNote || undefined,
      gardenId: warning.gardenId.toString(),
      gardenName: warning.garden.name,
      campusId: warning.garden.campusId,
      campusName: warning.garden.campus.name,
      severity: warning.severity as CriticalWarningSeverity | undefined,
    };
  }

  /**
   * Create a new critical warning for an inspection
   */
  async create(inspectionId: string, createDto: CreateCriticalWarningDto, createdById?: number): Promise<CriticalWarningDto> {
    // Load inspection and verify it exists
    const inspection = await this.prisma.inspection.findUnique({
      where: { id: inspectionId },
      include: {
        garden: {
          include: {
            campus: true,
          },
        },
      },
    });

    if (!inspection) {
      throw new NotFoundException(`Inspection with ID ${inspectionId} not found`);
    }

    // Validate topicId (should be 1-7 based on INSPECTION_TOPICS)
    if (createDto.topicId < 1 || createDto.topicId > 7) {
      throw new BadRequestException(`Invalid topicId: ${createDto.topicId}. Must be between 1 and 7.`);
    }

    // Create the critical warning
    const warning = await this.prisma.criticalWarning.create({
      data: {
        inspectionId: inspectionId,
        gardenId: inspection.gardenId,
        topicId: createDto.topicId,
        title: createDto.title,
        description: createDto.description,
        status: 'OPEN',
        severity: createDto.severity || null,
        createdById: createdById || null,
        openedAt: new Date(),
      },
      include: {
        garden: {
          include: {
            campus: true,
          },
        },
      },
    });

    // Send web push notification after successful creation (non-blocking)
    // Errors are handled inside the notification service and never thrown
    console.log('CRITICAL_WARNING_CREATE: calling notifyCriticalWarningCreated', {
      warningId: warning.id,
      gardenId: warning.gardenId,
      status: warning.status,
    });
    try {
      await this.notificationsService.notifyCriticalWarningCreated({
        id: warning.id,
        gardenId: warning.gardenId,
        garden: warning.garden,
      });
    } catch (error) {
      // Log error but never throw - notification failure should not break the API response
      console.error('CRITICAL_WARNING_CREATE: notifyCriticalWarningCreated failed', {
        warningId: warning.id,
        error: error instanceof Error ? error.message : error,
      });
    }

    return this.mapToDto(warning);
  }

  /**
   * Update a critical warning (status, closure note, severity)
   */
  async update(id: string, updateDto: UpdateCriticalWarningDto, closedById?: number): Promise<CriticalWarningDto> {
    // Load warning
    const warning = await this.prisma.criticalWarning.findUnique({
      where: { id },
      include: {
        garden: {
          include: {
            campus: true,
          },
        },
      },
    });

    if (!warning) {
      throw new NotFoundException(`Critical warning with ID ${id} not found`);
    }

    const updateData: Prisma.CriticalWarningUpdateInput = {};

    // Handle status changes
    if (updateDto.status !== undefined) {
      updateData.status = updateDto.status;

      // If changing from OPEN to CLOSED and closedAt is null
      if (updateDto.status === 'CLOSED' && !warning.closedAt) {
        updateData.closedAt = new Date();
        if (closedById) {
          updateData.closedBy = {
            connect: { id: closedById },
          };
        }
      }

      // If changing from CLOSED to OPEN
      if (updateDto.status === 'OPEN' && warning.closedAt) {
        updateData.closedAt = null;
        updateData.closedBy = {
          disconnect: true,
        };
        // Optionally clear closureNote if changing back to OPEN
        if (updateDto.closureNote === undefined) {
          updateData.closureNote = null;
        }
      }
    }

    // Handle closure note
    if (updateDto.closureNote !== undefined) {
      updateData.closureNote = updateDto.closureNote || null;
    }

    // Handle severity
    if (updateDto.severity !== undefined) {
      updateData.severity = updateDto.severity || null;
    }

    // Update the warning
    const updatedWarning = await this.prisma.criticalWarning.update({
      where: { id },
      data: updateData,
      include: {
        garden: {
          include: {
            campus: true,
          },
        },
      },
    });

    return this.mapToDto(updatedWarning);
  }

  /**
   * Find all critical warnings with filters (for global modal)
   */
  async findAll(
    status: string = 'OPEN',
    campusId?: string,
    topicId?: number,
    limit: number = 100,
    offset: number = 0,
  ): Promise<CriticalWarningDto[]> {
    const where: Prisma.CriticalWarningWhereInput = {};

    // Status filter - default to OPEN
    if (status && status !== 'all') {
      where.status = status as 'OPEN' | 'CLOSED';
    }

    // Campus filter
    if (campusId && campusId !== 'all') {
      where.garden = {
        campusId: campusId,
      };
    }

    // Topic filter
    if (topicId) {
      where.topicId = topicId;
    }

    const warnings = await this.prisma.criticalWarning.findMany({
      where,
      include: {
        garden: {
          include: {
            campus: true,
          },
        },
      },
      orderBy: {
        openedAt: 'asc', // En eski → en yeni (ASC)
      },
      take: limit,
      skip: offset,
    });

    return warnings.map(w => this.mapToDto(w));
  }

  /**
   * Find critical warnings by garden ID
   */
  async findByGardenId(gardenId: number, status?: string): Promise<CriticalWarningDto[]> {
    // Verify garden exists
    const garden = await this.prisma.garden.findUnique({
      where: { id: gardenId },
    });

    if (!garden) {
      throw new NotFoundException(`Garden with ID ${gardenId} not found`);
    }

    const where: Prisma.CriticalWarningWhereInput = {
      gardenId: gardenId,
    };

    // Status filter
    if (status && status !== 'all') {
      where.status = status as 'OPEN' | 'CLOSED';
    }

    const warnings = await this.prisma.criticalWarning.findMany({
      where,
      include: {
        garden: {
          include: {
            campus: true,
          },
        },
      },
      orderBy: {
        openedAt: 'asc', // En eski → en yeni (ASC)
      },
    });

    return warnings.map(w => this.mapToDto(w));
  }

  /**
   * Get count of open critical warnings for a garden
   */
  async getOpenCountByGardenId(gardenId: number): Promise<number> {
    return this.prisma.criticalWarning.count({
      where: {
        gardenId: gardenId,
        status: 'OPEN',
      },
    });
  }

  /**
   * Get count of open critical warnings for all gardens in a campus
   */
  async getOpenCountByCampusId(campusId: string): Promise<number> {
    return this.prisma.criticalWarning.count({
      where: {
        status: 'OPEN',
        garden: {
          campusId: campusId,
        },
      },
    });
  }
}