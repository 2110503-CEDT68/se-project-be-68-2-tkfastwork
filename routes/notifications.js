const express = require('express');
const {
    getNotifications,
    markAsRead,
    markAllRead
} = require('../controllers/notifications');

const router = express.Router();

const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', getNotifications);
router.put('/readAll', markAllRead);
router.put('/:id/read', markAsRead);

module.exports = router;
