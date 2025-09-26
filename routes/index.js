const express = require('express');
const router = express.Router();
const passport = require('passport');
const multer = require('multer');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const { storage } = require('../config/cloudinary');
const User = require('../models/user');
const LostItem = require('../models/lostItem');
const FoundItem = require('../models/foundItem');

const upload = multer({ storage });


const isLoggedIn = (req, res, next) => {
    if (!req.isAuthenticated()) {
        req.session.returnTo = req.originalUrl;
        req.flash('error', 'You must be signed in to do that!');
        return res.redirect('/auth');
    }
    next();
};

const isAdmin = (req, res, next) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') {
        req.flash('error', 'You do not have permission to access that page.');
        return res.redirect('/');
    }
    next();
};



// Home Page
router.get('/', async (req, res) => {
    try {
        const itemsReported = await LostItem.countDocuments() + await FoundItem.countDocuments();
        const happyUsers = await User.countDocuments();
        const itemsReunited = await FoundItem.countDocuments();
        res.render('index', { itemsReported, itemsReunited, happyUsers });
    } catch (e) {
        console.error("Homepage Stats Error:", e);
        res.render('index', { itemsReported: 0, itemsReunited: 0, happyUsers: 0 });
    }
});

// Footer Pages
router.get('/help-center', (req, res) => res.render('help-center'));
router.get('/contact', (req, res) => res.render('contact'));
router.get('/privacy-policy', (req, res) => res.render('privacy-policy'));
router.get('/terms-of-service', (req, res) => res.render('terms-of-service'));
router.get('/community', (req, res) => res.render('community'));


// Render Combined Auth Page
router.get('/auth', (req, res) => res.render('auth'));
router.get('/signup', (req, res) => res.redirect('/auth'));
router.get('/login', (req, res) => res.render('login'));

// Handle Signup (sends verification email)
router.post('/signup', async (req, res) => {
    try {
        const { email, fullName, phone, password, 'confirm-password': confirmPassword, terms } = req.body;
        if (password !== confirmPassword) {
            req.flash('error', 'Passwords do not match.');
            return res.redirect('/auth');
        }
        if (!terms) {
            req.flash('error', 'You must agree to the terms of service.');
            return res.redirect('/auth');
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            req.flash('error', 'A user with that email address already exists.');
            return res.redirect('/auth');
        }

        const user = new User({ email, fullName, phone });
        const registeredUser = await User.register(user, password);

        const token = crypto.randomBytes(20).toString('hex');
        registeredUser.emailVerificationToken = token;
        registeredUser.emailVerificationExpires = Date.now() + 3600000; // 1 hour
        await registeredUser.save();

        const transporter = nodemailer.createTransport({
            service: 'Gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const verificationUrl = `http://${req.headers.host}/verify-email?token=${token}`;
        const mailOptions = {
            to: registeredUser.email,
            from: `FindMate <${process.env.EMAIL_USER}>`,
            subject: 'FindMate - Verify Your Email Address',
            html: `<p>Hello ${registeredUser.fullName}, please click the link below to verify your email address:</p><a href="${verificationUrl}">${verificationUrl}</a>`
        };
        await transporter.sendMail(mailOptions);

        res.render('verify-prompt');
    } catch (e) {
        console.error("Signup Error:", e);
        req.flash('error', 'Something went wrong. Please try again.');
        res.redirect('/auth');
    }
});

// Handle Email Verification Link
router.get('/verify-email', async (req, res) => {
    try {
        const { token } = req.query;
        const user = await User.findOne({
            emailVerificationToken: token,
            emailVerificationExpires: { $gt: Date.now() }
        });

        if (!user) {
            req.flash('error', 'Verification link is invalid or has expired.');
            return res.redirect('/auth');
        }

        user.isVerified = true;
        user.emailVerificationToken = undefined;
        user.emailVerificationExpires = undefined;
        await user.save();

        req.flash('success', 'Your email has been verified! You can now log in.');
        res.redirect('/auth');
    } catch (e) {
        req.flash('error', 'Something went wrong during verification.');
        res.redirect('/auth');
    }
});


// Handle Password Login (checks if verified)
router.post('/login', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) { return next(err); }
        if (!user) {
            req.flash('error', 'Invalid email or password.');
            return res.redirect('/login');
        }
        if (!user.isVerified) {
            req.flash('error', 'Your account has not been verified. Please check your email.');
            return res.redirect('/auth');
        }
        req.logIn(user, function(err) {
            if (err) { return next(err); }
            req.flash('success', 'Welcome back!');
            const redirectUrl = req.session.returnTo || '/';
            delete req.session.returnTo;
            return res.redirect(redirectUrl);
        });
    })(req, res, next);
});

