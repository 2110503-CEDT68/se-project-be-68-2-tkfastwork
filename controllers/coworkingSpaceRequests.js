const mongoose = require('mongoose');
const CoworkingSpaceRequest = require('../models/CoworkingSpaceRequest');
const CoworkingSpace = require('../models/CoworkingSpace');
const User = require('../models/User');
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

//@desc   Get all coworking space requests
//@route  GET /api/v1/coworkingSpaceRequests/all
//@access Private (Admin)
exports.getAllRequests = async (req, res) => {
    let query;

    const reqQuery = { ...req.query };
    const removeFields = ['select', 'sort', 'page', 'limit'];
    removeFields.forEach(param => delete reqQuery[param]);

    let queryStr = JSON.stringify(reqQuery);
    queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);

    query = CoworkingSpaceRequest.find(JSON.parse(queryStr)).populate('submitter', 'name email');

    if (req.query.select) {
        const fields = req.query.select.split(',').join(' ');
        query = query.select(fields);
    }

    if (req.query.sort) {
        const sortBy = req.query.sort.split(',').join(' ');
        query = query.sort(sortBy);
    } else {
        query = query.sort('-createdAt');
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 25;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await CoworkingSpaceRequest.countDocuments(JSON.parse(queryStr));

    query = query.skip(startIndex).limit(limit);

    try {
        const requests = await query;
        const pagination = {};

        if (endIndex < total) {
            pagination.next = { page: page + 1, limit };
        }

        if (startIndex > 0) {
            pagination.prev = { page: page - 1, limit };
        }

        res.status(200).json({ success: true, count: requests.length, pagination, data: requests });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ success: false, message: 'Cannot fetch requests' });
    }
};

//@desc   Review a coworking space request (Approve/Reject)
//@route  PATCH /api/v1/coworkingSpaceRequests/:id/review
//@access Private (Admin)
exports.reviewRequest = async (req, res) => {
    const { status, rejectionReason } = req.body;

    if (!status || !['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Please provide a valid status: approved or rejected' });
    }

    if (status === 'rejected' && (!rejectionReason || !String(rejectionReason).trim())) {
        return res.status(400).json({ success: false, message: 'Please provide a rejectionReason when rejecting' });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const request = await CoworkingSpaceRequest.findById(req.params.id).session(session);

        if (!request) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ success: false, message: 'Request not found' });
        }

        if (request.status !== 'pending') {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ success: false, message: 'Request is already processed' });
        }

        request.status = status;
        request.reviewedBy = req.user.id;
        request.reviewedAt = Date.now();

        if (status === 'rejected') {
            request.rejectionReason = rejectionReason;
        }

        await request.save({ session });

        const submitter = await User.findById(request.submitter).session(session);

        if (status === 'approved') {
            await CoworkingSpace.create([{
                name: request.name,
                address: request.address,
                tel: request.tel,
                opentime: request.opentime,
                closetime: request.closetime,
                description: request.description,
                pics: request.pics,
                owner: request.submitter,
                isVisible: true
            }], { session });

            if (submitter && submitter.role === 'user') {
                submitter.role = 'owner';
                await submitter.save({ session });
            }
        }

        await session.commitTransaction();
        session.endSession();

        try {
            if (submitter && submitter.email) {
                const subject = status === 'approved' ? 'Your co-working space is approved!' : 'Your co-working space request was rejected';
                const bodyMsg = status === 'approved' 
                    ? `Good news! Your request to add <strong>${request.name}</strong> has been approved. You are now an owner and your space is live on our platform.`
                    : `Unfortunately, your request to add <strong>${request.name}</strong> was rejected.<br><br>Reason: ${rejectionReason}`;

                await sendEmail({
                    to: submitter.email,
                    subject,
                    html: `
                        <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px">
                            <h2 style="color:${status === 'approved' ? '#10B981' : '#EF4444'}">Request ${status.charAt(0).toUpperCase() + status.slice(1)}</h2>
                            <p>Hi <strong>${submitter.name}</strong>,</p>
                            <p>${bodyMsg}</p>
                        </div>
                    `
                });
            }
        } catch (emailErr) {
            console.log('Email send failed (non-fatal):', emailErr.message);
        }

        res.status(200).json({ success: true, data: request });

    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        console.error('REVIEW REQUEST ERROR:', err);
        return res.status(500).json({ success: false, message: 'Transaction failed, cannot review request', error: err.message });
    }
};
