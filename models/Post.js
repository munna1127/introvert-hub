const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  authorName: { type: String, required: true },
  category: { type: String, required: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Post', schema);
