const express = require('express');
const { getReservations, getReservation, addReservation, updateReservation, deleteReservation, getReservationPublic } = require('../controllers/reservations');

const router = express.Router({ mergeParams: true });

const {protect, authorize} = require('../middleware/auth');

/**
 * @swagger
 * /reservations/public/{id}:
 *   get:
 *     summary: Get reservation details publicly (for QR scan)
 *     tags: [Reservations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Reservation details with populated space, room, and user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { $ref: '#/components/schemas/Reservation' }
 *       404:
 *         description: Reservation not found
 */
router.route('/public/:id').get(getReservationPublic);

/**
 * @swagger
 * /coworkingSpaces/{coworkingSpaceId}/reservations:
 *   get:
 *     summary: Get all reservations (filtered by user role)
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: coworkingSpaceId
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 25 }
 *       - in: query
 *         name: userGender
 *         schema: { type: string }
 *         description: Filter by user gender
 *       - in: query
 *         name: userOccupation
 *         schema: { type: string }
 *         description: Filter by user occupation
 *       - in: query
 *         name: userMinAge
 *         schema: { type: integer }
 *       - in: query
 *         name: userMaxAge
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: List of reservations
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
 *                   items: { $ref: '#/components/schemas/Reservation' }
 *   post:
 *     summary: Create a new reservation
 *     tags: [Reservations]
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
 *             required: [apptDate, room]
 *             properties:
 *               apptDate: { type: string, format: 'date-time', description: 'Must be on the hour and in the future' }
 *               apptEnd: { type: string, format: 'date-time', description: 'Defaults to 1 hour after apptDate' }
 *               room: { type: string, description: 'Room ID' }
 *     responses:
 *       200:
 *         description: Reservation created with QR code
 *       400:
 *         description: Validation error (time conflict, max bookings, etc.)
 *       404:
 *         description: Space or room not found
 */
router.route('/').get(protect, getReservations).post(protect, authorize('admin', 'user', 'owner'), addReservation);

/**
 * @swagger
 * /coworkingSpaces/{coworkingSpaceId}/reservations/{id}:
 *   get:
 *     summary: Get a single reservation
 *     tags: [Reservations]
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
 *         description: Reservation details
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Reservation not found
 *   put:
 *     summary: Update a reservation (reschedule)
 *     tags: [Reservations]
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
 *           schema:
 *             type: object
 *             properties:
 *               apptDate: { type: string, format: 'date-time' }
 *               apptEnd: { type: string, format: 'date-time' }
 *     responses:
 *       200:
 *         description: Reservation updated
 *       400:
 *         description: Cannot modify within 1 hour or time conflict
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Reservation not found
 *   delete:
 *     summary: Delete a reservation
 *     tags: [Reservations]
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
 *         description: Reservation deleted
 *       400:
 *         description: Cannot modify within 1 hour
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Reservation not found
 */
router.route('/:id').get(protect, authorize('admin', 'user', 'owner'), getReservation).put(protect, authorize('admin', 'user', 'owner'), updateReservation).delete(protect, authorize('admin', 'user', 'owner'), deleteReservation);

module.exports = router;