import { describe, it, expect } from 'vitest';
import { computeStreak } from './streak';

describe('computeStreak', () => {
  it('counts consecutive days ending today', () => {
    expect(computeStreak(['2026-01-01', '2026-01-02', '2026-01-03'], '2026-01-03')).toEqual({
      current: 3,
      longest: 3,
    });
  });
  it('tolerates today not yet recorded', () => {
    expect(computeStreak(['2026-01-01', '2026-01-02'], '2026-01-03')).toEqual({
      current: 2,
      longest: 2,
    });
  });
  it('breaks when yesterday missing', () => {
    expect(computeStreak(['2026-01-01'], '2026-01-03')).toEqual({ current: 0, longest: 1 });
  });
  it('computes longest across gaps', () => {
    expect(
      computeStreak(
        ['2026-01-01', '2026-01-02', '2026-01-05', '2026-01-06', '2026-01-07'],
        '2026-01-07',
      ),
    ).toEqual({ current: 3, longest: 3 });
  });
});
