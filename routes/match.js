const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Message = require('../models/Message');
const auth = require('../middleware/auth');

router.get('/discover', auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id);
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
    const cleanRecipient = req.params.recipient.replace('@', '').trim();
    const currentUser = req.user.username.replace('@', '').trim();

    let query;
    if (cleanRecipient.startsWith('grp_')) {
      query = { recipient: cleanRecipient, isGroup: true };
    } else {
      query = {
        isGroup: false,
        $or: [
          { sender: currentUser, recipient: cleanRecipient },
          { sender: cleanRecipient, recipient: currentUser }
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
