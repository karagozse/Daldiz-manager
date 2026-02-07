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
  Delete,
} from '@nestjs/common';
import { InspectionsService } from './inspections.service';
import { CreateInspectionDto } from './dto/create-inspection.dto';
import { UpdateInspectionDto } from './dto/update-inspection.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import { Tenant } from '../common/decorators/tenant.decorator';
import { TenantContext } from '../middleware/tenant-context.middleware';

@Controller('inspections')
@UseGuards(JwtAuthGuard)
export class InspectionsController {
  constructor(private readonly inspectionsService: InspectionsService) {}

  /**
   * POST /inspections - Create inspection (denetim başlat)
   * Roles: root, danisman → CONSULTANT, SUPER_ADMIN
   */
  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.CONSULTANT, Role.SUPER_ADMIN)
  create(
    @Body() createInspectionDto: CreateInspectionDto,
    @CurrentUser() user: { id: number },
    @Tenant() tenant: TenantContext,
  ) {
    return this.inspectionsService.create(createInspectionDto, user.id, tenant.tenantId);
  }

  @Get()
  findAll(@Query('gardenId') gardenId?: string, @Tenant() tenant?: TenantContext) {
    if (gardenId) {
      return this.inspectionsService.findByGardenId(tenant!.tenantId, Number(gardenId));
    }
    return this.inspectionsService.findAll(tenant!.tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Tenant() tenant: TenantContext) {
    return this.inspectionsService.findOne(tenant.tenantId, id);
  }

  /**
   * PATCH /inspections/:id - Update inspection (draft save/submit by danisman; score/complete by denetci)
   * Roles: root, danisman, denetci → CONSULTANT, LEAD_AUDITOR, SUPER_ADMIN
   */
  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.CONSULTANT, Role.LEAD_AUDITOR, Role.SUPER_ADMIN)
  update(
    @Param('id') id: string,
    @Body() updateInspectionDto: UpdateInspectionDto,
    @Tenant() tenant: TenantContext,
  ) {
    return this.inspectionsService.update(tenant.tenantId, id, updateInspectionDto);
  }

  /**
   * DELETE /inspections/:id
   * CONSULTANT: own DRAFT only (e.g. exit form). LEAD_AUDITOR, SUPER_ADMIN: any.
   */
  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.CONSULTANT, Role.LEAD_AUDITOR, Role.SUPER_ADMIN)
  delete(
    @Param('id') id: string,
    @CurrentUser() user: { id: number; role: string },
    @Tenant() tenant: TenantContext,
  ) {
    return this.inspectionsService.delete(tenant.tenantId, id, user.id, user.role);
  }
}
