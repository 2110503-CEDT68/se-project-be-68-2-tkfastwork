const mongoose = require('mongoose');
const CoworkingSpaceRequest = require('../models/CoworkingSpaceRequest');
const CoworkingSpace = require('../models/CoworkingSpace');
const sendEmail = require('../utils/email');

const HAS_LETTER = /[a-zA-Z]/;
const URL_LIKE = /^https?:\/\/\S+$/i;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const TEL_RE = /^[0-9]{10}$/;

const wordCount = (s) =>
    String(s || '').trim().split(/\s+/).filter(Boolean).length;

const validateSubmission = (body) => {
    const errors = [];
    const {
        name, address, tel, opentime, closetime,
        description, pics, proofOfOwnership
    } = body;

    if (!name || !String(name).trim()) {
        errors.push('name is required');
    } else if (!HAS_LETTER.test(name)) {
        errors.push('name must contain at least one alphabet');
    } else if (String(name).length > 50) {
        errors.push('name must be 50 characters or fewer');
    }

    if (!address || !String(address).trim()) {
        errors.push('address is required');
    } else if (!HAS_LETTER.test(address)) {
        errors.push('address must contain at least one alphabet');
    }

    if (!tel || !TEL_RE.test(tel)) {
        errors.push('tel must be exactly 10 digits');
    }

    if (!opentime || !TIME_RE.test(opentime)) {
        errors.push('opentime must be in HH:MM format (00:00–23:59)');
    }
    if (!closetime || !TIME_RE.test(closetime)) {
        errors.push('closetime must be in HH:MM format (00:00–23:59)');
    }

    if (!description || !String(description).trim()) {
        errors.push('description is required');
    } else {
        if (!HAS_LETTER.test(description)) {
            errors.push('description must contain at least one alphabet');
        }
        const wc = wordCount(description);
        if (wc < 10) errors.push(`description must be at least 10 words (got ${wc})`);
        if (wc > 1000) errors.push(`description must be at most 1000 words (got ${wc})`);
    }

    if (!proofOfOwnership || !String(proofOfOwnership).trim()) {
        errors.push('proofOfOwnership is required');
    } else if (!URL_LIKE.test(String(proofOfOwnership).trim())) {
        errors.push('proofOfOwnership must be an http(s) URL');
    }

    if (pics !== undefined) {
        if (!Array.isArray(pics)) {
            errors.push('pics must be an array of URL strings');
        } else {
            pics.forEach((p, i) => {
                if (typeof p !== 'string' || !URL_LIKE.test(p.trim())) {
                    errors.push(`pics[${i}] must be an http(s) URL`);
                }
            });
        }
    }

    return errors;
};

//@desc   Submit a new co-working space request (US1-1)
//@route  POST /api/v1/coworkingSpaceRequests
//@access Private (any logged-in user)
exports.submitRequest = async (req, res) => {
    try {
        const errors = validateSubmission(req.body);
        if (errors.length > 0) {
            return res.status(400).json({ success: false, errors });
        }

        const payload = {
            submitter: req.user.id,
            name: req.body.name.trim(),
            address: req.body.address.trim(),
            tel: req.body.tel,
            opentime: req.body.opentime,
            closetime: req.body.closetime,
            description: req.body.description.trim(),
            pics: Array.isArray(req.body.pics) ? req.body.pics.map((p) => p.trim()) : [],
            proofOfOwnership: req.body.proofOfOwnership.trim()
        };

        const request = await CoworkingSpaceRequest.create(payload);

        try {
            if (req.user.email) {
                await sendEmail({
                    to: req.user.email,
                    subject: 'Co-working space request received',
                    html: `
                        <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px">
                            <h2 style="color:#2563EB">Request received</h2>
                            <p>Hi <strong>${req.user.name}</strong>,</p>
                            <p>We've received your request to add <strong>${payload.name}</strong>. It's now pending admin review — you'll get another email when a decision is made.</p>
                            <table style="width:100%;border-collapse:collapse;margin:16px 0">
                                <tr><td style="padding:8px;color:#64748B">Request ID</td><td style="padding:8px">${request._id}</td></tr>
                                <tr><td style="padding:8px;color:#64748B">Status</td><td style="padding:8px"><strong>Pending</strong></td></tr>
                            </table>
                        </div>
                    `
                });
            }
        } catch (emailErr) {
            console.log('Email send failed (non-fatal):', emailErr.message);
        }

        res.status(201).json({ success: true, data: request });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ success: false, message: 'Cannot submit request' });
    }
};

