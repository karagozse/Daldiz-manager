import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  Delete,
  UseGuards,
  ParseIntPipe,
  UnauthorizedException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { GardensService } from './gardens.service';
import { CreateGardenDto } from './dto/create-garden.dto';
import { UpdateGardenStatusDto } from './dto/update-garden-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { InspectionsService } from '../inspections/inspections.service';
import { DailyFieldCheckService } from '../daily-field-check/daily-field-check.service';
import { Tenant } from '../common/decorators/tenant.decorator';
import { TenantContext } from '../middleware/tenant-context.middleware';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('gardens')
@UseGuards(JwtAuthGuard)
export class GardensController {
  constructor(
    private readonly gardensService: GardensService,
    private readonly inspectionsService: InspectionsService,
    private readonly dailyFieldCheckService: DailyFieldCheckService,
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

  @Get(':id/daily-field-check')
  async getDailyFieldCheck(
    @Param('id', ParseIntPipe) gardenId: number,
    @Query('date') date: string | string[] | undefined,
    @Tenant() tenant: TenantContext,
  ) {
    const dateStr =
      (typeof date === 'string' ? date : Array.isArray(date) ? date[0] : undefined) ||
      new Date().toISOString().slice(0, 10);
    try {
      return await this.dailyFieldCheckService.get(
        tenant.tenantId,
        gardenId,
        dateStr,
      );
    } catch (err: any) {
      if (err?.status === 400 || err?.status === 404) throw err;
      console.error('[GET daily-field-check] Unexpected error:', err?.stack || err);
      throw err;
    }
  }

  @Post(':id/daily-field-check')
  async upsertDailyFieldCheck(
    @Param('id', ParseIntPipe) gardenId: number,
    @Body() body: { date?: string; status?: string; answers?: Record<string, unknown> },
    @CurrentUser() user: { id: number; role?: string },
    @Tenant() tenant: TenantContext,
  ) {
    if (!user?.id) {
      throw new UnauthorizedException('User not authenticated');
    }
    const dateStr = body?.date || new Date().toISOString().slice(0, 10);
    try {
      const result = await this.dailyFieldCheckService.upsertDraft(
        tenant.tenantId,
        gardenId,
        dateStr,
        user.id,
        body?.answers || {},
      );
      if (body?.status === 'SUBMITTED') {
        return this.dailyFieldCheckService.submit(tenant.tenantId, result.id);
      }
      return result;
    } catch (err: any) {
      if (err?.status === 400 || err?.status === 401 || err?.status === 404) throw err;
      console.error('[POST daily-field-check] Error:', err?.message);
      console.error('[POST daily-field-check] Stack:', err?.stack);
      if (err?.code === 'P2021' || err?.message?.includes('does not exist')) {
        throw new ServiceUnavailableException(
          'Daily field check table may not exist. Run migrations: npm run db:migrate-and-verify',
        );
      }
      throw err;
    }
  }

  @Post(':id/daily-field-check/submit')
  async submitDailyFieldCheck(
    @Param('id', ParseIntPipe) gardenId: number,
    @Body() body: { date?: string; answers?: Record<string, unknown> },
    @CurrentUser() user: { id: number },
    @Tenant() tenant: TenantContext,
  ) {
    if (!user?.id) {
      throw new UnauthorizedException('User not authenticated');
    }
    const dateStr = body?.date || new Date().toISOString().slice(0, 10);
    try {
      const draft = await this.dailyFieldCheckService.upsertDraft(
        tenant.tenantId,
        gardenId,
        dateStr,
        user.id,
        body?.answers || {},
      );
      return this.dailyFieldCheckService.submit(tenant.tenantId, draft.id);
    } catch (err: any) {
      if (err?.status === 400 || err?.status === 401 || err?.status === 404) throw err;
      console.error('[POST daily-field-check/submit] Error:', err?.message);
      console.error('[POST daily-field-check/submit] Stack:', err?.stack);
      throw err;
    }
  }

  @Delete(':id/daily-field-check')
  async deleteDailyFieldCheck(
    @Param('id', ParseIntPipe) gardenId: number,
    @Query('date') date: string,
    @CurrentUser() user: { id: number; role?: string },
    @Tenant() tenant: TenantContext,
  ) {
    const dateStr = date || new Date().toISOString().slice(0, 10);
    try {
      return await this.dailyFieldCheckService.deleteByDate(
        tenant.tenantId,
        gardenId,
        dateStr,
        user?.id,
        user?.role,
      );
    } catch (err: any) {
      if (err?.status === 400 || err?.status === 404) throw err;
      console.error('[DELETE daily-field-check] Error:', err?.message);
      console.error('[DELETE daily-field-check] Stack:', err?.stack);
      throw err;
    }
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
