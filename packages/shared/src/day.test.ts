import { describe, it, expect } from 'vitest';
import { addDays, currentCheckinDay, diffDays, lastCheckinDayLabel } from './day';

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

describe('diffDays', () => {
  it('same day is 0', () => {
    expect(diffDays('2026-08-13', '2026-08-13')).toBe(0);
  });
  it('one day apart', () => {
    expect(diffDays('2026-08-13', '2026-08-14')).toBe(1);
    expect(diffDays('2026-08-14', '2026-08-13')).toBe(-1);
  });
  it('across month boundary', () => {
    expect(diffDays('2026-08-31', '2026-09-01')).toBe(1);
    expect(diffDays('2026-01-31', '2026-03-01')).toBe(29);
  });
});

describe('lastCheckinDayLabel', () => {
  it('today / yesterday / day-before（晚上打卡）', () => {
    expect(lastCheckinDayLabel('2026-08-14', '2026-08-14', 23).label).toBe('今天');
    expect(lastCheckinDayLabel('2026-08-13', '2026-08-14', 23).label).toBe('昨天');
    expect(lastCheckinDayLabel('2026-08-12', '2026-08-14', 23).label).toBe('前天');
  });
  it('凌晨打卡按墙上日期归今天，标「今天凌晨」而非「昨天」', () => {
    // 墙上时钟 8-15 00:36，今天 8-15，hour=0
    expect(lastCheckinDayLabel('2026-08-15', '2026-08-15', 0).label).toBe('今天凌晨');
  });
  it('凌晨打卡归昨天时标「昨天凌晨」', () => {
    expect(lastCheckinDayLabel('2026-08-14', '2026-08-15', 2).label).toBe('昨天凌晨');
  });
  it('older than 2 days uses N天前 with monthDay（凌晨不强调）', () => {
    const r = lastCheckinDayLabel('2026-08-01', '2026-08-14', 1);
    expect(r.label).toBe('13天前');
    expect(r.daysAgo).toBe(13);
    expect(r.monthDay).toBe('8月1日');
  });
  it('future date clamps to today', () => {
    const r = lastCheckinDayLabel('2026-08-15', '2026-08-14', 23);
    expect(r.daysAgo).toBe(0);
    expect(r.label).toBe('今天');
  });
  it('monthDay 用中文月日', () => {
    expect(lastCheckinDayLabel('2026-08-03', '2026-08-14', 23).monthDay).toBe('8月3日');
  });
});