//@desc   List the logged-in user's requests (AC1-1.1 — inform status)
//@route  GET /api/v1/coworkingSpaceRequests/mine
//@access Private
exports.getMyRequests = async (req, res) => {
    try {
        const requests = await CoworkingSpaceRequest
            .find({ submitter: req.user.id })
            .sort('-createdAt');
        res.status(200).json({ success: true, count: requests.length, data: requests });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ success: false, message: 'Cannot fetch requests' });
    }
};

//@desc   Get one request submitted by the logged-in user
//@route  GET /api/v1/coworkingSpaceRequests/mine/:id
//@access Private
exports.getMyRequest = async (req, res) => {
    try {
        const request = await CoworkingSpaceRequest.findById(req.params.id);
        if (!request) {
            return res.status(404).json({ success: false, message: 'Request not found' });
        }
        if (request.submitter.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized to view this request' });
        }
        res.status(200).json({ success: true, data: request });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ success: false, message: 'Cannot fetch request' });
    }
};

//@desc   Accept a CoworkingSpaceRequest and create a CoworkingSpace (Admin only)
//@route  POST /api/v1/coworkingSpaceRequests/:id/accept
//@access Private (Admin only)
exports.acceptRequest = async (req, res) => {
    try {
        // Fetch the request
        const request = await CoworkingSpaceRequest.findById(req.params.id).populate('submitter');
        if (!request) {
            return res.status(404).json({ success: false, message: 'Request not found' });
        }

        // Check if already approved
        if (request.status !== 'pending') {
            return res.status(400).json({ success: false, message: `Request has already been ${request.status}` });
        }

        // Create a new CoworkingSpace from the request data
        const coworkingSpaceData = {
            name: request.name,
            address: request.address,
            tel: request.tel,
            opentime: request.opentime,
            closetime: request.closetime,
            description: request.description,
            pics: request.pics,
            owner: request.submitter._id,
            isVisible: true
        };

        const coworkingSpace = await CoworkingSpace.create(coworkingSpaceData);

        // Update the request status to approved
        request.status = 'approved';
        request.reviewedBy = req.user.id;
        request.reviewedAt = new Date();
        await request.save();

        // Send approval email to the submitter
        try {
            if (request.submitter.email) {
                await sendEmail({
                    to: request.submitter.email,
                    subject: 'Co-working space request approved',
                    html: `
                        <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px">
                            <h2 style="color:#16A34A">Request approved</h2>
                            <p>Hi <strong>${request.submitter.name}</strong>,</p>
                            <p>Congratulations! Your request to add <strong>${request.name}</strong> has been approved and is now live on our platform.</p>
                            <table style="width:100%;border-collapse:collapse;margin:16px 0">
                                <tr><td style="padding:8px;color:#64748B">Space Name</td><td style="padding:8px">${request.name}</td></tr>
                                <tr><td style="padding:8px;color:#64748B">Address</td><td style="padding:8px">${request.address}</td></tr>
                                <tr><td style="padding:8px;color:#64748B">Status</td><td style="padding:8px"><strong>Approved</strong></td></tr>
                            </table>
                            <p>You can now manage your space and view bookings through your dashboard.</p>
                        </div>
                    `
                });
            }
        } catch (emailErr) {
            console.log('Email send failed (non-fatal):', emailErr.message);
        }

        res.status(200).json({ 
            success: true, 
            message: 'Request accepted and CoworkingSpace created successfully',
            data: request
        });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ success: false, message: 'Cannot accept request' });
    }
};

