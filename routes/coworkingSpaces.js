const express = require('express');
const { getCoworkingSpaces, createCoworkingSpace, updateCoworkingSpace, deleteCoworkingSpace, getCoworkingSpace, toggleVisibility, getMyCoworkingSpaces } = require('../controllers/coworkingSpaces');

const reservationRouter = require('./reservations');
const roomRouter = require('./rooms');

const router = express.Router();

const {protect, authorize} = require('../middleware/auth');

router.use('/:coworkingSpaceId/reservations/', reservationRouter);
router.use('/:coworkingSpaceId/rooms/', roomRouter);

router.route('/owner/mine').get(protect, authorize('user'), getMyCoworkingSpaces);
router.route('/').get(getCoworkingSpaces).post(protect, authorize('admin'), createCoworkingSpace);
router.route('/:id').get(getCoworkingSpace).put(protect, authorize('admin', 'owner'), updateCoworkingSpace).delete(protect, authorize('admin', 'owner'), deleteCoworkingSpace);

router.route('/:id/visibility').patch(protect, toggleVisibility);

module.exports = router;

