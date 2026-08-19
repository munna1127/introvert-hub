const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Message = require('../models/Message');
const auth = require('../middleware/auth');

router.get('/discover', auth, async (req, res) => {
  try {
    const matches = await User.find({
      _id: { $ne: req.user.id }
    }).select('username interest location battery bio').limit(20);
    res.json(matches);
  } catch (err) {
    res.status(500).json({ msg: 'Error discovering matches' });
  }
});

// Current User Details
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ msg: 'Failed to fetch user data' });
  }
});

// Profile & Username Update
router.put('/update-profile', auth, async (req, res) => {
  try {
    let { username, bio, interest, location } = req.body;
    username = username ? username.replace('@', '').trim() : undefined;

    const currentUser = await User.findById(req.user.id);

    // If username changed, ensure uniqueness
    if (username && username.toLowerCase() !== currentUser.username.toLowerCase()) {
      const taken = await User.findOne({ username: new RegExp(`^${username}$`, 'i') });
      if (taken) {
        return res.status(400).json({ msg: 'Username is already taken. Try another.' });
      }
      currentUser.username = username;
    }

    if (bio !== undefined) currentUser.bio = bio;
    if (interest !== undefined) currentUser.interest = interest;
    if (location !== undefined) currentUser.location = location;

    await currentUser.save();

    res.json({
      msg: 'Profile updated successfully',
      username: currentUser.username,
      bio: currentUser.bio,
      interest: currentUser.interest,
      location: currentUser.location
    });
  } catch (err) {
    res.status(500).json({ msg: 'Error updating profile', error: err.message });
  }
});

router.get('/messages/:recipient', auth, async (req, res) => {
  try {
    const target = req.params.recipient.replace('@', '').trim();
    const me = req.user.username.replace('@', '').trim();

    let query;
    if (target.startsWith('grp_')) {
      query = { recipient: target, isGroup: true };
    } else if (target === me) {
      query = { isGroup: false, sender: me, recipient: me };
    } else {
      query = {
        isGroup: false,
        $or: [
          { sender: me, recipient: target },
          { sender: target, recipient: me }
        ]
      };
    }

    const messages = await Message.find(query).sort({ createdAt: 1 }).limit(100);
    res.json(messages);
  } catch (err) {
    res.status(500).json({ msg: 'Error fetching messages' });
  }
});

module.exports = router;