// Handle Logout
router.get('/logout', isLoggedIn, (req, res, next) => {
    req.logout(function(err) {
        if (err) { return next(err); }
        req.flash('success', 'You have been logged out.');
        res.redirect('/');
    });
});


// Display all lost items (with search and filters)
router.get('/view-lost', async (req, res) => {
    const { search, category, date } = req.query;
    let query = {};
    const findQuery = [];

    if (search) {
        findQuery.push({ $or: [{ itemName: { $regex: search, $options: 'i' } }, { description: { $regex: search, $options: 'i' } }] });
    }
    if (category) {
        findQuery.push({ category: category });
    }
    if (date && date !== 'any') {
        let startDate = new Date();
        if (date === 'today') { startDate.setHours(0, 0, 0, 0); }
        else if (date === 'week') { startDate.setDate(startDate.getDate() - 7); }
        else if (date === 'month') { startDate.setMonth(startDate.getMonth() - 1); }
        findQuery.push({ createdAt: { $gte: startDate } });
    }
    if (findQuery.length > 0) { query = { $and: findQuery }; }

    const lostItems = await LostItem.find(query).sort({ createdAt: -1 }).populate('user');
    res.render('view-lost', { items: lostItems, search: search || '', category: category || '', date: date || '' });
});

// Render form to report a lost item
router.get('/report-lost', isLoggedIn, (req, res) => {
    res.render('report-lost');
});

// Handle submission of a new lost item
router.post('/report-lost', isLoggedIn, upload.single('item-photo'), async (req, res) => {
    try {
        const newLostItem = new LostItem(req.body);
        newLostItem.user = req.user._id;
        if (req.file) { newLostItem.photoUrl = req.file.path; }
        await newLostItem.save();
        req.flash('success', 'Successfully submitted your lost item report!');
        res.redirect('/view-lost');
    } catch (error) {
        req.flash('error', 'Something went wrong. Please try again.');
        res.redirect('/report-lost');
    }
});

// Display all found items (with search and filters)
router.get('/view-found', async (req, res) => {
    const { search, category, date } = req.query;
    let query = {};
    const findQuery = [];

    if (search) {
        findQuery.push({ $or: [{ itemName: { $regex: search, $options: 'i' } }, { description: { $regex: search, $options: 'i' } }] });
    }
    if (category) {
        findQuery.push({ category: category });
    }
    if (date && date !== 'any') {
        let startDate = new Date();
        if (date === 'today') { startDate.setHours(0, 0, 0, 0); }
        else if (date === 'week') { startDate.setDate(startDate.getDate() - 7); }
        else if (date === 'month') { startDate.setMonth(startDate.getMonth() - 1); }
        findQuery.push({ createdAt: { $gte: startDate } });
    }
    if (findQuery.length > 0) { query = { $and: findQuery }; }

    const foundItems = await FoundItem.find(query).sort({ createdAt: -1 }).populate('finder');
    res.render('view-found', { items: foundItems, search: search || '', category: category || '', date: date || '' });
});

// Render form to report a found item
router.get('/report-found', isLoggedIn, (req, res) => {
    res.render('report-found');
});

// Handle submission of a new found item
router.post('/report-found', isLoggedIn, upload.single('item-photo'), async (req, res) => {
    try {
        const newFoundItem = new FoundItem(req.body);
        newFoundItem.finder = req.user._id;
        if (req.file) { newFoundItem.photoUrl = req.file.path; }
        await newFoundItem.save();
        req.flash('success', 'Thank you for reporting the found item!');
        res.redirect('/view-found');
    } catch (error) {
        req.flash('error', 'Something went wrong. Please try again.');
        res.redirect('/report-found');
    }
});


router.get('/admin-login', (req, res) => {
    res.render('admin-login');
});

