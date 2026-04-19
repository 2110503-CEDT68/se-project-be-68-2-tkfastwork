jest.mock('../models/CoworkingSpaceRequest');
jest.mock('../models/CoworkingSpace');
jest.mock('../models/User');
jest.mock('../utils/email');

const CoworkingSpaceRequest = require('../models/CoworkingSpaceRequest');
const CoworkingSpace = require('../models/CoworkingSpace');
const User = require('../models/User');
const sendEmail = require('../utils/email');

const {
    submitRequest,
    getMyRequests,
    getMyRequest,
    acceptRequest,
    rejectRequest,
    reviewRequest,
    getAllRequests,
} = require('../controllers/coworkingSpaceRequests');

function mockRes() {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json   = jest.fn().mockReturnValue(res);
    return res;
}

const VALID_BODY = {
    name: 'My Coworking Space',
    address: '123 Main Street',
    tel: '0812345678',
    opentime: '08:00',
    closetime: '20:00',
    description: 'This is a wonderful coworking space with great amenities and facilities for everyone to enjoy.',
    pics: ['https://example.com/pic1.jpg'],
    proofOfOwnership: 'https://example.com/proof.pdf',
};

beforeEach(() => jest.clearAllMocks());

// ─────────────────────────────────────────────────────────────────────────────
// submitRequest — validation (US1-1)
// ─────────────────────────────────────────────────────────────────────────────
describe('submitRequest — validation (US1-1)', () => {
    test('returns 400 when name is missing', async () => {
        const req = { body: { ...VALID_BODY, name: '' }, user: { id: 'u1', email: null, name: 'User' } };
        const res = mockRes();
        await submitRequest(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json.mock.calls[0][0].errors).toEqual(
            expect.arrayContaining([expect.stringContaining('name is required')])
        );
    });

    test('returns 400 when name contains no letters', async () => {
        const req = { body: { ...VALID_BODY, name: '12345' }, user: { id: 'u1' } };
        const res = mockRes();
        await submitRequest(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json.mock.calls[0][0].errors).toEqual(
            expect.arrayContaining([expect.stringContaining('alphabet')])
        );
    });

    test('returns 400 when name exceeds 50 characters', async () => {
        const req = { body: { ...VALID_BODY, name: 'A'.repeat(51) }, user: { id: 'u1' } };
        const res = mockRes();
        await submitRequest(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json.mock.calls[0][0].errors).toEqual(
            expect.arrayContaining([expect.stringContaining('50 characters')])
        );
    });

    test('returns 400 when address is missing', async () => {
        const req = { body: { ...VALID_BODY, address: '' }, user: { id: 'u1' } };
        const res = mockRes();
        await submitRequest(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json.mock.calls[0][0].errors).toEqual(
            expect.arrayContaining([expect.stringContaining('address is required')])
        );
    });

    test('returns 400 when address contains no letters', async () => {
        const req = { body: { ...VALID_BODY, address: '123 456' }, user: { id: 'u1' } };
        const res = mockRes();
        await submitRequest(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json.mock.calls[0][0].errors).toEqual(
            expect.arrayContaining([expect.stringContaining('alphabet')])
        );
    });

    test('returns 400 when tel is not 10 digits', async () => {
        const req = { body: { ...VALID_BODY, tel: '12345' }, user: { id: 'u1' } };
        const res = mockRes();
        await submitRequest(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json.mock.calls[0][0].errors).toEqual(
            expect.arrayContaining([expect.stringContaining('10 digits')])
        );
    });

    test('returns 400 when opentime is invalid format', async () => {
        const req = { body: { ...VALID_BODY, opentime: '8:00' }, user: { id: 'u1' } };
        const res = mockRes();
        await submitRequest(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json.mock.calls[0][0].errors).toEqual(
            expect.arrayContaining([expect.stringContaining('opentime')])
        );
    });

    test('returns 400 when closetime is invalid format', async () => {
        const req = { body: { ...VALID_BODY, closetime: '8pm' }, user: { id: 'u1' } };
        const res = mockRes();
        await submitRequest(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json.mock.calls[0][0].errors).toEqual(
            expect.arrayContaining([expect.stringContaining('closetime')])
        );
    });

    test('returns 400 when description is missing', async () => {
        const req = { body: { ...VALID_BODY, description: '' }, user: { id: 'u1' } };
        const res = mockRes();
        await submitRequest(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json.mock.calls[0][0].errors).toEqual(
            expect.arrayContaining([expect.stringContaining('description is required')])
        );
    });

    test('returns 400 when description contains no letters', async () => {
        const req = { body: { ...VALID_BODY, description: '1 2 3 4 5 6 7 8 9 10 11 12' }, user: { id: 'u1' } };
        const res = mockRes();
        await submitRequest(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json.mock.calls[0][0].errors).toEqual(
            expect.arrayContaining([expect.stringContaining('alphabet')])
        );
    });

    test('returns 400 when description has fewer than 10 words', async () => {
        const req = { body: { ...VALID_BODY, description: 'Too short description.' }, user: { id: 'u1' } };
        const res = mockRes();
        await submitRequest(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json.mock.calls[0][0].errors).toEqual(
            expect.arrayContaining([expect.stringContaining('at least 10 words')])
        );
    });

    test('returns 400 when description exceeds 1000 words', async () => {
        const longDesc = Array(1001).fill('word').join(' ');
        const req = { body: { ...VALID_BODY, description: longDesc }, user: { id: 'u1' } };
        const res = mockRes();
        await submitRequest(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json.mock.calls[0][0].errors).toEqual(
            expect.arrayContaining([expect.stringContaining('at most 1000 words')])
        );
    });

    test('returns 400 when proofOfOwnership is missing', async () => {
        const req = { body: { ...VALID_BODY, proofOfOwnership: '' }, user: { id: 'u1' } };
        const res = mockRes();
        await submitRequest(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json.mock.calls[0][0].errors).toEqual(
            expect.arrayContaining([expect.stringContaining('proofOfOwnership is required')])
        );
    });

    test('returns 400 when proofOfOwnership is not a URL', async () => {
        const req = { body: { ...VALID_BODY, proofOfOwnership: 'not-a-url' }, user: { id: 'u1' } };
        const res = mockRes();
        await submitRequest(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json.mock.calls[0][0].errors).toEqual(
            expect.arrayContaining([expect.stringContaining('http')])
        );
    });

    test('returns 400 when pics is not an array', async () => {
        const req = { body: { ...VALID_BODY, pics: 'not-an-array' }, user: { id: 'u1' } };
        const res = mockRes();
        await submitRequest(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json.mock.calls[0][0].errors).toEqual(
            expect.arrayContaining([expect.stringContaining('pics must be an array')])
        );
    });

    test('returns 400 when a pic entry is not a URL', async () => {
        const req = { body: { ...VALID_BODY, pics: ['not-a-url'] }, user: { id: 'u1' } };
        const res = mockRes();
        await submitRequest(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json.mock.calls[0][0].errors).toEqual(
            expect.arrayContaining([expect.stringContaining('pics[0]')])
        );
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// submitRequest — success & DB errors (US1-1)
// ─────────────────────────────────────────────────────────────────────────────
describe('submitRequest — success & errors (US1-1)', () => {
    test('returns 201 with created request for valid body', async () => {
        const created = { _id: 'req1', ...VALID_BODY };
        CoworkingSpaceRequest.create.mockResolvedValue(created);
        const req = { body: { ...VALID_BODY }, user: { id: 'u1', email: null, name: 'User' } };
        const res = mockRes();
        await submitRequest(req, res);
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({ success: true, data: created });
    });

    test('sends confirmation email when user has an email address', async () => {
        CoworkingSpaceRequest.create.mockResolvedValue({ _id: 'req1', name: VALID_BODY.name });
        sendEmail.mockResolvedValue();
        const req = { body: { ...VALID_BODY }, user: { id: 'u1', email: 'user@test.com', name: 'Alice' } };
        const res = mockRes();
        await submitRequest(req, res);
        expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: 'user@test.com' }));
        expect(res.status).toHaveBeenCalledWith(201);
    });

    test('email failure is non-fatal — still returns 201', async () => {
        CoworkingSpaceRequest.create.mockResolvedValue({ _id: 'req1', name: VALID_BODY.name });
        sendEmail.mockRejectedValue(new Error('SMTP error'));
        const req = { body: { ...VALID_BODY }, user: { id: 'u1', email: 'user@test.com', name: 'Alice' } };
        const res = mockRes();
        await submitRequest(req, res);
        expect(res.status).toHaveBeenCalledWith(201);
    });

    test('returns 500 when CoworkingSpaceRequest.create throws', async () => {
        CoworkingSpaceRequest.create.mockRejectedValue(new Error('DB error'));
        const req = { body: { ...VALID_BODY }, user: { id: 'u1', email: null } };
        const res = mockRes();
        await submitRequest(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Cannot submit request' });
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// getMyRequests (US1-1)
// ─────────────────────────────────────────────────────────────────────────────
describe('getMyRequests (US1-1)', () => {
    test('returns 200 with the logged-in user\'s requests', async () => {
        const requests = [{ _id: 'r1' }, { _id: 'r2' }];
        CoworkingSpaceRequest.find.mockReturnValue({ sort: jest.fn().mockResolvedValue(requests) });
        const req = { user: { id: 'u1' } };
        const res = mockRes();
        await getMyRequests(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ success: true, count: 2, data: requests });
    });

    test('filters by submitter id', async () => {
        CoworkingSpaceRequest.find.mockReturnValue({ sort: jest.fn().mockResolvedValue([]) });
        const req = { user: { id: 'u1' } };
        const res = mockRes();
        await getMyRequests(req, res);
        expect(CoworkingSpaceRequest.find).toHaveBeenCalledWith({ submitter: 'u1' });
    });

    test('returns 500 when DB throws', async () => {
        CoworkingSpaceRequest.find.mockReturnValue({
            sort: jest.fn().mockRejectedValue(new Error('DB error')),
        });
        const req = { user: { id: 'u1' } };
        const res = mockRes();
        await getMyRequests(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Cannot fetch requests' });
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// getMyRequest (US1-1)
// ─────────────────────────────────────────────────────────────────────────────
describe('getMyRequest (US1-1)', () => {
    test('returns 404 when request is not found', async () => {
        CoworkingSpaceRequest.findById.mockResolvedValue(null);
        const req = { params: { id: 'r1' }, user: { id: 'u1', role: 'user' } };
        const res = mockRes();
        await getMyRequest(req, res);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Request not found' });
    });

    test('returns 403 when user is not the submitter and not admin', async () => {
        CoworkingSpaceRequest.findById.mockResolvedValue({
            _id: 'r1',
            submitter: { toString: () => 'owner1' },
        });
        const req = { params: { id: 'r1' }, user: { id: 'other', role: 'user' } };
        const res = mockRes();
        await getMyRequest(req, res);
        expect(res.status).toHaveBeenCalledWith(403);
    });

    test('returns 200 when user is the submitter', async () => {
        const request = { _id: 'r1', submitter: { toString: () => 'u1' } };
        CoworkingSpaceRequest.findById.mockResolvedValue(request);
        const req = { params: { id: 'r1' }, user: { id: 'u1', role: 'user' } };
        const res = mockRes();
        await getMyRequest(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ success: true, data: request });
    });

    test('returns 200 when requester is admin (can view any request)', async () => {
        const request = { _id: 'r1', submitter: { toString: () => 'someoneElse' } };
        CoworkingSpaceRequest.findById.mockResolvedValue(request);
        const req = { params: { id: 'r1' }, user: { id: 'admin1', role: 'admin' } };
        const res = mockRes();
        await getMyRequest(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test('returns 500 when DB throws', async () => {
        CoworkingSpaceRequest.findById.mockRejectedValue(new Error('DB error'));
        const req = { params: { id: 'r1' }, user: { id: 'u1', role: 'user' } };
        const res = mockRes();
        await getMyRequest(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// acceptRequest (US1-2)
// ─────────────────────────────────────────────────────────────────────────────
describe('acceptRequest (US1-2)', () => {
    function makePendingRequest(overrides = {}) {
        return {
            _id: 'req1',
            status: 'pending',
            name: 'Space Name',
            address: '123 Road',
            tel: '0812345678',
            opentime: '08:00',
            closetime: '20:00',
            description: 'A description',
            pics: [],
            submitter: { _id: 'sub1', email: 'sub@test.com', name: 'Submitter' },
            save: jest.fn().mockResolvedValue(true),
            ...overrides,
        };
    }

    test('returns 404 when request not found', async () => {
        CoworkingSpaceRequest.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(null) });
        const req = { params: { id: 'r1' }, user: { id: 'admin1' } };
        const res = mockRes();
        await acceptRequest(req, res);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Request not found' });
    });

    test('returns 400 when request is already approved', async () => {
        CoworkingSpaceRequest.findById.mockReturnValue({
            populate: jest.fn().mockResolvedValue(makePendingRequest({ status: 'approved' })),
        });
        const req = { params: { id: 'r1' }, user: { id: 'admin1' } };
        const res = mockRes();
        await acceptRequest(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: expect.stringContaining('approved') })
        );
    });

    test('returns 400 when request is already rejected', async () => {
        CoworkingSpaceRequest.findById.mockReturnValue({
            populate: jest.fn().mockResolvedValue(makePendingRequest({ status: 'rejected' })),
        });
        const req = { params: { id: 'r1' }, user: { id: 'admin1' } };
        const res = mockRes();
        await acceptRequest(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    test('creates CoworkingSpace, promotes submitter to owner, marks request approved → 200', async () => {
        const request = makePendingRequest();
        CoworkingSpaceRequest.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(request) });
        CoworkingSpace.create.mockResolvedValue({ _id: 'space1' });
        const user = { _id: 'sub1', role: 'user', save: jest.fn().mockResolvedValue(true) };
        User.findById.mockResolvedValue(user);
        sendEmail.mockResolvedValue();

        const req = { params: { id: 'req1' }, user: { id: 'admin1' } };
        const res = mockRes();
        await acceptRequest(req, res);

        expect(CoworkingSpace.create).toHaveBeenCalledWith(expect.objectContaining({
            name: 'Space Name',
            owner: 'sub1',
            isVisible: true,
        }));
        expect(user.role).toBe('owner');
        expect(request.status).toBe('approved');
        expect(request.save).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test('sends approval email to the submitter', async () => {
        const request = makePendingRequest();
        CoworkingSpaceRequest.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(request) });
        CoworkingSpace.create.mockResolvedValue({ _id: 'space1' });
        User.findById.mockResolvedValue({ _id: 'sub1', role: 'user', save: jest.fn() });
        sendEmail.mockResolvedValue();

        const req = { params: { id: 'req1' }, user: { id: 'admin1' } };
        const res = mockRes();
        await acceptRequest(req, res);

        expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: 'sub@test.com' }));
    });

    test('email failure is non-fatal — still returns 200', async () => {
        const request = makePendingRequest();
        CoworkingSpaceRequest.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(request) });
        CoworkingSpace.create.mockResolvedValue({ _id: 'space1' });
        User.findById.mockResolvedValue({ _id: 'sub1', role: 'user', save: jest.fn() });
        sendEmail.mockRejectedValue(new Error('SMTP error'));

        const req = { params: { id: 'req1' }, user: { id: 'admin1' } };
        const res = mockRes();
        await acceptRequest(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
    });

    test('returns 500 when DB throws', async () => {
        CoworkingSpaceRequest.findById.mockReturnValue({
            populate: jest.fn().mockRejectedValue(new Error('DB error')),
        });
        const req = { params: { id: 'r1' }, user: { id: 'admin1' } };
        const res = mockRes();
        await acceptRequest(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Cannot accept request' });
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// rejectRequest (US1-2)
// ─────────────────────────────────────────────────────────────────────────────
describe('rejectRequest (US1-2)', () => {
    function makePendingRequest(overrides = {}) {
        return {
            _id: 'req1',
            status: 'pending',
            name: 'Space Name',
            submitter: { _id: 'sub1', email: 'sub@test.com', name: 'Submitter' },
            save: jest.fn().mockResolvedValue(true),
            ...overrides,
        };
    }

    test('returns 404 when request not found', async () => {
        CoworkingSpaceRequest.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(null) });
        const req = { params: { id: 'r1' }, body: { rejectionReason: 'Reason' }, user: { id: 'admin1' } };
        const res = mockRes();
        await rejectRequest(req, res);
        expect(res.status).toHaveBeenCalledWith(404);
    });

    test('returns 400 when request is not pending', async () => {
        CoworkingSpaceRequest.findById.mockReturnValue({
            populate: jest.fn().mockResolvedValue(makePendingRequest({ status: 'rejected' })),
        });
        const req = { params: { id: 'r1' }, body: { rejectionReason: 'Reason' }, user: { id: 'admin1' } };
        const res = mockRes();
        await rejectRequest(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    test('returns 400 when rejectionReason is missing', async () => {
        CoworkingSpaceRequest.findById.mockReturnValue({
            populate: jest.fn().mockResolvedValue(makePendingRequest()),
        });
        const req = { params: { id: 'r1' }, body: {}, user: { id: 'admin1' } };
        const res = mockRes();
        await rejectRequest(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Rejection reason is required' });
    });

    test('returns 400 when rejectionReason is blank whitespace', async () => {
        CoworkingSpaceRequest.findById.mockReturnValue({
            populate: jest.fn().mockResolvedValue(makePendingRequest()),
        });
        const req = { params: { id: 'r1' }, body: { rejectionReason: '   ' }, user: { id: 'admin1' } };
        const res = mockRes();
        await rejectRequest(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    test('marks request as rejected with reason and returns 200', async () => {
        const request = makePendingRequest();
        CoworkingSpaceRequest.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(request) });
        sendEmail.mockResolvedValue();

        const req = { params: { id: 'r1' }, body: { rejectionReason: 'Invalid documents' }, user: { id: 'admin1' } };
        const res = mockRes();
        await rejectRequest(req, res);

        expect(request.status).toBe('rejected');
        expect(request.rejectionReason).toBe('Invalid documents');
        expect(request.save).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test('sends rejection email to the submitter', async () => {
        const request = makePendingRequest();
        CoworkingSpaceRequest.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(request) });
        sendEmail.mockResolvedValue();

        const req = { params: { id: 'r1' }, body: { rejectionReason: 'Invalid' }, user: { id: 'admin1' } };
        const res = mockRes();
        await rejectRequest(req, res);

        expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: 'sub@test.com' }));
    });

    test('email failure is non-fatal — still returns 200', async () => {
        const request = makePendingRequest();
        CoworkingSpaceRequest.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(request) });
        sendEmail.mockRejectedValue(new Error('SMTP error'));

        const req = { params: { id: 'r1' }, body: { rejectionReason: 'Invalid' }, user: { id: 'admin1' } };
        const res = mockRes();
        await rejectRequest(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
    });

    test('returns 500 when DB throws', async () => {
        CoworkingSpaceRequest.findById.mockReturnValue({
            populate: jest.fn().mockRejectedValue(new Error('DB error')),
        });
        const req = { params: { id: 'r1' }, body: { rejectionReason: 'Reason' }, user: { id: 'admin1' } };
        const res = mockRes();
        await rejectRequest(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Cannot reject request' });
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// reviewRequest (US1-2)
// ─────────────────────────────────────────────────────────────────────────────
describe('reviewRequest (US1-2)', () => {
    test('returns 400 when status is missing from body', async () => {
        const req = { params: { id: 'r1' }, body: {}, user: { id: 'admin1' } };
        const res = mockRes();
        await reviewRequest(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: 'Status is required (approved or rejected)' })
        );
    });

    test('returns 400 when status is an invalid value', async () => {
        const req = { params: { id: 'r1' }, body: { status: 'maybe' }, user: { id: 'admin1' } };
        const res = mockRes();
        await reviewRequest(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: expect.stringContaining('Invalid status') })
        );
    });

    test('delegates to acceptRequest when status is "approved"', async () => {
        // acceptRequest will return 404 because request is not found — proves delegation happened
        CoworkingSpaceRequest.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(null) });
        const req = { params: { id: 'r1' }, body: { status: 'approved' }, user: { id: 'admin1' } };
        const res = mockRes();
        await reviewRequest(req, res);
        expect(res.status).toHaveBeenCalledWith(404);
    });

    test('delegates to rejectRequest when status is "rejected"', async () => {
        // rejectRequest will return 404 because request is not found — proves delegation happened
        CoworkingSpaceRequest.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(null) });
        const req = {
            params: { id: 'r1' },
            body: { status: 'rejected', rejectionReason: 'Some reason' },
            user: { id: 'admin1' },
        };
        const res = mockRes();
        await reviewRequest(req, res);
        expect(res.status).toHaveBeenCalledWith(404);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// getAllRequests (US1-2)
// ─────────────────────────────────────────────────────────────────────────────
describe('getAllRequests (US1-2)', () => {
    function makeQueryChain(docs = [], total = 0) {
        const chain = {
            populate: jest.fn().mockReturnThis(),
            select:   jest.fn().mockReturnThis(),
            sort:     jest.fn().mockReturnThis(),
            skip:     jest.fn().mockReturnThis(),
            limit:    jest.fn().mockResolvedValue(docs),
        };
        CoworkingSpaceRequest.find.mockReturnValue(chain);
        CoworkingSpaceRequest.countDocuments.mockResolvedValue(total);
        return chain;
    }

    test('returns 200 with list of requests', async () => {
        makeQueryChain([{ _id: 'r1' }], 1);
        const req = { query: {}, user: { id: 'admin1', role: 'admin' } };
        const res = mockRes();
        await getAllRequests(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
        const body = res.json.mock.calls[0][0];
        expect(body.success).toBe(true);
        expect(body.data).toHaveLength(1);
        expect(body.count).toBe(1);
    });

    test('uses default sort (-createdAt) when sort not provided', async () => {
        const chain = makeQueryChain([], 0);
        const req = { query: {}, user: { id: 'admin1' } };
        const res = mockRes();
        await getAllRequests(req, res);
        expect(chain.sort).toHaveBeenCalledWith('-createdAt');
    });

    test('applies custom sort when provided', async () => {
        const chain = makeQueryChain([], 0);
        const req = { query: { sort: 'status' }, user: { id: 'admin1' } };
        const res = mockRes();
        await getAllRequests(req, res);
        expect(chain.sort).toHaveBeenCalledWith('status');
    });

    test('includes pagination.next when more pages exist', async () => {
        makeQueryChain([{ _id: 'r1' }], 30);
        const req = { query: { page: '1', limit: '25' }, user: { id: 'admin1' } };
        const res = mockRes();
        await getAllRequests(req, res);
        const body = res.json.mock.calls[0][0];
        expect(body.pagination.next).toBeDefined();
        expect(body.pagination.prev).toBeUndefined();
    });

    test('includes pagination.prev when not on first page', async () => {
        makeQueryChain([], 10);
        const req = { query: { page: '2', limit: '5' }, user: { id: 'admin1' } };
        const res = mockRes();
        await getAllRequests(req, res);
        const body = res.json.mock.calls[0][0];
        expect(body.pagination.prev).toBeDefined();
    });

    test('returns 500 when DB query throws', async () => {
        const chain = {
            populate: jest.fn().mockReturnThis(),
            sort:     jest.fn().mockReturnThis(),
            skip:     jest.fn().mockReturnThis(),
            limit:    jest.fn().mockRejectedValue(new Error('DB error')),
        };
        CoworkingSpaceRequest.find.mockReturnValue(chain);
        CoworkingSpaceRequest.countDocuments.mockResolvedValue(0);
        const req = { query: {}, user: { id: 'admin1' } };
        const res = mockRes();
        await getAllRequests(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Cannot fetch requests' });
    });
});
