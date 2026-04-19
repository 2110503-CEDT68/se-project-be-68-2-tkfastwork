const express = require('express'); 
const { getReservations, getReservation, addReservation, updateReservation, deleteReservation, getReservationPublic } = require('../controllers/reservations');

const router = express.Router({ mergeParams: true }); 

const {protect, authorize} = require('../middleware/auth'); 

router.route('/public/:id').get(getReservationPublic);
router.route('/').get(protect, getReservations).post(protect, authorize('admin', 'user', 'owner'), addReservation);
router.route('/:id').get(protect, authorize('admin', 'user', 'owner'), getReservation).put(protect, authorize('admin', 'user', 'owner'), updateReservation).delete(protect, authorize('admin', 'user', 'owner'), deleteReservation);

module.exports = router; 