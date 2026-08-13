import { describe, it, expect } from 'vitest';
import { classifyNight, isNightHour, minutesLate } from './sleep';

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

describe('minutesLate', () => {
  it('同一天内正常晚睡：目标 23:00，墙钟 23:30 → 30 分钟', () => {
    expect(minutesLate('23:00', { hour: 23, minute: 30 })).toBe(30);
  });
  it('刚好卡点：目标 23:00，墙钟 23:00 → 0 分钟', () => {
    expect(minutesLate('23:00', { hour: 23, minute: 0 })).toBe(0);
  });
  it('跨午夜熬夜：目标 23:00，凌晨 00:36 → 96 分钟', () => {
    expect(minutesLate('23:00', { hour: 0, minute: 36 })).toBe(96);
  });
  it('跨午夜熬夜到凌晨 5 点：目标 23:00，05:00 → 360 分钟', () => {
    expect(minutesLate('23:00', { hour: 5, minute: 0 })).toBe(360);
  });
  it('目标较晚：目标 23:30，凌晨 00:10 → 40 分钟', () => {
    expect(minutesLate('23:30', { hour: 0, minute: 10 })).toBe(40);
  });
});
