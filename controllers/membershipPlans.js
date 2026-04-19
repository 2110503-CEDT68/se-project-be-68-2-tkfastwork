const MembershipPlan = require('../models/MembershipPlan');

//@desc Get all membership plans
//@route GET /api/v1/membershipPlans
//@access Public
exports.getMembershipPlans = async (req, res, next) => {
    try {
        const plans = await MembershipPlan.find();
        res.status(200).json({ success: true, count: plans.length, data: plans });
    } catch (err) {
        res.status(400).json({ success: false });
    }
};

//@desc Get single membership plan
//@route GET /api/v1/membershipPlans/:id
//@access Public
exports.getMembershipPlan = async (req, res, next) => {
    try {
        const plan = await MembershipPlan.findById(req.params.id);
        if (!plan) {
            return res.status(404).json({ success: false, message: 'Plan not found' });
        }
        res.status(200).json({ success: true, data: plan });
    } catch (err) {
        res.status(400).json({ success: false });
    }
};

//@desc Create membership plan
//@route POST /api/v1/membershipPlans
//@access Private (Admin)
exports.createMembershipPlan = async (req, res, next) => {
    try {
        const plan = await MembershipPlan.create(req.body);
        res.status(201).json({ success: true, data: plan });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

//@desc Update membership plan
//@route PUT /api/v1/membershipPlans/:id
//@access Private (Admin)
exports.updateMembershipPlan = async (req, res, next) => {
    try {
        const plan = await MembershipPlan.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });
        if (!plan) {
            return res.status(404).json({ success: false, message: 'Plan not found' });
        }
        res.status(200).json({ success: true, data: plan });
    } catch (err) {
        res.status(400).json({ success: false });
    }
};

//@desc Delete membership plan
//@route DELETE /api/v1/membershipPlans/:id
//@access Private (Admin)
exports.deleteMembershipPlan = async (req, res, next) => {
    try {
        const plan = await MembershipPlan.findById(req.params.id);
        if (!plan) {
            return res.status(404).json({ success: false, message: 'Plan not found' });
        }
        await plan.deleteOne();
        res.status(200).json({ success: true, data: {} });
    } catch (err) {
        res.status(400).json({ success: false });
    }
};
