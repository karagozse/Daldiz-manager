/**
 * Idempotent SQL migration runner.
 * Runs on startup: reads backend/db/migrations/*.sql in order,
 * applies any not yet in schema_migrations.
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { PrismaClient } from '@prisma/client';

// Resolve migrations dir: use path relative to this file (works when run from any cwd)
// Compiled output: dist/db/migrate.js -> migrations at backend/db/migrations
const MIGRATIONS_DIR = (() => {
  const dirBased = join(__dirname, '..', '..', 'db', 'migrations');
  if (existsSync(dirBased)) return dirBased;
  return join(process.cwd(), 'db', 'migrations');
})();

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
      // Skip only if empty or entirely comment lines (keep statements that start with -- but have SQL)
      const withoutLeadingComments = stmt.replace(/^(\s*--[^\n]*\n)+/, '').trim();
      if (withoutLeadingComments) statements.push(stmt);
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

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (!statement.trim()) continue;
      try {
        await prisma.$executeRawUnsafe(statement);
      } catch (e: any) {
        if (e.message?.includes('already exists') || e.code === '42P07' || e.code === '42710') {
          continue;
        }
        console.error(`[migrate] ${name} statement ${i + 1} failed:`, e.message);
        console.error('[migrate] Statement:', statement.slice(0, 200) + (statement.length > 200 ? '...' : ''));
        throw e;
      }
    }

    await prisma.$executeRawUnsafe(
      `INSERT INTO schema_migrations (name, applied_at) VALUES ($1, now()) ON CONFLICT (name) DO NOTHING`,
      migrationName,
    ).catch(() => {});
  }
}
