const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Message = require('../models/Message');
const auth = require('../middleware/auth');

// 1. Discover potential sync matches (Location + Interest based)
router.get('/discover', auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id);
    if (!currentUser) return res.status(404).json({ msg: 'User not found' });

    // Find users with same interest or location, excluding self
    const matches = await User.find({
      _id: { $ne: currentUser._id }
    }).select('-password').limit(20);

    res.json(matches);
  } catch (err) {
    res.status(500).json({ msg: 'Error discovering matches' });
  }
});

// 2. Fetch Conversation Messages (1-on-1 or Group)
router.get('/messages/:recipient', auth, async (req, res) => {
  try {
    const { recipient } = req.params;
    const currentUser = req.user.username;

    let query;
    if (recipient.startsWith('grp_')) {
      query = { recipient, isGroup: true };
    } else {
      query = {
        isGroup: false,
        $or: [
          { sender: currentUser, recipient: recipient },
          { sender: recipient, recipient: currentUser }
        ]
      };
    }

    const messages = await Message.find(query).sort({ createdAt: 1 }).limit(100);
    res.json(messages);
  } catch (err) {
    res.status(500).json({ msg: 'Error fetching chat' });
  }
});

// 3. Update User Profile Profile/Interest
router.post('/profile', auth, async (req, res) => {
  try {
    const { interest, location, bio } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { interest, location, bio },
      { new: true }
    ).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ msg: 'Failed to update profile' });
  }
});

module.exports = router;
