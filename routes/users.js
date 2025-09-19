const express = require('express');
const router = express.Router();
const multer = require('multer');
const { storage } = require('../config/cloudinary');
const upload = multer({ storage });
const userModel = require('../models/user'); // assuming you have a user model

// Upload image and save URL in MongoDB
router.post('/upload', upload.single('image'), async (req, res) => {
  try {
    const user = new userModel({
      username: req.body.username,
      imageUrl: req.file.path   // Cloudinary gives secure url
    });

    await user.save();
    res.redirect('/profile/' + user._id);
  } catch (err) {
    console.error(err);
    res.send("Error uploading file");
  }
});

module.exports = router;
