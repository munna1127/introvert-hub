const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');

const isValidGmail = (email) => /^[a-zA-Z0-9](\.?[a-zA-Z0-9_-]){5,}@gmail\.com$/.test(email);

router.get('/check-username/:username', async (req, res) => {
  try {
    const rawUsername = req.params.username.replace('@', '').trim().toLowerCase();
    const existing = await User.findOne({ username: new RegExp(`^${rawUsername}$`, 'i') });
    res.json({ available: !existing });
  } catch (err) {
    res.status(500).json({ msg: 'Error validating username' });
  }
});

// Signup Route
router.post('/signup', async (req, res) => {
  try {
    let { username, email, password, interest, location } = req.body;
    if (!username || !email || !password) return res.status(400).json({ msg: 'All fields are required.' });

    username = username.replace('@', '').trim();
    email = email.trim().toLowerCase();

    if (!isValidGmail(email)) return res.status(400).json({ msg: 'Please provide a valid @gmail.com address.' });
    if (password.length < 6) return res.status(400).json({ msg: 'Password must be at least 6 characters.' });

    const userExists = await User.findOne({ username: new RegExp(`^${username}$`, 'i') });
    if (userExists) return res.status(400).json({ msg: 'This username is already taken. Please choose another.' });

    const emailExists = await User.findOne({ email });
    if (emailExists) return res.status(400).json({ msg: 'An account with this Gmail already exists. Please Log In.' });

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

// Login Route with Clear Error Feedback
router.post('/login', async (req, res) => {
  try {
    let { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ msg: 'Please enter both Gmail and password.' });

    email = email.trim().toLowerCase();

    if (!isValidGmail(email)) {
      return res.status(400).json({ msg: 'Please enter a valid @gmail.com address.' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ msg: 'No account found with this Gmail. Please sign up first.' });
    }

    // Ban Check
    if (user.isBanned) {
      if (!user.banExpires) {
        return res.status(403).json({ msg: 'Your account is permanently banned.' });
      } else if (new Date() < new Date(user.banExpires)) {
        return res.status(403).json({ msg: `Your account is suspended until: ${new Date(user.banExpires).toLocaleString()}` });
      } else {
        user.isBanned = false;
        user.banExpires = null;
        await user.save();
      }
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Incorrect password. Please try again or use Forgot Password.' });
    }

    const token = jwt.sign({ id: user._id, username: user.username }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
    res.json({ token, username: user.username, id: user._id });
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// Forgot Password
router.post('/forgot-password', async (req, res) => {
  try {
    let { email } = req.body;
    if (!email) return res.status(400).json({ msg: 'Please provide registered Gmail.' });

    email = email.trim().toLowerCase();
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ msg: 'No account found with this Gmail.' });

    const resetToken = crypto.randomBytes(16).toString('hex');
    user.resetToken = resetToken;
    user.resetTokenExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    res.json({ msg: 'Verification successful.', resetToken });
  } catch (err) {
    res.status(500).json({ msg: 'Error processing request', error: err.message });
  }
});

// Reset Password
router.post('/reset-password', async (req, res) => {
  try {
    let { email, resetToken, newPassword } = req.body;
    if (!email || !resetToken || !newPassword) return res.status(400).json({ msg: 'Missing parameters.' });

    if (newPassword.length < 6) return res.status(400).json({ msg: 'Password must be at least 6 characters.' });

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
      resetToken,
      resetTokenExpires: { $gt: new Date() }
    });

    if (!user) return res.status(400).json({ msg: 'Invalid or expired reset token.' });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.resetToken = null;
    user.resetTokenExpires = null;
    await user.save();

    res.json({ msg: 'Password updated successfully!' });
  } catch (err) {
    res.status(500).json({ msg: 'Failed to reset password', error: err.message });
  }
});

module.exports = router;
