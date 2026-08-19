const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const authMiddleware = require('../middleware/auth');

// Saare posts fetch karne ke liye (Public)
router.get('/', async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Naya activity request post karne ke liye (Protected)
router.post('/create', authMiddleware, async (req, res) => {
  try {
    const { category, title, description, locationOrPlatform, authorName } = req.body;
    const newPost = new Post({
      author: req.user.userId,
      authorName,
      category,
      title,
      description,
      locationOrPlatform
    });
    await newPost.save();
    res.status(201).json({ message: 'Post created successfully!', post: newPost });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
