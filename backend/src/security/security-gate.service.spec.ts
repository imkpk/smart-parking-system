import { BadRequestException } from '@nestjs/common';
import { BookingStatus, ParkingEventStatus, SlotStatus } from '@prisma/client';
import { AccessPolicyService } from '../common/access-policy.service';
import { org1, org2 } from '../test/test-tenant-fixtures';
import { securityUser, securityUserOrg2 } from '../test/test-users';
import { SecurityGateService } from './security-gate.service';

describe('SecurityGateService', () => {
  let service: SecurityGateService;
  let prisma: {
    parkingEvent: { findFirst: jest.Mock; count: jest.Mock };
    booking: { findFirst: jest.Mock };
  };

  const confirmedBooking = {
    ...org1.booking,
    status: BookingStatus.CONFIRMED,
    user: {
      id: org1.normalUser.id,
      name: org1.normalUser.name,
      email: org1.normalUser.email,
      phone: org1.normalUser.phone,
    },
    vehicle: {
      id: org1.vehicle.id,
      vehicleNumber: org1.vehicle.vehicleNumber,
    },
    parkingLot: {
      id: org1.parkingLot.id,
      name: org1.parkingLot.name,
    },
    slot: {
      id: org1.slot.id,
      slotNumber: org1.slot.slotNumber,
      status: SlotStatus.RESERVED,
      floor: {
        id: org1.floor.id,
        name: org1.floor.name,
      },
    },
    startTime: new Date('2026-06-19T08:00:00.000Z'),
    endTime: null,
    createdAt: new Date('2026-06-19T08:00:00.000Z'),
    updatedAt: new Date('2026-06-19T08:00:00.000Z'),
  };

  const activeEvent = {
    id: 301,
    organizationId: org1.organizationId,
    bookingId: org1.booking.id,
    userId: org1.normalUser.id,
    vehicleId: org1.vehicle.id,
    slotId: org1.slot.id,
    parkingLotId: org1.parkingLot.id,
    checkInTime: new Date('2026-06-19T09:00:00.000Z'),
    checkOutTime: null,
    status: ParkingEventStatus.ACTIVE,
    durationMinutes: null,
    feeAmount: null,
    createdAt: new Date('2026-06-19T09:00:00.000Z'),
    updatedAt: new Date('2026-06-19T09:00:00.000Z'),
    booking: {
      id: org1.booking.id,
      bookingCode: org1.booking.bookingCode,
    },
    vehicle: {
      id: org1.vehicle.id,
      vehicleNumber: org1.vehicle.vehicleNumber,
    },
    slot: {
      id: org1.slot.id,
      slotNumber: org1.slot.slotNumber,
      floor: {
        id: org1.floor.id,
        name: org1.floor.name,
      },
    },
    parkingLot: {
      id: org1.parkingLot.id,
      name: org1.parkingLot.name,
    },
    user: {
      id: org1.normalUser.id,
      name: org1.normalUser.name,
      email: org1.normalUser.email,
      phone: org1.normalUser.phone,
    },
  };

  beforeEach(() => {
    prisma = {
      parkingEvent: {
        findFirst: jest.fn().mockResolvedValue(null),
        count: jest.fn().mockResolvedValue(0),
      },
      booking: { findFirst: jest.fn() },
    };

    service = new SecurityGateService(
      prisma as never,
      new AccessPolicyService(),
    );
  });

  it('requires a non-empty search query', async () => {
    await expect(service.search('   ', securityUser)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('returns check-in action for a confirmed booking without a parking event', async () => {
    prisma.booking.findFirst.mockResolvedValue(confirmedBooking);

    const result = await service.search(org1.booking.bookingCode, securityUser);

    expect(result?.action).toBe('CHECK_IN');
    expect(result?.booking.bookingCode).toBe(org1.booking.bookingCode);
    expect(result?.parkingEvent).toBeNull();
    expect(prisma.booking.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: org1.organizationId,
          OR: expect.arrayContaining([{ bookingCode: org1.booking.bookingCode }]),
        }),
      }),
    );
    expect(prisma.parkingEvent.count).toHaveBeenCalled();
  });

  it('returns check-out action for an active parking event', async () => {
    prisma.booking.findFirst.mockResolvedValue(confirmedBooking);
    prisma.parkingEvent.findFirst.mockResolvedValue(activeEvent);

    const result = await service.search(org1.booking.bookingCode, securityUser);

    expect(result?.action).toBe('CHECK_OUT');
    expect(result?.parkingEvent?.id).toBe(activeEvent.id);
    expect(prisma.parkingEvent.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          bookingId: org1.booking.id,
          status: ParkingEventStatus.ACTIVE,
          checkOutTime: null,
        }),
      }),
    );
  });

  it('returns check-out for a vehicle with a current active session', async () => {
    prisma.booking.findFirst.mockResolvedValue(null);
    prisma.parkingEvent.findFirst
      .mockResolvedValueOnce(activeEvent)
      .mockResolvedValueOnce(null);

    const result = await service.search(org1.vehicle.vehicleNumber, securityUser);

    expect(result?.action).toBe('CHECK_OUT');
    expect(result?.parkingEvent?.id).toBe(activeEvent.id);
    expect(prisma.parkingEvent.findFirst).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({
          status: ParkingEventStatus.ACTIVE,
          checkOutTime: null,
          vehicle: { vehicleNumber: org1.vehicle.vehicleNumber },
        }),
      }),
    );
  });

  it('returns check-in after checkout when the assigned slot is available again', async () => {
    const staleActiveEvent = {
      ...activeEvent,
      id: 302,
      checkInTime: new Date('2026-06-19T08:00:00.000Z'),
    };
    const lastCheckOutTime = new Date('2026-06-19T10:00:00.000Z');

    prisma.parkingEvent.findFirst
      .mockResolvedValueOnce(staleActiveEvent)
      .mockResolvedValueOnce({ checkOutTime: lastCheckOutTime })
      .mockResolvedValueOnce({
        checkOutTime: lastCheckOutTime,
        booking: {
          ...confirmedBooking,
          status: BookingStatus.COMPLETED,
          slot: {
            ...confirmedBooking.slot,
            status: SlotStatus.AVAILABLE,
          },
        },
      });

    const result = await service.search(org1.vehicle.vehicleNumber, securityUser);

    expect(result?.action).toBe('CHECK_IN');
    expect(result?.lastCheckOutTime).toBe(lastCheckOutTime.toISOString());
    expect(result?.parkingEvent).toBeNull();
  });

  it('returns check-in for a new confirmed booking after an older session completed', async () => {
    const nextBooking = {
      ...confirmedBooking,
      id: 401,
      bookingCode: 'BK-DEMO-010',
    };

    prisma.booking.findFirst.mockResolvedValueOnce(nextBooking);
    prisma.parkingEvent.findFirst
      .mockResolvedValueOnce({
        ...activeEvent,
        checkInTime: new Date('2026-06-19T08:00:00.000Z'),
      })
      .mockResolvedValueOnce({
        id: 301,
        checkOutTime: new Date('2026-06-19T09:30:00.000Z'),
      })
      .mockResolvedValueOnce(null);

    const result = await service.search(org1.vehicle.vehicleNumber, securityUser);

    expect(result?.action).toBe('CHECK_IN');
    expect(result?.booking.bookingCode).toBe('BK-DEMO-010');
  });

  it('returns check-in for a completed booking when the slot is available again', async () => {
    const lastCheckOutTime = new Date('2026-06-19T10:00:00.000Z');

    prisma.booking.findFirst.mockResolvedValueOnce({
      ...confirmedBooking,
      status: BookingStatus.COMPLETED,
      slot: {
        ...confirmedBooking.slot,
        status: SlotStatus.AVAILABLE,
      },
    });
    prisma.parkingEvent.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        checkOutTime: lastCheckOutTime,
      })
      .mockResolvedValueOnce(null);

    const result = await service.search(org1.booking.bookingCode, securityUser);

    expect(result?.action).toBe('CHECK_IN');
    expect(result?.lastCheckOutTime).toBe(lastCheckOutTime.toISOString());
  });

  it('scopes search to the current user organization', async () => {
    prisma.booking.findFirst.mockResolvedValue(null);

    await service.search(org2.booking.bookingCode, securityUser);

    expect(prisma.booking.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: org1.organizationId,
        }),
      }),
    );
    expect(prisma.booking.findFirst).not.toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: org2.organizationId,
        }),
      }),
    );
  });

  it('returns null when another tenant booking is not visible', async () => {
    prisma.booking.findFirst.mockResolvedValue(null);

    const result = await service.search(
      org2.booking.bookingCode,
      securityUserOrg2,
    );

    expect(result).toBeNull();
  });
});