const User = require('../models/User');

//@desc     Register user
//@route    POST /api/v1/auth/register
//@access   Public
exports.register = async (req, res, next) =>{
    try{
        const {name, tel, email, password, role, dateOfBirth, occupation, gender, revenue} = req.body;
        
        // Prevent role escalation - only 'user' allowed during registration
        // 'owner' is granted when a request is approved.
        // 'admin' must be set manually in DB or by another admin.
        const userRole = (role === 'admin') ? 'user' : (role || 'user');

        //Create user
        const user = await User.create({
            name,
            tel,
            email,
            password,
            role: userRole,
            dateOfBirth,
            occupation,
            gender,
            revenue
        });
        // const token = user.getSignedJwtToken();

        // res.status(200).json({success:true, token});
        sendTokenResponse(user, 200, res);
    }
    catch(err){
        res.status(400).json({success:false, message: err.message});
        console.log(err.stack);
    }
}

//@desc     Login user
//@route    POST /api/v1/auth/login
//@access   Public
exports.login = async (req, res, next) => {
    const { email, password } = req.body;

    // Validate email & password
    if (!email || !password) {
        return res.status(400).json({
            success: false,
            msg: 'Please provide an email and password'
        });
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
        return res.status(400).json({
            success: false,
            msg: 'Invalid credentials'
        });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
        return res.status(401).json({
            success: false,
            msg: 'Invalid credentials'
        });
    }

    // Create token
    // const token = user.getSignedJwtToken();

    // res.status(200).json({ success: true, token });
    sendTokenResponse(user, 200, res);
};

// Get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
    // Create token
    const token = user.getSignedJwtToken();

    const options = {
        expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000),
        httpOnly: true 
    };

    if (process.env.NODE_ENV === 'production') {
        options.secure = true; 
    }

    res.status(statusCode).cookie('token', token, options).json({ 
        success: true, 
        token
    }); 
};

//@desc     Get current Logged in user
//@route    POST /api/v1/auth/me
//@access   Private
exports.getMe = async(req, res, next) => {
    const user = await User.findById(req.user.id);
    res.status(200).json({
        success:true,
        data:user
    });
}

//@desc     Update user details
//@route    PUT /api/v1/auth/updatedetails
//@access   Private
exports.updateDetails = async (req, res, next) => {
    const fieldsToUpdate = {
        name: req.body.name,
        email: req.body.email,
        tel: req.body.tel,
        dateOfBirth: req.body.dateOfBirth,
        occupation: req.body.occupation,
        gender: req.body.gender,
        revenue: req.body.revenue
    };

    // Remove undefined fields
    Object.keys(fieldsToUpdate).forEach(key => fieldsToUpdate[key] === undefined && delete fieldsToUpdate[key]);

    const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
        new: true,
        runValidators: true
    });

    res.status(200).json({
        success: true,
        data: user
    });
};

//@desc     Log user out / clear cookie
//@route    GET /api/v1/auth/logout
//@access   Private
exports.logout = async (req, res, next) => {
    res.cookie('token', 'none', {
        expires: new Date(Date.now() + 10 * 1000), // หมดอายุทันทีใน 10 วินาที
        httpOnly: true
    });

    res.status(200).json({
        success: true,
        data: {}
    });
};