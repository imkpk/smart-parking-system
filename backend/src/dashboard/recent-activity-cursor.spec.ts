import { BadRequestException } from '@nestjs/common';
import {
  decodeRecentActivityCursor,
  encodeRecentActivityCursor,
} from './recent-activity-cursor';

describe('recent-activity-cursor', () => {
  it('round-trips cursor payload', () => {
    const payload = {
      checkInTime: '2026-06-18T10:30:00.000Z',
      id: 42,
    };

    const cursor = encodeRecentActivityCursor(payload);

    expect(decodeRecentActivityCursor(cursor)).toEqual(payload);
  });

  it('rejects invalid cursor values', () => {
    expect(() => decodeRecentActivityCursor('not-a-valid-cursor')).toThrow(BadRequestException);
  });
});