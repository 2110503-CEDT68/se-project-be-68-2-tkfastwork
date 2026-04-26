process.env.JWT_COOKIE_EXPIRE = '30';

jest.mock('../models/User');

const User = require('../models/User');

const { register, login, getMe, updateDetails, logout } = require('../controllers/auth');

function mockRes() {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json   = jest.fn().mockReturnValue(res);
    res.cookie = jest.fn().mockReturnValue(res);
    return res;
}

beforeEach(() => jest.clearAllMocks());

// ─────────────────────────────────────────────────────────────────────────────
// register
// ─────────────────────────────────────────────────────────────────────────────
describe('register', () => {
    test('returns 200 with token on success', async () => {
        const fakeUser = { getSignedJwtToken: jest.fn().mockReturnValue('tok123') };
        User.create.mockResolvedValue(fakeUser);

        const req = { body: { name: 'Alice', email: 'alice@test.com', password: 'pass', role: 'user' } };
        const res = mockRes();
        await register(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.cookie).toHaveBeenCalledWith('token', 'tok123', expect.any(Object));
        expect(res.json).toHaveBeenCalledWith({ success: true, token: 'tok123' });
    });

    test('prevents admin role escalation — role becomes user', async () => {
        const fakeUser = { getSignedJwtToken: jest.fn().mockReturnValue('tok') };
        User.create.mockResolvedValue(fakeUser);

        const req = { body: { name: 'Bad', email: 'bad@test.com', password: 'pass', role: 'admin' } };
        const res = mockRes();
        await register(req, res);

        const createArg = User.create.mock.calls[0][0];
        expect(createArg.role).toBe('user');
    });

    test('returns 400 on creation error', async () => {
        User.create.mockRejectedValue(new Error('Validation failed'));

        const req = { body: { name: 'Alice', email: 'bad-email', password: 'pass' } };
        const res = mockRes();
        await register(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Validation failed' });
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// login
// ─────────────────────────────────────────────────────────────────────────────
describe('login', () => {
    test('returns 400 when email or password missing', async () => {
        const req = { body: { email: 'alice@test.com' } };
        const res = mockRes();
        await login(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ success: false })
        );
    });

    test('returns 400 when user not found', async () => {
        User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });

        const req = { body: { email: 'nobody@test.com', password: 'pass' } };
        const res = mockRes();
        await login(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ success: false })
        );
    });

    test('returns 401 when password does not match', async () => {
        const fakeUser = { matchPassword: jest.fn().mockResolvedValue(false) };
        User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(fakeUser) });

        const req = { body: { email: 'alice@test.com', password: 'wrong' } };
        const res = mockRes();
        await login(req, res);

        expect(res.status).toHaveBeenCalledWith(401);
    });

    test('returns 200 with token on success', async () => {
        const fakeUser = {
            matchPassword: jest.fn().mockResolvedValue(true),
            getSignedJwtToken: jest.fn().mockReturnValue('tok456')
        };
        User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(fakeUser) });

        const req = { body: { email: 'alice@test.com', password: 'correct' } };
        const res = mockRes();
        await login(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.cookie).toHaveBeenCalledWith('token', 'tok456', expect.any(Object));
        expect(res.json).toHaveBeenCalledWith({ success: true, token: 'tok456' });
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// getMe
// ─────────────────────────────────────────────────────────────────────────────
describe('getMe', () => {
    test('returns 200 with user data', async () => {
        const fakeUser = { _id: 'u1', name: 'Alice', email: 'alice@test.com' };
        User.findById.mockResolvedValue(fakeUser);

        const req = { user: { id: 'u1' } };
        const res = mockRes();
        await getMe(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ success: true, data: fakeUser });
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// updateDetails
// ─────────────────────────────────────────────────────────────────────────────
describe('updateDetails', () => {
    test('returns 200 with updated user and removes undefined fields', async () => {
        const updatedUser = { _id: 'u1', name: 'Alice Updated', email: 'alice@test.com' };
        User.findByIdAndUpdate.mockResolvedValue(updatedUser);

        const req = {
            user: { id: 'u1' },
            body: { name: 'Alice Updated', email: 'alice@test.com', tel: undefined }
        };
        const res = mockRes();
        await updateDetails(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ success: true, data: updatedUser });

        const updateArg = User.findByIdAndUpdate.mock.calls[0][1];
        expect(updateArg.tel).toBeUndefined();
        expect(updateArg.name).toBe('Alice Updated');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// logout
// ─────────────────────────────────────────────────────────────────────────────
describe('logout', () => {
    test('returns 200 and clears cookie', async () => {
        const req = {};
        const res = mockRes();
        await logout(req, res);

        expect(res.cookie).toHaveBeenCalledWith('token', 'none', expect.any(Object));
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ success: true, data: {} });
    });
});
