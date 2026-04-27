jest.mock('../models/User');
jest.mock('../services/reportDelivery');

const User = require('../models/User');
const {
    buildOwnerReportAssets,
    sendOwnerReportEmail
} = require('../services/reportDelivery');
const {
    getMyReportPreferences,
    updateMyReportPreferences,
    downloadMyReportPdf,
    sendMyReportNow
} = require('../controllers/reports');

const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    res.setHeader = jest.fn();
    return res;
};

beforeEach(() => {
    jest.clearAllMocks();
});

describe('GET /reports/preferences', () => {
    test('returns the normalised preferences with timing metadata', async () => {
        const lastRun = new Date('2026-04-20T08:00:00.000Z');
        const nextRun = new Date('2026-04-27T08:00:00.000Z');
        User.findById.mockResolvedValue({
            reportPreferences: {
                enabled: true,
                frequency: 'weekly',
                dayOfWeek: 1,
                hour: 8,
                minute: 0,
                timezone: 'UTC',
                lookbackDays: 30,
                lastRunAt: lastRun,
                nextRunAt: nextRun
            }
        });

        const res = mockRes();
        await getMyReportPreferences({ user: { id: 'owner-1' } }, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success: true,
            data: expect.objectContaining({
                enabled: true,
                frequency: 'weekly',
                lastRunAt: lastRun,
                nextRunAt: nextRun
            })
        }));
    });

    test('falls back to default flags when the owner has no saved preferences', async () => {
        User.findById.mockResolvedValue({});

        const res = mockRes();
        await getMyReportPreferences({ user: { id: 'owner-1' } }, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                enabled: false,
                lastRunAt: null,
                nextRunAt: null
            })
        }));
    });

    test('returns 404 when the owner cannot be found', async () => {
        User.findById.mockResolvedValue(null);

        const res = mockRes();
        await getMyReportPreferences({ user: { id: 'missing' } }, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Owner not found' });
    });

    test('returns 500 if the database throws', async () => {
        User.findById.mockRejectedValue(new Error('boom'));

        const res = mockRes();
        await getMyReportPreferences({ user: { id: 'owner-1' } }, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Cannot fetch report preferences' });
    });
});

