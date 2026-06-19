import { OrganizationPlan, PrismaClient } from '@prisma/client';
import { syncPostgresSequences } from './sync-postgres-sequences';

const prisma = new PrismaClient();

async function main() {
  await prisma.organization.upsert({
    where: { slug: 'default' },
    update: {
      name: 'Default Organization',
      isActive: true,
    },
    create: {
      id: 1,
      name: 'Default Organization',
      slug: 'default',
      plan: OrganizationPlan.STARTER,
      maxParkingLots: 5,
      maxUsers: 50,
      isActive: true,
    },
  });

  await syncPostgresSequences(prisma);
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