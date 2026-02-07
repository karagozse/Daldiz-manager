import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Seed Campuses
  console.log('📦 Seeding campuses...');
  await prisma.campus.upsert({
    where: { id: 'belek' },
    update: {},
    create: {
      id: 'belek',
      name: 'Belek Kampüsü',
      weight: 0.60,
    },
  });

  await prisma.campus.upsert({
    where: { id: 'candir' },
    update: {},
    create: {
      id: 'candir',
      name: 'Çandır Kampüsü',
      weight: 0.20,
    },
  });

  await prisma.campus.upsert({
    where: { id: 'manavgat' },
    update: {},
    create: {
      id: 'manavgat',
      name: 'Manavgat Kampüsü',
      weight: 0.20,
    },
  });

  console.log('✅ Campuses seeded');

  // Seed Gardens
  console.log('🌳 Seeding gardens...');
  
  // Frontend mockData.ts'teki INITIAL_GARDENS verilerine göre bahçe listesi
  // Belek: 12 gardens, Çandır: 3 gardens, Manavgat: 5 gardens
  const gardensData = [
    // Belek - 12 gardens
    { name: 'Belek-1', campusId: 'belek' },
    { name: 'Belek-2', campusId: 'belek' },
    { name: 'Belek-3', campusId: 'belek' },
    { name: 'Belek-4', campusId: 'belek' },
    { name: 'Belek-5', campusId: 'belek' },
    { name: 'Belek-6', campusId: 'belek' },
    { name: 'Belek-7', campusId: 'belek' },
    { name: 'Belek-8', campusId: 'belek' },
    { name: 'Belek-9', campusId: 'belek' },
    { name: 'Belek-10', campusId: 'belek' },
    { name: 'Belek-11', campusId: 'belek' },
    { name: 'Belek-12', campusId: 'belek' },
    // Çandır - 3 gardens
    { name: 'Çandır-1', campusId: 'candir' },
    { name: 'Çandır-2', campusId: 'candir' },
    { name: 'Çandır-3', campusId: 'candir' },
    // Manavgat - 5 gardens
    { name: 'Manavgat-1', campusId: 'manavgat' },
    { name: 'Manavgat-2', campusId: 'manavgat' },
    { name: 'Manavgat-3', campusId: 'manavgat' },
    { name: 'Manavgat-4', campusId: 'manavgat' },
    { name: 'Manavgat-5', campusId: 'manavgat' },
  ];

  // Her bahçe için upsert işlemi (name + campusId kombinasyonu unique olmalı)
  for (const garden of gardensData) {
    // Önce bu isim ve kampüs kombinasyonunda bahçe var mı kontrol et
    const existingGarden = await prisma.garden.findFirst({
      where: {
        name: garden.name,
        campusId: garden.campusId,
      },
    });

    if (!existingGarden) {
      await prisma.garden.create({
        data: {
          name: garden.name,
          campusId: garden.campusId,
          status: 'ACTIVE', // Default status
        },
      });
      console.log(`  ✓ Created garden: ${garden.name} (${garden.campusId})`);
    } else {
      console.log(`  ⊙ Garden already exists: ${garden.name} (${garden.campusId})`);
    }
  }

  console.log('✅ Gardens seeded');

  // Hash password for all users
  const passwordHash = await bcrypt.hash('123123', 10);

  // Seed Users
  console.log('👤 Seeding users...');
  await prisma.user.upsert({
    where: { username: 'consultant' },
    update: {},
    create: {
      username: 'consultant',
      passwordHash,
      displayName: 'Ziraat Danışmanı',
      role: Role.CONSULTANT,
      email: 'consultant@dosttarim.com',
      isActive: true,
    },
  });

  await prisma.user.upsert({
    where: { username: 'auditor' },
    update: {},
    create: {
      username: 'auditor',
      passwordHash,
      displayName: 'Baş Denetçi',
      role: Role.LEAD_AUDITOR,
      email: 'auditor@dosttarim.com',
      isActive: true,
    },
  });

  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash,
      displayName: 'Yönetici',
      role: Role.ADMIN,
      email: 'admin@dosttarim.com',
      isActive: true,
    },
  });

  await prisma.user.upsert({
    where: { username: 'root' },
    update: {},
    create: {
      username: 'root',
      passwordHash,
      displayName: 'Sistem Yöneticisi',
      role: Role.SUPER_ADMIN,
      email: 'root@dosttarim.com',
      isActive: true,
    },
  });

  console.log('✅ Users seeded');
  console.log('📝 Default password for all users: 123123');

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
