/// <reference types="jest" />

import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { DEFAULT_ORGANIZATION_ID } from '../organizations/organizations.constants';
import { AuthService } from './auth.service';
import { adminUser, adminUserRecord, normalUser, userRecord } from '../test/test-users';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: { sign: jest.Mock };
  let usersService: {
    findByEmail: jest.Mock;
    findByPhone: jest.Mock;
    create: jest.Mock;
    findActiveById: jest.Mock;
  };

  beforeEach(() => {
    jwtService = { sign: jest.fn().mockReturnValue('signed-token') };
    usersService = {
      findByEmail: jest.fn(),
      findByPhone: jest.fn(),
      create: jest.fn(),
      findActiveById: jest.fn(),
    };
    service = new AuthService(jwtService as never, usersService as never);
    jest.mocked(bcrypt.hash).mockReset();
    jest.mocked(bcrypt.compare).mockReset();
  });

  it('registers a user with a hashed password and returns a token', async () => {
    usersService.findByEmail.mockResolvedValue(null);
    usersService.findByPhone.mockResolvedValue(null);
    jest.mocked(bcrypt.hash).mockResolvedValue('hashed-password' as never);
    usersService.create.mockResolvedValue(normalUser);
    usersService.findActiveById.mockResolvedValue(normalUser);

    const result = await service.register({
      name: normalUser.name,
      email: normalUser.email,
      phone: normalUser.phone ?? undefined,
      password: 'password123',
      role: normalUser.role,
    });

    expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
    expect(usersService.create).toHaveBeenCalledWith({
      name: normalUser.name,
      email: normalUser.email,
      phone: normalUser.phone,
      passwordHash: 'hashed-password',
      role: normalUser.role,
      organization: { connect: { id: DEFAULT_ORGANIZATION_ID } },
    });
    expect(result).toEqual({ user: normalUser, accessToken: 'signed-token' });
    expect(jwtService.sign).toHaveBeenCalledWith({
      sub: normalUser.id,
      email: normalUser.email,
      role: normalUser.role,
      organizationId: DEFAULT_ORGANIZATION_ID,
    });
  });

  it('includes organizationId in JWT payload on login', async () => {
    usersService.findByEmail.mockResolvedValue(userRecord);
    usersService.findActiveById.mockResolvedValue(normalUser);
    jest.mocked(bcrypt.compare).mockResolvedValue(true as never);

    await service.login({
      email: normalUser.email,
      password: 'password123',
    });

    expect(jwtService.sign).toHaveBeenCalledWith({
      sub: normalUser.id,
      email: normalUser.email,
      role: normalUser.role,
      organizationId: DEFAULT_ORGANIZATION_ID,
    });
  });

  it('blocks duplicate registration', async () => {
    usersService.findByEmail.mockResolvedValue(userRecord);

    await expect(
      service.register({
        name: normalUser.name,
        email: normalUser.email,
        phone: normalUser.phone ?? undefined,
        password: 'password123',
        role: normalUser.role,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('blocks duplicate phone registration', async () => {
    usersService.findByEmail.mockResolvedValue(null);
    usersService.findByPhone.mockResolvedValue(userRecord);

    await expect(
      service.register({
        name: normalUser.name,
        email: 'new@example.com',
        phone: normalUser.phone ?? undefined,
        password: 'password123',
        role: normalUser.role,
      }),
    ).rejects.toThrow('Phone number already exists');
    expect(usersService.create).not.toHaveBeenCalled();
  });

  it('logs in with a valid password', async () => {
    usersService.findByEmail.mockResolvedValue(userRecord);
    usersService.findActiveById.mockResolvedValue(normalUser);
    jest.mocked(bcrypt.compare).mockResolvedValue(true as never);

    const result = await service.login({
      email: normalUser.email,
      password: 'password123',
    });

    expect(usersService.findByEmail).toHaveBeenCalledWith(normalUser.email);
    expect(usersService.findActiveById).toHaveBeenCalledWith(normalUser.id);
    expect(bcrypt.compare).toHaveBeenCalledWith('password123', userRecord.passwordHash);
    expect(result).toEqual({ user: normalUser, accessToken: 'signed-token' });
  });

  it('logs in existing ADMIN in the default organization without tenant input', async () => {
    usersService.findByEmail.mockResolvedValue(adminUserRecord);
    usersService.findActiveById.mockResolvedValue(adminUser);
    jest.mocked(bcrypt.compare).mockResolvedValue(true as never);

    const result = await service.login({
      email: adminUser.email,
      password: 'password123',
    });

    expect(usersService.findByEmail).toHaveBeenCalledWith(adminUser.email);
    expect(result).toEqual({ user: adminUser, accessToken: 'signed-token' });
    expect(jwtService.sign).toHaveBeenCalledWith({
      sub: adminUser.id,
      email: adminUser.email,
      role: adminUser.role,
      organizationId: DEFAULT_ORGANIZATION_ID,
    });
    expect(result.user).toHaveProperty('organizationId', DEFAULT_ORGANIZATION_ID);
  });

  it('rejects invalid login password', async () => {
    usersService.findByEmail.mockResolvedValue(userRecord);
    jest.mocked(bcrypt.compare).mockResolvedValue(false as never);

    await expect(
      service.login({ email: normalUser.email, password: 'wrong-password' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects login when user does not exist', async () => {
    usersService.findByEmail.mockResolvedValue(null);

    await expect(
      service.login({ email: 'missing@example.com', password: 'password123' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects login when user is inactive', async () => {
    usersService.findByEmail.mockResolvedValue({ ...userRecord, isActive: false });

    await expect(
      service.login({ email: normalUser.email, password: 'password123' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects login when active user lookup fails after password validation', async () => {
    usersService.findByEmail.mockResolvedValue(userRecord);
    usersService.findActiveById.mockResolvedValue(null);
    jest.mocked(bcrypt.compare).mockResolvedValue(true as never);

    await expect(
      service.login({ email: normalUser.email, password: 'password123' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects registration when created user cannot be loaded as active', async () => {
    usersService.findByEmail.mockResolvedValue(null);
    usersService.findByPhone.mockResolvedValue(null);
    jest.mocked(bcrypt.hash).mockResolvedValue('hashed-password' as never);
    usersService.create.mockResolvedValue(normalUser);
    usersService.findActiveById.mockResolvedValue(null);

    await expect(
      service.register({
        name: normalUser.name,
        email: normalUser.email,
        password: 'password123',
        role: normalUser.role,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('includes null organizationId in JWT when user has no organization', async () => {
    const userWithoutOrg = { ...userRecord, organizationId: null };
    usersService.findByEmail.mockResolvedValue(userWithoutOrg);
    usersService.findActiveById.mockResolvedValue({ ...normalUser, organizationId: null });
    jest.mocked(bcrypt.compare).mockResolvedValue(true as never);

    await service.login({
      email: normalUser.email,
      password: 'password123',
    });

    expect(jwtService.sign).toHaveBeenCalledWith({
      sub: normalUser.id,
      email: normalUser.email,
      role: normalUser.role,
      organizationId: null,
    });
  });
});