import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { PrescriptionsService } from './prescriptions.service';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { UpdatePrescriptionDto } from './dto/update-prescription.dto';
import { ReviewPrescriptionDto } from './dto/review-prescription.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import { Tenant } from '../common/decorators/tenant.decorator';
import { TenantContext } from '../middleware/tenant-context.middleware';

@Controller('prescriptions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PrescriptionsController {
  constructor(private readonly prescriptionsService: PrescriptionsService) {}

  /**
   * POST /prescriptions
   * Create a new prescription draft
   * Roles: root, danisman → CONSULTANT, SUPER_ADMIN
   */
  @Post()
  @Roles(Role.CONSULTANT, Role.SUPER_ADMIN)
  create(
    @Body() createPrescriptionDto: CreatePrescriptionDto,
    @CurrentUser() user: { id: number },
    @Tenant() tenant: TenantContext,
  ) {
    return this.prescriptionsService.createDraft(tenant.tenantId, user.id, createPrescriptionDto);
  }

  /**
   * PUT /prescriptions/:id
   * Update prescription (only draft or rejected)
   * Roles: root, danisman → CONSULTANT, SUPER_ADMIN
   */
  @Put(':id')
  @Roles(Role.CONSULTANT, Role.SUPER_ADMIN)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePrescriptionDto: UpdatePrescriptionDto,
    @CurrentUser() user: { id: number },
    @Tenant() tenant: TenantContext,
  ) {
    return this.prescriptionsService.update(tenant.tenantId, user.id, id, updatePrescriptionDto);
  }

  /**
   * POST /prescriptions/:id/submit
   * Submit prescription for review (draft -> pending)
   * Roles: root, danisman → CONSULTANT, SUPER_ADMIN
   */
  @Post(':id/submit')
  @Roles(Role.CONSULTANT, Role.SUPER_ADMIN)
  submitForReview(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { id: number },
    @Tenant() tenant: TenantContext,
  ) {
    return this.prescriptionsService.submitForReview(tenant.tenantId, user.id, id);
  }

  /**
   * POST /prescriptions/:id/review
   * Review prescription (pending -> approved or rejected)
   * Roles: root, denetci → LEAD_AUDITOR, SUPER_ADMIN
   */
  @Post(':id/review')
  @Roles(Role.LEAD_AUDITOR, Role.SUPER_ADMIN)
  review(
    @Param('id', ParseIntPipe) id: number,
    @Body() reviewPrescriptionDto: ReviewPrescriptionDto,
    @CurrentUser() user: { id: number },
    @Tenant() tenant: TenantContext,
  ) {
    return this.prescriptionsService.review(tenant.tenantId, user.id, id, reviewPrescriptionDto);
  }

  /**
   * GET /prescriptions/campus/:campusId/list
   * List all prescriptions for a campus
   * Roles: CONSULTANT, LEAD_AUDITOR, ADMIN, SUPER_ADMIN
   */
  @Get('campus/:campusId/list')
  @Roles(Role.CONSULTANT, Role.LEAD_AUDITOR, Role.ADMIN, Role.SUPER_ADMIN)
  listByCampus(@Param('campusId') campusId: string, @Tenant() tenant: TenantContext) {
    return this.prescriptionsService.listByCampus(tenant.tenantId, campusId);
  }

  /**
   * GET /prescriptions/campus/:campusId/latest
   * Get latest approved prescription for a campus
   * Roles: CONSULTANT, LEAD_AUDITOR, ADMIN, SUPER_ADMIN
   */
  @Get('campus/:campusId/latest')
  @Roles(Role.CONSULTANT, Role.LEAD_AUDITOR, Role.ADMIN, Role.SUPER_ADMIN)
  getLatestApproved(@Param('campusId') campusId: string, @Tenant() tenant: TenantContext) {
    return this.prescriptionsService.getLatestApprovedByCampus(tenant.tenantId, campusId);
  }

  /**
   * GET /prescriptions/pending
   * List pending prescriptions for reviewer
   * Roles: root, danisman, denetci → CONSULTANT, LEAD_AUDITOR, SUPER_ADMIN (yonetici cannot see)
   */
  @Get('pending')
  @Roles(Role.CONSULTANT, Role.LEAD_AUDITOR, Role.SUPER_ADMIN)
  listPending(@Tenant() tenant: TenantContext) {
    return this.prescriptionsService.listPending(tenant.tenantId);
  }

  /**
   * GET /prescriptions/campus/:campusId/pending
   * List pending prescriptions for a specific campus
   * Roles: CONSULTANT, LEAD_AUDITOR, ADMIN, SUPER_ADMIN
   */
  @Get('campus/:campusId/pending')
  @Roles(Role.CONSULTANT, Role.LEAD_AUDITOR, Role.ADMIN, Role.SUPER_ADMIN)
  listPendingByCampus(@Param('campusId') campusId: string, @Tenant() tenant: TenantContext) {
    return this.prescriptionsService.listPendingByCampus(tenant.tenantId, campusId);
  }

  /**
   * GET /prescriptions/:id
   * Get prescription by ID
   * Roles: CONSULTANT, LEAD_AUDITOR, ADMIN, SUPER_ADMIN
   */
  @Get(':id')
  @Roles(Role.CONSULTANT, Role.LEAD_AUDITOR, Role.ADMIN, Role.SUPER_ADMIN)
  findOne(@Param('id', ParseIntPipe) id: number, @Tenant() tenant: TenantContext) {
    return this.prescriptionsService.findOne(tenant.tenantId, id);
  }

  /**
   * DELETE /prescriptions/:id
   * Delete prescription (DRAFT by creator, PENDING by root/denetci only)
   * Roles: CONSULTANT (own DRAFT), LEAD_AUDITOR, SUPER_ADMIN (PENDING)
   */
  @Delete(':id')
  @Roles(Role.CONSULTANT, Role.LEAD_AUDITOR, Role.SUPER_ADMIN)
  delete(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { id: number; role: string },
    @Tenant() tenant: TenantContext,
  ) {
    return this.prescriptionsService.delete(tenant.tenantId, user.id, id, user.role);
  }
}
