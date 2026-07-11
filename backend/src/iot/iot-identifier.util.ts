import { createHmac } from 'crypto';

export function hashIdentifier(rawValue: string, pepper: string): string {
  return createHmac('sha256', pepper).update(rawValue.trim()).digest('hex');
}

export function buildDisplaySuffix(rawValue: string, length = 4): string {
  const normalized = rawValue.trim();
  if (normalized.length <= length) {
    return normalized;
  }

  return normalized.slice(-length);
}

export function hashPlateForDedup(normalizedPlate: string, pepper: string): string {
  return createHmac('sha256', pepper).update(`plate:${normalizedPlate}`).digest('hex');
}

export function hashDeviceCredential(rawCredential: string, pepper: string): string {
  return createHmac('sha256', pepper).update(`device:${rawCredential}`).digest('hex');
}