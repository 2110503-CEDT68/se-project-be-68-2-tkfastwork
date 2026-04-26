const express = require('express');
const {
    getMyReportPreferences,
    updateMyReportPreferences,
    downloadMyReportPdf,
    sendMyReportNow
} = require('../controllers/reports');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect, authorize('owner'));

/**
 * @swagger
 * /reports/preferences:
 *   get:
 *     summary: Get current owner's report preferences
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Report preferences
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { $ref: '#/components/schemas/ReportPreferences' }
 *       404:
 *         description: Owner not found
 *   put:
 *     summary: Update report preferences
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ReportPreferences' }
 *     responses:
 *       200:
 *         description: Preferences updated
 *       400:
 *         description: Validation error
 *       404:
 *         description: Owner not found
 */
router.route('/preferences')
    .get(getMyReportPreferences)
    .put(updateMyReportPreferences);

/**
 * @swagger
 * /reports/pdf:
 *   get:
 *     summary: Download owner's PDF report
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: lookbackDays
 *         schema: { type: integer }
 *         description: Override lookback period
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: PDF file download
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Report generation error
 *       404:
 *         description: Owner not found
 */
router.route('/pdf').get(downloadMyReportPdf);

/**
 * @swagger
 * /reports/send-now:
 *   post:
 *     summary: Send report email immediately
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               lookbackDays: { type: integer }
 *               from: { type: string, format: date }
 *               to: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Report sent
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     filename: { type: string }
 *                     sentTo: { type: string }
 *       400:
 *         description: Send error
 *       404:
 *         description: Owner not found
 */
router.route('/send-now').post(sendMyReportNow);

module.exports = router;
