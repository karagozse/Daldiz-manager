/**
 * Idempotent SQL migration runner.
 * Runs on startup: reads backend/db/migrations/*.sql in order,
 * applies any not yet in schema_migrations.
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { PrismaClient } from '@prisma/client';

const MIGRATIONS_DIR = join(process.cwd(), 'db', 'migrations');

function getMigrationFiles(): string[] {
  try {
    const files = readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();
    return files;
  } catch {
    return [];
  }
}

function loadSql(name: string): string {
  const path = join(MIGRATIONS_DIR, name);
  return readFileSync(path, 'utf-8');
}

/**
 * Split SQL into single statements, respecting DO $$ ... $$ blocks (semicolons inside are not split).
 */
function splitStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = '';
  let inDollarQuote = false;
  for (let i = 0; i < sql.length; i++) {
    const c = sql[i];
    current += c;
    if (c === '$' && sql[i + 1] === '$') {
      inDollarQuote = !inDollarQuote;
      current += sql[++i];
    } else if (c === ';' && !inDollarQuote) {
      const stmt = current.trim();
      if (stmt && !stmt.startsWith('--')) statements.push(stmt);
      current = '';
    }
  }
  if (current.trim() && !current.trim().startsWith('--')) statements.push(current.trim());
  return statements.filter((s) => s.length > 0);
}

export async function runMigrations(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      applied_at TIMESTAMP NOT NULL DEFAULT now()
    )
  `);

  const files = getMigrationFiles();
  if (files.length === 0) return;

  for (const name of files) {
    const migrationName = name.replace(/\.sql$/, '');
    const applied = await prisma.$queryRawUnsafe<{ id: number }[]>(
      `SELECT id FROM schema_migrations WHERE name = $1 LIMIT 1`,
      migrationName,
    ).catch(() => null);

    if (applied && applied.length > 0) continue;

    const sql = loadSql(name);
    const statements = splitStatements(sql);

    for (const statement of statements) {
      if (!statement.trim()) continue;
      try {
        await prisma.$executeRawUnsafe(statement);
      } catch (e: any) {
        if (e.message?.includes('already exists') || e.code === '42P07' || e.code === '42710') {
          continue;
        }
        throw e;
      }
    }

    await prisma.$executeRawUnsafe(
      `INSERT INTO schema_migrations (name, applied_at) VALUES ($1, now()) ON CONFLICT (name) DO NOTHING`,
      migrationName,
    ).catch(() => {});
  }
}
