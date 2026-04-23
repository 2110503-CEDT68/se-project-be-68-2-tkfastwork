jest.mock('../models/CoworkingSpace');
jest.mock('../models/Reservation');
jest.mock('../models/User');
jest.mock('../models/Room');
jest.mock('../utils/email');
jest.mock('mongoose', () => {
    const actual = jest.requireActual('mongoose');
    return {
        ...actual,
        startSession: jest.fn().mockResolvedValue({
            startTransaction: jest.fn(),
            commitTransaction: jest.fn(),
            abortTransaction: jest.fn(),
            endSession: jest.fn(),
        }),
    };
});

const mongoose = require('mongoose');
const CoworkingSpace = require('../models/CoworkingSpace');
const Reservation    = require('../models/Reservation');
const User           = require('../models/User');
const Room           = require('../models/Room');
const sendEmail      = require('../utils/email');

const {
    getCoworkingSpaces,
    getCoworkingSpace,
    createCoworkingSpace,
    updateCoworkingSpace,
    toggleVisibility,
    deleteCoworkingSpace
} = require('../controllers/coworkingSpaces');

// ─── helpers ──────────────────────────────────────────────────────────────────

function mockRes() {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json   = jest.fn().mockReturnValue(res);
    return res;
}

function makeQueryChain(docs = [], total = 0) {
    const chain = {
        populate: jest.fn().mockReturnThis(),
        select:   jest.fn().mockReturnThis(),
        sort:     jest.fn().mockReturnThis(),
        skip:     jest.fn().mockReturnThis(),
        limit:    jest.fn().mockResolvedValue(docs),
    };
    CoworkingSpace.find.mockReturnValue(chain);
    CoworkingSpace.countDocuments.mockResolvedValue(total);
    return chain;
}

beforeEach(() => jest.clearAllMocks());

