jest.mock('../models/CoworkingSpace');
jest.mock('../services/reportData');
jest.mock('../services/llmInsights');

const CoworkingSpace = require('../models/CoworkingSpace');
const { parseDateRange } = require('../services/reportData');
const { generateAIInsights, generateTopInsights } = require('../services/llmInsights');

const { getAIInsights, getTopInsights } = require('../controllers/aiInsights');

function mockRes() {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json   = jest.fn().mockReturnValue(res);
    return res;
}

beforeEach(() => jest.clearAllMocks());

// ─────────────────────────────────────────────────────────────────────────────
// getAIInsights
// ─────────────────────────────────────────────────────────────────────────────
describe('getAIInsights', () => {
    test('returns 200 with AI insights', async () => {
        CoworkingSpace.findById.mockResolvedValue({
            _id: 'space1',
            owner: { toString: () => 'user1' }
        });
        parseDateRange.mockReturnValue({ from: new Date(), to: new Date() });
        generateAIInsights.mockResolvedValue({ insights: ['AI insight 1'] });

        const req = { params: { id: 'space1' }, query: {}, user: { id: 'user1' } };
        const res = mockRes();
        await getAIInsights(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        const body = res.json.mock.calls[0][0];
        expect(body.success).toBe(true);
        expect(body.data).toEqual({ insights: ['AI insight 1'] });
    });

    test('returns 404 when space not found', async () => {
        CoworkingSpace.findById.mockResolvedValue(null);

        const req = { params: { id: 'missing' }, query: {}, user: { id: 'user1' } };
        const res = mockRes();
        await getAIInsights(req, res);

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
        await getAIInsights(req, res);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Not authorized - owner only' });
    });

    test('returns 503 when OPENROUTER_KEY error', async () => {
        CoworkingSpace.findById.mockResolvedValue({
            _id: 'space1',
            owner: { toString: () => 'user1' }
        });
        parseDateRange.mockReturnValue({ from: new Date(), to: new Date() });
        generateAIInsights.mockRejectedValue(new Error('OPENROUTER_KEY is not configured'));

        const req = { params: { id: 'space1' }, query: {}, user: { id: 'user1' } };
        const res = mockRes();
        await getAIInsights(req, res);

        expect(res.status).toHaveBeenCalledWith(503);
        expect(res.json).toHaveBeenCalledWith({ success: false, message: 'AI service not configured' });
    });

    test('returns 500 on generic error', async () => {
        CoworkingSpace.findById.mockResolvedValue({
            _id: 'space1',
            owner: { toString: () => 'user1' }
        });
        parseDateRange.mockReturnValue({ from: new Date(), to: new Date() });
        generateAIInsights.mockRejectedValue(new Error('Unexpected failure'));

        const req = { params: { id: 'space1' }, query: {}, user: { id: 'user1' } };
        const res = mockRes();
        await getAIInsights(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Cannot generate AI insights' });
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// getTopInsights
// ─────────────────────────────────────────────────────────────────────────────
describe('getTopInsights', () => {
    test('returns 200 with top insights', async () => {
        CoworkingSpace.findById.mockResolvedValue({
            _id: 'space1',
            owner: { toString: () => 'user1' }
        });
        parseDateRange.mockReturnValue({ from: new Date(), to: new Date() });
        generateTopInsights.mockResolvedValue({ top: ['Top insight 1'] });

        const req = { params: { id: 'space1' }, query: {}, user: { id: 'user1' } };
        const res = mockRes();
        await getTopInsights(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        const body = res.json.mock.calls[0][0];
        expect(body.success).toBe(true);
        expect(body.data).toEqual({ top: ['Top insight 1'] });
    });

    test('returns 404 when space not found', async () => {
        CoworkingSpace.findById.mockResolvedValue(null);

        const req = { params: { id: 'missing' }, query: {}, user: { id: 'user1' } };
        const res = mockRes();
        await getTopInsights(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Coworking space not found' });
    });

    test('returns 500 on error', async () => {
        CoworkingSpace.findById.mockResolvedValue({
            _id: 'space1',
            owner: { toString: () => 'user1' }
        });
        parseDateRange.mockReturnValue({ from: new Date(), to: new Date() });
        generateTopInsights.mockRejectedValue(new Error('DB error'));

        const req = { params: { id: 'space1' }, query: {}, user: { id: 'user1' } };
        const res = mockRes();
        await getTopInsights(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Cannot generate top insights' });
    });
});
