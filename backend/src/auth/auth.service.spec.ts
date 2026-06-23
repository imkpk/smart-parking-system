/// <reference types="jest" />

import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ParkingLotType, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
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
    findActiveLoginCandidatesByEmail: jest.Mock;
    findActiveLoginCandidatesByPhone: jest.Mock;
    findActiveById: jest.Mock;
  };
  let prisma: {
    user: { findFirst: jest.Mock; findMany: jest.Mock; update: jest.Mock };
    organization: { findUnique: jest.Mock };
    $transaction: jest.Mock;
  };
  let mailerService: { sendMail: jest.Mock };

  beforeEach(() => {
    jwtService = { sign: jest.fn().mockReturnValue('signed-token') };
    usersService = {
      findActiveLoginCandidatesByEmail: jest.fn(),
      findActiveLoginCandidatesByPhone: jest.fn(),
      findActiveById: jest.fn(),
    };
    mailerService = { sendMail: jest.fn().mockResolvedValue(undefined) };
    prisma = {
      user: { findFirst: jest.fn(), findMany: jest.fn(), update: jest.fn() },
      organization: { findUnique: jest.fn().mockResolvedValue(null) },
      $transaction: jest.fn(),
    };
    service = new AuthService(
      jwtService as never,
      usersService as never,
      prisma as never,
      mailerService as never,
      { get: jest.fn().mockReturnValue('http://localhost:5173') } as never,
    );
    jest.mocked(bcrypt.hash).mockReset();
    jest.mocked(bcrypt.compare).mockReset();
  });

  it('registers a tenant admin with a new organization', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    jest.mocked(bcrypt.hash).mockResolvedValue('hashed-password' as never);
    prisma.$transaction.mockImplementation(async (callback) =>
      callback({
        organization: {
          create: jest.fn().mockResolvedValue({ id: 42, name: 'Sunrise Apts', slug: 'sunrise-apts' }),
        },
        user: {
          create: jest.fn().mockResolvedValue({
            id: 9,
            organizationId: 42,
            role: Role.TENANT_ADMIN,
          }),
        },
      }),
    );
    usersService.findActiveById.mockResolvedValue({
      ...normalUser,
      id: 9,
      role: Role.TENANT_ADMIN,
      organizationId: 42,
    });

    const result = await service.register({
      organizationName: 'Sunrise Apts',
      organizationType: ParkingLotType.APARTMENT,
      name: 'Owner',
      email: 'owner@example.com',
      phone: '+919876543210',
      password: 'password123',
    });

    expect(result.accessToken).toBe('signed-token');
    expect(result.user.role).toBe(Role.TENANT_ADMIN);
  });

  it('includes organizationId in JWT payload on login', async () => {
    usersService.findActiveLoginCandidatesByEmail.mockResolvedValue([userRecord]);
    usersService.findActiveById.mockResolvedValue(normalUser);
    jest.mocked(bcrypt.compare).mockResolvedValue(true as never);

    await service.login({
      email: normalUser.email!,
      password: 'password123',
    });

    expect(jwtService.sign).toHaveBeenCalledWith({
      sub: normalUser.id,
      email: normalUser.email!,
      role: normalUser.role,
      organizationId: normalUser.organizationId,
    });
  });

  it('blocks duplicate registration email globally', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 1 });

    await expect(
      service.register({
        organizationName: 'Sunrise Apts',
        organizationType: ParkingLotType.APARTMENT,
        name: 'Owner',
        email: normalUser.email!,
        password: 'password123',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('logs in with a valid password', async () => {
    usersService.findActiveLoginCandidatesByEmail.mockResolvedValue([userRecord]);
    usersService.findActiveById.mockResolvedValue(normalUser);
    jest.mocked(bcrypt.compare).mockResolvedValue(true as never);

    const result = await service.login({
      email: normalUser.email!,
      password: 'password123',
    });

    expect(result).toEqual({ user: normalUser, accessToken: 'signed-token' });
  });

  it('logs in existing ADMIN in the default organization without tenant input', async () => {
    usersService.findActiveLoginCandidatesByEmail.mockResolvedValue([adminUserRecord]);
    usersService.findActiveById.mockResolvedValue(adminUser);
    jest.mocked(bcrypt.compare).mockResolvedValue(true as never);

    const result = await service.login({
      email: adminUser.email!,
      password: 'password123',
    });

    expect(result.user).toHaveProperty('organizationId', adminUser.organizationId);
  });

  it('rejects login when multiple active accounts match the same email', async () => {
    usersService.findActiveLoginCandidatesByEmail.mockResolvedValue([
      userRecord,
      { ...userRecord, id: 99, organizationId: 2 },
    ]);
    jest.mocked(bcrypt.compare).mockResolvedValue(true as never);

    await expect(
      service.login({ email: normalUser.email!, password: 'password123' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('includes null organizationId in JWT when user has no organization', async () => {
    const userWithoutOrg = { ...userRecord, organizationId: null, role: Role.SUPER_ADMIN };
    usersService.findActiveLoginCandidatesByEmail.mockResolvedValue([userWithoutOrg]);
    usersService.findActiveById.mockResolvedValue({ ...normalUser, organizationId: null });
    jest.mocked(bcrypt.compare).mockResolvedValue(true as never);

    await service.login({
      email: normalUser.email!,
      password: 'password123',
    });

    expect(jwtService.sign).toHaveBeenCalledWith({
      sub: normalUser.id,
      email: normalUser.email!,
      role: normalUser.role,
      organizationId: null,
    });
  });

  it('rejects invalid login password', async () => {
    usersService.findActiveLoginCandidatesByEmail.mockResolvedValue([userRecord]);
    jest.mocked(bcrypt.compare).mockResolvedValue(false as never);

    await expect(
      service.login({ email: normalUser.email!, password: 'wrong-password' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('logs in with a normalized 10-digit mobile number', async () => {
    usersService.findActiveLoginCandidatesByPhone.mockResolvedValue([userRecord]);
    usersService.findActiveById.mockResolvedValue(normalUser);
    jest.mocked(bcrypt.compare).mockResolvedValue(true as never);

    const result = await service.login({
      email: '9876543210',
      password: 'password123',
    });

    expect(usersService.findActiveLoginCandidatesByPhone).toHaveBeenCalledWith('+919876543210');
    expect(result).toEqual({ user: normalUser, accessToken: 'signed-token' });
  });

  it('sends reset email for an existing account', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 1, email: 'user@example.com' });
    prisma.user.update.mockResolvedValue({ id: 1 });
    jest.mocked(bcrypt.hash).mockResolvedValue('hashed-token' as never);

    const response = await service.forgotPassword({ email: 'user@example.com' });

    expect(response.message).toContain('reset link has been sent');
    expect(mailerService.sendMail).toHaveBeenCalledTimes(1);
  });

  it('returns the same response when the email is not registered', async () => {
    prisma.user.findFirst.mockResolvedValue(null);

    const response = await service.forgotPassword({ email: 'missing@example.com' });

    expect(response.message).toContain('reset link has been sent');
    expect(mailerService.sendMail).not.toHaveBeenCalled();
  });

  it('resets password when token matches an unexpired hash', async () => {
    prisma.user.findMany.mockResolvedValue([
      { id: 1, passwordResetToken: 'hashed-token' },
    ]);
    jest.mocked(bcrypt.compare).mockResolvedValue(true as never);
    jest.mocked(bcrypt.hash).mockResolvedValue('new-hash' as never);
    prisma.user.update.mockResolvedValue({ id: 1 });

    await expect(
      service.resetPassword({ token: 'raw-token', newPassword: 'new-password' }),
    ).resolves.toEqual({ message: 'Password reset successful. Please log in.' });
  });

  it('rejects login when multiple active accounts match the same phone', async () => {
    usersService.findActiveLoginCandidatesByPhone.mockResolvedValue([
      userRecord,
      { ...userRecord, id: 99, organizationId: 2 },
    ]);
    jest.mocked(bcrypt.compare).mockResolvedValue(true as never);

    await expect(
      service.login({ email: '+919876543210', password: 'password123' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});