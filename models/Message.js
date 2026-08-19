const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  sender: { type: String, required: true },
  recipient: { type: String, required: true }, // username ya 'room_name'
  isGroup: { type: Boolean, default: false },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Message', schema);
