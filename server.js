const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');
const matchRoutes = require('./routes/match');
const adminRoutes = require('./routes/admin');
const Message = require('./models/Message');

const app = express();
const server = http.createServer(app);

const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/match', matchRoutes);
app.use('/api/admin', adminRoutes);

app.get('/health', (req, res) => res.status(200).send('OK'));

const uri = process.env.MONGO_URI;
if (uri) {
  mongoose.connect(uri)
    .then(() => console.log('db connected'))
    .catch(err => console.error('db error:', err));
}

io.on('connection', (socket) => {
  socket.on('join_user', (rawUser) => {
    if (!rawUser) return;
    socket.join(rawUser.replace('@', '').trim());
  });

  socket.on('join_group', (room) => socket.join(room));

  socket.on('send_direct_message', async (data) => {
    try {
      const sender = data.sender.replace('@', '').trim();
      const recipient = data.recipient.replace('@', '').trim();
      const text = data.text.trim();
      const isGroup = !!data.isGroup;

      if (!isGroup && sender === recipient) return;

      const msg = new Message({ sender, recipient, text, isGroup });
      await msg.save();

      if (isGroup) {
        io.to(recipient).emit('receive_direct_message', msg);
      } else {
        io.to(recipient).emit('receive_direct_message', msg);
        io.to(sender).emit('receive_direct_message', msg);
      }
    } catch (e) {
      console.error(e);
    }
  });

  socket.on('delete_message_event', (data) => {
    const { messageId, recipient, isGroup } = data;
    if (isGroup) {
      io.to(recipient).emit('message_deleted', { messageId });
    } else {
      io.to(recipient).emit('message_deleted', { messageId });
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => console.log(`running on :${PORT}`));
