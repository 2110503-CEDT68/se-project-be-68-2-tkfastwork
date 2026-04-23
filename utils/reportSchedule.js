const DEFAULT_REPORT_TIMEZONE = process.env.DEFAULT_REPORT_TIMEZONE || 'UTC';
const DEFAULT_REPORT_HOUR = 8;
const DEFAULT_REPORT_MINUTE = 0;
const DEFAULT_LOOKBACK_DAYS = 30;
const VALID_FREQUENCIES = ['daily', 'weekly', 'monthly'];
const WEEKDAY_TO_INDEX = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6
};

const isValidDate = (value) => value instanceof Date && !Number.isNaN(value.getTime());

const toIntegerOrDefault = (value, fallback) => {
    if (value === undefined || value === null || value === '') return fallback;
    const parsed = Number.parseInt(value, 10);
    return Number.isInteger(parsed) ? parsed : fallback;
};

const assertRange = (value, min, max, fieldName) => {
    if (!Number.isInteger(value) || value < min || value > max) {
        throw new Error(`${fieldName} must be between ${min} and ${max}`);
    }
};

const validateTimeZone = (timeZone) => {
    try {
        Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
        return true;
    } catch (err) {
        return false;
    }
};

const getTimeZoneParts = (date, timeZone = DEFAULT_REPORT_TIMEZONE) => {
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });

    const parts = formatter.formatToParts(date);
    const getPart = (type) => parts.find((part) => part.type === type)?.value;

    return {
        year: Number(getPart('year')),
        month: Number(getPart('month')),
        day: Number(getPart('day')),
        hour: Number(getPart('hour')),
        minute: Number(getPart('minute')),
        second: Number(getPart('second')),
        weekdayNumber: WEEKDAY_TO_INDEX[getPart('weekday')]
    };
};

const zonedTimeToUtc = ({ year, month, day, hour, minute, second = 0 }, timeZone) => {
    let utcDate = new Date(Date.UTC(year, month - 1, day, hour, minute, second));

    for (let index = 0; index < 3; index += 1) {
        const currentLocalParts = getTimeZoneParts(utcDate, timeZone);
        const currentLocalTime = Date.UTC(
            currentLocalParts.year,
            currentLocalParts.month - 1,
            currentLocalParts.day,
            currentLocalParts.hour,
            currentLocalParts.minute,
            currentLocalParts.second
        );
        const targetLocalTime = Date.UTC(year, month - 1, day, hour, minute, second);
        const diff = targetLocalTime - currentLocalTime;

        if (diff === 0) {
            return utcDate;
        }

        utcDate = new Date(utcDate.getTime() + diff);
    }

    return utcDate;
};

const addLocalDays = ({ year, month, day }, amount) => {
    const carrier = new Date(Date.UTC(year, month - 1, day));
    carrier.setUTCDate(carrier.getUTCDate() + amount);

    return {
        year: carrier.getUTCFullYear(),
        month: carrier.getUTCMonth() + 1,
        day: carrier.getUTCDate()
    };
};

const addLocalMonths = ({ year, month }, amount) => {
    const carrier = new Date(Date.UTC(year, month - 1, 1));
    carrier.setUTCMonth(carrier.getUTCMonth() + amount);

    return {
        year: carrier.getUTCFullYear(),
        month: carrier.getUTCMonth() + 1
    };
};

const getDaysInMonth = (year, month) => new Date(Date.UTC(year, month, 0)).getUTCDate();

