import 'reflect-metadata';
import { GUARDS_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { OutboxMonitorController } from './outbox-monitor.controller';
import { OutboxMonitorService } from './outbox-monitor.service';

function mockContext(role?: Role) {
  return {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => ({ user: role ? { role } : undefined }),
    }),
  } as never;
}

describe('OutboxMonitorController', () => {
  const service = {
    list: jest.fn(),
    getSummary: jest.fn(),
  } as unknown as OutboxMonitorService;

  it('registers the protected events/outbox route', () => {
    expect(Reflect.getMetadata(PATH_METADATA, OutboxMonitorController)).toBe(
      'events/outbox',
    );
  });

  it('requires JwtAuthGuard and RolesGuard', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, OutboxMonitorController);

    expect(guards).toEqual([JwtAuthGuard, RolesGuard]);
  });

  it('requires only SUPER_ADMIN', () => {
    expect(Reflect.getMetadata(ROLES_KEY, OutboxMonitorController)).toEqual([
      Role.SUPER_ADMIN,
    ]);
  });

  it('rejects non-SUPER_ADMIN roles through RolesGuard', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([Role.SUPER_ADMIN]),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(mockContext(Role.SUPER_ADMIN))).toBe(true);
    expect(guard.canActivate(mockContext(Role.TENANT_ADMIN))).toBe(false);
    expect(guard.canActivate(mockContext(Role.ADMIN))).toBe(false);
    expect(guard.canActivate(mockContext(Role.SECURITY))).toBe(false);
    expect(guard.canActivate(mockContext(Role.USER))).toBe(false);
    expect(guard.canActivate(mockContext())).toBe(false);
  });

  it('delegates list and summary reads to the monitor service', async () => {
    const controller = new OutboxMonitorController(service);
    const query = { status: 'FAILED' as const };

    await controller.list(query);
    await controller.getSummary();

    expect(service.list).toHaveBeenCalledWith(query);
    expect(service.getSummary).toHaveBeenCalled();
  });
});
