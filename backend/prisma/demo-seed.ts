import {
  BookingStatus,
  OrganizationPlan,
  ParkingEventStatus,
  ParkingLotType,
  PrismaClient,
  Role,
  SlotStatus,
  SlotType,
  VehicleType,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { syncPostgresSequences } from './sync-postgres-sequences';

const prisma = new PrismaClient();

const DEMO_ORG_SLUG = 'default';
const DEMO_MARKER_LOT = 'Hitech City Mall Parking';
const DEMO_PASSWORD = 'password123';
const DEMO_LOGO_URL = `${(process.env.FRONTEND_URL ?? 'http://localhost:5173').replace(/\/$/, '')}/sunrise-logo.svg`;

const LEGACY_DEMO_LOT_NAMES = [
  'City Center Mall',
  'Apollo Hospital Parking',
  'Tech Park Tower',
  'Green Valley Apartments',
  'Central Station Lot',
] as const;

const DEMO_USERS = [
  {
    email: 'demo-admin@smartparking.demo',
    name: 'Pratibha Sharma',
    role: Role.ADMIN,
    phone: '+919876543212',
  },
  {
    email: 'demo-tenant@smartparking.demo',
    name: 'Sunrise Operations',
    role: Role.TENANT_ADMIN,
    phone: '+919876543213',
  },
  {
    email: 'demo-security@smartparking.demo',
    name: 'Ravi Kumar',
    role: Role.SECURITY,
    phone: '+919876543211',
  },
  {
    email: 'demo-user@smartparking.demo',
    name: 'Asha Patel',
    role: Role.USER,
    phone: '+919876543210',
  },
] as const;

const DEMO_LOTS = [
  { name: 'Hitech City Mall Parking', type: ParkingLotType.MALL, city: 'Hyderabad', slots: 40 },
  { name: 'Gachibowli Tech Park', type: ParkingLotType.OFFICE, city: 'Hyderabad', slots: 30 },
  { name: 'Jubilee Hills Plaza', type: ParkingLotType.MALL, city: 'Hyderabad', slots: 25 },
  { name: 'Airport Premium Parking', type: ParkingLotType.PUBLIC, city: 'Hyderabad', slots: 20 },
  { name: 'Metro Station Parking', type: ParkingLotType.PUBLIC, city: 'Hyderabad', slots: 15 },
] as const;

const VEHICLE_PLATES = [
  'TS09EA1234',
  'TS09GB5678',
  'KA01MH9012',
  'MH12PK3456',
  'DL8CAB7890',
  'TN07CD4321',
  'TS09EF6789',
  'KA05GH2345',
] as const;

function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

function minutesAgo(minutes: number): Date {
  return new Date(Date.now() - minutes * 60 * 1000);
}

function distributeSlotStatuses(total: number): SlotStatus[] {
  const maintenance = Math.max(1, Math.floor(total * 0.05));
  const occupied = Math.max(2, Math.floor(total * 0.4));
  const reserved = Math.max(1, Math.floor(total * 0.1));
  const available = Math.max(0, total - maintenance - occupied - reserved);

  return [
    ...Array.from({ length: available }, () => SlotStatus.AVAILABLE),
    ...Array.from({ length: reserved }, () => SlotStatus.RESERVED),
    ...Array.from({ length: occupied }, () => SlotStatus.OCCUPIED),
    ...Array.from({ length: maintenance }, () => SlotStatus.MAINTENANCE),
  ];
}

async function upsertDemoOrganization() {
  return prisma.organization.upsert({
    where: { slug: DEMO_ORG_SLUG },
    update: {
      name: 'Sunrise Properties',
      logoUrl: DEMO_LOGO_URL,
      loginTitle: 'Sunrise Smart Parking',
      primaryColor: '#1565C0',
      secondaryColor: '#0D47A1',
      accentColor: '#42A5F5',
      supportEmail: 'support@sunrise-properties.demo',
      plan: OrganizationPlan.PRO,
      isActive: true,
    },
    create: {
      id: 1,
      name: 'Sunrise Properties',
      slug: DEMO_ORG_SLUG,
      logoUrl: DEMO_LOGO_URL,
      loginTitle: 'Sunrise Smart Parking',
      primaryColor: '#1565C0',
      secondaryColor: '#0D47A1',
      accentColor: '#42A5F5',
      supportEmail: 'support@sunrise-properties.demo',
      plan: OrganizationPlan.PRO,
      maxParkingLots: 10,
      maxUsers: 100,
      isActive: true,
    },
  });
}

async function upsertDemoUsers(organizationId: number, passwordHash: string) {
  const users: Array<{ id: number; email: string; role: Role; name: string }> = [];

  for (const demoUser of DEMO_USERS) {
    const user = await prisma.user.upsert({
      where: {
        organizationId_email: {
          organizationId,
          email: demoUser.email,
        },
      },
      update: {
        name: demoUser.name,
        role: demoUser.role,
        phone: demoUser.phone,
        isActive: true,
      },
      create: {
        organizationId,
        name: demoUser.name,
        email: demoUser.email,
        phone: demoUser.phone,
        passwordHash,
        role: demoUser.role,
        isActive: true,
      },
      select: { id: true, email: true, role: true, name: true },
    });
    users.push(user);
  }

  return users;
}

async function refreshDemoActivityTimestamps(organizationId: number) {
  const events = await prisma.parkingEvent.findMany({
    where: { organizationId },
    orderBy: { id: 'desc' },
    take: 24,
    select: { id: true, status: true },
  });

  if (events.length === 0) {
    return;
  }

  const activeCount = events.filter((event) => event.status === ParkingEventStatus.ACTIVE).length;
  const completedEvents = events.filter((event) => event.status === ParkingEventStatus.COMPLETED);

  for (let index = 0; index < events.length; index += 1) {
    const event = events[index];
    if (event.status === ParkingEventStatus.ACTIVE) {
      await prisma.parkingEvent.update({
        where: { id: event.id },
        data: { checkInTime: minutesAgo(20 + index * 7) },
      });
      continue;
    }

    const completedIndex = completedEvents.findIndex((entry) => entry.id === event.id);
    const checkInTime = hoursAgo(2 + completedIndex * 0.4);
    const checkOutTime = new Date(checkInTime.getTime() + (45 + completedIndex * 5) * 60 * 1000);

    await prisma.parkingEvent.update({
      where: { id: event.id },
      data: {
        checkInTime,
        checkOutTime,
        durationMinutes: 45 + completedIndex * 5,
        feeAmount: 80 + completedIndex * 25,
      },
    });
  }

  await prisma.booking.updateMany({
    where: { organizationId },
    data: { startTime: hoursAgo(1) },
  });

  console.log(
    `Refreshed demo activity timestamps (${activeCount} active, ${completedEvents.length} completed).`,
  );
}

async function seedDemoParkingStructure(organizationId: number, demoUserId: number) {
  let slotOffset = 0;

  for (const lotConfig of DEMO_LOTS) {
    let lot = await prisma.parkingLot.findFirst({
      where: { organizationId, name: lotConfig.name },
    });

    if (!lot) {
      lot = await prisma.parkingLot.create({
        data: {
          organizationId,
          name: lotConfig.name,
          type: lotConfig.type,
          city: lotConfig.city,
          isActive: true,
        },
      });
    }

    let floor = await prisma.floor.findFirst({
      where: { parkingLotId: lot.id, name: 'Ground Floor' },
    });

    if (!floor) {
      floor = await prisma.floor.create({
        data: {
          parkingLotId: lot.id,
          name: 'Ground Floor',
          level: 0,
        },
      });
    }

    const existingSlots = await prisma.slot.count({ where: { floorId: floor.id } });
    if (existingSlots >= lotConfig.slots) {
      slotOffset += existingSlots;
      continue;
    }

    const statuses = distributeSlotStatuses(lotConfig.slots);
    const slotsToCreate = statuses.map((status, index) => ({
      floorId: floor.id,
      slotNumber: `${lot.name.slice(0, 1).toUpperCase()}-${String(index + 1).padStart(2, '0')}`,
      slotType: index % 7 === 0 ? SlotType.EV : SlotType.CAR,
      status,
    }));

    await prisma.slot.createMany({ data: slotsToCreate });
    slotOffset += lotConfig.slots;
  }

  const demoUser = await prisma.user.findFirst({
    where: { organizationId, email: DEMO_USERS[2].email },
  });

  if (!demoUser) {
    throw new Error('Demo user account missing after upsert.');
  }

  const vehicles: Array<{ id: number; vehicleNumber: string }> = [];
  for (let index = 0; index < VEHICLE_PLATES.length; index += 1) {
    const plate = VEHICLE_PLATES[index];
    const vehicle = await prisma.vehicle.upsert({
      where: {
        organizationId_vehicleNumber: {
          organizationId,
          vehicleNumber: plate,
        },
      },
      update: {},
      create: {
        organizationId,
        userId: index % 2 === 0 ? demoUser.id : demoUserId,
        vehicleNumber: plate,
        vehicleType: index % 5 === 0 ? VehicleType.EV : VehicleType.CAR,
        brand: index % 2 === 0 ? 'Hyundai' : 'Maruti',
        model: index % 2 === 0 ? 'Creta' : 'Swift',
        color: index % 3 === 0 ? 'White' : 'Silver',
      },
    });
    vehicles.push(vehicle);
  }

  const allSlots = await prisma.slot.findMany({
    where: {
      floor: {
        parkingLot: { organizationId, isActive: true },
      },
    },
    include: {
      floor: {
        select: { parkingLotId: true },
      },
    },
    orderBy: { id: 'asc' },
  });

  const reservedSlots = allSlots.filter((slot) => slot.status === SlotStatus.RESERVED);
  const occupiedSlots = allSlots.filter((slot) => slot.status === SlotStatus.OCCUPIED);

  let bookingSequence = 1;

  for (const slot of reservedSlots.slice(0, 6)) {
    const vehicle = vehicles[bookingSequence % vehicles.length];
    const bookingCode = `BK-DEMO-${String(bookingSequence).padStart(3, '0')}`;

    await prisma.booking.upsert({
      where: { bookingCode },
      update: {
        startTime: hoursAgo(0.5),
        status: BookingStatus.CONFIRMED,
      },
      create: {
        organizationId,
        userId: demoUser.id,
        vehicleId: vehicle.id,
        slotId: slot.id,
        parkingLotId: slot.floor.parkingLotId,
        status: BookingStatus.CONFIRMED,
        startTime: hoursAgo(0.5),
        bookingCode,
      },
    });
    bookingSequence += 1;
  }

  for (const [index, slot] of occupiedSlots.entries()) {
    const vehicle = vehicles[index % vehicles.length];
    const bookingCode = `BK-DEMO-${String(bookingSequence).padStart(3, '0')}`;
    const checkInTime = minutesAgo(25 + index * 8);

    const booking = await prisma.booking.upsert({
      where: { bookingCode },
      update: {
        startTime: checkInTime,
        status: BookingStatus.CONFIRMED,
      },
      create: {
        organizationId,
        userId: demoUser.id,
        vehicleId: vehicle.id,
        slotId: slot.id,
        parkingLotId: slot.floor.parkingLotId,
        status: BookingStatus.CONFIRMED,
        startTime: checkInTime,
        bookingCode,
      },
    });
    bookingSequence += 1;

    const existingEvent = await prisma.parkingEvent.findUnique({
      where: { bookingId: booking.id },
    });

    if (!existingEvent) {
      await prisma.parkingEvent.create({
        data: {
          organizationId,
          bookingId: booking.id,
          userId: demoUser.id,
          vehicleId: vehicle.id,
          slotId: slot.id,
          parkingLotId: slot.floor.parkingLotId,
          checkInTime,
          status: ParkingEventStatus.ACTIVE,
        },
      });
    } else {
      await prisma.parkingEvent.update({
        where: { id: existingEvent.id },
        data: { checkInTime, status: ParkingEventStatus.ACTIVE, checkOutTime: null },
      });
    }
  }

  const completedCandidates = allSlots
    .filter((slot) => slot.status === SlotStatus.AVAILABLE)
    .slice(0, 18);

  for (const [index, slot] of completedCandidates.entries()) {
    const vehicle = vehicles[(index + 3) % vehicles.length];
    const bookingCode = `BK-DEMO-C${String(index + 1).padStart(3, '0')}`;
    const checkInTime = hoursAgo(3 + index * 0.35);
    const durationMinutes = 40 + index * 6;
    const checkOutTime = new Date(checkInTime.getTime() + durationMinutes * 60 * 1000);
    const feeAmount = 60 + index * 20;

    const booking = await prisma.booking.upsert({
      where: { bookingCode },
      update: {
        startTime: checkInTime,
        endTime: checkOutTime,
        status: BookingStatus.COMPLETED,
      },
      create: {
        organizationId,
        userId: demoUser.id,
        vehicleId: vehicle.id,
        slotId: slot.id,
        parkingLotId: slot.floor.parkingLotId,
        status: BookingStatus.COMPLETED,
        startTime: checkInTime,
        endTime: checkOutTime,
        bookingCode,
      },
    });

    await prisma.parkingEvent.upsert({
      where: { bookingId: booking.id },
      update: {
        checkInTime,
        checkOutTime,
        durationMinutes,
        feeAmount,
        status: ParkingEventStatus.COMPLETED,
      },
      create: {
        organizationId,
        bookingId: booking.id,
        userId: demoUser.id,
        vehicleId: vehicle.id,
        slotId: slot.id,
        parkingLotId: slot.floor.parkingLotId,
        checkInTime,
        checkOutTime,
        durationMinutes,
        feeAmount,
        status: ParkingEventStatus.COMPLETED,
      },
    });
  }
}

async function cleanupE2eArtifacts(organizationId: number) {
  const e2eLots = await prisma.parkingLot.findMany({
    where: {
      organizationId,
      OR: [
        { name: { startsWith: 'E2E Lot' } },
        { name: { startsWith: 'E2E Booking Lot' } },
      ],
    },
    select: { id: true, name: true },
  });

  for (const lot of e2eLots) {
    await prisma.parkingLot.delete({ where: { id: lot.id } });
    console.log(`Removed E2E test lot: ${lot.name}`);
  }
}

async function cleanupSupersededDemoLots(organizationId: number, includeCurrentDemoLots: boolean) {
  const names = includeCurrentDemoLots
    ? [...LEGACY_DEMO_LOT_NAMES, ...DEMO_LOTS.map((lot) => lot.name)]
    : [...LEGACY_DEMO_LOT_NAMES];

  const lots = await prisma.parkingLot.findMany({
    where: {
      organizationId,
      name: { in: [...names] },
    },
    select: { id: true, name: true },
  });

  for (const lot of lots) {
    await prisma.parkingLot.delete({ where: { id: lot.id } });
    console.log(`Removed superseded demo lot: ${lot.name}`);
  }
}

function printDemoCredentials() {
  console.log('\n--- Demo login credentials (password for all: password123) ---');
  for (const demoUser of DEMO_USERS) {
    console.log(
      `  ${demoUser.role.padEnd(8)}  ${demoUser.email}  (${demoUser.name})  phone: ${demoUser.phone}`,
    );
  }
  console.log('\nOpen: http://localhost:5173/login');
  console.log('Admin dashboard: http://localhost:5173/admin/dashboard\n');
}

async function main() {
  const forceReseed = process.env.DEMO_RESEED === '1';
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const organization = await upsertDemoOrganization();

  await cleanupE2eArtifacts(organization.id);

  const users = await upsertDemoUsers(organization.id, passwordHash);
  const adminUser = users.find((user) => user.role === Role.ADMIN);

  if (!adminUser) {
    throw new Error('Demo admin user was not created.');
  }

  let markerLot = await prisma.parkingLot.findFirst({
    where: { organizationId: organization.id, name: DEMO_MARKER_LOT },
  });

  if (forceReseed) {
    await cleanupSupersededDemoLots(organization.id, true);
    markerLot = null;
  } else if (!markerLot) {
    await cleanupSupersededDemoLots(organization.id, false);
  }

  if (markerLot && !forceReseed) {
    await refreshDemoActivityTimestamps(organization.id);
    printDemoCredentials();
    return;
  }

  await seedDemoParkingStructure(organization.id, adminUser.id);
  await syncPostgresSequences(prisma);
  printDemoCredentials();
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