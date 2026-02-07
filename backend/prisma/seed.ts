import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const TENANT_KEY = 'kral';

async function main() {
  console.log('🌱 Starting database seed...');

  // 1. Create tenant "kral"
  console.log('🏢 Seeding tenant...');
  const tenant = await prisma.tenant.upsert({
    where: { key: TENANT_KEY },
    update: {},
    create: {
      key: TENANT_KEY,
      name: 'Kral',
      status: 'active',
    },
  });
  const tenantId = tenant.id;
  console.log(`✅ Tenant seeded: ${tenant.key} (${tenantId})`);

  // 2. Seed Campuses for kral
  console.log('📦 Seeding campuses...');
  const campusData = [
    { id: 'belek', name: 'Belek Kampüsü', weight: 0.6 },
    { id: 'candir', name: 'Çandır Kampüsü', weight: 0.2 },
    { id: 'manavgat', name: 'Manavgat Kampüsü', weight: 0.2 },
  ];
  for (const c of campusData) {
    await prisma.campus.upsert({
      where: { tenantId_id: { tenantId, id: c.id } },
      update: {},
      create: {
        tenantId,
        id: c.id,
        name: c.name,
        weight: c.weight,
      },
    });
  }
  console.log('✅ Campuses seeded');

  // 3. Seed Gardens for kral
  console.log('🌳 Seeding gardens...');
  const gardensData = [
    ...Array.from({ length: 12 }, (_, i) => ({ name: `Belek-${i + 1}`, campusId: 'belek' })),
    ...Array.from({ length: 3 }, (_, i) => ({ name: `Çandır-${i + 1}`, campusId: 'candir' })),
    ...Array.from({ length: 5 }, (_, i) => ({ name: `Manavgat-${i + 1}`, campusId: 'manavgat' })),
  ];
  for (const g of gardensData) {
    const existing = await prisma.garden.findFirst({
      where: { tenantId, name: g.name, campusTenantId: tenantId, campusId: g.campusId },
    });
    if (!existing) {
      await prisma.garden.create({
        data: {
          tenantId,
          name: g.name,
          campusTenantId: tenantId,
          campusId: g.campusId,
          status: 'ACTIVE',
        },
      });
      console.log(`  ✓ Created garden: ${g.name} (${g.campusId})`);
    }
  }
  console.log('✅ Gardens seeded');

  // 4. Seed Users - admin (admin/admin123) for kral
  const passwordHash = await bcrypt.hash('123123', 10);
  const adminPasswordHash = await bcrypt.hash('admin123', 10);

  console.log('👤 Seeding users...');
  const existingAdmin = await prisma.user.findUnique({
    where: { tenantId_username: { tenantId, username: 'admin' } },
  });
  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        tenantId,
        username: 'admin',
        passwordHash: adminPasswordHash,
        displayName: 'Yönetici',
        role: Role.ADMIN,
        email: 'admin@dosttarim.com',
        isActive: true,
      },
    });
    console.log('Default admin created → admin / admin123');
  } else {
    console.log('Admin user already exists, skipping');
  }

  await prisma.user.upsert({
    where: { tenantId_username: { tenantId, username: 'consultant' } },
    update: {},
    create: {
      tenantId,
      username: 'consultant',
      passwordHash,
      displayName: 'Ziraat Danışmanı',
      role: Role.CONSULTANT,
      email: 'consultant@dosttarim.com',
      isActive: true,
    },
  });

  await prisma.user.upsert({
    where: { tenantId_username: { tenantId, username: 'auditor' } },
    update: {},
    create: {
      tenantId,
      username: 'auditor',
      passwordHash,
      displayName: 'Baş Denetçi',
      role: Role.LEAD_AUDITOR,
      email: 'auditor@dosttarim.com',
      isActive: true,
    },
  });

  await prisma.user.upsert({
    where: { tenantId_username: { tenantId, username: 'root' } },
    update: {},
    create: {
      tenantId,
      username: 'root',
      passwordHash,
      displayName: 'Sistem Yöneticisi',
      role: Role.SUPER_ADMIN,
      email: 'root@dosttarim.com',
      isActive: true,
    },
  });

  console.log('✅ Users seeded');
  console.log('📝 Default password for all users except admin: 123123');

  console.log('✨ Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
