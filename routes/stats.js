const express = require('express');
const { getStats, getInsights } = require('../controllers/stats');
const { getAIInsights, getTopInsights } = require('../controllers/aiInsights');
const { protect } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

/**
 * @swagger
 * /coworkingSpaces/{id}/stats:
 *   get:
 *     summary: Get dashboard stats for a coworking space
 *     tags: [Stats & Insights]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date }
 *         description: Start date for stats range
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date }
 *         description: End date for stats range
 *     responses:
 *       200:
 *         description: Dashboard statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalBookings: { type: integer }
 *                     totalUniqueUsers: { type: integer }
 *                     roomUtilization: { type: object }
 *                     peakHours: { type: object }
 *                     avgBookingDurationMinutes: { type: number }
 *                     demographicBreakdown: { type: object }
 *       403:
 *         description: Not authorized (owner only)
 *       404:
 *         description: Space not found
 */
router.route('/:id/stats').get(protect, getStats);

/**
 * @swagger
 * /coworkingSpaces/{id}/insights:
 *   get:
 *     summary: Get rule-based insights for a coworking space
 *     tags: [Stats & Insights]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Rule-based insights
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     insights: { type: array, items: { type: object } }
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Space not found
 */
router.route('/:id/insights').get(protect, getInsights);

/**
 * @swagger
 * /coworkingSpaces/{id}/ai-insights:
 *   get:
 *     summary: Get LLM-enhanced insights for a coworking space
 *     tags: [Stats & Insights]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: AI-generated insights
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Space not found
 *       503:
 *         description: AI service not configured
 */
router.route('/:id/ai-insights').get(protect, getAIInsights);

/**
 * @swagger
 * /coworkingSpaces/{id}/top-insights:
 *   get:
 *     summary: Get top priority-ranked insights
 *     tags: [Stats & Insights]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Top priority insights
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Space not found
 */
router.route('/:id/top-insights').get(protect, getTopInsights);

module.exports = router;
