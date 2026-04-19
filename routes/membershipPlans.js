const express = require('express');
const {
    getMembershipPlans,
    getMembershipPlan,
    createMembershipPlan,
    updateMembershipPlan,
    deleteMembershipPlan
} = require('../controllers/membershipPlans');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

router.route('/')
    .get(getMembershipPlans)
    .post(protect, authorize('admin'), createMembershipPlan);

router.route('/:id')
    .get(getMembershipPlan)
    .put(protect, authorize('admin'), updateMembershipPlan)
    .delete(protect, authorize('admin'), deleteMembershipPlan);

module.exports = router;
