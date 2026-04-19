const UserMembership = require('../models/UserMembership');
const MembershipPlan = require('../models/MembershipPlan');
const Notification = require('../models/Notification');

//@desc Get current user membership
//@route GET /api/v1/memberships/me
//@access Private
exports.getMyMembership = async (req, res, next) => {
    try {
        const membership = await UserMembership.findOne({ 
            user: req.user.id, 
            status: 'active' 
        }).populate('plan');

        if (!membership) {
            return res.status(200).json({ success: true, data: null });
        }

        res.status(200).json({ success: true, data: membership });
    } catch (err) {
        res.status(400).json({ success: false });
    }
};

//@desc Subscribe to a membership plan
//@route POST /api/v1/memberships/subscribe
//@access Private
exports.subscribe = async (req, res, next) => {
    try {
        const { planId, paymentMethod } = req.body;

        const plan = await MembershipPlan.findById(planId);
        if (!plan) {
            return res.status(404).json({ success: false, message: 'Plan not found' });
        }

        // Check if user already has an active membership
        let currentMembership = await UserMembership.findOne({ 
            user: req.user.id, 
            status: 'active' 
        });

        // Rules: Reset duration on new subscription (MVP)
        if (currentMembership) {
            currentMembership.status = 'cancelled';
            await currentMembership.save();
        }

        const startDate = new Date();
        const endDate = new Date();
        endDate.setMonth(startDate.getMonth() + plan.durationMonths);

        const membership = await UserMembership.create({
            user: req.user.id,
            plan: planId,
            startDate,
            endDate,
            status: 'active',
            paymentStatus: 'completed',
            paymentMethod: paymentMethod || 'Simulated Payment'
        });

        // Trigger Notification
        await Notification.create({
            user: req.user.id,
            type: 'MEMBERSHIP_ACTIVATED',
            message: `Your ${plan.name} membership is now active until ${endDate.toDateString()}.`,
            metadata: { membershipId: membership._id }
        });

        res.status(201).json({ success: true, data: membership });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

//@desc Cancel membership
//@route PUT /api/v1/memberships/cancel
//@access Private
exports.cancelMembership = async (req, res, next) => {
    try {
        const membership = await UserMembership.findOne({ 
            user: req.user.id, 
            status: 'active' 
        });

        if (!membership) {
            return res.status(404).json({ success: false, message: 'No active membership found' });
        }

        membership.status = 'cancelled';
        await membership.save();

        res.status(200).json({ success: true, data: membership });
    } catch (err) {
        res.status(400).json({ success: false });
    }
};
