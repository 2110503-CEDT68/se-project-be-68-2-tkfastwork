const express = require('express');
const {register, login, getMe, logout, updateDetails} = require('../controllers/auth');

const router = express.Router();

const {protect} = require('../middleware/auth');

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, tel, email, password, dateOfBirth, occupation, gender, revenue]
 *             properties:
 *               name: { type: string }
 *               tel: { type: string, pattern: '^[0-9]{10}$' }
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 6 }
 *               role: { type: string, enum: [user] }
 *               dateOfBirth: { type: string, format: date }
 *               occupation: { type: string }
 *               gender: { type: string, enum: [male, female, non-binary, other, prefer not to say] }
 *               revenue: { type: number, minimum: 0 }
 *     responses:
 *       200:
 *         description: User registered successfully, returns JWT token
 *       400:
 *         description: Validation error
 */
router.post('/register', register);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Login successful, returns JWT token
 *       400:
 *         description: Missing credentials or user not found
 *       401:
 *         description: Invalid password
 */
router.post('/login', login);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current logged-in user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { $ref: '#/components/schemas/User' }
 */
router.get('/me', protect, getMe);

/**
 * @swagger
 * /auth/logout:
 *   get:
 *     summary: Logout user and clear cookie
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
router.get('/logout', protect, logout);

/**
 * @swagger
 * /auth/updatedetails:
 *   put:
 *     summary: Update user details
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               email: { type: string, format: email }
 *               tel: { type: string }
 *               dateOfBirth: { type: string, format: date }
 *               occupation: { type: string }
 *               gender: { type: string }
 *               revenue: { type: number }
 *     responses:
 *       200:
 *         description: User details updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { $ref: '#/components/schemas/User' }
 */
router.put('/updatedetails', protect, updateDetails);

module.exports = router;