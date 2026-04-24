const express = require('express');
const { getStats, getInsights } = require('../controllers/stats');
const { getAIInsights, getTopInsights } = require('../controllers/aiInsights');
const { protect } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

router.route('/:id/stats').get(protect, getStats);
router.route('/:id/insights').get(protect, getInsights);
router.route('/:id/ai-insights').get(protect, getAIInsights);
router.route('/:id/top-insights').get(protect, getTopInsights);

module.exports = router;
