const express = require('express');
const {
    submitRequest,
    getMyRequests,
    getMyRequest,
    acceptRequest,
    rejectRequest,
    getAllRequests,
    reviewRequest
} = require('../controllers/coworkingSpaceRequests');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * /coworkingSpaceRequests:
 *   post:
 *     summary: Submit a new coworking space request
 *     tags: [Space Requests]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, address, tel, opentime, closetime, description, proofOfOwnership]
 *             properties:
 *               name: { type: string, maxLength: 50 }
 *               address: { type: string }
 *               tel: { type: string, pattern: '^[0-9]{10}$' }
 *               opentime: { type: string, example: '08:00' }
 *               closetime: { type: string, example: '18:00' }
 *               description: { type: string }
 *               pics: { type: array, items: { type: string } }
 *               proofOfOwnership: { type: string }
 *     responses:
 *       201:
 *         description: Request submitted
 *       400:
 *         description: Validation error
 */
router.route('/').post(protect, submitRequest);

/**
 * @swagger
 * /coworkingSpaceRequests/admin/all:
 *   get:
 *     summary: Get all requests (admin)
 *     tags: [Space Requests]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All space requests
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/CoworkingSpaceRequest' }
 */
router.route('/admin/all').get(protect, authorize('admin'), getAllRequests);

/**
 * @swagger
 * /coworkingSpaceRequests/mine:
 *   get:
 *     summary: Get current user's requests
 *     tags: [Space Requests]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User's space requests
 */
router.route('/mine').get(protect, getMyRequests);

/**
 * @swagger
 * /coworkingSpaceRequests/mine/{id}:
 *   get:
 *     summary: Get a specific request by the current user
 *     tags: [Space Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Request details
 *       404:
 *         description: Request not found
 */
router.route('/mine/:id').get(protect, getMyRequest);

/**
 * @swagger
 * /coworkingSpaceRequests/{id}/accept:
 *   post:
 *     summary: Accept a space request (admin)
 *     tags: [Space Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Request accepted, space created, user promoted to owner
 *       404:
 *         description: Request not found
 */
router.route('/:id/accept').post(protect, authorize('admin'), acceptRequest);

/**
 * @swagger
 * /coworkingSpaceRequests/{id}/reject:
 *   post:
 *     summary: Reject a space request (admin)
 *     tags: [Space Requests]
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
 *           schema:
 *             type: object
 *             properties:
 *               rejectionReason: { type: string }
 *     responses:
 *       200:
 *         description: Request rejected
 *       404:
 *         description: Request not found
 */
router.route('/:id/reject').post(protect, authorize('admin'), rejectRequest);

/**
 * @swagger
 * /coworkingSpaceRequests/all:
 *   get:
 *     summary: Get all requests (admin, alternate endpoint)
 *     tags: [Space Requests]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All space requests
 */
router.route('/all').get(protect, authorize('admin'), getAllRequests);

/**
 * @swagger
 * /coworkingSpaceRequests/{id}/review:
 *   patch:
 *     summary: Review a space request (admin)
 *     tags: [Space Requests]
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
 *           schema:
 *             type: object
 *             properties:
 *               status: { type: string, enum: [approved, rejected] }
 *               rejectionReason: { type: string }
 *     responses:
 *       200:
 *         description: Request reviewed
 *       404:
 *         description: Request not found
 */
router.route('/:id/review').patch(protect, authorize('admin'), reviewRequest);

module.exports = router;
