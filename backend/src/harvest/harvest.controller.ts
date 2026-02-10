import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { HarvestService } from './harvest.service';
import { CreateHarvestDto } from './dto/create-harvest.dto';
import { UpdateHarvestDto } from './dto/update-harvest.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import { Tenant } from '../common/decorators/tenant.decorator';
import { TenantContext } from '../middleware/tenant-context.middleware';

function isInvalidId(id: string | undefined): boolean {
  if (id == null || typeof id !== 'string') return true;
  const t = id.trim().toLowerCase();
  return t === '' || t === 'undefined' || t === 'null';
}

@Controller('harvest')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CONSULTANT, Role.LEAD_AUDITOR, Role.ADMIN, Role.SUPER_ADMIN)
export class HarvestController {
  constructor(private readonly harvestService: HarvestService) {}

  @Post()
  create(
    @Body() dto: CreateHarvestDto,
    @Tenant() tenant: TenantContext,
  ) {
    return this.harvestService.create(dto, tenant.tenantId);
  }

  @Get('traders')
  findTraders(
    @Query('q') q: string,
    @Query('list') list: string,
    @Tenant() tenant: TenantContext,
  ) {
    if (list === 'all') {
      return this.harvestService.listAllTraderNames(tenant?.tenantId ?? '');
    }
    return this.harvestService.findTraderNames(tenant?.tenantId ?? '', q ?? '');
  }

  @Get('summary')
  async getSummary(
    @Query('year') year?: string,
    @Query('campusId') campusId?: string,
    @Query('gardenId') gardenId?: string,
    @Query('trader') trader?: string,
    @Tenant() tenant?: TenantContext,
  ) {
    const tenantId = tenant?.tenantId ?? '';
    const filters: { year?: number; campusId?: string; gardenId?: number; trader?: string } = {};
    if (year != null && year !== '') {
      const y = parseInt(String(year), 10);
      if (!Number.isNaN(y)) filters.year = y;
    }
    if (campusId != null && campusId !== '') filters.campusId = campusId;
    if (gardenId != null && gardenId !== '') {
      const g = parseInt(String(gardenId), 10);
      if (!Number.isNaN(g)) filters.gardenId = g;
    }
    if (trader != null && trader.trim() !== '') filters.trader = trader.trim();
    return this.harvestService.findSummary(tenantId, filters);
  }

  @Get()
  async findAll(
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
    @Query('status') status?: string,
    @Query('garden_id') gardenId?: string,
    @Tenant() tenant?: TenantContext,
  ) {
    try {
      console.log('Harvest GET /harvest', { dateFrom, dateTo, status, gardenId });
      const tenantId = tenant?.tenantId ?? '';
      const filters: any = {};
      if (dateFrom && dateFrom !== 'undefined') filters.dateFrom = dateFrom;
      if (dateTo && dateTo !== 'undefined') filters.dateTo = dateTo;
      if (status && status !== 'undefined') filters.status = status;
      if (gardenId != null && gardenId !== '' && gardenId !== 'undefined') {
        const n = parseInt(String(gardenId), 10);
        if (!Number.isNaN(n)) filters.gardenId = n;
      }
      const data = await this.harvestService.findAll(tenantId, filters);
      return { items: data };
    } catch (err) {
      console.error('Harvest list error:', err);
      return { items: [] };
    }
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Tenant() tenant: TenantContext) {
    if (isInvalidId(id)) {
      console.warn('Harvest GET /harvest/:id invalid id', { id });
      throw new BadRequestException({ message: 'Harvest id is required and cannot be undefined, null or empty.' });
    }
    console.log('Harvest GET /harvest/:id', { id });
    return this.harvestService.findOne(tenant?.tenantId ?? '', id);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateHarvestDto,
    @Tenant() tenant: TenantContext,
    @CurrentUser() user: { role: Role },
  ) {
    if (isInvalidId(id)) {
      console.warn('Harvest PUT /harvest/:id invalid id', { id });
      throw new BadRequestException({ message: 'Harvest id is required and cannot be undefined, null or empty.' });
    }
    console.log('Harvest PUT /harvest/:id', { id });
    return this.harvestService.update(tenant?.tenantId ?? '', id, dto, user?.role);
  }

  @Post(':id/submit')
  submit(@Param('id') id: string, @Tenant() tenant: TenantContext) {
    if (isInvalidId(id)) {
      console.warn('Harvest POST /harvest/:id/submit invalid id', { id });
      throw new BadRequestException({ message: 'Harvest id is required and cannot be undefined, null or empty.' });
    }
    console.log('Harvest POST /harvest/:id/submit', { id });
    return this.harvestService.submit(tenant?.tenantId ?? '', id);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Tenant() tenant: TenantContext) {
    if (isInvalidId(id)) {
      console.warn('Harvest DELETE /harvest/:id invalid id', { id });
      throw new BadRequestException({ message: 'Harvest id is required and cannot be undefined, null or empty.' });
    }
    console.log('Harvest DELETE /harvest/:id', { id });
    return this.harvestService.delete(tenant?.tenantId ?? '', id);
  }

  @Delete(':id/photos/:photoId')
  deletePhoto(
    @Param('id') id: string,
    @Param('photoId') photoId: string,
    @Tenant() tenant: TenantContext,
    @CurrentUser() user: { role: Role },
  ) {
    if (isInvalidId(id) || isInvalidId(photoId)) {
      throw new BadRequestException({ message: 'Harvest id and photo id are required.' });
    }
    return this.harvestService.deletePhoto(tenant?.tenantId ?? '', id, photoId, user?.role);
  }
}
