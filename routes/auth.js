const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Check live username availability
router.get('/check-username/:username', async (req, res) => {
  try {
    const rawUsername = req.params.username.replace('@', '').trim().toLowerCase();
    const existing = await User.findOne({ username: new RegExp(`^${rawUsername}$`, 'i') });
    res.json({ available: !existing });
  } catch (err) {
    res.status(500).json({ msg: 'Error validating username' });
  }
});

// Signup with strict duplication check
router.post('/signup', async (req, res) => {
  try {
    let { username, email, password, interest, location } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ msg: 'All required fields must be filled' });
    }

    username = username.replace('@', '').trim();
    email = email.trim().toLowerCase();

    // Check duplicate username (case-insensitive)
    const userExists = await User.findOne({ username: new RegExp(`^${username}$`, 'i') });
    if (userExists) {
      return res.status(400).json({ msg: 'This username is already taken. Please choose a different handle.' });
    }

    // Check duplicate email
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
    res.status(500).json({ msg: 'Internal server error', error: err.message });
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
    res.status(500).json({ msg: 'Internal server error', error: err.message });
  }
});

module.exports = router;
