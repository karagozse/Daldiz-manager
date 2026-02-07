import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { UpdatePrescriptionDto } from './dto/update-prescription.dto';
import { ReviewPrescriptionDto } from './dto/review-prescription.dto';

@Injectable()
export class PrescriptionsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  /**
   * Create a new prescription (directly PENDING, no draft)
   */
  async createDraft(tenantId: string, userId: number, dto: CreatePrescriptionDto) {
    // Verify campus exists for tenant
    const campus = await this.prisma.campus.findUnique({
      where: { tenantId_id: { tenantId, id: dto.campusId } },
    });

    if (!campus) {
      throw new NotFoundException(`Campus with ID ${dto.campusId} not found`);
    }

    return this.prisma.prescription.create({
      data: {
        tenantId,
        campusTenantId: tenantId,
        campusId: dto.campusId,
        createdById: userId,
        ventilation: dto.ventilation ?? null,
        irrigation: dto.irrigation ?? null,
        fertilization: dto.fertilization ?? null,
        status: 'pending',
      },
      include: {
        users_prescriptions_createdByIdTousers: {
          select: {
            id: true,
            username: true,
            displayName: true,
            role: true,
          },
        },
        users_prescriptions_reviewedByIdTousers: {
          select: {
            id: true,
            username: true,
            displayName: true,
            role: true,
          },
        },
        campuses: true,
      },
    });
  }

  /**
   * Update prescription (only draft or rejected can be updated)
   */
  async update(tenantId: string, userId: number, id: number, dto: UpdatePrescriptionDto) {
    const prescription = await this.prisma.prescription.findFirst({
      where: { id, tenantId },
    });

    if (!prescription) {
      throw new NotFoundException(`Prescription with ID ${id} not found`);
    }

    // Only creator can update
    if (prescription.createdById !== userId) {
      throw new ForbiddenException('You can only update your own prescriptions');
    }

    // Only draft or rejected can be updated
    if (prescription.status !== 'draft' && prescription.status !== 'rejected') {
      throw new BadRequestException('Can only update draft or rejected prescriptions');
    }

    return this.prisma.prescription.update({
      where: { id },
      data: {
        ventilation: dto.ventilation !== undefined ? dto.ventilation : prescription.ventilation,
        irrigation: dto.irrigation !== undefined ? dto.irrigation : prescription.irrigation,
        fertilization: dto.fertilization !== undefined ? dto.fertilization : prescription.fertilization,
      },
      include: {
        users_prescriptions_createdByIdTousers: {
          select: {
            id: true,
            username: true,
            displayName: true,
            role: true,
          },
        },
        users_prescriptions_reviewedByIdTousers: {
          select: {
            id: true,
            username: true,
            displayName: true,
            role: true,
          },
        },
        campuses: true,
      },
    });
  }

  /**
   * Submit prescription for review (draft -> pending)
   */
  async submitForReview(tenantId: string, userId: number, id: number) {
    const prescription = await this.prisma.prescription.findFirst({
      where: { id, tenantId },
    });

    if (!prescription) {
      throw new NotFoundException(`Prescription with ID ${id} not found`);
    }

    // Only creator can submit
    if (prescription.createdById !== userId) {
      throw new ForbiddenException('You can only submit your own prescriptions');
    }

    if (prescription.status !== 'draft') {
      throw new BadRequestException('Can only submit draft prescriptions');
    }

    return this.prisma.prescription.update({
      where: { id },
      data: {
        status: 'pending',
      },
      include: {
        users_prescriptions_createdByIdTousers: {
          select: {
            id: true,
            username: true,
            displayName: true,
            role: true,
          },
        },
        users_prescriptions_reviewedByIdTousers: {
          select: {
            id: true,
            username: true,
            displayName: true,
            role: true,
          },
        },
        campuses: true,
      },
    });
  }

  /**
   * Review prescription (pending -> approved or deleted)
   */
  async review(tenantId: string, userId: number, id: number, dto: ReviewPrescriptionDto) {
    const prescription = await this.prisma.prescription.findFirst({
      where: { id, tenantId },
    });

    if (!prescription) {
      throw new NotFoundException(`Prescription with ID ${id} not found`);
    }

    if (prescription.status !== 'pending') {
      throw new BadRequestException('Can only review pending prescriptions');
    }

    if (dto.status !== 'approved' && dto.status !== 'rejected') {
      throw new BadRequestException('Review status must be approved or rejected');
    }

    // If rejected/deleted, delete the prescription completely
    if (dto.status === 'rejected') {
      await this.prisma.prescription.delete({
        where: { id },
      });
      return { message: 'Prescription deleted successfully', deleted: true };
    }

    // If approved, set status to APPROVED
    const approvedPrescription = await this.prisma.prescription.update({
      where: { id },
      data: {
        status: 'approved',
        reviewedById: userId,
        reviewedAt: new Date(),
      },
      include: {
        users_prescriptions_createdByIdTousers: {
          select: {
            id: true,
            username: true,
            displayName: true,
            role: true,
          },
        },
        users_prescriptions_reviewedByIdTousers: {
          select: {
            id: true,
            username: true,
            displayName: true,
            role: true,
          },
        },
        campuses: true,
      },
    });

    // Verify status is actually 'approved' before sending notification
    if (approvedPrescription.status !== 'approved') {
      console.warn('PRESCRIPTION_REVIEW: prescription status is not approved after update', {
        prescriptionId: id,
        actualStatus: approvedPrescription.status,
      });
      return approvedPrescription;
    }

    // Send web push notification after successful approval (non-blocking)
    // Errors are handled inside the notification service and never thrown
    console.log('PRESCRIPTION_REVIEW: calling notifyPrescriptionApproved', {
      prescriptionId: approvedPrescription.id,
      campusId: approvedPrescription.campusId,
      status: approvedPrescription.status,
    });
    try {
      await this.notificationsService.notifyPrescriptionApproved(approvedPrescription);
    } catch (error) {
      // Log error but never throw - notification failure should not break the API response
      console.error('PRESCRIPTION_REVIEW: notifyPrescriptionApproved failed', {
        prescriptionId: approvedPrescription.id,
        error: error instanceof Error ? error.message : error,
      });
    }

    return approvedPrescription;
  }

  /**
   * Get latest approved prescription for a campus
   */
  async getLatestApprovedByCampus(tenantId: string, campusId: string) {
    try {
      const prescription = await this.prisma.prescription.findFirst({
        where: {
          tenantId,
          campusTenantId: tenantId,
          campusId,
          status: 'approved',
        },
        orderBy: {
          id: 'desc',
        },
        include: {
          users_prescriptions_createdByIdTousers: {
            select: {
              id: true,
              username: true,
              displayName: true,
              role: true,
            },
          },
          users_prescriptions_reviewedByIdTousers: {
            select: {
              id: true,
              username: true,
              displayName: true,
              role: true,
            },
          },
          campuses: true,
        },
      });

      // Return null if no prescription found (frontend handles this)
      return prescription || null;
    } catch (error) {
      console.error('Error in getLatestApprovedByCampus:', error);
      throw error;
    }
  }

  /**
   * List all prescriptions for a campus
   */
  async listByCampus(tenantId: string, campusId: string) {
    try {
      return await this.prisma.prescription.findMany({
        where: {
          tenantId,
          campusTenantId: tenantId,
          campusId,
        },
        orderBy: {
          id: 'desc',
        },
        include: {
          users_prescriptions_createdByIdTousers: {
            select: {
              id: true,
              username: true,
              displayName: true,
              role: true,
            },
          },
          users_prescriptions_reviewedByIdTousers: {
            select: {
              id: true,
              username: true,
              displayName: true,
              role: true,
            },
          },
          campuses: true,
        },
      });
    } catch (error) {
      console.error('Error in listByCampus:', error);
      throw error;
    }
  }

  /**
   * List pending prescriptions for reviewer
   */
  async listPending(tenantId: string) {
    return this.prisma.prescription.findMany({
      where: {
        tenantId,
        status: 'pending',
      },
      orderBy: {
        id: 'asc',
      },
      include: {
        users_prescriptions_createdByIdTousers: {
          select: {
            id: true,
            username: true,
            displayName: true,
            role: true,
          },
        },
        campuses: true,
      },
    });
  }

  /**
   * List pending prescriptions for a specific campus
   */
  async listPendingByCampus(tenantId: string, campusId: string) {
    return this.prisma.prescription.findMany({
      where: {
        tenantId,
        campusTenantId: tenantId,
        campusId,
        status: 'pending',
      },
      orderBy: {
        id: 'asc',
      },
      include: {
        users_prescriptions_createdByIdTousers: {
          select: {
            id: true,
            username: true,
            displayName: true,
            role: true,
          },
        },
        campuses: true,
      },
    });
  }

  /**
   * Get prescription by ID
   */
  async findOne(tenantId: string, id: number) {
    const prescription = await this.prisma.prescription.findFirst({
      where: { id, tenantId },
      include: {
        users_prescriptions_createdByIdTousers: {
          select: {
            id: true,
            username: true,
            displayName: true,
            role: true,
          },
        },
        users_prescriptions_reviewedByIdTousers: {
          select: {
            id: true,
            username: true,
            displayName: true,
            role: true,
          },
        },
        campuses: true,
      },
    });

    if (!prescription) {
      throw new NotFoundException(`Prescription with ID ${id} not found`);
    }

    return prescription;
  }

  /**
   * Delete prescription
   * - Consultant can delete DRAFT prescriptions (legacy support)
   * - Auditor/Admin can delete PENDING prescriptions
   */
  async delete(tenantId: string, userId: number, id: number, userRole?: string) {
    const prescription = await this.prisma.prescription.findFirst({
      where: { id, tenantId },
    });

    if (!prescription) {
      throw new NotFoundException(`Prescription with ID ${id} not found`);
    }

    // Check if user is creator
    const isCreator = prescription.createdById === userId;
    
    // Check if user is auditor (root/denetci): only LEAD_AUDITOR, SUPER_ADMIN can delete PENDING
    const isAuditor = userRole === 'LEAD_AUDITOR' || userRole === 'SUPER_ADMIN';

    // Only creator can delete DRAFT prescriptions (legacy)
    if (prescription.status === 'draft') {
      if (!isCreator) {
        throw new ForbiddenException('You can only delete your own prescriptions');
      }
    }
    // Auditor/Admin can delete PENDING prescriptions
    else if (prescription.status === 'pending') {
      if (!isAuditor) {
        throw new ForbiddenException('Only auditors can delete pending prescriptions');
      }
    } else {
      throw new BadRequestException('Can only delete draft or pending prescriptions');
    }

    await this.prisma.prescription.delete({
      where: { id },
    });

    return { message: 'Prescription deleted successfully' };
  }
}
