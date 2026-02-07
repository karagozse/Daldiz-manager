import {
  Injectable,
  NestMiddleware,
  NotFoundException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

export interface TenantContext {
  tenantId: string;
  tenantKey: string;
}

declare global {
  namespace Express {
    interface Request {
      tenant?: TenantContext;
    }
  }
}

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    // 1) req header "x-tenant"
    // 2) query param "?tenant="
    // 3) env DEFAULT_TENANT_KEY (default "kral")
    let tenantKey =
      (req.headers['x-tenant'] as string) ||
      (req.query['tenant'] as string) ||
      this.config.get<string>('DEFAULT_TENANT_KEY') ||
      'kral';

    tenantKey = tenantKey.trim().toLowerCase();

    const tenant = await this.prisma.tenant.findUnique({
      where: { key: tenantKey },
    });

    if (!tenant || tenant.status !== 'active') {
      throw new NotFoundException('Unknown tenant');
    }

    req.tenant = {
      tenantId: tenant.id,
      tenantKey: tenant.key,
    };

    next();
  }

  private extractSubdomain(host: string): string | null {
    if (!host) return null;
    const parts = host.split('.');
    if (parts.length >= 2) {
      const sub = parts[0];
      if (sub && sub !== 'www' && sub !== 'api') return sub;
    }
    return null;
  }
}
