const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const auth = require('../middleware/auth');

router.get('/', async (req, res) => {
  try {
    const list = await Post.find().sort({ createdAt: -1 }).limit(50);
    res.json(list);
  } catch (err) {
    res.status(500).json({ msg: 'Failed to fetch posts' });
  }
});

router.post('/create', auth, async (req, res) => {
  try {
    const { title, description, category } = req.body;
    if (!title || !description) {
      return res.status(400).json({ msg: 'Missing title or description' });
    }

    const post = new Post({
      author: req.user.id,
      authorName: req.user.username.replace('@', '').trim(),
      category: category || 'Quiet Sync',
      title,
      description
    });

    await post.save();
    res.status(201).json(post);
  } catch (err) {
    res.status(500).json({ msg: 'Failed to create post' });
  }
});

module.exports = router;
