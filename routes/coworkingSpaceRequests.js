const express = require('express');
const {
    submitRequest,
    getMyRequests,
    getMyRequest,
    getAllRequests,
    reviewRequest
} = require('../controllers/coworkingSpaceRequests');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.route('/').post(protect, submitRequest);
router.route('/mine').get(protect, getMyRequests);
router.route('/mine/:id').get(protect, getMyRequest);

router.route('/all').get(protect, authorize('admin'), getAllRequests);
router.route('/:id/review').patch(protect, authorize('admin'), reviewRequest);

module.exports = router;
