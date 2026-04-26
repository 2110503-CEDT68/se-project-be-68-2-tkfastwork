const express = require('express');
const { getCoworkingSpaces, createCoworkingSpace, updateCoworkingSpace, deleteCoworkingSpace, getCoworkingSpace, toggleVisibility, getMyCoworkingSpaces } = require('../controllers/coworkingSpaces');

const reservationRouter = require('./reservations');
const roomRouter = require('./rooms');

const router = express.Router();

const {protect, authorize} = require('../middleware/auth');

router.use('/:coworkingSpaceId/reservations/', reservationRouter);
router.use('/:coworkingSpaceId/rooms/', roomRouter);

/**
 * @swagger
 * /coworkingSpaces/owner/mine:
 *   get:
 *     summary: Get logged-in owner's coworking spaces
 *     tags: [Coworking Spaces]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 25 }
 *       - in: query
 *         name: sort
 *         schema: { type: string }
 *       - in: query
 *         name: select
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: List of owner's spaces
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 count: { type: integer }
 *                 total: { type: integer }
 *                 pagination: { type: object }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/CoworkingSpace' }
 */
router.route('/owner/mine').get(protect, authorize('user', 'owner'), getMyCoworkingSpaces);

/**
 * @swagger
 * /coworkingSpaces:
 *   get:
 *     summary: Get all coworking spaces
 *     tags: [Coworking Spaces]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 25 }
 *       - in: query
 *         name: sort
 *         schema: { type: string }
 *       - in: query
 *         name: select
 *         schema: { type: string }
 *       - in: query
 *         name: showAll
 *         schema: { type: string, enum: ['true', 'false'] }
 *         description: Show hidden spaces (admin)
 *     responses:
 *       200:
 *         description: List of coworking spaces
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 count: { type: integer }
 *                 pagination: { type: object }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/CoworkingSpace' }
 *   post:
 *     summary: Create a new coworking space
 *     tags: [Coworking Spaces]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, address, tel, opentime, closetime, description]
 *             properties:
 *               name: { type: string, maxLength: 50 }
 *               address: { type: string }
 *               tel: { type: string }
 *               opentime: { type: string, example: '08:00' }
 *               closetime: { type: string, example: '18:00' }
 *               description: { type: string }
 *               pics: { type: array, items: { type: string } }
 *     responses:
 *       201:
 *         description: Space created
 *       400:
 *         description: Validation error
 */
router.route('/').get(getCoworkingSpaces).post(protect, authorize('admin'), createCoworkingSpace);

/**
 * @swagger
 * /coworkingSpaces/{id}:
 *   get:
 *     summary: Get a single coworking space
 *     tags: [Coworking Spaces]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Space details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { $ref: '#/components/schemas/CoworkingSpace' }
 *       400:
 *         description: Space not found
 *   put:
 *     summary: Update a coworking space
 *     tags: [Coworking Spaces]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CoworkingSpace' }
 *     responses:
 *       200:
 *         description: Space updated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Space not found
 *   delete:
 *     summary: Delete a coworking space
 *     tags: [Coworking Spaces]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Space deleted
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Space not found
 */
router.route('/:id').get(getCoworkingSpace).put(protect, authorize('admin', 'owner'), updateCoworkingSpace).delete(protect, authorize('admin', 'owner'), deleteCoworkingSpace);

/**
 * @swagger
 * /coworkingSpaces/{id}/visibility:
 *   patch:
 *     summary: Toggle space visibility (hide/show from public search)
 *     tags: [Coworking Spaces]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Visibility toggled
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id: { type: string }
 *                     isVisible: { type: boolean }
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Space not found
 */
router.route('/:id/visibility').patch(protect, toggleVisibility);

module.exports = router;
