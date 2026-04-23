jest.mock('../models/User');
jest.mock('../utils/email');
jest.mock('../services/reportData');

const User = require('../models/User');
const sendEmail = require('../utils/email');
const { getNextRunAt, normalizeReportPreferences } = require('../utils/reportSchedule');
const { buildOwnerReportPdf } = require('../utils/reportPdf');
const {
    getMyReportPreferences,
    updateMyReportPreferences,
    sendMyReportNow
} = require('../controllers/reports');
const { getOwnerReportData } = require('../services/reportData');
const { runDueOwnerReports } = require('../services/reportScheduler');

const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    res.setHeader = jest.fn();
    return res;
};

describe('report schedule utilities', () => {
    test('computes the next weekly run in the requested timezone', () => {
        const nextRun = getNextRunAt({
            enabled: true,
            frequency: 'weekly',
            timezone: 'Asia/Bangkok',
            dayOfWeek: 1,
            hour: 9,
            minute: 30
        }, new Date('2026-04-20T03:00:00.000Z'));

        expect(nextRun.toISOString()).toBe('2026-04-27T02:30:00.000Z');
    });

    test('normalizes and validates report preferences', () => {
        const preferences = normalizeReportPreferences({}, {
            enabled: true,
            frequency: 'monthly',
            dayOfMonth: 15,
            hour: 7,
            minute: 45,
            timezone: 'UTC',
            lookbackDays: 14
        });

        expect(preferences).toEqual(expect.objectContaining({
            enabled: true,
            frequency: 'monthly',
            dayOfMonth: 15,
            hour: 7,
            minute: 45,
            timezone: 'UTC',
            lookbackDays: 14
        }));
    });
});

describe('report PDF generation', () => {
    test('builds a valid PDF buffer', () => {
        const buffer = buildOwnerReportPdf({
            owner: { name: 'Owner Test' },
            generatedAt: new Date('2026-04-23T00:00:00.000Z'),
            window: {
                from: new Date('2026-04-01T00:00:00.000Z'),
                to: new Date('2026-04-23T00:00:00.000Z')
            },
            totals: {
                totalSpaces: 1,
                totalBookings: 4,
                totalUniqueUsers: 3
            },
            spaces: [{
                spaceName: 'Focus Hub',
                address: '123 Main Street',
                openTime: '08:00',
                closeTime: '18:00',
                totalBookings: 4,
                totalUniqueUsers: 3,
                avgBookingDurationMinutes: 60,
                peakHours: [{ hour: 9, count: 2 }],
                roomUtilization: [{
                    roomName: 'Atlas',
                    roomType: 'meeting',
                    bookingCount: 4,
                    totalHoursBooked: 4,
                    utilizationPercent: 10
                }],
                insights: [{ message: 'The busiest room was "Atlas" with 4 bookings.' }]
            }]
        });

        expect(buffer.slice(0, 8).toString()).toBe('%PDF-1.4');
        expect(buffer.toString('binary')).toContain('Owner Report');
    });
});

describe('report controllers', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('returns current report preferences for the owner', async () => {
        User.findById.mockResolvedValue({
            reportPreferences: {
                enabled: true,
                frequency: 'weekly',
                dayOfWeek: 1,
                hour: 9,
                minute: 0,
                timezone: 'UTC',
                lookbackDays: 30,
                lastRunAt: null,
                nextRunAt: new Date('2026-04-27T09:00:00.000Z')
            }
        });

        const req = { user: { id: 'owner-1' } };
        const res = mockRes();

        await getMyReportPreferences(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success: true,
            data: expect.objectContaining({ enabled: true, frequency: 'weekly' })
        }));
    });

    test('updates report preferences and stores the next run date', async () => {
        const save = jest.fn().mockResolvedValue(true);
        const markModified = jest.fn();
        const owner = {
            reportPreferences: { enabled: false, frequency: 'weekly', dayOfWeek: 1, hour: 8, minute: 0, timezone: 'UTC', lookbackDays: 30 },
            markModified,
            save
        };

        User.findById.mockResolvedValue(owner);

        const req = {
            user: { id: 'owner-1' },
            body: {
                enabled: true,
                frequency: 'daily',
                hour: 6,
                minute: 15,
                timezone: 'UTC',
                lookbackDays: 7
            }
        };
        const res = mockRes();

        await updateMyReportPreferences(req, res);

        expect(markModified).toHaveBeenCalledWith('reportPreferences');
        expect(save).toHaveBeenCalled();
        expect(owner.reportPreferences).toEqual(expect.objectContaining({
            enabled: true,
            frequency: 'daily',
            hour: 6,
            minute: 15,
            timezone: 'UTC',
            lookbackDays: 7
        }));
        expect(owner.reportPreferences.nextRunAt).toBeInstanceOf(Date);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test('sends a report immediately', async () => {
        const save = jest.fn().mockResolvedValue(true);
        const markModified = jest.fn();
        const owner = {
            _id: 'owner-1',
            email: 'owner@test.com',
            reportPreferences: {
                enabled: true,
                frequency: 'weekly',
                dayOfWeek: 1,
                hour: 8,
                minute: 0,
                timezone: 'UTC',
                lookbackDays: 30
            },
            markModified,
            save
        };

        User.findById.mockResolvedValue(owner);
        getOwnerReportData.mockResolvedValue({
            owner: { name: 'Owner', email: 'owner@test.com' },
            generatedAt: new Date('2026-04-23T00:00:00.000Z'),
            window: { from: new Date('2026-04-01T00:00:00.000Z'), to: new Date('2026-04-23T00:00:00.000Z') },
            totals: { totalSpaces: 1, totalBookings: 3, totalUniqueUsers: 2 },
            spaces: []
        });
        sendEmail.mockResolvedValue(true);

        const req = { user: { id: 'owner-1' }, body: {} };
        const res = mockRes();

        await sendMyReportNow(req, res);

        expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({
            to: 'owner@test.com',
            attachments: [expect.objectContaining({ filename: expect.stringMatching(/owner-report-/) })]
        }));
        expect(save).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
    });
});

describe('report scheduler', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('sends due reports and advances nextRunAt', async () => {
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
        getOwnerReportData.mockResolvedValue({
            owner: { name: 'Owner', email: 'owner@test.com' },
            generatedAt: new Date('2026-04-23T00:00:00.000Z'),
            window: { from: new Date('2026-04-01T00:00:00.000Z'), to: new Date('2026-04-23T00:00:00.000Z') },
            totals: { totalSpaces: 1, totalBookings: 3, totalUniqueUsers: 2 },
            spaces: []
        });
        sendEmail.mockResolvedValue(true);

        const result = await runDueOwnerReports(new Date('2026-04-23T09:00:00.000Z'));

        expect(result).toEqual({ processed: 1, sent: 1 });
        expect(sendEmail).toHaveBeenCalled();
        expect(owner.markModified).toHaveBeenCalledWith('reportPreferences');
        expect(owner.save).toHaveBeenCalled();
        expect(owner.reportPreferences.nextRunAt).toBeInstanceOf(Date);
    });
});