const normalizeReportPreferences = (currentPreferences = {}, updates = {}) => {
    const normalized = {
        enabled: updates.enabled !== undefined
            ? Boolean(updates.enabled)
            : Boolean(currentPreferences.enabled),
        frequency: updates.frequency || currentPreferences.frequency || 'weekly',
        hour: toIntegerOrDefault(updates.hour, toIntegerOrDefault(currentPreferences.hour, DEFAULT_REPORT_HOUR)),
        minute: toIntegerOrDefault(updates.minute, toIntegerOrDefault(currentPreferences.minute, DEFAULT_REPORT_MINUTE)),
        timezone: updates.timezone || currentPreferences.timezone || DEFAULT_REPORT_TIMEZONE,
        dayOfWeek: toIntegerOrDefault(updates.dayOfWeek, toIntegerOrDefault(currentPreferences.dayOfWeek, 1)),
        dayOfMonth: toIntegerOrDefault(updates.dayOfMonth, toIntegerOrDefault(currentPreferences.dayOfMonth, 1)),
        lookbackDays: toIntegerOrDefault(updates.lookbackDays, toIntegerOrDefault(currentPreferences.lookbackDays, DEFAULT_LOOKBACK_DAYS)),
        lastRunAt: currentPreferences.lastRunAt || null,
        nextRunAt: currentPreferences.nextRunAt || null
    };

    if (!VALID_FREQUENCIES.includes(normalized.frequency)) {
        throw new Error(`frequency must be one of: ${VALID_FREQUENCIES.join(', ')}`);
    }

    if (!validateTimeZone(normalized.timezone)) {
        throw new Error('timezone must be a valid IANA timezone');
    }

    assertRange(normalized.hour, 0, 23, 'hour');
    assertRange(normalized.minute, 0, 59, 'minute');
    assertRange(normalized.lookbackDays, 1, 365, 'lookbackDays');

    if (normalized.frequency === 'weekly') {
        assertRange(normalized.dayOfWeek, 0, 6, 'dayOfWeek');
    }

    if (normalized.frequency === 'monthly') {
        assertRange(normalized.dayOfMonth, 1, 31, 'dayOfMonth');
    }

    return normalized;
};

const getNextRunAt = (preferences, afterDate = new Date()) => {
    const schedule = normalizeReportPreferences(preferences);
    if (!schedule.enabled) {
        return null;
    }

    const now = new Date(afterDate);
    if (!isValidDate(now)) {
        throw new Error('afterDate must be a valid date');
    }

    const localNow = getTimeZoneParts(now, schedule.timezone);
    let candidate;

    if (schedule.frequency === 'daily') {
        candidate = zonedTimeToUtc({
            year: localNow.year,
            month: localNow.month,
            day: localNow.day,
            hour: schedule.hour,
            minute: schedule.minute
        }, schedule.timezone);

        if (candidate <= now) {
            const nextLocalDate = addLocalDays(localNow, 1);
            candidate = zonedTimeToUtc({
                ...nextLocalDate,
                hour: schedule.hour,
                minute: schedule.minute
            }, schedule.timezone);
        }

        return candidate;
    }

    if (schedule.frequency === 'weekly') {
        const deltaDays = (schedule.dayOfWeek - localNow.weekdayNumber + 7) % 7;
        const nextLocalDate = addLocalDays(localNow, deltaDays);
        candidate = zonedTimeToUtc({
            ...nextLocalDate,
            hour: schedule.hour,
            minute: schedule.minute
        }, schedule.timezone);

        if (candidate <= now) {
            const followingWeek = addLocalDays(nextLocalDate, 7);
            candidate = zonedTimeToUtc({
                ...followingWeek,
                hour: schedule.hour,
                minute: schedule.minute
            }, schedule.timezone);
        }

        return candidate;
    }

    const currentMonthDay = Math.min(
        schedule.dayOfMonth,
        getDaysInMonth(localNow.year, localNow.month)
    );

    candidate = zonedTimeToUtc({
        year: localNow.year,
        month: localNow.month,
        day: currentMonthDay,
        hour: schedule.hour,
        minute: schedule.minute
    }, schedule.timezone);

    if (candidate <= now) {
        const nextMonth = addLocalMonths(localNow, 1);
        const nextMonthDay = Math.min(
            schedule.dayOfMonth,
            getDaysInMonth(nextMonth.year, nextMonth.month)
        );

        candidate = zonedTimeToUtc({
            year: nextMonth.year,
            month: nextMonth.month,
            day: nextMonthDay,
            hour: schedule.hour,
            minute: schedule.minute
        }, schedule.timezone);
    }

    return candidate;
};

module.exports = {
    DEFAULT_LOOKBACK_DAYS,
    DEFAULT_REPORT_TIMEZONE,
    VALID_FREQUENCIES,
    getNextRunAt,
    getTimeZoneParts,
    normalizeReportPreferences,
    validateTimeZone,
    zonedTimeToUtc
};
