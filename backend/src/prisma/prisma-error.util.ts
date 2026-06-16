import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export function isPrismaUniqueConstraintError(
  error: unknown,
): error is Prisma.PrismaClientKnownRequestError {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

export function getPrismaTargetFields(
  error: Prisma.PrismaClientKnownRequestError,
): string[] {
  const target = error.meta?.target;

  if (Array.isArray(target)) {
    return target.map(String);
  }

  if (typeof target === 'string') {
    return [target];
  }

  return [];
}

export function handlePrismaUniqueConstraint(
  error: unknown,
  fieldMessageMap: Record<string, string>,
  defaultMessage = 'Record already exists',
): never {
  if (!isPrismaUniqueConstraintError(error)) {
    throw error;
  }

  const fields = getPrismaTargetFields(error);
  const compositeKey = fields.join(',');

  if (fieldMessageMap[compositeKey]) {
    throw new ConflictException(fieldMessageMap[compositeKey]);
  }

  for (const field of fields) {
    if (fieldMessageMap[field]) {
      throw new ConflictException(fieldMessageMap[field]);
    }
  }

  throw new ConflictException(defaultMessage);
}