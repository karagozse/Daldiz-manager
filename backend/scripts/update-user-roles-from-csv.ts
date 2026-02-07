/**
 * Opsiyonel örnek script: users.csv dosyasına göre Neon DB'deki kullanıcı rollerini günceller.
 * Zorunlu değildir; sadece örnek amaçlıdır. Çalıştırmak için:
 *
 *   cd backend
 *   npx ts-node -r tsconfig-paths/register scripts/update-user-roles-from-csv.ts [users.csv yolu]
 *
 * CSV formatı: email,username,displayName,role,campusId
 * role: SUPER_ADMIN | ADMIN | CONSULTANT | LEAD_AUDITOR
 */

import { PrismaClient, Role } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

const VALID_ROLES: Role[] = [Role.SUPER_ADMIN, Role.ADMIN, Role.CONSULTANT, Role.LEAD_AUDITOR];

function parseCsv(filePath: string): Array<{ email: string; username: string; displayName: string; role: string }> {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const lines = raw.split(/\r?\n/).filter((l) => l.trim());
  const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const rows: Array<{ email: string; username: string; displayName: string; role: string }> = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map((v) => v.trim());
    const row: Record<string, string> = {};
    header.forEach((h, j) => {
      row[h] = values[j] ?? '';
    });
    if (row.email || row.username) {
      rows.push({
        email: row.email ?? '',
        username: row.username ?? '',
        displayName: row.displayname ?? row.display_name ?? '',
        role: (row.role ?? '').toUpperCase(),
      });
    }
  }

  return rows;
}

async function main() {
  const csvPath = process.argv[2] ?? path.join(__dirname, 'users.csv');
  if (!fs.existsSync(csvPath)) {
    console.error(`Dosya bulunamadı: ${csvPath}`);
    console.error('Kullanım: npx ts-node scripts/update-user-roles-from-csv.ts [users.csv]');
    process.exit(1);
  }

  const rows = parseCsv(csvPath);
  console.log(`📂 ${rows.length} satır okundu.`);

  for (const row of rows) {
    if (!VALID_ROLES.includes(row.role as Role)) {
      console.warn(`⏭ Geçersiz rol "${row.role}" atlandı: ${row.email || row.username}`);
      continue;
    }

    const where = row.email
      ? { email: row.email }
      : { username: row.username };

    const existing = await prisma.user.findFirst({ where });
    if (!existing) {
      console.warn(`⏭ Kullanıcı bulunamadı: ${row.email || row.username}`);
      continue;
    }

    if (existing.role === row.role) {
      console.log(`⊙ Rol aynı, güncelleme yok: ${existing.username} (${row.role})`);
      continue;
    }

    await prisma.user.update({
      where: { id: existing.id },
      data: {
        role: row.role as Role,
        ...(row.displayName && { displayName: row.displayName }),
      },
    });
    console.log(`✓ Güncellendi: ${existing.username} -> ${row.role}`);
  }

  console.log('✨ İşlem tamamlandı.');
}

main()
  .catch((e) => {
    console.error('❌ Hata:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
