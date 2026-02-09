import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TradersService {
  constructor(private readonly prisma: PrismaService) {}

  /** List all traders for tenant (e.g. for filter dropdown). Max 200, ordered by name. */
  async listAll(tenantId: string): Promise<{ id: string; name: string }[]> {
    return this.prisma.trader.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
      take: 200,
      select: { id: true, name: true },
    });
  }

  /** Search by name (ILIKE), return top 10 ordered by name. Safe for empty query. */
  async search(tenantId: string, query: string | undefined): Promise<{ id: string; name: string }[]> {
    const q = typeof query === 'string' ? query.trim() : '';
    if (q.length === 0) {
      return [];
    }
    const list = await this.prisma.trader.findMany({
      where: {
        tenantId,
        name: { contains: q, mode: 'insensitive' },
      },
      orderBy: { name: 'asc' },
      take: 10,
      select: { id: true, name: true },
    });
    return list;
  }

  /** Find or create trader by name (for harvest save). */
  async findOrCreateByName(tenantId: string, name: string): Promise<{ id: string; name: string }> {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new Error('Trader name is required');
    }
    let trader = await this.prisma.trader.findUnique({
      where: { tenantId_name: { tenantId, name: trimmed } },
    });
    if (!trader) {
    trader = await this.prisma.trader.create({
      data: { tenantId, name: trimmed },
    });
    }
    return { id: trader.id, name: trader.name };
  }
}
