import { describe, it, expect } from 'vitest';
import { classifyNight } from './sleep';

describe('classifyNight', () => {
  const tz = 'Asia/Shanghai';
  const target = '23:00';

  it('missing when no check-in', () => {
    expect(classifyNight({ targetBedtime: target, timezone: tz })).toBe('missing');
  });
  it('early when before target', () => {
    // 上海 22:50 = UTC 14:50
    expect(classifyNight({ checkedInAt: '2026-01-01T14:50:00Z', targetBedtime: target, timezone: tz })).toBe('early');
  });
  it('late when after target', () => {
    // 上海 23:45 = UTC 15:45
    expect(classifyNight({ checkedInAt: '2026-01-01T15:45:00Z', targetBedtime: target, timezone: tz })).toBe('late');
  });
  it('equal to target counts as early', () => {
    // 上海 23:00 = UTC 15:00
    expect(classifyNight({ checkedInAt: '2026-01-01T15:00:00Z', targetBedtime: target, timezone: tz })).toBe('early');
  });
});
