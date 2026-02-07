import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { CriticalWarningsService } from './critical-warnings.service';
import { CreateCriticalWarningDto } from './dto/create-critical-warning.dto';
import { UpdateCriticalWarningDto } from './dto/update-critical-warning.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import { Tenant } from '../common/decorators/tenant.decorator';
import { TenantContext } from '../middleware/tenant-context.middleware';

@Controller()
@UseGuards(JwtAuthGuard)
export class CriticalWarningsController {
  constructor(private readonly criticalWarningsService: CriticalWarningsService) {}

  /**
   * POST /inspections/:inspectionId/critical-warnings
   * Create a new critical warning for an inspection
   * Roles: CONSULTANT, LEAD_AUDITOR, SUPER_ADMIN (single-layer flow)
   */
  @Post('inspections/:inspectionId/critical-warnings')
  @UseGuards(RolesGuard)
  @Roles(Role.CONSULTANT, Role.LEAD_AUDITOR, Role.SUPER_ADMIN)
  create(
    @Param('inspectionId') inspectionId: string,
    @Body() createDto: CreateCriticalWarningDto,
    @CurrentUser() user: { id: number },
    @Tenant() tenant: TenantContext,
  ) {
    return this.criticalWarningsService.create(tenant.tenantId, inspectionId, createDto, user.id);
  }

  /**
   * PATCH /critical-warnings/:id
   * Update a critical warning (status, closure note, severity)
   * Roles: CONSULTANT, LEAD_AUDITOR, SUPER_ADMIN (single-layer flow)
   */
  @Patch('critical-warnings/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.CONSULTANT, Role.LEAD_AUDITOR, Role.SUPER_ADMIN)
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateCriticalWarningDto,
    @CurrentUser() user: { id: number },
    @Tenant() tenant: TenantContext,
  ) {
    const closedById = updateDto.status === 'CLOSED' ? user.id : undefined;
    return this.criticalWarningsService.update(tenant.tenantId, id, updateDto, closedById);
  }

  /**
   * GET /critical-warnings
   * Get all critical warnings with optional filters
   */
  @Get('critical-warnings')
  findAll(
    @Query('status') status?: string,
    @Query('campusId') campusId?: string,
    @Query('topicId') topicId?: string,
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit?: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset?: number,
    @Tenant() tenant?: TenantContext,
  ) {
    const topicIdNum = topicId ? parseInt(topicId, 10) : undefined;
    return this.criticalWarningsService.findAll(tenant!.tenantId, status, campusId, topicIdNum, limit, offset);
  }

  /**
   * GET /gardens/:gardenId/critical-warnings
   * Get critical warnings for a specific garden
   */
  @Get('gardens/:gardenId/critical-warnings')
  findByGardenId(
    @Param('gardenId', ParseIntPipe) gardenId: number,
    @Query('status') status?: string,
    @Tenant() tenant?: TenantContext,
  ) {
    return this.criticalWarningsService.findByGardenId(tenant!.tenantId, gardenId, status);
  }
}