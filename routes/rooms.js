const express = require('express');
const { getRooms, createRoom, updateRoom, deleteRoom, getRoomReservations } = require('../controllers/rooms');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

/**
 * @swagger
 * /coworkingSpaces/{coworkingSpaceId}/rooms:
 *   get:
 *     summary: Get all rooms for a coworking space
 *     tags: [Rooms]
 *     parameters:
 *       - in: path
 *         name: coworkingSpaceId
 *         required: true
 *         schema: { type: string }
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
 *         description: List of rooms
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 count: { type: integer }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Room' }
 *   post:
 *     summary: Create a new room
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: coworkingSpaceId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, capacity, roomType]
 *             properties:
 *               name: { type: string, maxLength: 100 }
 *               description: { type: string, maxLength: 500 }
 *               capacity: { type: integer, minimum: 1 }
 *               roomType: { type: string, enum: [meeting, private office, phone booth] }
 *               facilities: { type: array, items: { type: string } }
 *     responses:
 *       201:
 *         description: Room created
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Space not found
 */
router.route('/')
    .get(getRooms)
    .post(protect, authorize('owner', 'admin'), createRoom);

/**
 * @swagger
 * /coworkingSpaces/{coworkingSpaceId}/rooms/{id}/reservations:
 *   get:
 *     summary: Get all reservations for a specific room
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: coworkingSpaceId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Room reservations
 *       404:
 *         description: Room not found
 */
router.route('/:id/reservations').get(protect, getRoomReservations);

/**
 * @swagger
 * /coworkingSpaces/{coworkingSpaceId}/rooms/{id}:
 *   put:
 *     summary: Update a room
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: coworkingSpaceId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/Room' }
 *     responses:
 *       200:
 *         description: Room updated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Room not found
 *   delete:
 *     summary: Delete a room
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: coworkingSpaceId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Room deleted
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Room not found
 */
router.route('/:id')
    .put(protect, authorize('owner', 'admin'), updateRoom)
    .delete(protect, authorize('owner', 'admin'), deleteRoom);

module.exports = router;