describe('PUT /reports/preferences', () => {
    test('updates preferences and computes a future nextRunAt when enabled', async () => {
        const owner = {
            reportPreferences: {
                enabled: false,
                frequency: 'weekly',
                dayOfWeek: 1,
                hour: 8,
                minute: 0,
                timezone: 'UTC',
                lookbackDays: 30
            },
            markModified: jest.fn(),
            save: jest.fn().mockResolvedValue(true)
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

        expect(owner.markModified).toHaveBeenCalledWith('reportPreferences');
        expect(owner.save).toHaveBeenCalled();
        expect(owner.reportPreferences.enabled).toBe(true);
        expect(owner.reportPreferences.nextRunAt).toBeInstanceOf(Date);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test('clears nextRunAt when the schedule is being disabled', async () => {
        const owner = {
            reportPreferences: {
                enabled: true,
                frequency: 'weekly',
                dayOfWeek: 1,
                hour: 8,
                minute: 0,
                timezone: 'UTC',
                lookbackDays: 30,
                nextRunAt: new Date()
            },
            markModified: jest.fn(),
            save: jest.fn().mockResolvedValue(true)
        };
        User.findById.mockResolvedValue(owner);

        const req = { user: { id: 'owner-1' }, body: { enabled: false } };
        const res = mockRes();
        await updateMyReportPreferences(req, res);

        expect(owner.reportPreferences.enabled).toBe(false);
        expect(owner.reportPreferences.nextRunAt).toBeNull();
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test('returns 404 when the owner cannot be found', async () => {
        User.findById.mockResolvedValue(null);

        const res = mockRes();
        await updateMyReportPreferences({ user: { id: 'missing' }, body: {} }, res);

        expect(res.status).toHaveBeenCalledWith(404);
    });

    test('returns 400 when validation fails', async () => {
        User.findById.mockResolvedValue({
            reportPreferences: {},
            markModified: jest.fn(),
            save: jest.fn()
        });

        const res = mockRes();
        await updateMyReportPreferences(
            { user: { id: 'owner-1' }, body: { frequency: 'hourly' } },
            res
        );

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });

    test('uses empty object fallback when owner.reportPreferences is null', async () => {
        const owner = {
            reportPreferences: null,
            markModified: jest.fn(),
            save: jest.fn().mockResolvedValue(true)
        };
        User.findById.mockResolvedValue(owner);

        const req = {
            user: { id: 'owner-1' },
            body: { enabled: false }
        };
        const res = mockRes();
        await updateMyReportPreferences(req, res);

        expect(owner.reportPreferences.enabled).toBe(false);
        expect(res.status).toHaveBeenCalledWith(200);
    });
});

describe('GET /reports/pdf', () => {
    test('returns the PDF buffer with download headers', async () => {
        const owner = {
            _id: 'owner-1',
            reportPreferences: { lookbackDays: 14 }
        };
        User.findById.mockResolvedValue(owner);
        buildOwnerReportAssets.mockResolvedValue({
            pdfBuffer: Buffer.from('PDF'),
            filename: 'owner-report-2026-04-23.pdf'
        });

        const res = mockRes();
        await downloadMyReportPdf(
            { user: { id: 'owner-1' }, query: { from: '2026-04-01', to: '2026-04-23' } },
            res
        );

        expect(buildOwnerReportAssets).toHaveBeenCalledWith(expect.objectContaining({
            ownerId: 'owner-1',
            from: '2026-04-01',
            to: '2026-04-23',
            lookbackDays: 14
        }));
        expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
        expect(res.setHeader).toHaveBeenCalledWith(
            'Content-Disposition',
            'attachment; filename="owner-report-2026-04-23.pdf"'
        );
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith(Buffer.from('PDF'));
    });

    test('uses the lookbackDays query parameter when provided', async () => {
        User.findById.mockResolvedValue({ _id: 'owner-1', reportPreferences: {} });
        buildOwnerReportAssets.mockResolvedValue({
            pdfBuffer: Buffer.from('PDF'),
            filename: 'owner-report.pdf'
        });

        await downloadMyReportPdf(
            { user: { id: 'owner-1' }, query: { lookbackDays: '7' } },
            mockRes()
        );

        expect(buildOwnerReportAssets).toHaveBeenCalledWith(expect.objectContaining({ lookbackDays: 7 }));
    });

    test('returns 404 when the owner cannot be found', async () => {
        User.findById.mockResolvedValue(null);

        const res = mockRes();
        await downloadMyReportPdf({ user: { id: 'missing' }, query: {} }, res);

        expect(res.status).toHaveBeenCalledWith(404);
    });

    test('returns 400 when PDF generation fails', async () => {
        User.findById.mockResolvedValue({ _id: 'owner-1', reportPreferences: {} });
        buildOwnerReportAssets.mockRejectedValue(new Error('No data'));

        const res = mockRes();
        await downloadMyReportPdf({ user: { id: 'owner-1' }, query: {} }, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ success: false, message: 'No data' });
    });
});

describe('POST /reports/send-now', () => {
    test('sends the report and persists run timestamps when scheduling is enabled', async () => {
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
            markModified: jest.fn(),
            save: jest.fn().mockResolvedValue(true)
        };
        User.findById.mockResolvedValue(owner);
        sendOwnerReportEmail.mockResolvedValue({ filename: 'owner-report.pdf' });

        const res = mockRes();
        await sendMyReportNow({ user: { id: 'owner-1' }, body: {} }, res);

        expect(sendOwnerReportEmail).toHaveBeenCalledWith(expect.objectContaining({
            owner,
            lookbackDays: 30
        }));
        expect(owner.save).toHaveBeenCalled();
        expect(owner.reportPreferences.lastRunAt).toBeInstanceOf(Date);
        expect(owner.reportPreferences.nextRunAt).toBeInstanceOf(Date);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ filename: 'owner-report.pdf', sentTo: 'owner@test.com' })
        }));
    });

    test('does not persist run metadata when scheduling is disabled', async () => {
        const owner = {
            _id: 'owner-2',
            email: 'owner2@test.com',
            reportPreferences: { enabled: false },
            markModified: jest.fn(),
            save: jest.fn().mockResolvedValue(true)
        };
        User.findById.mockResolvedValue(owner);
        sendOwnerReportEmail.mockResolvedValue({ filename: 'owner-report.pdf' });

        const res = mockRes();
        await sendMyReportNow({ user: { id: 'owner-2' }, body: {} }, res);

        expect(owner.save).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test('honours an explicit lookbackDays value supplied in the request body', async () => {
        const owner = {
            _id: 'owner-1',
            email: 'owner@test.com',
            reportPreferences: { enabled: false },
            markModified: jest.fn(),
            save: jest.fn()
        };
        User.findById.mockResolvedValue(owner);
        sendOwnerReportEmail.mockResolvedValue({ filename: 'owner-report.pdf' });

        await sendMyReportNow(
            { user: { id: 'owner-1' }, body: { lookbackDays: '5', from: '2026-04-01', to: '2026-04-23' } },
            mockRes()
        );

        expect(sendOwnerReportEmail).toHaveBeenCalledWith(expect.objectContaining({
            lookbackDays: 5,
            from: '2026-04-01',
            to: '2026-04-23'
        }));
    });

    test('returns 404 when the owner cannot be found', async () => {
        User.findById.mockResolvedValue(null);

        const res = mockRes();
        await sendMyReportNow({ user: { id: 'missing' }, body: {} }, res);

        expect(res.status).toHaveBeenCalledWith(404);
    });

    test('returns 400 when delivery throws', async () => {
        User.findById.mockResolvedValue({
            _id: 'owner-1',
            email: 'owner@test.com',
            reportPreferences: { enabled: true, frequency: 'weekly', dayOfWeek: 1, hour: 8, minute: 0, timezone: 'UTC', lookbackDays: 30 },
            markModified: jest.fn(),
            save: jest.fn()
        });
        sendOwnerReportEmail.mockRejectedValue(new Error('email broken'));

        const res = mockRes();
        await sendMyReportNow({ user: { id: 'owner-1' }, body: {} }, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ success: false, message: 'email broken' });
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Branch coverage: owner.reportPreferences || {} falsy branch (lines 41, 97)
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /reports/preferences — reportPreferences null branch (line 41)', () => {
    test('handles owner with null reportPreferences without throwing', async () => {
        User.findById.mockResolvedValue({ reportPreferences: null });

        const res = mockRes();
        await getMyReportPreferences({ user: { id: 'owner-1' } }, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                enabled: false,
                lastRunAt: null,
                nextRunAt: null
            })
        }));
    });
});

describe('POST /reports/send-now — reportPreferences null branch (line 97)', () => {
    test('handles owner with null reportPreferences without throwing', async () => {
        const owner = {
            _id: 'owner-1',
            email: 'owner@test.com',
            reportPreferences: null,
            markModified: jest.fn(),
            save: jest.fn().mockResolvedValue(true)
        };
        User.findById.mockResolvedValue(owner);
        sendOwnerReportEmail.mockResolvedValue({ filename: 'owner-report.pdf' });

        const res = mockRes();
        await sendMyReportNow({ user: { id: 'owner-1' }, body: {} }, res);

        expect(res.status).toHaveBeenCalledWith(200);
        // preferences.enabled is false (default), so save is not called
        expect(owner.save).not.toHaveBeenCalled();
    });
});
