import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { SlotStatus, SlotType, VehicleType } from '@prisma/client';
import { SlotLifecycleService } from './slot-lifecycle.service';

describe('SlotLifecycleService', () => {
  let service: SlotLifecycleService;
  let prisma: {
    slot: {
      findUnique: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
  };

  const slot = {
    id: 20,
    slotType: SlotType.CAR,
    status: SlotStatus.AVAILABLE,
    floor: {
      parkingLotId: 30,
      parkingLot: { id: 30, isActive: true },
    },
  };

  beforeEach(() => {
    prisma = {
      slot: {
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    };
    service = new SlotLifecycleService(prisma as never);
  });

  it('validates an available slot and returns it', async () => {
    prisma.slot.findUnique.mockResolvedValue(slot);

    await expect(
      service.validateSlotAvailable(slot.id, VehicleType.CAR),
    ).resolves.toBe(slot);
  });

  it('rejects unavailable slots during validation', async () => {
    prisma.slot.findUnique.mockResolvedValue({
      ...slot,
      status: SlotStatus.RESERVED,
    });

    await expect(
      service.validateSlotAvailable(slot.id, VehicleType.CAR),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects missing slots during validation', async () => {
    prisma.slot.findUnique.mockResolvedValue(null);

    await expect(
      service.validateSlotAvailable(404, VehicleType.CAR),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects inactive parking lot slots during validation', async () => {
    prisma.slot.findUnique.mockResolvedValue({
      ...slot,
      floor: {
        ...slot.floor,
        parkingLot: { id: 30, isActive: false },
      },
    });

    await expect(
      service.validateSlotAvailable(slot.id, VehicleType.CAR),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects vehicle and slot type mismatch during validation', async () => {
    prisma.slot.findUnique.mockResolvedValue(slot);

    await expect(
      service.validateSlotAvailable(slot.id, VehicleType.BIKE),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('reserves an available slot', async () => {
    prisma.slot.updateMany.mockResolvedValue({ count: 1 });

    await service.reserveSlot(slot.id);

    expect(prisma.slot.updateMany).toHaveBeenCalledWith({
      where: { id: slot.id, status: SlotStatus.AVAILABLE },
      data: { status: SlotStatus.RESERVED },
    });
  });

  it('rejects stale reservation attempts', async () => {
    prisma.slot.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.reserveSlot(slot.id)).rejects.toBeInstanceOf(ConflictException);
  });

  it('validates a reserved slot', async () => {
    prisma.slot.findUnique.mockResolvedValue({
      id: slot.id,
      status: SlotStatus.RESERVED,
    });

    await expect(service.validateSlotReserved(slot.id)).resolves.toEqual({
      id: slot.id,
      status: SlotStatus.RESERVED,
    });
  });

  it('rejects missing slots during reserved validation', async () => {
    prisma.slot.findUnique.mockResolvedValue(null);

    await expect(service.validateSlotReserved(404)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects non-reserved slots during reserved validation', async () => {
    prisma.slot.findUnique.mockResolvedValue({
      id: slot.id,
      status: SlotStatus.AVAILABLE,
    });

    await expect(service.validateSlotReserved(slot.id)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('occupies a reserved slot', async () => {
    prisma.slot.updateMany.mockResolvedValue({ count: 1 });

    await service.occupySlot(slot.id);

    expect(prisma.slot.updateMany).toHaveBeenCalledWith({
      where: { id: slot.id, status: SlotStatus.RESERVED },
      data: { status: SlotStatus.OCCUPIED },
    });
  });

  it('rejects stale occupy attempts', async () => {
    prisma.slot.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.occupySlot(slot.id)).rejects.toBeInstanceOf(ConflictException);
  });

  it('validates an occupied slot', async () => {
    prisma.slot.findUnique.mockResolvedValue({
      id: slot.id,
      status: SlotStatus.OCCUPIED,
    });

    await expect(service.validateSlotOccupied(slot.id)).resolves.toEqual({
      id: slot.id,
      status: SlotStatus.OCCUPIED,
    });
  });

  it('rejects missing slots during occupied validation', async () => {
    prisma.slot.findUnique.mockResolvedValue(null);

    await expect(service.validateSlotOccupied(404)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects non-occupied slots during occupied validation', async () => {
    prisma.slot.findUnique.mockResolvedValue({
      id: slot.id,
      status: SlotStatus.RESERVED,
    });

    await expect(service.validateSlotOccupied(slot.id)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('releases a slot back to available', async () => {
    prisma.slot.update.mockResolvedValue({ id: slot.id, status: SlotStatus.AVAILABLE });

    await service.releaseSlot(slot.id);

    expect(prisma.slot.update).toHaveBeenCalledWith({
      where: { id: slot.id },
      data: { status: SlotStatus.AVAILABLE },
    });
  });
});