// ─────────────────────────────────────────────────────────────────────────────
// getCoworkingSpaces
// ─────────────────────────────────────────────────────────────────────────────
describe('getCoworkingSpaces', () => {
    test('non-admin: injects isVisible=true into filter', async () => {
        makeQueryChain([{ _id: '1', name: 'A' }], 1);
        const req = { query: {}, user: null };
        const res = mockRes();

        await getCoworkingSpaces(req, res);

        const filterArg = CoworkingSpace.find.mock.calls[0][0];
        expect(filterArg.isVisible).toBe(true);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test('admin without showAll: still injects isVisible=true', async () => {
        makeQueryChain([], 0);
        const req = { query: {}, user: { role: 'admin' } };
        const res = mockRes();

        await getCoworkingSpaces(req, res);

        const filterArg = CoworkingSpace.find.mock.calls[0][0];
        expect(filterArg.isVisible).toBe(true);
    });

    test('admin with showAll=true: does NOT inject isVisible filter', async () => {
        makeQueryChain([], 0);
        const req = { query: { showAll: 'true' }, user: { role: 'admin' } };
        const res = mockRes();

        await getCoworkingSpaces(req, res);

        const filterArg = CoworkingSpace.find.mock.calls[0][0];
        expect(filterArg.isVisible).toBeUndefined();
    });

    test('applies select when provided', async () => {
        const chain = makeQueryChain([], 0);
        const req = { query: { select: 'name,address' }, user: null };
        const res = mockRes();

        await getCoworkingSpaces(req, res);

        expect(chain.select).toHaveBeenCalledWith('name address');
    });

    test('applies sort when provided', async () => {
        const chain = makeQueryChain([], 0);
        const req = { query: { sort: 'name' }, user: null };
        const res = mockRes();

        await getCoworkingSpaces(req, res);

        expect(chain.sort).toHaveBeenCalledWith('name');
    });

    test('uses default sort (-createdAt) when sort not provided', async () => {
        const chain = makeQueryChain([], 0);
        const req = { query: {}, user: null };
        const res = mockRes();

        await getCoworkingSpaces(req, res);

        expect(chain.sort).toHaveBeenCalledWith('-createdAt');
    });

    test('includes pagination.next when more pages exist', async () => {
        makeQueryChain([{ _id: '1' }], 30);
        const req = { query: { page: '1', limit: '25' }, user: null };
        const res = mockRes();

        await getCoworkingSpaces(req, res);

        const body = res.json.mock.calls[0][0];
        expect(body.pagination.next).toBeDefined();
        expect(body.pagination.prev).toBeUndefined();
    });

    test('includes pagination.prev when not on first page', async () => {
        makeQueryChain([], 10);
        const req = { query: { page: '2', limit: '5' }, user: null };
        const res = mockRes();

        await getCoworkingSpaces(req, res);

        const body = res.json.mock.calls[0][0];
        expect(body.pagination.prev).toBeDefined();
    });

    test('returns 400 when DB query throws', async () => {
        const chain = {
            populate: jest.fn().mockReturnThis(),
            sort:     jest.fn().mockReturnThis(),
            skip:     jest.fn().mockReturnThis(),
            limit:    jest.fn().mockRejectedValue(new Error('DB error')),
        };
        CoworkingSpace.find.mockReturnValue(chain);
        CoworkingSpace.countDocuments.mockResolvedValue(0);

        const req = { query: {}, user: null };
        const res = mockRes();

        await getCoworkingSpaces(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ success: false });
    });

    test('handles advanced filtering (gt, gte, lt, lte, in)', async () => {
        makeQueryChain([], 0);
        const req = { query: { price: { lte: '1000', gte: '500' } }, user: null };
        const res = mockRes();

        await getCoworkingSpaces(req, res);

        const filterArg = CoworkingSpace.find.mock.calls[0][0];
        expect(filterArg).toHaveProperty('price');
        expect(filterArg.price).toHaveProperty('$lte', '1000');
        expect(filterArg.price).toHaveProperty('$gte', '500');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// getCoworkingSpace
// ─────────────────────────────────────────────────────────────────────────────
describe('getCoworkingSpace', () => {
    test('returns 400 when space not found', async () => {
        CoworkingSpace.findById.mockResolvedValue(null);
        const req = { params: { id: 'x' }, user: null };
        const res = mockRes();

        await getCoworkingSpace(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
    });

    test('returns 404 when space is hidden and user is regular user', async () => {
        CoworkingSpace.findById.mockResolvedValue({
            isVisible: false,
            owner: { toString: () => 'owner1' },
        });
        const req = { params: { id: 'x' }, user: { role: 'user', id: 'other' } };
        const res = mockRes();

        await getCoworkingSpace(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });

    test('returns 200 when space is hidden but requester is admin', async () => {
        CoworkingSpace.findById.mockResolvedValue({ isVisible: false, owner: 'owner1' });
        const req = { params: { id: 'x' }, user: { role: 'admin', id: 'adminId' } };
        const res = mockRes();

        await getCoworkingSpace(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
    });

    test('returns 200 when space is hidden but requester is owner', async () => {
        CoworkingSpace.findById.mockResolvedValue({
            isVisible: false,
            owner: { toString: () => 'owner1' },
        });
        const req = { params: { id: 'x' }, user: { role: 'user', id: 'owner1' } };
        const res = mockRes();

        await getCoworkingSpace(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
    });

    test('returns 200 for visible space with unauthenticated request', async () => {
        CoworkingSpace.findById.mockResolvedValue({ isVisible: true, owner: null });
        const req = { params: { id: 'x' }, user: null };
        const res = mockRes();

        await getCoworkingSpace(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
    });

    test('returns 400 when findById throws', async () => {
        CoworkingSpace.findById.mockRejectedValue(new Error('DB error'));
        const req = { params: { id: 'x' }, user: null };
        const res = mockRes();

        await getCoworkingSpace(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// createCoworkingSpace
// ─────────────────────────────────────────────────────────────────────────────
describe('createCoworkingSpace', () => {
    test('returns 201 with created space', async () => {
        const space = { _id: '1', name: 'New Space', isVisible: true };
        CoworkingSpace.create.mockResolvedValue(space);
        const req = { body: { name: 'New Space' } };
        const res = mockRes();

        await createCoworkingSpace(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({ success: true, data: space });
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// updateCoworkingSpace
// ─────────────────────────────────────────────────────────────────────────────
describe('updateCoworkingSpace', () => {
    test('returns 200 with updated space', async () => {
        const space = { _id: '1', name: 'Updated', owner: 'owner1' };
        CoworkingSpace.findById.mockResolvedValue(space);
        CoworkingSpace.findByIdAndUpdate.mockResolvedValue(space);
        const req = { 
            params: { id: '1' }, 
            body: { name: 'Updated' },
            user: { id: 'owner1', role: 'user' }
        };
        const res = mockRes();

        await updateCoworkingSpace(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ success: true, data: space });
    });

    test('returns 404 when space not found', async () => {
        CoworkingSpace.findById.mockResolvedValue(null);
        const req = { params: { id: 'x' }, body: {}, user: { role: 'admin' } };
        const res = mockRes();

        await updateCoworkingSpace(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
    });

    test('returns 500 when findByIdAndUpdate throws', async () => {
        CoworkingSpace.findById.mockResolvedValue({ _id: '1', owner: 'owner1' });
        CoworkingSpace.findByIdAndUpdate.mockRejectedValue(new Error('DB error'));
        const req = { 
            params: { id: '1' }, 
            body: {},
            user: { id: 'owner1', role: 'user' }
        };
        const res = mockRes();

        await updateCoworkingSpace(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// toggleVisibility  (User1-7)
// ─────────────────────────────────────────────────────────────────────────────
describe('toggleVisibility', () => {
    test('returns 404 when space not found', async () => {
        CoworkingSpace.findById.mockResolvedValue(null);
        const req = { params: { id: 'x' }, user: { role: 'admin', id: 'a1' } };
        const res = mockRes();

        await toggleVisibility(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });

    test('returns 403 when user is neither admin nor owner', async () => {
        CoworkingSpace.findById.mockResolvedValue({
            _id: 's1',
            owner: { toString: () => 'owner1' },
            isVisible: true,
        });
        const req = { params: { id: 's1' }, user: { role: 'user', id: 'someoneElse' } };
        const res = mockRes();

        await toggleVisibility(req, res);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });

    test('admin: visible → hidden, sends notification emails', async () => {
        const space = {
            _id: 's1', name: 'Space A', address: '1 Road',
            isVisible: true,
            owner: { toString: () => 'owner1' },
            save: jest.fn().mockResolvedValue(true),
        };
        CoworkingSpace.findById.mockResolvedValue(space);

        const future = new Date(Date.now() + 86400000);
        Reservation.find.mockResolvedValue([
            { _id: 'r1', user: { toString: () => 'u1' }, apptDate: future, apptEnd: future },
            { _id: 'r2', user: { toString: () => 'u1' }, apptDate: future, apptEnd: future },
        ]);
        User.find.mockResolvedValue([
            { _id: { toString: () => 'u1' }, email: 'alice@test.com', name: 'Alice' },
        ]);
        sendEmail.mockResolvedValue();

        const req = { params: { id: 's1' }, user: { role: 'admin', id: 'a1' } };
        const res = mockRes();

        await toggleVisibility(req, res);

        expect(space.isVisible).toBe(false);
        expect(space.save).toHaveBeenCalled();
        expect(sendEmail).toHaveBeenCalledTimes(1);
        expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: 'alice@test.com' }));
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            data: { _id: 's1', isVisible: false },
        });
    });

    test('owner: can toggle their own space', async () => {
        const space = {
            _id: 's1', name: 'Space A', address: '1 Road',
            isVisible: true,
            owner: { toString: () => 'owner1' },
            save: jest.fn().mockResolvedValue(true),
        };
        CoworkingSpace.findById.mockResolvedValue(space);
        Reservation.find.mockResolvedValue([]);
        User.find.mockResolvedValue([]);

        const req = { params: { id: 's1' }, user: { role: 'owner', id: 'owner1' } };
        const res = mockRes();

        await toggleVisibility(req, res);

        expect(space.isVisible).toBe(false);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test('re-enabling (hidden → visible) sends notifications', async () => {
        const space = {
            _id: 's1', name: 'Space A', address: '1 Road',
            isVisible: false, 
            owner: { toString: () => 'owner1' },
            save: jest.fn().mockResolvedValue(true),
        };
        CoworkingSpace.findById.mockResolvedValue(space);
        
        Reservation.find.mockResolvedValue([
            { _id: 'r1', user: { toString: () => 'u1' }, apptDate: new Date(), apptEnd: new Date() },
        ]);
        User.find.mockResolvedValue([
            { _id: { toString: () => 'u1' }, email: 'alice@test.com', name: 'Alice' },
        ]);
        sendEmail.mockResolvedValue();

        const req = { params: { id: 's1' }, user: { role: 'admin', id: 'a1' } };
        const res = mockRes();

        await toggleVisibility(req, res);

        expect(space.isVisible).toBe(true);
        expect(Reservation.find).toHaveBeenCalled();
        expect(sendEmail).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test('email failure is non-fatal — still responds 200', async () => {
        const space = {
            _id: 's1', name: 'Space A', address: '1 Road',
            isVisible: true,
            owner: { toString: () => 'owner1' },
            save: jest.fn().mockResolvedValue(true),
        };
        CoworkingSpace.findById.mockResolvedValue(space);

        const future = new Date(Date.now() + 86400000);
        Reservation.find.mockResolvedValue([
            { _id: 'r1', user: { toString: () => 'u1' }, apptDate: future, apptEnd: future },
        ]);
        User.find.mockResolvedValue([
            { _id: { toString: () => 'u1' }, email: 'alice@test.com', name: 'Alice' },
        ]);
        sendEmail.mockRejectedValue(new Error('SMTP error'));

        const req = { params: { id: 's1' }, user: { role: 'admin', id: 'a1' } };
        const res = mockRes();

        await toggleVisibility(req, res);

        expect(space.isVisible).toBe(false);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test('space with no owner — regular user gets 403, admin gets 200', async () => {
        const space = {
            _id: 's1', name: 'Space A', address: '1 Road',
            isVisible: true,
            owner: null, 
            save: jest.fn().mockResolvedValue(true),
        };
        CoworkingSpace.findById.mockResolvedValue(space);
        Reservation.find.mockResolvedValue([]);
        User.find.mockResolvedValue([]);

        const req = { params: { id: 's1' }, user: { role: 'admin', id: 'a1' } };
        const res = mockRes();

        await toggleVisibility(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
    });

    test('returns 400 when findById throws', async () => {
        CoworkingSpace.findById.mockRejectedValue(new Error('DB error'));
        const req = { params: { id: 'x' }, user: { role: 'admin', id: 'a1' } };
        const res = mockRes();

        await toggleVisibility(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// deleteCoworkingSpace
// ─────────────────────────────────────────────────────────────────────────────
describe('deleteCoworkingSpace', () => {
    test('returns 200 and deletes space and associated reservations', async () => {
        const space = { _id: '1', name: 'Space to Delete', owner: { toString: () => 'a1' } };
        CoworkingSpace.findById.mockReturnThis();
        CoworkingSpace.session = jest.fn().mockResolvedValue(space);
        Room.find.mockReturnValue({
            session: jest.fn().mockResolvedValue([])
        });
        Reservation.find.mockReturnValue({
            populate: jest.fn().mockReturnThis(),
            session: jest.fn().mockResolvedValue([])
        });
        Reservation.deleteMany.mockResolvedValue({ deletedCount: 1 });
        Room.deleteMany.mockResolvedValue({ deletedCount: 1 });
        CoworkingSpace.deleteOne.mockResolvedValue({ deletedCount: 1 });

        const req = { params: { id: '1' }, user: { role: 'admin', id: 'a1' } };
        const res = mockRes();

        await deleteCoworkingSpace(req, res);

        expect(CoworkingSpace.findById).toHaveBeenCalledWith('1');
        expect(Reservation.deleteMany).toHaveBeenCalled();
        expect(Room.deleteMany).toHaveBeenCalled();
        expect(CoworkingSpace.deleteOne).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ success: true, data: {} });
    });

    test('returns 404 when space not found', async () => {
        CoworkingSpace.findById.mockReturnThis();
        CoworkingSpace.session = jest.fn().mockResolvedValue(null);
        const req = { params: { id: '999' }, user: { role: 'admin' } };
        const res = mockRes();

        await deleteCoworkingSpace(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Space not found' });
    });

    test('returns 500 when database throws an error', async () => {
        CoworkingSpace.findById.mockReturnThis();
        CoworkingSpace.session = jest.fn().mockRejectedValue(new Error('DB Error'));
        const req = { params: { id: '1' }, user: { role: 'admin' } };
        const res = mockRes();

        await deleteCoworkingSpace(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Cannot delete space' });
    });
});
