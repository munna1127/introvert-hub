const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  interest: { type: String, default: 'Gym' },
  location: { type: String, default: 'Online' },
  battery: { type: String, default: '🔋 Energized' },
  bio: { type: String, default: 'Looking for low-friction quiet connection.' }
}, { timestamps: true });

module.exports = mongoose.model('User', schema);
