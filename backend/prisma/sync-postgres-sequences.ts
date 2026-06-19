import { PrismaClient } from '@prisma/client';

const SERIAL_TABLES = [
  'organizations',
  'users',
  'parking_lots',
  'floors',
  'parking_slots',
  'vehicles',
  'bookings',
  'slot_assignments',
  'parking_events',
  'conversations',
  'conversation_messages',
] as const;

export async function syncPostgresSequences(prisma: PrismaClient) {
  const databaseUrl = process.env.DATABASE_URL ?? '';

  if (!databaseUrl.startsWith('postgresql')) {
    return;
  }

  for (const table of SERIAL_TABLES) {
    await prisma.$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), COALESCE((SELECT MAX(id) FROM "${table}"), 1), true)`,
    );
  }
}