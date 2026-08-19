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

router.get('/messages/:recipient', auth, async (req, res) => {
  try {
    const target = req.params.recipient.replace('@', '').trim();
    const me = req.user.username.replace('@', '').trim();

    let query;
    if (target.startsWith('grp_')) {
      query = { recipient: target, isGroup: true };
    } else if (target === me) {
      // Handle Self-test Chat
      query = { isGroup: false, sender: me, recipient: me };
    } else {
      // 1-on-1 DM query
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
