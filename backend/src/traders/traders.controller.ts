import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { TradersService } from './traders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { Tenant } from '../common/decorators/tenant.decorator';
import { TenantContext } from '../middleware/tenant-context.middleware';

@Controller('traders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CONSULTANT, Role.LEAD_AUDITOR, Role.SUPER_ADMIN)
export class TradersController {
  constructor(private readonly tradersService: TradersService) {}

  @Get()
  async search(
    @Query('query') query: string | undefined,
    @Tenant() tenant: TenantContext,
  ) {
    try {
      const tenantId = tenant?.tenantId ?? '';
      const items = await this.tradersService.search(tenantId, query);
      return { items };
    } catch (err) {
      console.error('Traders search error:', err);
      return { items: [] };
    }
  }
}
