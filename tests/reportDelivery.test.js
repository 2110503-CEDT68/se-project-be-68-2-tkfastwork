jest.mock('../utils/email');
jest.mock('../services/reportData');
jest.mock('../utils/reportPdf');

const sendEmail = require('../utils/email');
const { getOwnerReportData } = require('../services/reportData');
const { buildOwnerReportPdf } = require('../utils/reportPdf');
const { buildOwnerReportAssets, sendOwnerReportEmail } = require('../services/reportDelivery');

const fakeReportData = {
    owner: { name: 'Owner Test', email: 'owner@test.com' },
    generatedAt: new Date('2026-04-23T00:00:00.000Z'),
    window: {
        from: new Date('2026-04-01T00:00:00.000Z'),
        to: new Date('2026-04-23T00:00:00.000Z')
    },
    totals: { totalSpaces: 1, totalBookings: 4, totalUniqueUsers: 3 },
    spaces: []
};

beforeEach(() => {
    jest.clearAllMocks();
    getOwnerReportData.mockResolvedValue(fakeReportData);
    buildOwnerReportPdf.mockReturnValue(Buffer.from('%PDF-1.4 fake'));
    sendEmail.mockResolvedValue(undefined);
});

describe('buildOwnerReportAssets', () => {
    test('returns the report data, a PDF buffer and a deterministic filename', async () => {
        const now = new Date('2026-04-23T12:00:00.000Z');
        const assets = await buildOwnerReportAssets({
            ownerId: 'owner-1',
            from: '2026-04-01',
            to: '2026-04-23',
            lookbackDays: 30,
            now
        });

        expect(getOwnerReportData).toHaveBeenCalledWith(expect.objectContaining({
            ownerId: 'owner-1',
            from: '2026-04-01',
            to: '2026-04-23',
            lookbackDays: 30,
            referenceDate: now
        }));
        expect(buildOwnerReportPdf).toHaveBeenCalledWith(fakeReportData);
        expect(Buffer.isBuffer(assets.pdfBuffer)).toBe(true);
        expect(assets.filename).toBe('owner-report-2026-04-23.pdf');
    });

    test('uses the current date for the filename when no `now` is supplied', async () => {
        const assets = await buildOwnerReportAssets({ ownerId: 'owner-1' });
        expect(assets.filename).toMatch(/^owner-report-\d{4}-\d{2}-\d{2}\.pdf$/);
    });
});

describe('sendOwnerReportEmail', () => {
    test('throws when no owner is provided', async () => {
        await expect(sendOwnerReportEmail({})).rejects.toThrow('Owner is required');
    });

    test('throws when the owner has no _id', async () => {
        await expect(sendOwnerReportEmail({ owner: { email: 'x@test.com' } })).rejects.toThrow('Owner is required');
    });

    test('throws when the owner has no email', async () => {
        await expect(sendOwnerReportEmail({ owner: { _id: 'owner-1' } })).rejects.toThrow('Owner email is required');
    });

    test('builds the report and dispatches the email with the PDF attached', async () => {
        const owner = { _id: 'owner-1', email: 'owner@test.com' };
        const result = await sendOwnerReportEmail({
            owner,
            from: '2026-04-01',
            to: '2026-04-23',
            lookbackDays: 30,
            now: new Date('2026-04-23T08:00:00.000Z')
        });

        expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({
            to: 'owner@test.com',
            subject: 'Your scheduled coworking report',
            html: expect.stringContaining('Your coworking report is ready'),
            attachments: [expect.objectContaining({
                filename: 'owner-report-2026-04-23.pdf',
                contentType: 'application/pdf'
            })]
        }));
        expect(result.filename).toBe('owner-report-2026-04-23.pdf');
        expect(result.reportData).toBe(fakeReportData);
    });

    test('uses default `now` when not provided', async () => {
        const owner = { _id: 'owner-1', email: 'owner@test.com' };
        const result = await sendOwnerReportEmail({ owner });
        expect(result.filename).toMatch(/^owner-report-\d{4}-\d{2}-\d{2}\.pdf$/);
        expect(sendEmail).toHaveBeenCalled();
    });
});
