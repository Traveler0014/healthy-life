import { describe, it, expect } from 'vitest';
import { addDays, currentCheckinDay } from './day';

describe('addDays', () => {
  it('handles month boundary', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
});

describe('currentCheckinDay', () => {
  const tz = 'Asia/Shanghai'; // UTC+8
  it('before boundary hour counts as previous day', () => {
    // 上海 2026-01-02 04:30 = UTC 2026-01-01 20:30
    expect(currentCheckinDay(tz, new Date('2026-01-01T20:30:00Z'), 5)).toBe('2026-01-01');
  });
  it('after boundary hour counts as same day', () => {
    // 上海 2026-01-02 05:30 = UTC 2026-01-01 21:30
    expect(currentCheckinDay(tz, new Date('2026-01-01T21:30:00Z'), 5)).toBe('2026-01-02');
  });
});
