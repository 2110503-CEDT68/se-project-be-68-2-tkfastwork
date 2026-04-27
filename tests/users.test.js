const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

describe('User Model Test', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should hash the password before saving', async () => {
        bcrypt.genSalt.mockResolvedValue('fakeSalt');
        bcrypt.hash.mockResolvedValue('hashedPassword');

        const user = new User({
            name: 'Test',
            tel: '0123456789',
            email: 'test@test.com',
            password: 'password123'
        });

        const hooks = User.schema.s.hooks._pres;
        const saveHooks = (typeof hooks.get === 'function' ? hooks.get('save') : hooks['save']) || [];
        
        const targetHook = saveHooks.find(h => typeof h.fn === 'function' && h.fn.toString().includes('genSalt'));

        if (!targetHook) {
            throw new Error('ไม่พบ Pre-save hook ที่มีการเข้ารหัสรหัสผ่าน');
        }

        await targetHook.fn.call(user, jest.fn());

        expect(bcrypt.genSalt).toHaveBeenCalledWith(10);
        expect(bcrypt.hash).toHaveBeenCalledWith('password123', 'fakeSalt');
        expect(user.password).toBe('hashedPassword');
    });

    it('should return a signed JWT token', () => {
        process.env.JWT_SECRET = 'test_secret';
        process.env.JWT_EXPIRE = '30d';

        jwt.sign.mockReturnValue('mock_token');

        const user = new User({ _id: 'user123' });
        const token = user.getSignedJwtToken();

        expect(jwt.sign).toHaveBeenCalledWith(
            { id: user._id },
            'test_secret',
            { expiresIn: '30d' }
        );
        expect(token).toBe('mock_token');
    });

    it('should match user entered password to hashed password', async () => {
        bcrypt.compare.mockResolvedValue(true);

        const user = new User({ password: 'hashedPassword' });
        const isMatch = await user.matchPassword('correctPassword');

        expect(bcrypt.compare).toHaveBeenCalledWith('correctPassword', 'hashedPassword');
        expect(isMatch).toBe(true);
    });

    it('should skip hashing when password is not modified', async () => {
        const user = new User({
            name: 'Test',
            tel: '0123456789',
            email: 'test@test.com',
            password: 'alreadyHashed'
        });

        const hooks = User.schema.s.hooks._pres;
        const saveHooks = (typeof hooks.get === 'function' ? hooks.get('save') : hooks['save']) || [];
        const targetHook = saveHooks.find(h => typeof h.fn === 'function' && h.fn.toString().includes('genSalt'));

        if (!targetHook) {
            throw new Error('Pre-save hook not found');
        }

        // Simulate isModified returning false (password not changed)
        user.isModified = jest.fn().mockReturnValue(false);

        const nextFn = jest.fn();
        await targetHook.fn.call(user, nextFn);

        expect(bcrypt.genSalt).not.toHaveBeenCalled();
        expect(bcrypt.hash).not.toHaveBeenCalled();
    });
});