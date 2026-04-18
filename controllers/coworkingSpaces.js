const CoworkingSpace = require("../models/CoworkingSpace");
const Reservation = require('../models/Reservation');
const User = require('../models/User');
const sendEmail = require('../utils/email');

//@desc Get all coworkingSpaces
//@route GET /api/v1/coworkingSpaces
//@access Public
exports.getCoworkingSpaces = async (req, res, next) => {
    let query;

    const reqQuery = {...req.query};

    const removeFields = ['select', 'sort', 'page', 'limit'];
    removeFields.forEach(param => delete reqQuery[param]);
    console.log(reqQuery);

    let queryStr = JSON.stringify(reqQuery);
    queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g,match => `$${match}`);

    const filter = JSON.parse(queryStr);

    const isAdmin = req.user && req.user.role === 'admin';
    if (!isAdmin || req.query.showAll !== 'true') {
        filter.isVisible = true;
    }

    query = CoworkingSpace.find(JSON.parse(queryStr)).populate('reservations');

    if(req.query.select){
        const fields = req.query.select.split(',').join(' ');
        query=query.select(fields);
    }

    if(req.query.sort){
        const sortBy = req.query.sort.split(',').join(' ');
        query = query.sort(sortBy);
    }
    else{
        query = query.sort('-createdAt');
    }

    const page = parseInt(req.query.page,10) || 1;
    const limit = parseInt(req.query.limit, 10) || 25;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await CoworkingSpace.countDocuments();

    query = query.skip(startIndex).limit(limit);

    try{
        const coworkingSpaces = await query;

        const pagination = {};

        if(endIndex < total){
            pagination.next = {
                page: page + 1,
                limit
            }
        }

        if(startIndex > 0){
            pagination.prev = {
                page: page - 1,
                limit
            }
        }

        res.status(200).json({success: true, count: coworkingSpaces.length, pagination, data:coworkingSpaces});
    }
    catch(err){
        res.status(400).json({success:false});
    }
    
};

//@desc Get single coworkingSpace
//@route GET /api/v1/coworkingSpaces/:id
//@access Private
exports.getCoworkingSpace = async (req, res, next) => {
    try{
        const coworkingSpace = await CoworkingSpace.findById(req.params.id);
        if(!coworkingSpace){
            return res.status(400).json({success:false});
        }

        const isAdmin = req.user && req.user.role === 'admin';
        const isOwner = req.user && coworkingSpace.owner &&
            coworkingSpace.owner.toString() === req.user.id;

        if (!coworkingSpace.isVisible && !isAdmin && !isOwner) {
            return res.status(404).json({ success: false, message: 'Space not found' });
        }

        res.status(200).json({success:true, data:coworkingSpace});
    }
    catch(err){
        res.status(400).json({success:false});
    }
};

//@desc Create new coworkingSpace
//@route POST /api/v1/coworkingSpaces
//@access Private
exports.createCoworkingSpace = async (req, res, next) => {
    const coworkingSpace = await CoworkingSpace.create(req.body);
    res.status(201).json({success: true, data:coworkingSpace});
};

//@desc Update coworkingSpace
//@route PUT /api/v1/coworkingSpaces/:id
//@access Private
exports.updateCoworkingSpace = async (req, res, next) => {
    try{
        const coworkingSpace = await CoworkingSpace.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });
        if(!coworkingSpace){
            return res.status(400).json({success:false});
        }
        res.status(200).json({success:true, data:coworkingSpace});
    }
    catch(err){
        res.status(400).json({success:false});
    }
};

//@desc Toggle space visibility (hide/show from public search)
//@route PATCH /api/v1/coworkingSpaces/:id/visibility
//@access Private — admin or owner of this space
exports.toggleVisibility = async (req, res, next) => {
    try {
        const coworkingSpace = await CoworkingSpace.findById(req.params.id);
        if (!coworkingSpace) {
            return res.status(404).json({ success: false, message: 'Space not found' });
        }

        const isAdmin = req.user.role === 'admin';
        const isOwner = coworkingSpace.owner &&
            coworkingSpace.owner.toString() === req.user.id;

        if (!isAdmin && !isOwner) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to change visibility of this space'
            });
        }

        const wasVisible = coworkingSpace.isVisible;
        coworkingSpace.isVisible = !coworkingSpace.isVisible;
        await coworkingSpace.save();

        if (wasVisible && !coworkingSpace.isVisible) {
            const now = new Date();
            const activeReservations = await Reservation.find({
                coworkingSpace: coworkingSpace._id,
                apptDate: { $gte: now }
            });

            const uniqueUserIds = [...new Set(
                activeReservations.map(r => r.user.toString())
            )];
            const usersToNotify = await User.find({ _id: { $in: uniqueUserIds } });

            for (const user of usersToNotify) {
                const userReservations = activeReservations.filter(
                    r => r.user.toString() === user._id.toString()
                );

                const bookingRows = userReservations.map(r =>
                    `<tr>
                        <td style="padding:8px;color:#64748B">Booking ID</td>
                        <td style="padding:8px">${r._id}</td>
                    </tr>
                    <tr>
                        <td style="padding:8px;color:#64748B">Date &amp; Time</td>
                        <td style="padding:8px"><strong>${new Date(r.apptDate).toLocaleString('en-GB')} – ${new Date(r.apptEnd).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</strong></td>
                    </tr>`
                ).join('<tr><td colspan="2"><hr style="border:none;border-top:1px solid #e2e8f0;margin:4px 0"/></td></tr>');

                try {
                    await sendEmail({
                        to: user.email,
                        subject: `Notice: ${coworkingSpace.name} is temporarily unavailable`,
                        html: `
                            <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px">
                                <h2 style="color:#D97706">Space Temporarily Unavailable</h2>
                                <p>Hi <strong>${user.name}</strong>,</p>
                                <p>We'd like to let you know that <strong>${coworkingSpace.name}</strong>
                                   (${coworkingSpace.address}) has been temporarily disabled on our platform.</p>
                                <p>You have the following upcoming booking(s) at this space:</p>
                                <table style="width:100%;border-collapse:collapse;margin:16px 0">
                                    ${bookingRows}
                                </table>
                                <p style="color:#64748B;font-size:14px">
                                    Please contact us or check back later for updates.
                                    We apologise for any inconvenience caused.
                                </p>
                            </div>
                        `
                    });
                } catch (emailErr) {
                    console.log(`Disable notification failed for ${user.email} (non-fatal):`, emailErr.message);
                }
            }
        }

        res.status(200).json({
            success: true,
            data: { _id: coworkingSpace._id, isVisible: coworkingSpace.isVisible }
        });
    } catch (err) {
        res.status(400).json({ success: false });
    }
};

//@desc Delete coworkingSpace
//@route DELETE /api/v1/coworkingSpaces/:id
//@access Private
exports.deleteCoworkingSpace = async (req, res, next) => {
    try{
        const coworkingSpace = await CoworkingSpace.findById(req.params.id);
        if(!coworkingSpace){
            return res.status(400).json({success:false});
        }
        await Reservation.deleteMany({ coworkingSpace: req.params.id });
        await CoworkingSpace.deleteOne({ _id: req.params.id });
        res.status(200).json({success:true, data: {}});
    }
    catch(err){
        res.status(400).json({success:false});
    }
};