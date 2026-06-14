import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  BookingStatus,
  ParkingLotType,
  Role,
  SlotStatus,
  SlotType,
  VehicleType,
} from '@prisma/client';
import { HealthResponseDto } from './app.dto';
import { AuthResponseDto, UserResponseDto } from './auth/dto/auth-response.dto';
import { LoginDto } from './auth/dto/login.dto';
import { RegisterDto } from './auth/dto/register.dto';
import { CreateBookingDto } from './bookings/dto/create-booking.dto';
import { CreateFloorDto } from './floors/dto/create-floor.dto';
import { UpdateFloorDto } from './floors/dto/update-floor.dto';
import { CheckInDto } from './parking-events/dto/check-in.dto';
import { CheckOutDto } from './parking-events/dto/check-out.dto';
import { CreateParkingLotDto } from './parking-lots/dto/create-parking-lot.dto';
import { UpdateParkingLotDto } from './parking-lots/dto/update-parking-lot.dto';
import { AvailableSlotsQueryDto } from './slots/dto/available-slots-query.dto';
import { CreateBulkSlotsDto } from './slots/dto/create-bulk-slots.dto';
import { CreateSlotDto } from './slots/dto/create-slot.dto';
import { UpdateSlotStatusDto } from './slots/dto/update-slot-status.dto';
import { CreateVehicleDto } from './vehicles/dto/create-vehicle.dto';
import { UpdateVehicleDto } from './vehicles/dto/update-vehicle.dto';

async function expectValid<T extends object>(Dto: new () => T, payload: Partial<T>) {
  const instance = plainToInstance(Dto, payload);
  const errors = await validate(instance);
  expect(errors).toHaveLength(0);
  return instance;
}

async function expectInvalid<T extends object>(Dto: new () => T, payload: Partial<T>) {
  const instance = plainToInstance(Dto, payload);
  const errors = await validate(instance);
  expect(errors.length).toBeGreaterThan(0);
}

describe('DTO validation', () => {
  it('validates auth DTOs', async () => {
    await expectValid(LoginDto, { email: 'user@example.com', password: 'password123' });
    await expectInvalid(LoginDto, { email: 'bad-email', password: '123' });
    await expectValid(RegisterDto, {
      name: 'User',
      email: 'user@example.com',
      phone: '+919999999999',
      password: 'password123',
      role: Role.USER,
    });
    await expectInvalid(RegisterDto, {
      name: 'User',
      email: 'bad-email',
      password: '123',
      role: 'OWNER' as Role,
    });
  });

  it('validates parking lot and floor DTOs', async () => {
    await expectValid(CreateParkingLotDto, {
      name: 'Lot',
      type: ParkingLotType.APARTMENT,
      address: 'Road',
      city: 'Hyderabad',
      state: 'Telangana',
      pincode: '500001',
      isActive: true,
    });
    await expectInvalid(CreateParkingLotDto, { name: 'Lot', type: 'HOUSE' as ParkingLotType });
    await expectValid(UpdateParkingLotDto, { city: 'Hyderabad' });

    await expectValid(CreateFloorDto, { name: 'Basement 1', level: -1 });
    await expectInvalid(CreateFloorDto, { name: 123 as unknown as string, level: 'one' as unknown as number });
    await expectValid(UpdateFloorDto, { level: 0 });
  });

  it('validates slot DTOs', async () => {
    await expectValid(AvailableSlotsQueryDto, { vehicleType: VehicleType.CAR });
    await expectInvalid(AvailableSlotsQueryDto, { vehicleType: 'TRUCK' as VehicleType });

    await expectValid(CreateSlotDto, {
      slotNumber: 'A-01',
      slotType: SlotType.CAR,
      status: SlotStatus.AVAILABLE,
    });
    await expectInvalid(CreateSlotDto, {
      slotNumber: 123 as unknown as string,
      slotType: 'TRUCK' as SlotType,
    });

    await expectValid(CreateBulkSlotsDto, {
      slots: [{ slotNumber: 'A-01', slotType: SlotType.CAR, status: SlotStatus.AVAILABLE }],
    });
    await expectInvalid(CreateBulkSlotsDto, { slots: [] });

    await expectValid(UpdateSlotStatusDto, { status: SlotStatus.MAINTENANCE });
    await expectInvalid(UpdateSlotStatusDto, { status: 'BROKEN' as SlotStatus });
  });

  it('validates vehicle, booking, and parking event DTOs', async () => {
    await expectValid(CreateVehicleDto, {
      vehicleNumber: 'TS09EA1234',
      vehicleType: VehicleType.CAR,
      brand: 'Hyundai',
      model: 'Creta',
      color: 'White',
    });
    await expectInvalid(CreateVehicleDto, {
      vehicleNumber: 123 as unknown as string,
      vehicleType: 'TRUCK' as VehicleType,
    });
    await expectValid(UpdateVehicleDto, { color: 'Black' });

    const booking = await expectValid(CreateBookingDto, {
      vehicleId: '1' as unknown as number,
      slotId: '2' as unknown as number,
      startTime: '2026-06-14T10:00:00.000Z',
      endTime: '2026-06-14T18:00:00.000Z',
    });
    expect(booking.vehicleId).toBe(1);
    await expectInvalid(CreateBookingDto, {
      vehicleId: 'abc' as unknown as number,
      slotId: 2,
      startTime: 'not-a-date',
    });

    const checkIn = await expectValid(CheckInDto, {
      bookingId: '1' as unknown as number,
      bookingCode: 'BK-1',
    });
    expect(checkIn.bookingId).toBe(1);
    await expectInvalid(CheckInDto, { bookingId: 'abc' as unknown as number });

    const checkOut = await expectValid(CheckOutDto, { parkingEventId: '1' as unknown as number });
    expect(checkOut.parkingEventId).toBe(1);
    await expectInvalid(CheckOutDto, { parkingEventId: 'abc' as unknown as number });
  });

  it('constructs response DTOs', () => {
    const health = new HealthResponseDto();
    health.status = 'ok';
    health.service = 'smart-parking-backend';

    const user = new UserResponseDto();
    user.id = 1;
    user.name = 'User';
    user.email = 'user@example.com';
    user.phone = null;
    user.role = Role.USER;
    user.isActive = true;
    user.createdAt = new Date('2026-01-01T00:00:00.000Z');
    user.updatedAt = new Date('2026-01-01T00:00:00.000Z');

    const auth = new AuthResponseDto();
    auth.user = user;
    auth.accessToken = 'token';

    expect(health.service).toBe('smart-parking-backend');
    expect(auth.user.email).toBe('user@example.com');
    expect(BookingStatus.CONFIRMED).toBe('CONFIRMED');
  });
});
