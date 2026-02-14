import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Delete,
  ParseIntPipe,
} from '@nestjs/common';
import { DailyFieldCheckService } from './daily-field-check.service';
import { UpdateDailyFieldCheckDto } from './dto/update-daily-field-check.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Tenant } from '../common/decorators/tenant.decorator';
import { TenantContext } from '../middleware/tenant-context.middleware';

@Controller('daily-field-check')
@UseGuards(JwtAuthGuard)
export class DailyFieldCheckController {
  constructor(private readonly dailyFieldCheckService: DailyFieldCheckService) {}

  @Get()
  list(
    @Query('gardenId') gardenIdStr: string | undefined,
    @Query('limit') limitStr: string | undefined,
    @Tenant() tenant: TenantContext,
  ) {
    const gardenId = gardenIdStr ? parseInt(gardenIdStr, 10) : undefined;
    const limit = limitStr ? parseInt(limitStr, 10) : 20;
    return this.dailyFieldCheckService.list(tenant.tenantId, gardenId, Math.min(limit || 20, 100));
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.CONSULTANT, Role.LEAD_AUDITOR, Role.ADMIN, Role.SUPER_ADMIN)
  findOne(@Param('id') id: string, @Tenant() tenant: TenantContext) {
    return this.dailyFieldCheckService.findOne(tenant.tenantId, id);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.CONSULTANT, Role.LEAD_AUDITOR, Role.ADMIN, Role.SUPER_ADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDailyFieldCheckDto,
    @Tenant() tenant: TenantContext,
  ) {
    return this.dailyFieldCheckService.update(tenant.tenantId, id, {
      answers: dto.answers,
    });
  }

  @Post(':id/submit')
  @UseGuards(RolesGuard)
  @Roles(Role.CONSULTANT, Role.LEAD_AUDITOR, Role.ADMIN, Role.SUPER_ADMIN)
  submit(@Param('id') id: string, @Tenant() tenant: TenantContext) {
    return this.dailyFieldCheckService.submit(tenant.tenantId, id);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.CONSULTANT, Role.LEAD_AUDITOR, Role.ADMIN, Role.SUPER_ADMIN)
  delete(
    @Param('id') id: string,
    @CurrentUser() user: { id: number; role: string },
    @Tenant() tenant: TenantContext,
  ) {
    return this.dailyFieldCheckService.delete(
      tenant.tenantId,
      id,
      user.id,
      user.role,
    );
  }
}
