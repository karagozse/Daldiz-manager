import { Controller, Get, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class AppController {
  constructor(private prisma: PrismaService) {}

  @Get('health')
  health() {
    return { status: 'ok' };
  }

  /**
   * Dev-only: Runtime DB verification - which DB is backend connected to?
   * GET /debug/db - returns current_database, server addr, version, daily_field_checks table status.
   */
  @Get('debug/db')
  async debugDb() {
    if (process.env.NODE_ENV === 'production') {
      throw new NotFoundException();
    }
    const db = this.prisma;
    const [dbInfo, serverInfo, version, tableCheck, migrations, count] = await Promise.all([
      db.$queryRawUnsafe<{ db: string; user: string }[]>(
        `SELECT current_database() as db, current_user as "user"`,
      ),
      db.$queryRawUnsafe<
        { server_addr: string | null; server_port: number | null }[]
      >(`SELECT inet_server_addr()::text as server_addr, inet_server_port() as server_port`),
      db.$queryRawUnsafe<{ version: string }[]>(`SELECT version()`),
      db.$queryRawUnsafe<{ to_regclass: string | null }[]>(
        `SELECT to_regclass('public.daily_field_checks')::text as to_regclass`,
      ),
      db.$queryRawUnsafe<{ id: number; name: string; applied_at: Date }[]>(
        `SELECT id, name, applied_at FROM schema_migrations ORDER BY id`,
      ).catch(() => []),
      db.$queryRawUnsafe<{ count: bigint }[]>(
        `SELECT count(*) FROM daily_field_checks`,
      ).catch(() => [{ count: BigInt(-1) }]),
    ]);
    return {
      nodeEnv: process.env.NODE_ENV,
      db: dbInfo[0],
      server: serverInfo[0],
      version: version[0]?.version,
      daily_field_checks_table: tableCheck[0]?.to_regclass ?? null,
      schema_migrations: migrations,
      daily_field_checks_count:
        count[0]?.count !== undefined ? Number(count[0].count) : -1,
    };
  }
}
