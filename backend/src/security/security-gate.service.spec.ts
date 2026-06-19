import { BadRequestException } from '@nestjs/common';
import { BookingStatus, ParkingEventStatus, SlotStatus } from '@prisma/client';
import { AccessPolicyService } from '../common/access-policy.service';
import { org1, org2 } from '../test/test-tenant-fixtures';
import { normalUser, securityUser, securityUserOrg2 } from '../test/test-users';
import { SecurityGateService } from './security-gate.service';

function expectSingleResult(
  result: Awaited<ReturnType<SecurityGateService['search']>>,
) {
  expect(result?.resultType).toBe('SINGLE');

  if (!result || result.resultType !== 'SINGLE') {
    throw new Error('Expected a single gate result');
  }

  return result;
}

describe('SecurityGateService', () => {
  let service: SecurityGateService;
  let prisma: {
    parkingEvent: { findFirst: jest.Mock; findMany: jest.Mock; count: jest.Mock };
    booking: { findFirst: jest.Mock; findMany: jest.Mock };
    user: { findMany: jest.Mock };
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
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      booking: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      user: {
        findMany: jest.fn(),
      },
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

    const result = expectSingleResult(
      await service.search(org1.booking.bookingCode, securityUser),
    );

    expect(result.action).toBe('CHECK_IN');
    expect(result.booking.bookingCode).toBe(org1.booking.bookingCode);
    expect(result.parkingEvent).toBeNull();
    expect(result.vehicleActivity.todayVisits).toBe(0);
    expect(prisma.parkingEvent.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: org1.organizationId,
          vehicleId: org1.vehicle.id,
        }),
      }),
    );
  });

  it('returns check-out action for an active parking event', async () => {
    prisma.booking.findFirst.mockResolvedValue(confirmedBooking);
    prisma.parkingEvent.findFirst.mockResolvedValue(activeEvent);

    const result = expectSingleResult(
      await service.search(org1.booking.bookingCode, securityUser),
    );

    expect(result.action).toBe('CHECK_OUT');
    expect(result.parkingEvent?.id).toBe(activeEvent.id);
  });

  it('returns check-out for a vehicle with a current active session', async () => {
    prisma.parkingEvent.findFirst
      .mockResolvedValueOnce(activeEvent)
      .mockResolvedValueOnce(null);
    prisma.booking.findFirst.mockResolvedValue(confirmedBooking);

    const result = expectSingleResult(
      await service.search(org1.vehicle.vehicleNumber, securityUser),
    );

    expect(result.action).toBe('CHECK_OUT');
    expect(result.parkingEvent?.id).toBe(activeEvent.id);
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
          status: BookingStatus.CONFIRMED,
          slot: {
            ...confirmedBooking.slot,
            status: SlotStatus.AVAILABLE,
          },
        },
      });

    const result = expectSingleResult(
      await service.search(org1.vehicle.vehicleNumber, securityUser),
    );

    expect(result.action).toBe('CHECK_IN');
    expect(result.lastCheckOutTime).toBe(lastCheckOutTime.toISOString());
    expect(result.parkingEvent).toBeNull();
  });

  it('does not return CHECK_OUT after checkout is completed', async () => {
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
            status: SlotStatus.RESERVED,
          },
        },
      })
      .mockResolvedValueOnce({
        checkOutTime: lastCheckOutTime,
        booking: {
          ...confirmedBooking,
          status: BookingStatus.COMPLETED,
        },
      });
    prisma.booking.findFirst.mockResolvedValue(null);

    const result = expectSingleResult(
      await service.search(org1.vehicle.vehicleNumber, securityUser),
    );

    expect(result.action).not.toBe('CHECK_OUT');
    expect(result.action).toBe('NONE');
  });

  it('returns NONE for completed bookings in phone search matches', async () => {
    const completedBooking = {
      ...confirmedBooking,
      id: 501,
      bookingCode: 'BK-DEMO-099',
      status: BookingStatus.COMPLETED,
    };

    prisma.user.findMany.mockResolvedValue([{ id: normalUser.id }]);
    prisma.booking.findMany.mockResolvedValue([completedBooking]);
    prisma.parkingEvent.findFirst.mockResolvedValue(null);
    prisma.parkingEvent.count.mockResolvedValue(1);

    const result = expectSingleResult(await service.search('0000000000', securityUser));

    expect(result.action).toBe('NONE');
    expect(result.booking.status).toBe(BookingStatus.COMPLETED);
    expect(result.actionDisabledReason).toBe('This booking is completed.');
  });

  it('returns multiple matches for phone search when several bookings exist', async () => {
    const secondBooking = {
      ...confirmedBooking,
      id: 401,
      bookingCode: 'BK-DEMO-010',
      vehicle: {
        id: 101,
        vehicleNumber: 'TS09GB5678',
      },
      vehicleId: 101,
    };

    prisma.user.findMany.mockResolvedValue([{ id: normalUser.id }]);
    prisma.booking.findMany.mockResolvedValue([confirmedBooking, secondBooking]);

    const result = await service.search('0000000000', securityUser);

    expect(result?.resultType).toBe('MULTIPLE_MATCHES');

    if (result?.resultType === 'MULTIPLE_MATCHES') {
      expect(result.matches).toHaveLength(2);
      expect(result.matches[0].customerPhone).toBe(normalUser.phone);
      expect(result.matches[0].gateAction).toBe('CHECK_IN');
    }
  });

  it('scopes phone search to the current user organization', async () => {
    prisma.user.findMany.mockResolvedValue([]);

    await service.search('+910000000011', securityUser);

    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        organizationId: org1.organizationId,
      }),
      select: { id: true },
    });
    expect(prisma.user.findMany).not.toHaveBeenCalledWith({
      where: expect.objectContaining({
        organizationId: org2.organizationId,
      }),
      select: { id: true },
    });
  });

  it('scopes vehicle activity counts to the current organization', async () => {
    prisma.booking.findFirst.mockResolvedValue(confirmedBooking);

    await service.search(org1.booking.bookingCode, securityUser);

    expect(prisma.parkingEvent.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: org1.organizationId,
          vehicleId: org1.vehicle.id,
        }),
      }),
    );
    expect(prisma.parkingEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: org1.organizationId,
          vehicleId: org1.vehicle.id,
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