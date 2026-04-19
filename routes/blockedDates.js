const express = require('express');
const {
    getBlockedDates,
    blockDate,
    unblockDate
} = require('../controllers/blockedDates');

const router = express.Router({ mergeParams: true });

const { protect, authorize } = require('../middleware/auth');

router.route('/')
    .get(getBlockedDates)
    .post(protect, authorize('admin'), blockDate);

router.route('/:id')
    .delete(protect, authorize('admin'), unblockDate);

module.exports = router;
