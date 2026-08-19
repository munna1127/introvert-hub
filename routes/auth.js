const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');

// Live Username Availability Check
router.get('/check-username/:username', async (req, res) => {
  try {
    const rawUsername = req.params.username.replace('@', '').trim().toLowerCase();
    const existing = await User.findOne({ username: new RegExp(`^${rawUsername}$`, 'i') });
    res.json({ available: !existing });
  } catch (err) {
    res.status(500).json({ msg: 'Error validating username' });
  }
});

// Signup
router.post('/signup', async (req, res) => {
  try {
    let { username, email, password, interest, location } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ msg: 'All required fields must be filled' });
    }

    username = username.replace('@', '').trim();
    email = email.trim().toLowerCase();

    const userExists = await User.findOne({ username: new RegExp(`^${username}$`, 'i') });
    if (userExists) {
      return res.status(400).json({ msg: 'This username is already taken. Please choose another.' });
    }

    const emailExists = await User.findOne({ email });
    if (emailExists) {
      return res.status(400).json({ msg: 'An account with this email already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new User({
      username,
      email,
      password: hashedPassword,
      interest: interest || 'Gym',
      location: location || 'Online'
    });

    await user.save();

    const token = jwt.sign({ id: user._id, username: user.username }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
    res.status(201).json({ token, username: user.username, id: user._id });
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    let { email, password } = req.body;
    email = email.trim().toLowerCase();

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: 'Invalid email or password' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: 'Invalid email or password' });

    const token = jwt.sign({ id: user._id, username: user.username }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
    res.json({ token, username: user.username, id: user._id });
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// 1. Forgot Password - Verify Email & Generate Token
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ msg: 'Please provide registered email.' });

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) return res.status(404).json({ msg: 'No account found with this email address.' });

    const resetToken = crypto.randomBytes(16).toString('hex');
    user.resetToken = resetToken;
    user.resetTokenExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins validity
    await user.save();

    res.json({
      msg: 'Verification successful. Reset code generated.',
      resetToken: resetToken
    });
  } catch (err) {
    res.status(500).json({ msg: 'Error processing request', error: err.message });
  }
});

// 2. Reset Password - Verify Token & Update Hash
router.post('/reset-password', async (req, res) => {
  try {
    const { email, resetToken, newPassword } = req.body;
    if (!email || !resetToken || !newPassword) {
      return res.status(400).json({ msg: 'Missing required parameters.' });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
      resetToken: resetToken,
      resetTokenExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ msg: 'Invalid or expired reset token.' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.resetToken = null;
    user.resetTokenExpires = null;
    await user.save();

    res.json({ msg: 'Password updated successfully! You can now log in.' });
  } catch (err) {
    res.status(500).json({ msg: 'Failed to reset password', error: err.message });
  }
});

module.exports = router;
