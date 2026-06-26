import {
  ParkingLotType,
  ParkingLotVisibility,
  SlotStatus,
  SlotType,
} from '@prisma/client';
import { PublicParkingFinderService } from './public-parking-finder.service';

describe('PublicParkingFinderService', () => {
  let service: PublicParkingFinderService;
  let prisma: { parkingLot: { findMany: jest.Mock } };

  const publicLot = {
    id: 1,
    name: 'City Mall Parking',
    type: ParkingLotType.MALL,
    address: 'Main Road',
    city: 'Hyderabad',
    state: 'Telangana',
    pincode: '500001',
    latitude: null,
    longitude: null,
    baseHourlyRate: null,
    currency: 'INR',
    openingHours: '24x7',
    organization: { name: 'Sunrise Properties' },
    floors: [
      {
        slots: [
          { status: SlotStatus.AVAILABLE, slotType: SlotType.CAR },
          { status: SlotStatus.OCCUPIED, slotType: SlotType.CAR },
          { status: SlotStatus.AVAILABLE, slotType: SlotType.BIKE },
        ],
      },
    ],
  };

  beforeEach(() => {
    prisma = {
      parkingLot: {
        findMany: jest.fn(),
      },
    };
    service = new PublicParkingFinderService(prisma as never);
  });

  it('queries only active public lots from active organizations', async () => {
    prisma.parkingLot.findMany.mockResolvedValue([]);

    await service.findPublicLots({});

    expect(prisma.parkingLot.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          isActive: true,
          visibility: ParkingLotVisibility.PUBLIC,
          organization: { isActive: true },
        },
      }),
    );
  });

  it('returns public lots with live availability counts', async () => {
    prisma.parkingLot.findMany.mockResolvedValue([publicLot]);

    const results = await service.findPublicLots({});

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      id: 1,
      organizationName: 'Sunrise Properties',
      totalSlots: 3,
      availableSlots: 2,
      availabilityType: 'LIVE',
      bookable: true,
    });
    expect(results[0]).not.toHaveProperty('organizationId');
  });

  it('filters by city and vehicle type', async () => {
    prisma.parkingLot.findMany.mockResolvedValue([]);

    await service.findPublicLots({ city: 'Hyderabad', vehicleType: 'CAR' });

    expect(prisma.parkingLot.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          city: { contains: 'Hyderabad', mode: 'insensitive' },
        }),
        include: expect.objectContaining({
          floors: expect.objectContaining({
            include: expect.objectContaining({
              slots: expect.objectContaining({
                where: { slotType: SlotType.CAR },
              }),
            }),
          }),
        }),
      }),
    );
  });

  it('caps limit at 50', async () => {
    prisma.parkingLot.findMany.mockResolvedValue([]);

    await service.findPublicLots({ limit: 100 });

    expect(prisma.parkingLot.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 150,
      }),
    );
  });

  it('sorts by distance when lat and lng are provided', async () => {
    prisma.parkingLot.findMany.mockResolvedValue([
      {
        ...publicLot,
        id: 2,
        latitude: 17.385,
        longitude: 78.4867,
      },
      {
        ...publicLot,
        id: 3,
        latitude: 12.9716,
        longitude: 77.5946,
      },
    ]);

    const results = await service.findPublicLots({
      lat: 17.385,
      lng: 78.4867,
      limit: 10,
    });

    expect(results[0]?.id).toBe(2);
    expect(results[0]?.distanceKm).toBe(0);
  });
});