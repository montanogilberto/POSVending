import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { currentPeriod, hermosilloPeriod, parsePeriodKey, periodDateRange, periodKey } from './monthPeriod';

describe('monthPeriod', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-12-01T06:59:00Z')); });
  afterEach(() => { vi.useRealTimers(); });

  it('changes month at 07:00 UTC (Hermosillo midnight)', () => {
    expect(currentPeriod()).toEqual({ year: 2026, month: 11 });
    expect(hermosilloPeriod('2026-11-01T06:59:59')).toEqual({ year: 2026, month: 10 });
    expect(hermosilloPeriod('2026-11-01T07:00:00')).toEqual({ year: 2026, month: 11 });
  });

  it('parses month keys and rejects future or malformed ones', () => {
    expect(parsePeriodKey('2026-09')).toEqual({ year: 2026, month: 9 });
    expect(periodKey({ year: 2026, month: 9 })).toBe('2026-09');
    expect(parsePeriodKey('2026-12')).toBeNull();
    expect(parsePeriodKey('2026-13')).toBeNull();
    expect(parsePeriodKey(null)).toBeNull();
  });

  it('bounds the date range by month end and today', () => {
    expect(periodDateRange({ year: 2024, month: 2 })).toEqual({ fromDate: '2024-02-01', toDate: '2024-02-29' });
    expect(periodDateRange({ year: 2026, month: 11 })).toEqual({ fromDate: '2026-11-01', toDate: '2026-11-30' });
  });
});
