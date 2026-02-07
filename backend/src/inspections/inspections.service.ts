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

  async create(createInspectionDto: CreateInspectionDto, createdById: number) {
    // Verify garden exists
    const garden = await this.prisma.garden.findUnique({
      where: { id: createInspectionDto.gardenId },
    });

    if (!garden) {
      throw new NotFoundException(
        `Garden with ID ${createInspectionDto.gardenId} not found`,
      );
    }

    return this.prisma.inspection.create({
      data: {
        gardenId: createInspectionDto.gardenId,
        createdById,
        status: createInspectionDto.status ?? InspectionStatus.DRAFT,
        topics: createInspectionDto.topics ?? null,
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

  async findOne(id: string) {
    const inspection = await this.prisma.inspection.findUnique({
      where: { id },
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

  async findAll() {
    return this.prisma.inspection.findMany({
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

  async findByGardenId(gardenId: number) {
    // Verify garden exists
    const garden = await this.prisma.garden.findUnique({
      where: { id: gardenId },
    });

    if (!garden) {
      throw new NotFoundException(`Garden with ID ${gardenId} not found`);
    }

    return this.prisma.inspection.findMany({
      where: { gardenId },
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

  async update(id: string, updateInspectionDto: UpdateInspectionDto) {
    // Verify inspection exists
    const inspection = await this.prisma.inspection.findUnique({
      where: { id },
    });

    if (!inspection) {
      throw new NotFoundException(`Inspection with ID ${id} not found`);
    }

    // Check if status is being changed to SCORED (evaluation completed)
    const isBeingScored = updateInspectionDto.status === InspectionStatus.SCORED && 
                          inspection.status !== InspectionStatus.SCORED;

    const updatedInspection = await this.prisma.inspection.update({
      where: { id },
      data: updateInspectionDto,
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

    // Verify status is actually SCORED before sending notification
    if (isBeingScored && updatedInspection.status === InspectionStatus.SCORED) {
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

  async delete(id: string, userId?: number, userRole?: string) {
    const inspection = await this.prisma.inspection.findUnique({
      where: { id },
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

    await this.prisma.inspection.delete({
      where: { id },
    });

    return { success: true };
  }
}
