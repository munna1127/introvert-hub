const express = require('express');
const router = express.Router();
const User = require('../models/User');

const ADMIN_KEY = process.env.ADMIN_KEY || 'admin123';

const verifyAdmin = (req, res, next) => {
  const key = req.headers['x-admin-key'];
  if (!key || key !== ADMIN_KEY) {
    return res.status(403).json({ msg: 'Unauthorized: Invalid Admin Key' });
  }
  next();
};

// 1. Fetch All Registered Users
router.get('/users', verifyAdmin, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ msg: 'Failed to fetch users' });
  }
});

// 2. Ban / Unban User
router.post('/ban', verifyAdmin, async (req, res) => {
  try {
    const { userId, banType } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    if (banType === 'unban') {
      user.isBanned = false;
      user.banExpires = null;
    } else if (banType === '1h') {
      user.isBanned = true;
      user.banExpires = new Date(Date.now() + 60 * 60 * 1000);
    } else if (banType === '24h') {
      user.isBanned = true;
      user.banExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    } else if (banType === 'perm') {
      user.isBanned = true;
      user.banExpires = null;
    }

    await user.save();
    res.json({ msg: `User status updated successfully`, user });
  } catch (err) {
    res.status(500).json({ msg: 'Action failed' });
  }
});

// 3. Delete User
router.delete('/delete/:userId', verifyAdmin, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.userId);
    res.json({ msg: 'User permanently deleted' });
  } catch (err) {
    res.status(500).json({ msg: 'Delete failed' });
  }
});

module.exports = router;
