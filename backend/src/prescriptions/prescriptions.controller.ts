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
  ) {
    return this.prescriptionsService.createDraft(user.id, createPrescriptionDto);
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
  ) {
    return this.prescriptionsService.update(user.id, id, updatePrescriptionDto);
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
  ) {
    return this.prescriptionsService.submitForReview(user.id, id);
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
  ) {
    return this.prescriptionsService.review(user.id, id, reviewPrescriptionDto);
  }

  /**
   * GET /prescriptions/campus/:campusId/list
   * List all prescriptions for a campus
   * Roles: CONSULTANT, LEAD_AUDITOR, ADMIN, SUPER_ADMIN
   */
  @Get('campus/:campusId/list')
  @Roles(Role.CONSULTANT, Role.LEAD_AUDITOR, Role.ADMIN, Role.SUPER_ADMIN)
  listByCampus(@Param('campusId') campusId: string) {
    return this.prescriptionsService.listByCampus(campusId);
  }

  /**
   * GET /prescriptions/campus/:campusId/latest
   * Get latest approved prescription for a campus
   * Roles: CONSULTANT, LEAD_AUDITOR, ADMIN, SUPER_ADMIN
   */
  @Get('campus/:campusId/latest')
  @Roles(Role.CONSULTANT, Role.LEAD_AUDITOR, Role.ADMIN, Role.SUPER_ADMIN)
  getLatestApproved(@Param('campusId') campusId: string) {
    return this.prescriptionsService.getLatestApprovedByCampus(campusId);
  }

  /**
   * GET /prescriptions/pending
   * List pending prescriptions for reviewer
   * Roles: root, danisman, denetci → CONSULTANT, LEAD_AUDITOR, SUPER_ADMIN (yonetici cannot see)
   */
  @Get('pending')
  @Roles(Role.CONSULTANT, Role.LEAD_AUDITOR, Role.SUPER_ADMIN)
  listPending() {
    return this.prescriptionsService.listPending();
  }

  /**
   * GET /prescriptions/campus/:campusId/pending
   * List pending prescriptions for a specific campus
   * Roles: CONSULTANT, LEAD_AUDITOR, ADMIN, SUPER_ADMIN
   */
  @Get('campus/:campusId/pending')
  @Roles(Role.CONSULTANT, Role.LEAD_AUDITOR, Role.ADMIN, Role.SUPER_ADMIN)
  listPendingByCampus(@Param('campusId') campusId: string) {
    return this.prescriptionsService.listPendingByCampus(campusId);
  }

  /**
   * GET /prescriptions/:id
   * Get prescription by ID
   * Roles: CONSULTANT, LEAD_AUDITOR, ADMIN, SUPER_ADMIN
   */
  @Get(':id')
  @Roles(Role.CONSULTANT, Role.LEAD_AUDITOR, Role.ADMIN, Role.SUPER_ADMIN)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.prescriptionsService.findOne(id);
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
  ) {
    return this.prescriptionsService.delete(user.id, id, user.role);
  }
}
