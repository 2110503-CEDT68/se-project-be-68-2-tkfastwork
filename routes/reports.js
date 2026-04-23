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

router.route('/preferences')
    .get(getMyReportPreferences)
    .put(updateMyReportPreferences);

router.route('/pdf').get(downloadMyReportPdf);
router.route('/send-now').post(sendMyReportNow);

module.exports = router;
