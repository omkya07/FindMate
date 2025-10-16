const mongoose = require('mongoose');
const User = require('./user');

const reunitedItemSchema = new mongoose.Schema({
  itemName: { type: String, required: true },
  description: String,
  category: String,
  photoUrl: String,
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  // For items that were originally found
  finder: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  lostLocation: String,
  foundLocation: String,
  lostDate: Date,
  foundDate: Date,

  reunitedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ReunitedItem', reunitedItemSchema);
