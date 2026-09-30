const { PrismaClient } = require('@prisma/client');
const { hash } = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding production database...');

  // Check if demo user already exists
  const existingDemo = await prisma.user.findUnique({
    where: { email: 'demo@battx.com' },
  });

  if (existingDemo) {
    console.log('✅ Demo user already exists:', existingDemo.email);
    console.log('   User ID:', existingDemo.id);
    console.log('   Role:', existingDemo.role);
    return;
  }

  // Hash the demo password using the same algorithm as signup (bcryptjs with 12 rounds)
  const hashedPassword = await hash('BATTxDemo!2026#47', 12);

  // Create demo user as a real database user
  const demoUser = await prisma.user.create({
    data: {
      email: 'demo@battx.com',
      name: 'Demo User',
      password: hashedPassword,
      role: 'CONSUMER',
      preferredLanguage: 'en',
    },
  });

  console.log('✅ Demo user created successfully');
  console.log('   Email:', demoUser.email);
  console.log('   User ID:', demoUser.id);
  console.log('   Role:', demoUser.role);
  console.log('   Created at:', demoUser.createdAt);
  console.log('');
  console.log('✅ This user can now:');
  console.log('   - Sign in at production website');
  console.log('   - Pair real ESP32 devices');
  console.log('   - Receive real telemetry data');
  console.log('   - Access all authenticated routes');
}

main()
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
