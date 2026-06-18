import { BadRequestException } from '@nestjs/common';

const CURSOR_SEPARATOR = '|';

export type RecentActivityCursorPayload = {
  checkInTime: string;
  id: number;
};

export function encodeRecentActivityCursor(payload: RecentActivityCursorPayload): string {
  return Buffer.from(`${payload.checkInTime}${CURSOR_SEPARATOR}${payload.id}`, 'utf8').toString(
    'base64url',
  );
}

export function decodeRecentActivityCursor(cursor: string): RecentActivityCursorPayload {
  try {
    const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
    const separatorIndex = decoded.lastIndexOf(CURSOR_SEPARATOR);

    if (separatorIndex <= 0) {
      throw new Error('Invalid cursor shape');
    }

    const checkInTime = decoded.slice(0, separatorIndex);
    const id = Number.parseInt(decoded.slice(separatorIndex + 1), 10);
    const parsedTime = new Date(checkInTime);

    if (Number.isNaN(id) || Number.isNaN(parsedTime.getTime())) {
      throw new Error('Invalid cursor values');
    }

    return { checkInTime: parsedTime.toISOString(), id };
  } catch {
    throw new BadRequestException('Invalid activity cursor');
  }
}