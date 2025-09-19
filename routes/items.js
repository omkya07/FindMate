// In file: routes/items.js

const express = require('express');
const router = express.Router();
const multer = require('multer');
const { storage } = require('../config/cloudinary'); // From your config folder
const upload = multer({ storage });

// Require your Mongoose models
const LostItem = require('../models/lostItem');
const FoundItem = require('../models/foundItem');

// Middleware to check if user is authenticated (you'll need to create this)
const isLoggedIn = (req, res, next) => {
    if (!req.isAuthenticated()) { // This assumes you are using Passport.js
        // store the url they are requesting
        req.session.returnTo = req.originalUrl;
        // req.flash('error', 'You must be signed in');
        return res.redirect('/login');
    }
    next();
}


// === LOST ITEM ROUTES ===

// GET route to display the report-lost form
router.get('/report-lost', isLoggedIn, (req, res) => {
    res.render('report-lost'); // Assumes your view is named report-lost.ejs
});

// POST route to handle new lost item report
router.post('/report-lost', isLoggedIn, upload.single('item-photo'), async (req, res) => {
    try {
        const newLostItem = new LostItem(req.body); // req.body contains all form fields
        newLostItem.user = req.user._id; // Assign the logged-in user
        if (req.file) {
            newLostItem.photoUrl = req.file.path; // Add the Cloudinary URL
        }
        await newLostItem.save();
        // req.flash('success', 'Successfully submitted your lost item report!');
        res.redirect('/view-lost'); // Or wherever your lost items list is
    } catch (error) {
        console.error("Error creating lost item report:", error);
        // req.flash('error', 'Something went wrong. Please try again.');
        res.redirect('/report-lost');
    }
});


// === FOUND ITEM ROUTES ===

// GET route to display the report-found form
router.get('/report-found', isLoggedIn, (req, res) => {
    res.render('report-found'); // Assumes your view is named report-found.ejs
});

// POST route to handle new found item report
router.post('/report-found', isLoggedIn, upload.single('item-photo'), async (req, res) => {
    try {
        const newFoundItem = new FoundItem(req.body);
        newFoundItem.finder = req.user._id;
        if (req.file) {
            newFoundItem.photoUrl = req.file.path;
        }
        await newFoundItem.save();
        // req.flash('success', 'Thank you for reporting the found item!');
        res.redirect('/view-found');
    } catch (error) {
        console.error("Error creating found item report:", error);
        // req.flash('error', 'Something went wrong. Please try again.');
        res.redirect('/report-found');
    }
});


module.exports = router;