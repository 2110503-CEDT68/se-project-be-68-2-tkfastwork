jest.mock('../models/User');
jest.mock('../services/reportDelivery');

const User = require('../models/User');
const { sendOwnerReportEmail } = require('../services/reportDelivery');

const ORIGINAL_ENV = { ...process.env };

const loadFreshScheduler = (envOverrides = {}) => {
    let mod;
    jest.isolateModules(() => {
        Object.assign(process.env, envOverrides);
        // Re-register mocks for the isolated module graph
        jest.doMock('../models/User', () => require('../models/User'));
        jest.doMock('../services/reportDelivery', () => require('../services/reportDelivery'));
        mod = require('../services/reportScheduler');
    });
    return mod;
};

afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
});

beforeEach(() => {
    jest.clearAllMocks();
});

describe('runDueOwnerReports', () => {
    let scheduler;

    beforeEach(() => {
        scheduler = require('../services/reportScheduler');
    });

    test('returns zero counts when no owners are due', async () => {
        User.find.mockResolvedValue([]);
        const result = await scheduler.runDueOwnerReports(new Date('2026-04-22T10:00:00.000Z'));
        expect(result).toEqual({ processed: 0, sent: 0 });
        expect(sendOwnerReportEmail).not.toHaveBeenCalled();
    });

    test('sends due reports and advances each owner nextRunAt', async () => {
        const owner = {
            _id: 'owner-1',
            email: 'owner@test.com',
            reportPreferences: {
                enabled: true,
                frequency: 'daily',
                hour: 8,
                minute: 0,
                timezone: 'UTC',
                lookbackDays: 30,
                nextRunAt: new Date('2026-04-22T08:00:00.000Z')
            },
            markModified: jest.fn(),
            save: jest.fn().mockResolvedValue(true)
        };

        User.find.mockResolvedValue([owner]);
        sendOwnerReportEmail.mockResolvedValue({ filename: 'owner-report-2026-04-23.pdf' });

        const now = new Date('2026-04-23T09:00:00.000Z');
        const result = await scheduler.runDueOwnerReports(now);

        expect(result).toEqual({ processed: 1, sent: 1 });
        expect(sendOwnerReportEmail).toHaveBeenCalledWith(expect.objectContaining({
            owner,
            lookbackDays: 30,
            now
        }));
        expect(owner.markModified).toHaveBeenCalledWith('reportPreferences');
        expect(owner.save).toHaveBeenCalled();
        expect(owner.reportPreferences.lastRunAt).toEqual(now);
        expect(owner.reportPreferences.nextRunAt).toBeInstanceOf(Date);
    });

    test('still advances nextRunAt and logs when delivery throws', async () => {
        const owner = {
            _id: 'owner-2',
            email: 'owner2@test.com',
            reportPreferences: {
                enabled: true,
                frequency: 'weekly',
                hour: 8,
                minute: 0,
                timezone: 'UTC',
                lookbackDays: 7,
                dayOfWeek: 1,
                nextRunAt: new Date('2026-04-20T08:00:00.000Z')
            },
            markModified: jest.fn(),
            save: jest.fn().mockResolvedValue(true)
        };

        User.find.mockResolvedValue([owner]);
        sendOwnerReportEmail.mockRejectedValue(new Error('SMTP down'));
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

        const now = new Date('2026-04-21T08:00:00.000Z');
        const result = await scheduler.runDueOwnerReports(now);

        expect(result).toEqual({ processed: 1, sent: 0 });
        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining('Scheduled report delivery failed'),
            'SMTP down'
        );
        expect(owner.save).toHaveBeenCalled();

        consoleSpy.mockRestore();
    });

    test('falls back to the owner _id in the failure log when email is missing', async () => {
        const owner = {
            _id: 'owner-3',
            reportPreferences: {
                enabled: true,
                frequency: 'daily',
                hour: 8,
                minute: 0,
                timezone: 'UTC',
                lookbackDays: 30,
                nextRunAt: new Date('2026-04-20T08:00:00.000Z')
            },
            markModified: jest.fn(),
            save: jest.fn().mockResolvedValue(true)
        };

        User.find.mockResolvedValue([owner]);
        sendOwnerReportEmail.mockRejectedValue(new Error('Owner email is required'));
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

        await scheduler.runDueOwnerReports(new Date('2026-04-21T08:00:00.000Z'));

        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining('owner-3'),
            'Owner email is required'
        );
        consoleSpy.mockRestore();
    });
});

describe('startReportScheduler / stopReportScheduler', () => {
    test('does not start when NODE_ENV is "test"', () => {
        const isolated = loadFreshScheduler({ NODE_ENV: 'test', DISABLE_REPORT_SCHEDULER: 'false' });
        expect(isolated.startReportScheduler()).toBeNull();
        isolated.stopReportScheduler();
    });

    test('does not start when DISABLE_REPORT_SCHEDULER is "true"', () => {
        const isolated = loadFreshScheduler({ NODE_ENV: 'production', DISABLE_REPORT_SCHEDULER: 'true' });
        expect(isolated.startReportScheduler()).toBeNull();
        isolated.stopReportScheduler();
    });

    test('returns the existing handle on subsequent calls and stops cleanly', () => {
        jest.useFakeTimers();
        const isolated = loadFreshScheduler({ NODE_ENV: 'production', DISABLE_REPORT_SCHEDULER: 'false' });
        User.find.mockResolvedValue([]);

        const first = isolated.startReportScheduler();
        const second = isolated.startReportScheduler();

        expect(first).toBe(second);
        expect(first).not.toBeNull();

        isolated.stopReportScheduler();
        // calling stop a second time when already stopped should be a no-op
        isolated.stopReportScheduler();

        jest.useRealTimers();
    });

    test('runs a tick on the configured interval and recovers from poll errors', async () => {
        jest.useFakeTimers();
        const isolated = loadFreshScheduler({
            NODE_ENV: 'production',
            DISABLE_REPORT_SCHEDULER: 'false',
            REPORT_SCHEDULER_POLL_MS: '1000'
        });

        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        User.find.mockRejectedValueOnce(new Error('Mongo blip'));

        isolated.startReportScheduler();
        await jest.advanceTimersByTimeAsync(1000);

        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining('Report scheduler failed'),
            'Mongo blip'
        );

        // Second tick succeeds
        User.find.mockResolvedValueOnce([]);
        await jest.advanceTimersByTimeAsync(1000);

        isolated.stopReportScheduler();
        consoleSpy.mockRestore();
        jest.useRealTimers();
    });

    test('skips overlapping ticks while a prior run is still in flight', async () => {
        jest.useFakeTimers();
        const isolated = loadFreshScheduler({
            NODE_ENV: 'production',
            DISABLE_REPORT_SCHEDULER: 'false',
            REPORT_SCHEDULER_POLL_MS: '1000'
        });

        let resolveFind;
        User.find.mockImplementation(() => new Promise((resolve) => { resolveFind = resolve; }));

        isolated.startReportScheduler();
        await jest.advanceTimersByTimeAsync(1000); // tick 1 starts and is "running"
        await jest.advanceTimersByTimeAsync(1000); // tick 2 fires while still running -> skipped early

        expect(User.find).toHaveBeenCalledTimes(1);

        resolveFind([]);
        isolated.stopReportScheduler();
        jest.useRealTimers();
    });
});
