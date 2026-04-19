const express = require('express');
const { getRooms, createRoom, updateRoom, deleteRoom, getRoomReservations } = require('../controllers/rooms');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

router.route('/')
    .get(getRooms)
    .post(protect, authorize('owner', 'admin'), createRoom);

router.route('/:id/reservations').get(protect, getRoomReservations);

router.route('/:id')
    .put(protect, authorize('owner', 'admin'), updateRoom)
    .delete(protect, authorize('owner', 'admin'), deleteRoom);

module.exports = router;
