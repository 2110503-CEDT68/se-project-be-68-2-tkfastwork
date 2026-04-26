const {
    DEFAULT_LOOKBACK_DAYS,
    DEFAULT_REPORT_TIMEZONE,
    VALID_FREQUENCIES,
    getNextRunAt,
    getTimeZoneParts,
    normalizeReportPreferences,
    validateTimeZone,
    zonedTimeToUtc
} = require('../utils/reportSchedule');

describe('exported constants', () => {
    test('expose sensible defaults', () => {
        expect(DEFAULT_LOOKBACK_DAYS).toBe(30);
        expect(typeof DEFAULT_REPORT_TIMEZONE).toBe('string');
        expect(VALID_FREQUENCIES).toEqual(['daily', 'weekly', 'monthly']);
    });
});

describe('validateTimeZone', () => {
    test('returns true for valid IANA timezones', () => {
        expect(validateTimeZone('UTC')).toBe(true);
        expect(validateTimeZone('Asia/Bangkok')).toBe(true);
    });

    test('returns false for invalid timezones', () => {
        expect(validateTimeZone('Mars/Phobos')).toBe(false);
    });
});

describe('getTimeZoneParts', () => {
    test('extracts year/month/day/hour/minute/weekday for the requested zone', () => {
        const parts = getTimeZoneParts(new Date('2026-04-20T03:00:00.000Z'), 'Asia/Bangkok');
        expect(parts).toEqual(expect.objectContaining({
            year: 2026,
            month: 4,
            day: 20,
            hour: 10,
            minute: 0
        }));
        expect(typeof parts.weekdayNumber).toBe('number');
    });
});

describe('zonedTimeToUtc', () => {
    test('round-trips a wall-clock time in a timezone back to UTC', () => {
        const utc = zonedTimeToUtc({
            year: 2026,
            month: 4,
            day: 20,
            hour: 9,
            minute: 30
        }, 'Asia/Bangkok');

        expect(utc.toISOString()).toBe('2026-04-20T02:30:00.000Z');
    });
});

describe('normalizeReportPreferences', () => {
    test('returns default values when nothing is provided', () => {
        const prefs = normalizeReportPreferences();
        expect(prefs).toEqual(expect.objectContaining({
            enabled: false,
            frequency: 'weekly',
            hour: 8,
            minute: 0,
            timezone: DEFAULT_REPORT_TIMEZONE,
            dayOfWeek: 1,
            dayOfMonth: 1,
            lookbackDays: DEFAULT_LOOKBACK_DAYS
        }));
    });

    test('merges current preferences with provided updates', () => {
        const prefs = normalizeReportPreferences({}, {
            enabled: true,
            frequency: 'monthly',
            dayOfMonth: 15,
            hour: 7,
            minute: 45,
            timezone: 'UTC',
            lookbackDays: 14
        });

        expect(prefs.enabled).toBe(true);
        expect(prefs.frequency).toBe('monthly');
        expect(prefs.dayOfMonth).toBe(15);
    });

    test('falls back to integer defaults when integers are unparseable', () => {
        const prefs = normalizeReportPreferences({}, {
            hour: 'abc',
            minute: '',
            lookbackDays: null
        });
        expect(prefs.hour).toBe(8);
        expect(prefs.minute).toBe(0);
        expect(prefs.lookbackDays).toBe(DEFAULT_LOOKBACK_DAYS);
    });

    test('uses current preference values when no update is provided', () => {
        const prefs = normalizeReportPreferences({
            enabled: true,
            frequency: 'daily',
            hour: 5,
            minute: 30,
            timezone: 'UTC',
            lookbackDays: 7,
            lastRunAt: new Date('2026-04-01T00:00:00.000Z'),
            nextRunAt: new Date('2026-04-02T00:00:00.000Z')
        });

        expect(prefs.frequency).toBe('daily');
        expect(prefs.hour).toBe(5);
        expect(prefs.lastRunAt).toBeInstanceOf(Date);
        expect(prefs.nextRunAt).toBeInstanceOf(Date);
    });

    test('throws on invalid frequency', () => {
        expect(() => normalizeReportPreferences({}, { frequency: 'hourly' })).toThrow(/frequency must be one of/);
    });

    test('throws on invalid timezone', () => {
        expect(() => normalizeReportPreferences({}, { timezone: 'Mars/Phobos' })).toThrow(/valid IANA timezone/);
    });

    test('throws when hour is out of range', () => {
        expect(() => normalizeReportPreferences({}, { hour: 99 })).toThrow(/hour must be between/);
    });

    test('throws when minute is out of range', () => {
        expect(() => normalizeReportPreferences({}, { minute: 99 })).toThrow(/minute must be between/);
    });

    test('throws when lookbackDays is out of range', () => {
        expect(() => normalizeReportPreferences({}, { lookbackDays: 5000 })).toThrow(/lookbackDays must be between/);
    });

    test('throws when weekly dayOfWeek is invalid', () => {
        expect(() => normalizeReportPreferences({}, { frequency: 'weekly', dayOfWeek: 99 })).toThrow(/dayOfWeek must be between/);
    });

    test('throws when monthly dayOfMonth is invalid', () => {
        expect(() => normalizeReportPreferences({}, { frequency: 'monthly', dayOfMonth: 0 })).toThrow(/dayOfMonth must be between/);
    });
});

