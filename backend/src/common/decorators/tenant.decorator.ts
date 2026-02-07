import { createParamDecorator, ExecutionContext, InternalServerErrorException } from '@nestjs/common';
import { TenantContext } from '../../middleware/tenant-context.middleware';

export const Tenant = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): TenantContext => {
    const request = ctx.switchToHttp().getRequest();
    const tenant = request.tenant;
    if (!tenant?.tenantId) {
      throw new InternalServerErrorException(
        'Tenant context not set. Ensure x-tenant header is sent (e.g. x-tenant: kral) and tenant exists in DB (run: npx prisma db seed).',
      );
    }
    return tenant;
  },
);
