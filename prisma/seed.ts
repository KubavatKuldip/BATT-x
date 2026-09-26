import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding demo user...');

  // Step 1: Clean up any users with demo email but incorrect ID
  const conflictingEmailUsers = await prisma.user.findMany({
    where: {
      email: 'demo@battx.com',
      NOT: { id: 'demo-user' },
    },
  });

  for (const user of conflictingEmailUsers) {
    console.log(`Deleting conflicting user by email (id: ${user.id}, email: ${user.email}).`);
    await prisma.user.delete({ where: { id: user.id } });
  }

  // Step 2: Clean up any users with demo ID but incorrect email
  const conflictingIdUsers = await prisma.user.findMany({
    where: {
      id: 'demo-user',
      NOT: { email: 'demo@battx.com' },
    },
  });

  for (const user of conflictingIdUsers) {
    console.log(`Deleting conflicting user by ID (id: ${user.id}, email: ${user.email}).`);
    await prisma.user.delete({ where: { id: user.id } });
  }

  // Step 3: Upsert the actual demo user with the correct ID and email
  await prisma.user.upsert({
    where: { id: 'demo-user' },
    update: {
      email: 'demo@battx.com',
      name: 'Demo User',
      role: 'CONSUMER',
    },
    create: {
      id: 'demo-user',
      email: 'demo@battx.com',
      name: 'Demo User',
      role: 'CONSUMER',
    },
  });

  console.log('Ensured demo user (id: "demo-user", email: "demo@battx.com") exists and is consistent.');

  console.log('Demo user seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
