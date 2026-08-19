const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  authorName: { type: String, required: true },
  category: { 
    type: String, 
    enum: ['Gym Buddy', 'Study/Coding', 'Casual Talk', 'Gaming'], 
    default: 'Casual Talk' 
  },
  title: { type: String, required: true },
  description: { type: String, required: true },
  locationOrPlatform: { type: String, default: 'Online' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Post', postSchema);