router.post('/admin-login', passport.authenticate('local', {
    failureFlash: true,
    failureRedirect: '/admin-login'
}), (req, res, next) => {
    if (req.user.role !== 'admin') {
        req.logout(function(err) {
            if (err) { return next(err); }
            req.flash('error', 'Access Denied. Admin credentials required.');
            return res.redirect('/');
        });
    } else {
        req.flash('success', 'Welcome, Admin!');
        res.redirect('/admin/dashboard');
    }
});

router.get('/admin/dashboard', isAdmin, async (req, res) => {
    const allUsers = await User.find({});
    const allLostItems = await LostItem.find({}).populate('user');
    const allFoundItems = await FoundItem.find({}).populate('finder');
    res.render('admin-dashboard', {
        users: allUsers,
        lostItems: allLostItems,
        foundItems: allFoundItems
    });
});

router.post('/admin/lostitems/:id', isAdmin, async (req, res) => {
    await LostItem.findByIdAndDelete(req.params.id);
    req.flash('success', 'Successfully deleted the lost item report.');
    res.redirect('/admin/dashboard#lost-items');
});

router.post('/admin/founditems/:id', isAdmin, async (req, res) => {
    await FoundItem.findByIdAndDelete(req.params.id);
    req.flash('success', 'Successfully deleted the found item report.');
    res.redirect('/admin/dashboard#found-items');
});
// Handle DELETING a Lost Item
router.post('/admin/lostitems/:id/delete', isAdmin, async (req, res) => {
    await LostItem.findByIdAndDelete(req.params.id);
    req.flash('success', 'Successfully deleted the lost item report.');
    res.redirect('/admin/dashboard#lost-items');
});
// Handle DELETING a Found Item
router.post('/admin/founditems/:id/delete', isAdmin, async (req, res) => {
    await FoundItem.findByIdAndDelete(req.params.id);
    req.flash('success', 'Successfully deleted the found item report.');
    res.redirect('/admin/dashboard#found-items');
});
// Display the forgot password form
router.get('/forgot-password', (req, res) => {
    res.render('forgot-password');
});

// Handle the forgot password form submission
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            // For security, we don't reveal if the user exists or not
            req.flash('success', 'If an account with that email exists, a password reset link has been sent.');
            return res.redirect('/forgot-password');
        }

        const token = crypto.randomBytes(20).toString('hex');
        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
        await user.save();

        const transporter = nodemailer.createTransport({
            service: 'Gmail',
            auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
        });

        const resetUrl = `http://${req.headers.host}/reset-password/${token}`;
        const mailOptions = {
            to: user.email,
            from: `FindMate <${process.env.EMAIL_USER}>`,
            subject: 'FindMate - Password Reset Request',
            html: `<p>You are receiving this because you (or someone else) have requested the reset of the password for your account.</p>
                   <p>Please click on the following link, or paste this into your browser to complete the process:</p>
                   <a href="${resetUrl}">${resetUrl}</a>
                   <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>`
        };
        
        await transporter.sendMail(mailOptions);
        req.flash('success', `An email has been sent to ${user.email} with further instructions.`);
        res.redirect('/forgot-password');
    } catch (e) {
        req.flash('error', 'Something went wrong.');
        res.redirect('/forgot-password');
    }
});

// Display the password reset form
router.get('/reset-password/:token', async (req, res) => {
    const user = await User.findOne({
        resetPasswordToken: req.params.token,
        resetPasswordExpires: { $gt: Date.now() }
    });
    if (!user) {
        req.flash('error', 'Password reset token is invalid or has expired.');
        return res.redirect('/forgot-password');
    }
    res.render('reset-password', { token: req.params.token });
});

// Handle the password reset form submission
router.post('/reset-password/:token', async (req, res) => {
    try {
        const user = await User.findOne({
            resetPasswordToken: req.params.token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            req.flash('error', 'Password reset token is invalid or has expired.');
            return res.redirect('/forgot-password');
        }
        
        if (req.body.password !== req.body['confirm-password']) {
            req.flash('error', 'Passwords do not match.');
            return res.redirect(`/reset-password/${req.params.token}`);
        }

        // setPassword is a method from passport-local-mongoose
        await user.setPassword(req.body.password);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();
        
        // Log the user in automatically after password reset
        req.login(user, (err) => {
            if (err) { return next(err); }
            req.flash('success', 'Your password has been successfully updated!');
            res.redirect('/');
        });
    } catch (e) {
        req.flash('error', 'Something went wrong.');
        res.redirect('/forgot-password');
    }
});
module.exports = router;