jest.mock('../models/Room');
jest.mock('../models/CoworkingSpace');
jest.mock('../models/Reservation');
jest.mock('../utils/email');
jest.mock('mongoose', () => {
    const actual = jest.requireActual('mongoose');
    return {
        ...actual,
        startSession: jest.fn().mockResolvedValue({
            startTransaction: jest.fn(),
            commitTransaction: jest.fn(),
            abortTransaction:  jest.fn(),
            endSession:        jest.fn(),
        }),
    };
});

const Room          = require('../models/Room');
const CoworkingSpace = require('../models/CoworkingSpace');
const Reservation   = require('../models/Reservation');
const sendEmail     = require('../utils/email');

const {
    getRooms,
    getRoomReservations,
    createRoom,
    updateRoom,
    deleteRoom,
} = require('../controllers/rooms');

function mockRes() {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json   = jest.fn().mockReturnValue(res);
    return res;
}

beforeEach(() => jest.clearAllMocks());

// ─────────────────────────────────────────────────────────────────────────────
// getRooms
// ─────────────────────────────────────────────────────────────────────────────
describe('getRooms', () => {
    function makeRoomChain(docs = [], total = 0) {
        const chain = {
            select: jest.fn().mockReturnThis(),
            sort:   jest.fn().mockReturnThis(),
            skip:   jest.fn().mockReturnThis(),
            limit:  jest.fn().mockResolvedValue(docs),
        };
        Room.find.mockReturnValue(chain);
        Room.countDocuments.mockResolvedValue(total);
        return chain;
    }

    test('returns 200 with rooms list', async () => {
        makeRoomChain([{ _id: 'r1' }], 1);
        const req = { query: {}, params: {} };
        const res = mockRes();
        await getRooms(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
        const body = res.json.mock.calls[0][0];
        expect(body.success).toBe(true);
        expect(body.data).toHaveLength(1);
        expect(body.count).toBe(1);
    });

    test('filters by coworkingSpaceId when route param is provided', async () => {
        makeRoomChain([], 0);
        const req = { query: {}, params: { coworkingSpaceId: 'space1' } };
        const res = mockRes();
        await getRooms(req, res);
        const filterArg = Room.find.mock.calls[0][0];
        expect(filterArg.coworkingSpace).toBe('space1');
    });

    test('applies custom sort when provided', async () => {
        const chain = makeRoomChain([], 0);
        const req = { query: { sort: 'name' }, params: {} };
        const res = mockRes();
        await getRooms(req, res);
        expect(chain.sort).toHaveBeenCalledWith('name');
    });

    test('uses default sort (-createdAt) when sort not provided', async () => {
        const chain = makeRoomChain([], 0);
        const req = { query: {}, params: {} };
        const res = mockRes();
        await getRooms(req, res);
        expect(chain.sort).toHaveBeenCalledWith('-createdAt');
    });

    test('includes pagination.next when more pages exist', async () => {
        makeRoomChain([{ _id: 'r1' }], 30);
        const req = { query: { page: '1', limit: '25' }, params: {} };
        const res = mockRes();
        await getRooms(req, res);
        const body = res.json.mock.calls[0][0];
        expect(body.pagination.next).toBeDefined();
        expect(body.pagination.prev).toBeUndefined();
    });

    test('includes pagination.prev when not on first page', async () => {
        makeRoomChain([], 10);
        const req = { query: { page: '2', limit: '5' }, params: {} };
        const res = mockRes();
        await getRooms(req, res);
        const body = res.json.mock.calls[0][0];
        expect(body.pagination.prev).toBeDefined();
    });

    test('returns 500 when DB query throws', async () => {
        const chain = {
            sort:  jest.fn().mockReturnThis(),
            skip:  jest.fn().mockReturnThis(),
            limit: jest.fn().mockRejectedValue(new Error('DB error')),
        };
        Room.find.mockReturnValue(chain);
        Room.countDocuments.mockResolvedValue(0);
        const req = { query: {}, params: {} };
        const res = mockRes();
        await getRooms(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Cannot list rooms' });
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// getRoomReservations
// ─────────────────────────────────────────────────────────────────────────────
describe('getRoomReservations', () => {
    test('returns 404 when room is not found', async () => {
        Room.findById.mockResolvedValue(null);
        const req = { params: { id: 'r1' } };
        const res = mockRes();
        await getRoomReservations(req, res);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Room not found' });
    });

    test('returns 200 with the room\'s reservations', async () => {
        Room.findById.mockResolvedValue({ _id: 'r1' });
        const reservations = [{ _id: 'res1', apptDate: new Date() }];
        Reservation.find.mockReturnValue({ select: jest.fn().mockResolvedValue(reservations) });
        const req = { params: { id: 'r1' } };
        const res = mockRes();
        await getRoomReservations(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
        const body = res.json.mock.calls[0][0];
        expect(body.count).toBe(1);
        expect(body.data).toEqual(reservations);
    });

    test('returns 500 when DB throws', async () => {
        Room.findById.mockRejectedValue(new Error('DB error'));
        const req = { params: { id: 'r1' } };
        const res = mockRes();
        await getRoomReservations(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// createRoom (US1-4)
// ─────────────────────────────────────────────────────────────────────────────
describe('createRoom (US1-4)', () => {
    test('returns 400 when coworkingSpaceId is missing from params', async () => {
        const req = { params: {}, body: {}, user: { id: 'u1', role: 'owner' } };
        const res = mockRes();
        await createRoom(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ success: false, message: 'coworkingSpaceId is required' });
    });

    test('returns 404 when co-working space is not found', async () => {
        CoworkingSpace.findById.mockResolvedValue(null);
        const req = { params: { coworkingSpaceId: 'space1' }, body: {}, user: { id: 'u1', role: 'user' } };
        const res = mockRes();
        await createRoom(req, res);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Coworking space not found' });
    });

    test('returns 403 when user is not admin and not the owner', async () => {
        CoworkingSpace.findById.mockResolvedValue({
            _id: 'space1',
            owner: { toString: () => 'owner1' },
        });
        const req = { params: { coworkingSpaceId: 'space1' }, body: {}, user: { id: 'other', role: 'user' } };
        const res = mockRes();
        await createRoom(req, res);
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ success: false, message: expect.stringContaining('Not authorized') })
        );
    });

    test('owner can create a room in their space — returns 201', async () => {
        CoworkingSpace.findById.mockResolvedValue({ _id: 'space1', owner: { toString: () => 'owner1' } });
        const room = { _id: 'room1', name: 'Room A' };
        Room.create.mockResolvedValue(room);
        const req = {
            params: { coworkingSpaceId: 'space1' },
            body: { name: 'Room A' },
            user: { id: 'owner1', role: 'owner' },
        };
        const res = mockRes();
        await createRoom(req, res);
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({ success: true, data: room });
    });

    test('admin can create a room in any space — returns 201', async () => {
        CoworkingSpace.findById.mockResolvedValue({ _id: 'space1', owner: { toString: () => 'owner1' } });
        const room = { _id: 'room1', name: 'Room A' };
        Room.create.mockResolvedValue(room);
        const req = {
            params: { coworkingSpaceId: 'space1' },
            body: { name: 'Room A' },
            user: { id: 'admin1', role: 'admin' },
        };
        const res = mockRes();
        await createRoom(req, res);
        expect(res.status).toHaveBeenCalledWith(201);
    });

    test('injects coworkingSpace id into req.body before create', async () => {
        CoworkingSpace.findById.mockResolvedValue({ _id: 'space1', owner: { toString: () => 'owner1' } });
        Room.create.mockResolvedValue({ _id: 'room1' });
        const body = { name: 'Room A' };
        const req = { params: { coworkingSpaceId: 'space1' }, body, user: { id: 'owner1', role: 'owner' } };
        const res = mockRes();
        await createRoom(req, res);
        expect(body.coworkingSpace).toBe('space1');
    });

    test('returns 500 when Room.create throws', async () => {
        CoworkingSpace.findById.mockResolvedValue({ _id: 'space1', owner: { toString: () => 'owner1' } });
        Room.create.mockRejectedValue(new Error('DB error'));
        const req = {
            params: { coworkingSpaceId: 'space1' },
            body: {},
            user: { id: 'owner1', role: 'owner' },
        };
        const res = mockRes();
        await createRoom(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Cannot create room' });
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// updateRoom (US1-5)
// ─────────────────────────────────────────────────────────────────────────────
describe('updateRoom (US1-5)', () => {
    test('returns 404 when room is not found', async () => {
        Room.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(null) });
        const req = { params: { id: 'r1' }, body: {}, user: { id: 'u1', role: 'user' } };
        const res = mockRes();
        await updateRoom(req, res);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Room not found' });
    });

    test('returns 403 when user is not admin and not the space owner', async () => {
        Room.findById.mockReturnValue({
            populate: jest.fn().mockResolvedValue({
                _id: 'r1',
                coworkingSpace: { owner: { toString: () => 'owner1' } },
            }),
        });
        const req = { params: { id: 'r1' }, body: {}, user: { id: 'other', role: 'user' } };
        const res = mockRes();
        await updateRoom(req, res);
        expect(res.status).toHaveBeenCalledWith(403);
    });

    test('owner can update their room — returns 200', async () => {
        const room = { _id: 'r1', coworkingSpace: { owner: { toString: () => 'owner1' } } };
        const updated = { _id: 'r1', name: 'Updated' };
        Room.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(room) });
        Room.findByIdAndUpdate.mockResolvedValue(updated);
        const req = { params: { id: 'r1' }, body: { name: 'Updated' }, user: { id: 'owner1', role: 'owner' } };
        const res = mockRes();
        await updateRoom(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ success: true, data: updated });
    });

    test('admin can update any room — returns 200', async () => {
        const room = { _id: 'r1', coworkingSpace: { owner: { toString: () => 'owner1' } } };
        Room.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(room) });
        Room.findByIdAndUpdate.mockResolvedValue({ _id: 'r1' });
        const req = { params: { id: 'r1' }, body: { name: 'Updated' }, user: { id: 'admin1', role: 'admin' } };
        const res = mockRes();
        await updateRoom(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test('strips coworkingSpace from body to prevent room reassignment', async () => {
        const room = { _id: 'r1', coworkingSpace: { owner: { toString: () => 'owner1' } } };
        Room.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(room) });
        Room.findByIdAndUpdate.mockResolvedValue(room);
        const body = { name: 'New Name', coworkingSpace: 'differentSpace' };
        const req = { params: { id: 'r1' }, body, user: { id: 'owner1', role: 'owner' } };
        const res = mockRes();
        await updateRoom(req, res);
        expect(body.coworkingSpace).toBeUndefined();
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test('returns 500 when findByIdAndUpdate throws', async () => {
        const room = { _id: 'r1', coworkingSpace: { owner: { toString: () => 'owner1' } } };
        Room.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(room) });
        Room.findByIdAndUpdate.mockRejectedValue(new Error('DB error'));
        const req = { params: { id: 'r1' }, body: {}, user: { id: 'owner1', role: 'owner' } };
        const res = mockRes();
        await updateRoom(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Cannot update room' });
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// deleteRoom (US1-6)
// ─────────────────────────────────────────────────────────────────────────────
describe('deleteRoom (US1-6)', () => {
    function mockRoomFindChain(roomValue) {
        const chain = { populate: jest.fn(), session: jest.fn() };
        chain.populate.mockReturnValue(chain);
        chain.session.mockResolvedValue(roomValue);
        Room.findById.mockReturnValue(chain);
    }

    function mockReservationFindChain(reservations) {
        const chain = { populate: jest.fn(), session: jest.fn() };
        chain.populate.mockReturnValue(chain);
        chain.session.mockResolvedValue(reservations);
        Reservation.find.mockReturnValue(chain);
    }

    test('returns 404 when room is not found', async () => {
        mockRoomFindChain(null);
        const req = { params: { id: 'r1' }, user: { id: 'admin1', role: 'admin' } };
        const res = mockRes();
        await deleteRoom(req, res);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ success: false, message: expect.stringContaining('r1') })
        );
    });

    test('returns 403 when user is not admin and not the space owner', async () => {
        mockRoomFindChain({
            _id: 'r1',
            name: 'Room A',
            coworkingSpace: { name: 'Space A', owner: { toString: () => 'owner1' } },
        });
        const req = { params: { id: 'r1' }, user: { id: 'other', role: 'user' } };
        const res = mockRes();
        await deleteRoom(req, res);
        expect(res.status).toHaveBeenCalledWith(403);
    });

    test('admin deletes room and all reservations — returns 200 with summary', async () => {
        const room = {
            _id: 'r1', name: 'Room A',
            coworkingSpace: { name: 'Space A', owner: { toString: () => 'owner1' } },
        };
        mockRoomFindChain(room);
        mockReservationFindChain([]);
        Reservation.deleteMany.mockResolvedValue({ deletedCount: 0 });
        Room.deleteOne.mockResolvedValue({ deletedCount: 1 });

        const req = { params: { id: 'r1' }, user: { id: 'admin1', role: 'admin' } };
        const res = mockRes();
        await deleteRoom(req, res);

        expect(Reservation.deleteMany).toHaveBeenCalled();
        expect(Room.deleteOne).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
        const body = res.json.mock.calls[0][0];
        expect(body.success).toBe(true);
        expect(body.data.roomId).toBe('r1');
        expect(body.data.cancelledReservations).toBe(0);
    });

    test('owner can delete their room — returns 200', async () => {
        const room = {
            _id: 'r1', name: 'Room A',
            coworkingSpace: { name: 'Space A', owner: { toString: () => 'owner1' } },
        };
        mockRoomFindChain(room);
        mockReservationFindChain([]);
        Reservation.deleteMany.mockResolvedValue({ deletedCount: 0 });
        Room.deleteOne.mockResolvedValue({ deletedCount: 1 });

        const req = { params: { id: 'r1' }, user: { id: 'owner1', role: 'owner' } };
        const res = mockRes();
        await deleteRoom(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test('sends cancellation emails to users with affected reservations', async () => {
        const room = {
            _id: 'r1', name: 'Room A',
            coworkingSpace: { name: 'Space A', owner: { toString: () => 'owner1' } },
        };
        mockRoomFindChain(room);
        mockReservationFindChain([
            { _id: 'res1', apptDate: new Date(), apptEnd: new Date(), user: { name: 'Alice', email: 'alice@test.com' } },
            { _id: 'res2', apptDate: new Date(), apptEnd: new Date(), user: { name: 'Bob', email: 'bob@test.com' } },
        ]);
        Reservation.deleteMany.mockResolvedValue({ deletedCount: 2 });
        Room.deleteOne.mockResolvedValue({ deletedCount: 1 });
        sendEmail.mockResolvedValue();

        const req = { params: { id: 'r1' }, user: { id: 'admin1', role: 'admin' } };
        const res = mockRes();
        await deleteRoom(req, res);

        expect(sendEmail).toHaveBeenCalledTimes(2);
        expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: 'alice@test.com' }));
        expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: 'bob@test.com' }));
        const body = res.json.mock.calls[0][0];
        expect(body.data.cancelledReservations).toBe(2);
        expect(body.data.notifiedUsers).toBe(2);
    });

    test('email failure is non-fatal — still responds 200', async () => {
        const room = {
            _id: 'r1', name: 'Room A',
            coworkingSpace: { name: 'Space A', owner: { toString: () => 'owner1' } },
        };
        mockRoomFindChain(room);
        mockReservationFindChain([
            { _id: 'res1', apptDate: new Date(), apptEnd: new Date(), user: { name: 'Alice', email: 'alice@test.com' } },
        ]);
        Reservation.deleteMany.mockResolvedValue({ deletedCount: 1 });
        Room.deleteOne.mockResolvedValue({ deletedCount: 1 });
        sendEmail.mockRejectedValue(new Error('SMTP error'));

        const req = { params: { id: 'r1' }, user: { id: 'admin1', role: 'admin' } };
        const res = mockRes();
        await deleteRoom(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
    });

    test('reservations with no user or email are skipped for notification', async () => {
        const room = {
            _id: 'r1', name: 'Room A',
            coworkingSpace: { name: 'Space A', owner: { toString: () => 'owner1' } },
        };
        mockRoomFindChain(room);
        mockReservationFindChain([
            { _id: 'res1', apptDate: new Date(), apptEnd: new Date(), user: null },
            { _id: 'res2', apptDate: new Date(), apptEnd: new Date(), user: { name: 'NoEmail', email: undefined } },
        ]);
        Reservation.deleteMany.mockResolvedValue({ deletedCount: 2 });
        Room.deleteOne.mockResolvedValue({ deletedCount: 1 });

        const req = { params: { id: 'r1' }, user: { id: 'admin1', role: 'admin' } };
        const res = mockRes();
        await deleteRoom(req, res);

        expect(sendEmail).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
        const body = res.json.mock.calls[0][0];
        expect(body.data.cancelledReservations).toBe(2);
        expect(body.data.notifiedUsers).toBe(0);
    });

    test('returns 500 when DB throws during deletion', async () => {
        const chain = { populate: jest.fn(), session: jest.fn() };
        chain.populate.mockReturnValue(chain);
        chain.session.mockRejectedValue(new Error('DB error'));
        Room.findById.mockReturnValue(chain);

        const req = { params: { id: 'r1' }, user: { id: 'admin1', role: 'admin' } };
        const res = mockRes();
        await deleteRoom(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Cannot delete Room' });
    });
});