//@desc   Reject a CoworkingSpaceRequest (Admin only)
//@route  POST /api/v1/coworkingSpaceRequests/:id/reject
//@access Private (Admin only)
exports.rejectRequest = async (req, res) => {
    try {
        const request = await CoworkingSpaceRequest.findById(req.params.id).populate('submitter');
        if (!request) {
            return res.status(404).json({ success: false, message: 'Request not found' });
        }

        if (request.status !== 'pending') {
            return res.status(400).json({ success: false, message: `Request has already been ${request.status}` });
        }

        const rejectionReason = req.body.rejectionReason && String(req.body.rejectionReason).trim();
        if (!rejectionReason) {
            return res.status(400).json({ success: false, message: 'Rejection reason is required' });
        }

        request.status = 'rejected';
        request.rejectionReason = rejectionReason;
        request.reviewedBy = req.user.id;
        request.reviewedAt = new Date();
        await request.save();

        try {
            if (request.submitter.email) {
                await sendEmail({
                    to: request.submitter.email,
                    subject: 'Co-working space request rejected',
                    html: `
                        <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px">
                            <h2 style="color:#DC2626">Request rejected</h2>
                            <p>Hi <strong>${request.submitter.name}</strong>,</p>
                            <p>We reviewed your request to add <strong>${request.name}</strong>, and we are unable to approve it at this time.</p>
                            <p><strong>Reason:</strong> ${rejectionReason}</p>
                            <table style="width:100%;border-collapse:collapse;margin:16px 0">
                                <tr><td style="padding:8px;color:#64748B">Request ID</td><td style="padding:8px">${request._id}</td></tr>
                                <tr><td style="padding:8px;color:#64748B">Status</td><td style="padding:8px"><strong>Rejected</strong></td></tr>
                            </table>
                            <p>If you would like to submit a revised request, please review the guidelines and try again.</p>
                        </div>
                    `
                });
            }
        } catch (emailErr) {
            console.log('Email send failed (non-fatal):', emailErr.message);
        }

        res.status(200).json({
            success: true,
            message: 'Request rejected successfully',
            data: request
        });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ success: false, message: 'Cannot reject request' });
    }
};

//@desc   Get all CoworkingSpaceRequests (Admin only)
//@route  GET /api/v1/coworkingSpaceRequests/admin/all
//@access Private (Admin only)
exports.getAllRequests = async (req, res) => {
    try {
        let query;
        const reqQuery = { ...req.query };

        const removeFields = ['select', 'sort', 'page', 'limit'];
        removeFields.forEach(param => delete reqQuery[param]);

        let queryStr = JSON.stringify(reqQuery);
        queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);

        query = CoworkingSpaceRequest.find(JSON.parse(queryStr))
            .populate('submitter', 'name email tel')
            .populate('reviewedBy', 'name email');

        // Select fields if specified
        if (req.query.select) {
            const fields = req.query.select.split(',').join(' ');
            query = query.select(fields);
        }

        // Sort by field if specified
        if (req.query.sort) {
            const sortBy = req.query.sort.split(',').join(' ');
            query = query.sort(sortBy);
        } else {
            query = query.sort('-createdAt');
        }

        // Pagination
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 25;
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;
        const total = await CoworkingSpaceRequest.countDocuments(JSON.parse(JSON.stringify(reqQuery).replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`)));

        query = query.skip(startIndex).limit(limit);

        const requests = await query;

        const pagination = {};
        if (endIndex < total) {
            pagination.next = {
                page: page + 1,
                limit
            };
        }
        if (startIndex > 0) {
            pagination.prev = {
                page: page - 1,
                limit
            };
        }

        res.status(200).json({ 
            success: true, 
            count: requests.length, 
            total,
            pagination, 
            data: requests 
        });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ success: false, message: 'Cannot fetch requests' });
    }
};

//@desc   Review a CoworkingSpaceRequest (Admin only)
//@route  PATCH /api/v1/coworkingSpaceRequests/:id/review
//@access Private (Admin only)
exports.reviewRequest = async (req, res) => {
    try {
        const { status } = req.body;
        
        if (!status) {
            return res.status(400).json({ success: false, message: 'Status is required (approved or rejected)' });
        }

        if (status === 'approved') {
            return exports.acceptRequest(req, res);
        } else if (status === 'rejected') {
            return exports.rejectRequest(req, res);
        } else {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid status. Status must be "approved" or "rejected"' 
            });
        }
    } catch (err) {
        console.log(err);
        return res.status(500).json({ success: false, message: 'Cannot review request' });
    }
};
