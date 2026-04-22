const express = require('express');
const { getStats, getInsights } = require('../controllers/stats');
const { protect } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

router.route('/:id/stats').get(protect, getStats);
router.route('/:id/insights').get(protect, getInsights);

module.exports = router;
