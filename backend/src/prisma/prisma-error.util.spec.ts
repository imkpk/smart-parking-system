import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  getPrismaTargetFields,
  handlePrismaUniqueConstraint,
  isPrismaUniqueConstraintError,
} from './prisma-error.util';

function createUniqueError(target: string | string[]) {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    clientVersion: 'test',
    code: 'P2002',
    meta: { target },
  });
}

describe('prisma-error.util', () => {
  it('identifies prisma unique constraint errors', () => {
    const error = createUniqueError(['email']);

    expect(isPrismaUniqueConstraintError(error)).toBe(true);
    expect(isPrismaUniqueConstraintError(new Error('other'))).toBe(false);
  });

  it('extracts array and string target fields', () => {
    expect(getPrismaTargetFields(createUniqueError(['email', 'phone']))).toEqual([
      'email',
      'phone',
    ]);
    expect(getPrismaTargetFields(createUniqueError('users_phone_key'))).toEqual([
      'users_phone_key',
    ]);
    expect(
      getPrismaTargetFields(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          clientVersion: 'test',
          code: 'P2002',
        }),
      ),
    ).toEqual([]);
  });

  it('maps known fields to conflict exceptions', () => {
    expect(() =>
      handlePrismaUniqueConstraint(createUniqueError(['email']), {
        email: 'Email already exists',
      }),
    ).toThrow('Email already exists');
  });

  it('falls back to individual field messages when composite key is not mapped', () => {
    expect(() =>
      handlePrismaUniqueConstraint(createUniqueError(['parkingLotId', 'name']), {
        name: 'Floor already exists',
      }),
    ).toThrow('Floor already exists');
  });

  it('maps composite unique constraints to conflict exceptions', () => {
    expect(() =>
      handlePrismaUniqueConstraint(createUniqueError(['floorId', 'slotNumber']), {
        'floorId,slotNumber': 'Slot already exists',
      }),
    ).toThrow('Slot already exists');
  });

  it('uses the default message for unknown unique constraints', () => {
    expect(() =>
      handlePrismaUniqueConstraint(createUniqueError(['unknown']), {
        email: 'Email already exists',
      }, 'User already exists'),
    ).toThrow('User already exists');
  });

  it('rethrows non-unique errors', () => {
    const error = new Error('Database unavailable');

    expect(() =>
      handlePrismaUniqueConstraint(error, { email: 'Email already exists' }),
    ).toThrow(error);
  });

  it('throws ConflictException instances', () => {
    try {
      handlePrismaUniqueConstraint(createUniqueError(['email']), {
        email: 'Email already exists',
      });
    } catch (error) {
      expect(error).toBeInstanceOf(ConflictException);
    }
  });
});