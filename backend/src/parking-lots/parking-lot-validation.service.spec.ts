import { NotFoundException } from '@nestjs/common';
import { DEFAULT_ORGANIZATION_ID } from '../organizations/organizations.constants';
import { ParkingLotValidationService } from './parking-lot-validation.service';

describe('ParkingLotValidationService', () => {
  let service: ParkingLotValidationService;
  let prisma: {
    parkingLot: { findFirst: jest.Mock };
    floor: { findFirst: jest.Mock };
    slot: { findFirst: jest.Mock };
  };

  const organizationId = DEFAULT_ORGANIZATION_ID;
  const parkingLot = { id: 1, name: 'Lot A', isActive: true, organizationId };
  const floor = { id: 10, parkingLotId: 1, name: 'Level 1', level: 1 };
  const slot = {
    id: 20,
    floorId: 10,
    slotNumber: 'A-01',
    floor: {
      parkingLotId: 1,
      parkingLot,
    },
  };

  beforeEach(() => {
    prisma = {
      parkingLot: { findFirst: jest.fn() },
      floor: { findFirst: jest.fn() },
      slot: { findFirst: jest.fn() },
    };
    service = new ParkingLotValidationService(prisma as never);
  });

  it('returns an active parking lot', async () => {
    prisma.parkingLot.findFirst.mockResolvedValue(parkingLot);

    await expect(
      service.getActiveParkingLotOrThrow(parkingLot.id, organizationId),
    ).resolves.toBe(parkingLot);
    expect(prisma.parkingLot.findFirst).toHaveBeenCalledWith({
      where: { id: parkingLot.id, isActive: true, organizationId },
    });
  });

  it('throws when parking lot is missing or inactive', async () => {
    prisma.parkingLot.findFirst.mockResolvedValue(null);

    await expect(service.getActiveParkingLotOrThrow(404, organizationId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('returns a floor in an active parking lot', async () => {
    prisma.floor.findFirst.mockResolvedValue(floor);

    await expect(service.getActiveFloorOrThrow(floor.id, organizationId)).resolves.toBe(floor);
    expect(prisma.floor.findFirst).toHaveBeenCalledWith({
      where: {
        id: floor.id,
        parkingLot: { isActive: true, organizationId },
      },
    });
  });

  it('throws when floor is missing or belongs to an inactive parking lot', async () => {
    prisma.floor.findFirst.mockResolvedValue(null);

    await expect(service.getActiveFloorOrThrow(404, organizationId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('returns a slot in an active parking lot', async () => {
    prisma.slot.findFirst.mockResolvedValue(slot);

    await expect(service.getActiveSlotOrThrow(slot.id, organizationId)).resolves.toBe(slot);
    expect(prisma.slot.findFirst).toHaveBeenCalledWith({
      where: {
        id: slot.id,
        floor: { parkingLot: { isActive: true, organizationId } },
      },
      include: {
        floor: {
          include: {
            parkingLot: true,
          },
        },
      },
    });
  });

  it('throws when slot is missing or belongs to an inactive parking lot', async () => {
    prisma.slot.findFirst.mockResolvedValue(null);

    await expect(service.getActiveSlotOrThrow(404, organizationId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});