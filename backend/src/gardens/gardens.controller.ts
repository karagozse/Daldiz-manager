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
} from '@nestjs/common';
import { GardensService } from './gardens.service';
import { CreateGardenDto } from './dto/create-garden.dto';
import { UpdateGardenStatusDto } from './dto/update-garden-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { InspectionsService } from '../inspections/inspections.service';
import { Tenant } from '../common/decorators/tenant.decorator';
import { TenantContext } from '../middleware/tenant-context.middleware';

@Controller('gardens')
@UseGuards(JwtAuthGuard)
export class GardensController {
  constructor(
    private readonly gardensService: GardensService,
    private readonly inspectionsService: InspectionsService,
  ) {}

  /**
   * Create garden. Roles: root only → SUPER_ADMIN (yonetici read-only)
   */
  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  create(@Body() createGardenDto: CreateGardenDto, @Tenant() tenant: TenantContext) {
    return this.gardensService.create(tenant.tenantId, createGardenDto);
  }

  @Get()
  async findAll(
    @Query('campusId') campusId?: string,
    @Query('status') status?: string,
    @Tenant() tenant?: TenantContext,
  ) {
    const gardens = await this.gardensService.findAll(tenant!.tenantId, campusId, status);
    console.log(
      'DEBUG /gardens response sample',
      gardens.slice(0, 3).map((g: any) => ({
        id: g.id,
        name: g.name,
        openCriticalWarningCount: g.openCriticalWarningCount,
        hasOpenCriticalWarningCount: 'openCriticalWarningCount' in g,
        openCriticalWarningCountType: typeof g.openCriticalWarningCount,
      })),
    );
    return gardens;
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number, @Tenant() tenant: TenantContext) {
    const garden = await this.gardensService.findOne(tenant.tenantId, id);
    console.log('DEBUG /gardens/:id response', {
      id: garden.id,
      name: garden.name,
      openCriticalWarningCount: garden.openCriticalWarningCount,
      hasOpenCriticalWarningCount: 'openCriticalWarningCount' in garden,
      openCriticalWarningCountType: typeof garden.openCriticalWarningCount,
    });
    return garden;
  }

  @Get(':id/inspections')
  findInspectionsByGardenId(@Param('id', ParseIntPipe) id: number, @Tenant() tenant: TenantContext) {
    return this.inspectionsService.findByGardenId(tenant.tenantId, id);
  }

  /**
   * Update garden status. Roles: root only → SUPER_ADMIN
   */
  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateGardenStatusDto: UpdateGardenStatusDto,
    @Tenant() tenant: TenantContext,
  ) {
    return this.gardensService.updateStatus(tenant.tenantId, id, updateGardenStatusDto);
  }
}
