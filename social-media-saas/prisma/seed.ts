import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL || 'admin@gopuexports.com';
  const password = process.env.ADMIN_PASSWORD || 'change-this-admin-password';
  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.upsert({
    where: { email },
    update: { passwordHash, role: 'admin' },
    create: { email, passwordHash, role: 'admin' }
  });

  await prisma.campaign.upsert({
    where: { id: 'seed-daily-export-authority' },
    update: {
      name: 'Daily Export Authority Content',
      productFocus: process.env.DEFAULT_PRODUCT_FOCUS || 'Indian spices export authority',
      isActive: true
    },
    create: {
      id: 'seed-daily-export-authority',
      name: 'Daily Export Authority Content',
      productFocus: process.env.DEFAULT_PRODUCT_FOCUS || 'Indian spices export authority',
      isActive: true
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
