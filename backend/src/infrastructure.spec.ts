import 'reflect-metadata';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { MODULE_METADATA, ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { AppModule } from './app.module';
import { AppService } from './app.service';
import { AssignmentsModule } from './assignments/assignments.module';
import { AssignmentsService } from './assignments/assignments.service';
import { AuthModule } from './auth/auth.module';
import { JwtStrategy } from './auth/strategies/jwt.strategy';
import { BookingsModule } from './bookings/bookings.module';
import { CurrentUser } from './common/decorators/current-user.decorator';
import { ROLES_KEY, Roles } from './common/decorators/roles.decorator';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { DashboardModule } from './dashboard/dashboard.module';
import { DashboardService } from './dashboard/dashboard.service';
import { FloorsModule } from './floors/floors.module';
import { ParkingEventsModule } from './parking-events/parking-events.module';
import { ParkingLotsModule } from './parking-lots/parking-lots.module';
import { PaymentClientModule } from './integrations/payment-service/payment-client.module';
import { PrismaModule } from './prisma/prisma.module';
import { PrismaService } from './prisma/prisma.service';
import { SlotsModule } from './slots/slots.module';
import { normalUser } from './test/test-users';
import { UsersModule } from './users/users.module';
import { VehiclesModule } from './vehicles/vehicles.module';

function mockContext(user?: { role?: Role }): ExecutionContext {
  const handler = jest.fn();
  const controller = jest.fn();

  return {
    getHandler: () => handler,
    getClass: () => controller,
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

describe('Infrastructure', () => {
  it('loads module classes', () => {
    expect(AppModule).toBeDefined();
    expect(AssignmentsModule).toBeDefined();
    expect(AuthModule).toBeDefined();
    expect(BookingsModule).toBeDefined();
    expect(DashboardModule).toBeDefined();
    expect(FloorsModule).toBeDefined();
    expect(ParkingEventsModule).toBeDefined();
    expect(ParkingLotsModule).toBeDefined();
    expect(PaymentClientModule).toBeDefined();
    expect(PrismaModule).toBeDefined();
    expect(SlotsModule).toBeDefined();
    expect(UsersModule).toBeDefined();
    expect(VehiclesModule).toBeDefined();
  });

  it('configures JWT module options from ConfigService with defaults', async () => {
    const imports = Reflect.getMetadata(MODULE_METADATA.IMPORTS, AuthModule) as Array<{
      module?: { name?: string };
      providers?: Array<{ useFactory?: (configService: { get: jest.Mock }) => unknown }>;
    }>;
    const jwtModule = imports.find((item) => item.module?.name === 'JwtModule');
    const optionsProvider = jwtModule?.providers?.find((provider) => provider.useFactory);

    expect(optionsProvider?.useFactory?.({
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'JWT_SECRET') {
          return 'test-secret';
        }
        if (key === 'JWT_EXPIRES_IN') {
          return '2d';
        }
        return undefined;
      }),
    })).toEqual({
      secret: 'test-secret',
      signOptions: { expiresIn: '2d' },
    });
    expect(optionsProvider?.useFactory?.({
      get: jest.fn().mockReturnValue(undefined),
    })).toEqual({
      secret: 'smart_parking_dev_jwt_secret_32_chars_minimum',
      signOptions: { expiresIn: '1d' },
    });
  });

  it('stores role metadata with the Roles decorator', () => {
    class TestController {}

    Roles(Role.ADMIN, Role.SECURITY)(TestController);

    expect(Reflect.getMetadata(ROLES_KEY, TestController)).toEqual([
      Role.ADMIN,
      Role.SECURITY,
    ]);
  });

  it('extracts current user from request metadata factory', () => {
    class TestController {
      test(@CurrentUser() _user: unknown) {
        return undefined;
      }
    }

    const metadata = Reflect.getMetadata(
      ROUTE_ARGS_METADATA,
      TestController,
      'test',
    ) as Record<string, { factory: (data: unknown, ctx: ExecutionContext) => unknown }>;
    const paramMetadata = metadata[Object.keys(metadata)[0]];

    expect(paramMetadata.factory(undefined, mockContext(normalUser))).toBe(normalUser);
  });

  it('allows requests when no roles are required', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(undefined),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(mockContext())).toBe(true);
  });

  it('allows requests with a matching role', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([Role.ADMIN]),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(mockContext({ role: Role.ADMIN }))).toBe(true);
  });

  it('blocks requests without a matching role', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([Role.ADMIN]),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(mockContext({ role: Role.USER }))).toBe(false);
    expect(guard.canActivate(mockContext())).toBe(false);
  });

  it('constructs JwtAuthGuard', () => {
    expect(new JwtAuthGuard()).toBeInstanceOf(JwtAuthGuard);
  });

  it('validates active JWT users', async () => {
    const strategy = new JwtStrategy(
      { get: jest.fn().mockReturnValue('secret') } as never,
      { findActiveById: jest.fn().mockResolvedValue(normalUser) } as never,
    );

    await expect(
      strategy.validate({ sub: normalUser.id, email: normalUser.email, role: normalUser.role }),
    ).resolves.toBe(normalUser);
  });

  it('rejects JWT users that no longer exist or are inactive', async () => {
    const strategy = new JwtStrategy(
      { get: jest.fn().mockReturnValue(undefined) } as never,
      { findActiveById: jest.fn().mockResolvedValue(null) } as never,
    );

    await expect(
      strategy.validate({ sub: 404, email: 'missing@example.com', role: Role.USER }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('constructs PrismaService', () => {
    const prisma = new PrismaService();
    expect(prisma).toBeDefined();
  });

  it('connects and disconnects PrismaService on module lifecycle', async () => {
    const prisma = new PrismaService();
    const connect = jest.spyOn(prisma, '$connect').mockResolvedValue(undefined);
    const disconnect = jest.spyOn(prisma, '$disconnect').mockResolvedValue(undefined);

    await prisma.onModuleInit();
    await prisma.onModuleDestroy();

    expect(connect).toHaveBeenCalled();
    expect(disconnect).toHaveBeenCalled();
  });

  it('covers simple application and placeholder services', () => {
    expect(new AppService().getHealth()).toEqual({
      status: 'ok',
      service: 'smart-parking-backend',
    });
    expect(new AssignmentsService()).toBeInstanceOf(AssignmentsService);
    expect(new DashboardService({} as never)).toBeInstanceOf(DashboardService);
  });
});
