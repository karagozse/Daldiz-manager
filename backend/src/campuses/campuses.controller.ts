import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { CampusesService } from './campuses.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Tenant } from '../common/decorators/tenant.decorator';
import { TenantContext } from '../middleware/tenant-context.middleware';

@Controller('campuses')
@UseGuards(JwtAuthGuard)
export class CampusesController {
  constructor(private readonly campusesService: CampusesService) {}

  @Get()
  findAll(@Tenant() tenant: TenantContext) {
    return this.campusesService.findAll(tenant.tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Tenant() tenant: TenantContext) {
    return this.campusesService.findOne(tenant.tenantId, id);
  }
}
