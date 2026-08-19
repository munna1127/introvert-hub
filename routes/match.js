const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Message = require('../models/Message');
const auth = require('../middleware/auth');

router.get('/discover', auth, async (req, res) => {
  try {
    const matches = await User.find({
      _id: { $ne: req.user.id },
      username: { $ne: req.user.username }
    }).select('username interest location battery bio').limit(20);
    res.json(matches);
  } catch (err) {
    res.status(500).json({ msg: 'Error discovering matches' });
  }
});

router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ msg: 'Failed to fetch user data' });
  }
});

router.put('/update-profile', auth, async (req, res) => {
  try {
    let { username, bio, interest, location } = req.body;
    username = username ? username.replace('@', '').trim() : undefined;

    const currentUser = await User.findById(req.user.id);

    if (username && username.toLowerCase() !== currentUser.username.toLowerCase()) {
      const taken = await User.findOne({ username: new RegExp(`^${username}$`, 'i') });
      if (taken) return res.status(400).json({ msg: 'Username already taken.' });
      currentUser.username = username;
    }

    if (bio !== undefined) currentUser.bio = bio;
    if (interest !== undefined) currentUser.interest = interest;
    if (location !== undefined) currentUser.location = location;

    await currentUser.save();
    res.json({ msg: 'Profile updated', username: currentUser.username, bio: currentUser.bio, interest: currentUser.interest, location: currentUser.location });
  } catch (err) {
    res.status(500).json({ msg: 'Error updating profile', error: err.message });
  }
});

// Fetch Messages
router.get('/messages/:recipient', auth, async (req, res) => {
  try {
    const target = req.params.recipient.replace('@', '').trim();
    const me = req.user.username.replace('@', '').trim();

    if (target === me) return res.status(400).json({ msg: 'Self chat not allowed' });

    let query;
    if (target.startsWith('grp_')) {
      query = { recipient: target, isGroup: true };
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

// 1. Delete Single Message (Only author can delete)
router.delete('/message/:messageId', auth, async (req, res) => {
  try {
    const msg = await Message.findById(req.params.messageId);
    if (!msg) return res.status(404).json({ msg: 'Message not found' });

    if (msg.sender !== req.user.username.replace('@', '').trim()) {
      return res.status(403).json({ msg: 'Unauthorized: Can only delete your own message' });
    }

    await Message.findByIdAndDelete(req.params.messageId);
    res.json({ msg: 'Message deleted successfully', messageId: req.params.messageId });
  } catch (err) {
    res.status(500).json({ msg: 'Delete failed' });
  }
});

// 2. Clear Whole Conversation History
router.delete('/clear-chat/:recipient', auth, async (req, res) => {
  try {
    const target = req.params.recipient.replace('@', '').trim();
    const me = req.user.username.replace('@', '').trim();

    if (target.startsWith('grp_')) {
      return res.status(400).json({ msg: 'Cannot clear squad public group history' });
    }

    await Message.deleteMany({
      isGroup: false,
      $or: [
        { sender: me, recipient: target },
        { sender: target, recipient: me }
      ]
    });

    res.json({ msg: 'Chat conversation cleared' });
  } catch (err) {
    res.status(500).json({ msg: 'Failed to clear conversation' });
  }
});

module.exports = router;
