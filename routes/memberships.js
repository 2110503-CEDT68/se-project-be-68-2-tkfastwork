const express = require('express');
const {
    getMyMembership,
    subscribe,
    cancelMembership
} = require('../controllers/memberships');

const router = express.Router();

const { protect } = require('../middleware/auth');

router.use(protect); // All membership routes are protected

router.get('/me', getMyMembership);
router.post('/subscribe', subscribe);
router.put('/cancel', cancelMembership);

module.exports = router;
