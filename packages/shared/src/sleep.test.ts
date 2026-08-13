import { describe, it, expect } from 'vitest';
import { classifyNight, isNightHour } from './sleep';

describe('isNightHour', () => {
  it('20:00-04:59 为夜间', () => {
    expect(isNightHour(20)).toBe(true);
    expect(isNightHour(0)).toBe(true);
    expect(isNightHour(4)).toBe(true);
    expect(isNightHour(5)).toBe(false);
    expect(isNightHour(12)).toBe(false);
    expect(isNightHour(19)).toBe(false);
  });
});

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
  it('after-midnight (before day boundary) counts as late', () => {
    // 上海 02:00 = UTC 前一日 18:00
    expect(classifyNight({ checkedInAt: '2026-01-01T18:00:00Z', targetBedtime: target, timezone: tz })).toBe('late');
  });
});
