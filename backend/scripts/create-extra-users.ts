/**
 * Sadece yeni kullanıcıları ekler. Mevcut kullanıcılar (admin, root, consultant, auditor)
 * ve diğer kayıtlı kullanıcılar kesinlikle değiştirilmez.
 *
 * Çalıştırma:
 *   cd backend
 *   npx ts-node scripts/create-extra-users.ts
 */

import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const SALT_ROUNDS = 10;

interface NewUser {
  username: string;
  plainPassword: string;
  role: Role;
  email: string;
  displayName: string;
}

/** Sadece eklenecek 12 kullanıcı. Mevcut admin/root/consultant/auditor bu listede yok. */
const NEW_USERS: NewUser[] = [
  // 10 ADMIN (yonetici)
  { username: 'dost1', plainPassword: '113819', role: Role.ADMIN, email: 'dost1@daldiz.local', displayName: 'Dost 1' },
  { username: 'dost2', plainPassword: '121035', role: Role.ADMIN, email: 'dost2@daldiz.local', displayName: 'Dost 2' },
  { username: 'dost3', plainPassword: '251056', role: Role.ADMIN, email: 'dost3@daldiz.local', displayName: 'Dost 3' },
  { username: 'dost4', plainPassword: '298704', role: Role.ADMIN, email: 'dost4@daldiz.local', displayName: 'Dost 4' },
  { username: 'dost5', plainPassword: '503893', role: Role.ADMIN, email: 'dost5@daldiz.local', displayName: 'Dost 5' },
  { username: 'dost6', plainPassword: '584671', role: Role.ADMIN, email: 'dost6@daldiz.local', displayName: 'Dost 6' },
  { username: 'dost7', plainPassword: '677744', role: Role.ADMIN, email: 'dost7@daldiz.local', displayName: 'Dost 7' },
  { username: 'dost8', plainPassword: '686213', role: Role.ADMIN, email: 'dost8@daldiz.local', displayName: 'Dost 8' },
  { username: 'dost9', plainPassword: '700858', role: Role.ADMIN, email: 'dost9@daldiz.local', displayName: 'Dost 9' },
  { username: 'dost10', plainPassword: '737152', role: Role.ADMIN, email: 'dost10@daldiz.local', displayName: 'Dost 10' },
  // 1 CONSULTANT (danisman)
  { username: 'danisman', plainPassword: '758295', role: Role.CONSULTANT, email: 'danisman@daldiz.local', displayName: 'Danışman' },
  // 1 LEAD_AUDITOR (denetci)
  { username: 'denetci', plainPassword: '815057', role: Role.LEAD_AUDITOR, email: 'denetci@daldiz.local', displayName: 'Denetçi' },
];

async function ensureUser(u: NewUser): Promise<'created' | 'skipped'> {
  const existing = await prisma.user.findUnique({
    where: { username: u.username },
  });

  if (existing) {
    console.log(`  skip (already exists): ${u.username} [${u.role}]`);
    return 'skipped';
  }

  const passwordHash = await bcrypt.hash(u.plainPassword, SALT_ROUNDS);
  await prisma.user.create({
    data: {
      username: u.username,
      passwordHash,
      displayName: u.displayName,
      role: u.role,
      email: u.email,
      isActive: true,
    },
  });
  console.log(`  created: ${u.username} [${u.role}] ${u.email}`);
  return 'created';
}

async function main() {
  console.log('🔐 create-extra-users: only adds dost1..dost10, danisman, denetci.');
  console.log('   Existing users (admin, root, consultant, auditor, etc.) are never modified.\n');

  let created = 0;
  let skipped = 0;

  for (const u of NEW_USERS) {
    const result = await ensureUser(u);
    if (result === 'created') created++;
    else skipped++;
  }

  console.log(`\n✅ Done. Created: ${created}, Skipped: ${skipped}.`);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
