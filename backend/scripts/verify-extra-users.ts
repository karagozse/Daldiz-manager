/**
 * Verifies create-extra-users results. Run: npx ts-node scripts/verify-extra-users.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const NEW_USERNAMES = ['dost1', 'dost2', 'dost3', 'dost4', 'dost5', 'dost6', 'dost7', 'dost8', 'dost9', 'dost10', 'danisman', 'denetci'];
const EXISTING_USERNAMES = ['admin', 'root', 'consultant', 'auditor'];

async function main() {
  console.log('--- New users (dost1..dost10, danisman, denetci) ---');
  const newUsers = await prisma.user.findMany({
    where: { username: { in: NEW_USERNAMES } },
    select: { username: true, role: true, email: true },
    orderBy: { username: 'asc' },
  });
  console.table(newUsers);

  console.log('--- Existing users (must be unchanged) ---');
  const existing = await prisma.user.findMany({
    where: { username: { in: EXISTING_USERNAMES } },
    select: { username: true, role: true, email: true },
    orderBy: { username: 'asc' },
  });
  console.table(existing);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
