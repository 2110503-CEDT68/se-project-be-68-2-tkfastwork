jest.mock('../models/CoworkingSpace');
jest.mock('../services/reportData');

const CoworkingSpace = require('../models/CoworkingSpace');
const { parseDateRange, getSpaceReportData } = require('../services/reportData');

const { getStats, getInsights } = require('../controllers/stats');

function mockRes() {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json   = jest.fn().mockReturnValue(res);
    return res;
}

beforeEach(() => jest.clearAllMocks());

// ─────────────────────────────────────────────────────────────────────────────
// getStats
// ─────────────────────────────────────────────────────────────────────────────
describe('getStats', () => {
    const fakeReport = {
        totalBookings: 10,
        totalUniqueUsers: 5,
        roomUtilization: [],
        peakHours: [],
        avgBookingDurationMinutes: 60,
        demographicBreakdown: {}
    };

    test('returns 200 with stats data when owner calls', async () => {
        CoworkingSpace.findById.mockResolvedValue({
            _id: 'space1',
            owner: { toString: () => 'user1' }
        });
        parseDateRange.mockReturnValue({ from: new Date(), to: new Date() });
        getSpaceReportData.mockResolvedValue(fakeReport);

        const req = { params: { id: 'space1' }, query: {}, user: { id: 'user1' } };
        const res = mockRes();
        await getStats(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        const body = res.json.mock.calls[0][0];
        expect(body.success).toBe(true);
        expect(body.data.totalBookings).toBe(10);
        expect(body.data.totalUniqueUsers).toBe(5);
    });

    test('returns 404 when space not found', async () => {
        CoworkingSpace.findById.mockResolvedValue(null);

        const req = { params: { id: 'missing' }, query: {}, user: { id: 'user1' } };
        const res = mockRes();
        await getStats(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Coworking space not found' });
    });

    test('returns 403 when user is not the owner', async () => {
        CoworkingSpace.findById.mockResolvedValue({
            _id: 'space1',
            owner: { toString: () => 'owner1' }
        });

        const req = { params: { id: 'space1' }, query: {}, user: { id: 'other' } };
        const res = mockRes();
        await getStats(req, res);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Not authorized - owner only' });
    });

    test('returns 500 on internal error', async () => {
        CoworkingSpace.findById.mockRejectedValue(new Error('DB error'));

        const req = { params: { id: 'space1' }, query: {}, user: { id: 'user1' } };
        const res = mockRes();
        await getStats(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Cannot fetch stats' });
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// getInsights
// ─────────────────────────────────────────────────────────────────────────────
describe('getInsights', () => {
    test('returns 200 with insights data', async () => {
        CoworkingSpace.findById.mockResolvedValue({
            _id: 'space1',
            owner: { toString: () => 'user1' }
        });
        parseDateRange.mockReturnValue({ from: new Date(), to: new Date() });
        getSpaceReportData.mockResolvedValue({ insights: ['Insight A', 'Insight B'] });

        const req = { params: { id: 'space1' }, query: {}, user: { id: 'user1' } };
        const res = mockRes();
        await getInsights(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        const body = res.json.mock.calls[0][0];
        expect(body.success).toBe(true);
        expect(body.data.insights).toHaveLength(2);
    });

    test('returns 404 when space not found', async () => {
        CoworkingSpace.findById.mockResolvedValue(null);

        const req = { params: { id: 'missing' }, query: {}, user: { id: 'user1' } };
        const res = mockRes();
        await getInsights(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Coworking space not found' });
    });

    test('returns 403 when not owner', async () => {
        CoworkingSpace.findById.mockResolvedValue({
            _id: 'space1',
            owner: { toString: () => 'owner1' }
        });

        const req = { params: { id: 'space1' }, query: {}, user: { id: 'other' } };
        const res = mockRes();
        await getInsights(req, res);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Not authorized - owner only' });
    });
});