describe('getNextRunAt', () => {
    test('returns null when scheduling is disabled', () => {
        expect(getNextRunAt({ enabled: false })).toBeNull();
    });

    test('throws when afterDate is invalid', () => {
        expect(() => getNextRunAt({ enabled: true, frequency: 'daily' }, new Date('not-a-date'))).toThrow();
    });

    test('returns the next daily run later today when the time has not yet passed', () => {
        const next = getNextRunAt({
            enabled: true,
            frequency: 'daily',
            timezone: 'UTC',
            hour: 23,
            minute: 0
        }, new Date('2026-04-20T01:00:00.000Z'));

        expect(next.toISOString()).toBe('2026-04-20T23:00:00.000Z');
    });

    test('rolls over to the following day when the time has already passed today', () => {
        const next = getNextRunAt({
            enabled: true,
            frequency: 'daily',
            timezone: 'UTC',
            hour: 0,
            minute: 0
        }, new Date('2026-04-20T01:00:00.000Z'));

        expect(next.toISOString()).toBe('2026-04-21T00:00:00.000Z');
    });

    test('computes weekly runs in the requested timezone', () => {
        const next = getNextRunAt({
            enabled: true,
            frequency: 'weekly',
            timezone: 'Asia/Bangkok',
            dayOfWeek: 1,
            hour: 9,
            minute: 30
        }, new Date('2026-04-20T03:00:00.000Z'));

        expect(next.toISOString()).toBe('2026-04-27T02:30:00.000Z');
    });

    test('rolls forward seven days when the chosen weekly slot has already passed', () => {
        const next = getNextRunAt({
            enabled: true,
            frequency: 'weekly',
            timezone: 'UTC',
            dayOfWeek: 1,
            hour: 0,
            minute: 0
        }, new Date('2026-04-20T01:00:00.000Z'));

        expect(next.toISOString()).toBe('2026-04-27T00:00:00.000Z');
    });

    test('schedules a monthly run later this month when the day has not passed yet', () => {
        const next = getNextRunAt({
            enabled: true,
            frequency: 'monthly',
            timezone: 'UTC',
            dayOfMonth: 25,
            hour: 8,
            minute: 0
        }, new Date('2026-04-20T01:00:00.000Z'));

        expect(next.toISOString()).toBe('2026-04-25T08:00:00.000Z');
    });

    test('rolls forward to the next month when the monthly slot is in the past', () => {
        const next = getNextRunAt({
            enabled: true,
            frequency: 'monthly',
            timezone: 'UTC',
            dayOfMonth: 1,
            hour: 0,
            minute: 0
        }, new Date('2026-04-20T01:00:00.000Z'));

        expect(next.toISOString()).toBe('2026-05-01T00:00:00.000Z');
    });

    test('clamps the day of month for short months', () => {
        const next = getNextRunAt({
            enabled: true,
            frequency: 'monthly',
            timezone: 'UTC',
            dayOfMonth: 31,
            hour: 8,
            minute: 0
        }, new Date('2026-02-15T00:00:00.000Z'));

        expect(next.getUTCMonth()).toBe(1);
        expect(next.getUTCDate()).toBe(28);
    });

    test('rolls into the next month using the clamped day when the current month has already ended', () => {
        const next = getNextRunAt({
            enabled: true,
            frequency: 'monthly',
            timezone: 'UTC',
            dayOfMonth: 31,
            hour: 0,
            minute: 0
        }, new Date('2026-04-30T23:00:00.000Z'));

        expect(next.getUTCMonth()).toBe(4);
        expect(next.getUTCDate()).toBe(31);
    });
});
