/// <reference types="jest" />

import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { normalUser, userRecord } from '../test/test-users';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: { sign: jest.Mock };
  let usersService: {
    findByEmail: jest.Mock;
    create: jest.Mock;
    toSafeUser: jest.Mock;
  };

  beforeEach(() => {
    jwtService = { sign: jest.fn().mockReturnValue('signed-token') };
    usersService = {
      findByEmail: jest.fn(),
      create: jest.fn(),
      toSafeUser: jest.fn(),
    };
    service = new AuthService(jwtService as never, usersService as never);
    jest.mocked(bcrypt.hash).mockReset();
    jest.mocked(bcrypt.compare).mockReset();
  });

  it('registers a user with a hashed password and returns a token', async () => {
    usersService.findByEmail.mockResolvedValue(null);
    jest.mocked(bcrypt.hash).mockResolvedValue('hashed-password' as never);
    usersService.create.mockResolvedValue(normalUser);

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
    });
    expect(result).toEqual({ user: normalUser, accessToken: 'signed-token' });
    expect(jwtService.sign).toHaveBeenCalledWith({
      sub: normalUser.id,
      email: normalUser.email,
      role: normalUser.role,
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

  it('logs in with a valid password', async () => {
    usersService.findByEmail.mockResolvedValue(userRecord);
    usersService.toSafeUser.mockReturnValue(normalUser);
    jest.mocked(bcrypt.compare).mockResolvedValue(true as never);

    const result = await service.login({
      email: normalUser.email,
      password: 'password123',
    });

    expect(bcrypt.compare).toHaveBeenCalledWith('password123', userRecord.passwordHash);
    expect(result).toEqual({ user: normalUser, accessToken: 'signed-token' });
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
});
