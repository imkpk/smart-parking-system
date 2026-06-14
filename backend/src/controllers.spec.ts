import { Role, SlotStatus, SlotType, VehicleType } from '@prisma/client';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthController } from './auth/auth.controller';
import { BookingsController } from './bookings/bookings.controller';
import { AssignmentsController } from './assignments/assignments.controller';
import { DashboardController } from './dashboard/dashboard.controller';
import { FloorsController } from './floors/floors.controller';
import { ParkingEventsController } from './parking-events/parking-events.controller';
import { ParkingLotsController } from './parking-lots/parking-lots.controller';
import { SlotsController } from './slots/slots.controller';
import { normalUser } from './test/test-users';
import { UsersController } from './users/users.controller';
import { VehiclesController } from './vehicles/vehicles.controller';

describe('Controllers', () => {
  it('AppController delegates health checks to AppService', () => {
    const appService = {
      getHealth: jest.fn().mockReturnValue({ status: 'ok', service: 'smart-parking-backend' }),
    } as unknown as AppService;
    const controller = new AppController(appService);

    expect(controller.getHealth()).toEqual({ status: 'ok', service: 'smart-parking-backend' });
    expect(appService.getHealth).toHaveBeenCalled();
  });

  it('AuthController delegates auth requests', async () => {
    const authService = {
      register: jest.fn().mockResolvedValue({ accessToken: 'token' }),
      login: jest.fn().mockResolvedValue({ accessToken: 'token' }),
    };
    const controller = new AuthController(authService as never);
    const registerDto = {
      name: 'Test User',
      email: 'user@example.com',
      password: 'password123',
      role: Role.USER,
    };
    const loginDto = { email: 'user@example.com', password: 'password123' };

    await expect(controller.register(registerDto)).resolves.toEqual({ accessToken: 'token' });
    await expect(controller.login(loginDto)).resolves.toEqual({ accessToken: 'token' });
    expect(controller.getCurrentUser(normalUser)).toBe(normalUser);
  });

  it('UsersController delegates user reads', async () => {
    const usersService = {
      findAll: jest.fn().mockResolvedValue([normalUser]),
      findOne: jest.fn().mockResolvedValue(normalUser),
    };
    const controller = new UsersController(usersService as never);

    await expect(controller.findAll()).resolves.toEqual([normalUser]);
    await expect(controller.findOne(1)).resolves.toBe(normalUser);
    expect(usersService.findOne).toHaveBeenCalledWith(1);
  });

  it('ParkingLotsController delegates CRUD operations', async () => {
    const parkingLotsService = {
      create: jest.fn().mockResolvedValue({ id: 1 }),
      findAll: jest.fn().mockResolvedValue([{ id: 1 }]),
      findOne: jest.fn().mockResolvedValue({ id: 1 }),
      update: jest.fn().mockResolvedValue({ id: 1, name: 'Updated' }),
      remove: jest.fn().mockResolvedValue({ id: 1, isActive: false }),
    };
    const controller = new ParkingLotsController(parkingLotsService as never);
    const dto = { name: 'Lot', type: 'APARTMENT' as never };

    await expect(controller.create(dto)).resolves.toEqual({ id: 1 });
    await expect(controller.findAll()).resolves.toEqual([{ id: 1 }]);
    await expect(controller.findOne(1)).resolves.toEqual({ id: 1 });
    await expect(controller.update(1, { name: 'Updated' })).resolves.toEqual({ id: 1, name: 'Updated' });
    await expect(controller.remove(1)).resolves.toEqual({ id: 1, isActive: false });
  });

  it('FloorsController delegates floor operations', async () => {
    const floorsService = {
      create: jest.fn().mockResolvedValue({ id: 1 }),
      findByParkingLot: jest.fn().mockResolvedValue([{ id: 1 }]),
      update: jest.fn().mockResolvedValue({ id: 1, name: 'Ground' }),
      remove: jest.fn().mockResolvedValue({ id: 1 }),
    };
    const controller = new FloorsController(floorsService as never);

    await expect(controller.findByParkingLot(10)).resolves.toEqual([{ id: 1 }]);
    await expect(controller.create(10, { name: 'Ground', level: 0 })).resolves.toEqual({ id: 1 });
    await expect(controller.update(1, { name: 'Ground' })).resolves.toEqual({ id: 1, name: 'Ground' });
    await expect(controller.remove(1)).resolves.toEqual({ id: 1 });
  });

  it('SlotsController delegates slot operations', async () => {
    const slotsService = {
      create: jest.fn().mockResolvedValue({ id: 1 }),
      createBulk: jest.fn().mockResolvedValue([{ id: 1 }]),
      findAvailableByParkingLot: jest.fn().mockResolvedValue([{ id: 1 }]),
      findByParkingLot: jest.fn().mockResolvedValue([{ id: 1 }]),
      updateStatus: jest.fn().mockResolvedValue({ id: 1, status: SlotStatus.MAINTENANCE }),
      removeBulk: jest.fn().mockResolvedValue({ count: 2 }),
    };
    const controller = new SlotsController(slotsService as never);

    await expect(controller.findByParkingLot(10)).resolves.toEqual([{ id: 1 }]);
    await expect(controller.findAvailableByParkingLot(10, { vehicleType: VehicleType.CAR })).resolves.toEqual([
      { id: 1 },
    ]);
    await expect(
      controller.create(1, { slotNumber: 'A-01', slotType: SlotType.CAR }),
    ).resolves.toEqual({ id: 1 });
    await expect(
      controller.createBulk(1, { slots: [{ slotNumber: 'A-01', slotType: SlotType.CAR }] }),
    ).resolves.toEqual([{ id: 1 }]);
    await expect(controller.updateStatus(1, { status: SlotStatus.MAINTENANCE })).resolves.toEqual({
      id: 1,
      status: SlotStatus.MAINTENANCE,
    });
    await expect(controller.removeBulk({ ids: [1, 2] })).resolves.toEqual({ count: 2 });
  });

  it('VehiclesController delegates vehicle operations', async () => {
    const vehiclesService = {
      create: jest.fn().mockResolvedValue({ id: 1 }),
      findMine: jest.fn().mockResolvedValue([{ id: 1 }]),
      findAll: jest.fn().mockResolvedValue([{ id: 1 }]),
      findOneForAdmin: jest.fn().mockResolvedValue({ id: 1 }),
      update: jest.fn().mockResolvedValue({ id: 1, color: 'White' }),
      remove: jest.fn().mockResolvedValue({ id: 1 }),
    };
    const controller = new VehiclesController(vehiclesService as never);

    await expect(
      controller.register(normalUser, { vehicleNumber: 'TS09EA1234', vehicleType: VehicleType.CAR }),
    ).resolves.toEqual({ id: 1 });
    await expect(controller.findMine(normalUser)).resolves.toEqual([{ id: 1 }]);
    await expect(controller.findAll()).resolves.toEqual([{ id: 1 }]);
    await expect(controller.findOne(1)).resolves.toEqual({ id: 1 });
    await expect(controller.update(1, normalUser, { color: 'White' })).resolves.toEqual({ id: 1, color: 'White' });
    await expect(controller.remove(1, normalUser)).resolves.toEqual({ id: 1 });
  });

  it('BookingsController delegates booking operations', async () => {
    const bookingsService = {
      create: jest.fn().mockResolvedValue({ id: 1 }),
      findMine: jest.fn().mockResolvedValue([{ id: 1 }]),
      findAll: jest.fn().mockResolvedValue([{ id: 1 }]),
      findOne: jest.fn().mockResolvedValue({ id: 1 }),
      cancel: jest.fn().mockResolvedValue({ id: 1, status: 'CANCELLED' }),
    };
    const controller = new BookingsController(bookingsService as never);
    const dto = { vehicleId: 1, slotId: 1, startTime: '2026-06-14T10:00:00.000Z' };

    await expect(controller.create(normalUser, dto)).resolves.toEqual({ id: 1 });
    await expect(controller.findMine(normalUser)).resolves.toEqual([{ id: 1 }]);
    await expect(controller.findAll()).resolves.toEqual([{ id: 1 }]);
    await expect(controller.findOne(1, normalUser)).resolves.toEqual({ id: 1 });
    await expect(controller.cancel(1, normalUser)).resolves.toEqual({ id: 1, status: 'CANCELLED' });
  });

  it('ParkingEventsController delegates parking event operations', async () => {
    const parkingEventsService = {
      checkIn: jest.fn().mockResolvedValue({ id: 1 }),
      checkOut: jest.fn().mockResolvedValue({ id: 1 }),
      findActive: jest.fn().mockResolvedValue([{ id: 1 }]),
      findHistory: jest.fn().mockResolvedValue([{ id: 1 }]),
      findAll: jest.fn().mockResolvedValue([{ id: 1 }]),
      findOne: jest.fn().mockResolvedValue({ id: 1 }),
    };
    const controller = new ParkingEventsController(parkingEventsService as never);

    await expect(controller.checkIn({ bookingCode: 'BK-1' })).resolves.toEqual({ id: 1 });
    await expect(controller.checkOut({ parkingEventId: 1 })).resolves.toEqual({ id: 1 });
    await expect(controller.findActive()).resolves.toEqual([{ id: 1 }]);
    await expect(controller.findHistory(normalUser)).resolves.toEqual([{ id: 1 }]);
    await expect(controller.findAll()).resolves.toEqual([{ id: 1 }]);
    await expect(controller.findOne(1, normalUser)).resolves.toEqual({ id: 1 });
  });

  it('DashboardController delegates dashboard reports', async () => {
    const dashboardService = {
      getAdminSummary: jest.fn().mockResolvedValue({ totalUsers: 1 }),
      getParkingLotSummary: jest.fn().mockResolvedValue({ parkingLotId: 1 }),
      getRecentEvents: jest.fn().mockResolvedValue([{ parkingEventId: 1 }]),
      getTodayBookings: jest.fn().mockResolvedValue([{ id: 1 }]),
      getSlotStatusSummary: jest.fn().mockResolvedValue({ availableSlots: 1 }),
    };
    const controller = new DashboardController(dashboardService as never);

    await expect(controller.getAdminSummary()).resolves.toEqual({ totalUsers: 1 });
    await expect(controller.getParkingLotSummary(1)).resolves.toEqual({ parkingLotId: 1 });
    await expect(controller.getRecentEvents()).resolves.toEqual([{ parkingEventId: 1 }]);
    await expect(controller.getTodayBookings()).resolves.toEqual([{ id: 1 }]);
    await expect(controller.getSlotStatusSummary()).resolves.toEqual({ availableSlots: 1 });
  });

  it('placeholder controllers can be constructed', () => {
    expect(new AssignmentsController()).toBeInstanceOf(AssignmentsController);
  });
});
