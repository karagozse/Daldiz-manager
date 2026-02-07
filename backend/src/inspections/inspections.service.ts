import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateInspectionDto } from './dto/create-inspection.dto';
import { UpdateInspectionDto } from './dto/update-inspection.dto';
import { InspectionStatus } from '@prisma/client';

@Injectable()
export class InspectionsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async create(createInspectionDto: CreateInspectionDto, createdById: number, tenantId: string) {
    // Verify garden exists for tenant
    const garden = await this.prisma.garden.findFirst({
      where: { id: createInspectionDto.gardenId, tenantId },
    });

    if (!garden) {
      throw new NotFoundException(
        `Garden with ID ${createInspectionDto.gardenId} not found`,
      );
    }

    return this.prisma.inspection.create({
      data: {
        tenantId,
        gardenId: createInspectionDto.gardenId,
        createdById,
        status: createInspectionDto.status ?? InspectionStatus.DRAFT,
        topics: createInspectionDto.topics ?? null,
        score: createInspectionDto.score ?? null,
      },
      include: {
        garden: {
          include: {
            campus: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            username: true,
            displayName: true,
            role: true,
          },
        },
      },
    });
  }

  async findOne(tenantId: string, id: string) {
    const inspection = await this.prisma.inspection.findFirst({
      where: { id, tenantId },
      include: {
        garden: {
          include: {
            campus: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            username: true,
            displayName: true,
            role: true,
          },
        },
      },
    });

    if (!inspection) {
      throw new NotFoundException(`Inspection with ID ${id} not found`);
    }

    return inspection;
  }

  async findAll(tenantId: string) {
    return this.prisma.inspection.findMany({
      where: { tenantId },
      include: {
        garden: {
          include: {
            campus: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            username: true,
            displayName: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findByGardenId(tenantId: string, gardenId: number) {
    // Verify garden exists for tenant
    const garden = await this.prisma.garden.findFirst({
      where: { id: gardenId, tenantId },
    });

    if (!garden) {
      throw new NotFoundException(`Garden with ID ${gardenId} not found`);
    }

    return this.prisma.inspection.findMany({
      where: { gardenId, tenantId },
      include: {
        garden: {
          include: {
            campus: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            username: true,
            displayName: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async update(tenantId: string, id: string, updateInspectionDto: UpdateInspectionDto) {
    // Verify inspection exists for tenant
    const inspection = await this.prisma.inspection.findFirst({
      where: { id, tenantId },
    });

    if (!inspection) {
      throw new NotFoundException(`Inspection with ID ${id} not found`);
    }

    const isBeingCompleted = updateInspectionDto.status === InspectionStatus.SUBMITTED &&
      inspection.status !== InspectionStatus.SUBMITTED;

    const updateData: any = { ...updateInspectionDto };
    if (isBeingCompleted) {
      updateData.submittedAt = new Date();
    }

    const updatedInspection = await this.prisma.inspection.update({
      where: { id },
      data: updateData,
      include: {
        garden: {
          include: {
            campus: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            username: true,
            displayName: true,
            role: true,
          },
        },
      },
    });

    if (isBeingCompleted && updatedInspection.status === InspectionStatus.SUBMITTED) {
      // Send web push notification after successful scoring (non-blocking)
      // Errors are handled inside the notification service and never thrown
      console.log('INSPECTION_UPDATE: calling notifyEvaluationCompleted', {
        inspectionId: updatedInspection.id,
        gardenId: updatedInspection.gardenId,
        status: updatedInspection.status,
      });
      try {
        await this.notificationsService.notifyEvaluationCompleted(updatedInspection);
      } catch (error) {
        // Log error but never throw - notification failure should not break the API response
        console.error('INSPECTION_UPDATE: notifyEvaluationCompleted failed', {
          inspectionId: updatedInspection.id,
          error: error instanceof Error ? error.message : error,
        });
      }
    }

    return updatedInspection;
  }

  async delete(tenantId: string, id: string, userId?: number, userRole?: string) {
    const inspection = await this.prisma.inspection.findFirst({
      where: { id, tenantId },
    });

    if (!inspection) {
      throw new NotFoundException(`Inspection with ID ${id} not found`);
    }

    if (userRole === 'CONSULTANT') {
      if (inspection.createdById !== userId) {
        throw new BadRequestException('You can only delete your own draft inspections');
      }
      if (inspection.status !== InspectionStatus.DRAFT) {
        throw new BadRequestException('Only draft inspections can be deleted');
      }
    }

    if (inspection.status === InspectionStatus.SUBMITTED) {
      throw new BadRequestException('Submitted inspections cannot be deleted');
    }

    await this.prisma.inspection.delete({
      where: { id },
    });

    return { success: true };
  }
}
