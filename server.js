const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');
const matchRoutes = require('./routes/match');
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

app.get('/health', (req, res) => res.status(200).send('OK'));

const uri = process.env.MONGO_URI;
if (uri) {
  mongoose.connect(uri)
    .then(() => console.log('db connected'))
    .catch(err => console.error('db error:', err));
}

// Real-time Chat Engine
io.on('connection', (socket) => {
  socket.on('join_user', (username) => {
    socket.join(username);
  });

  socket.on('join_group', (groupName) => {
    socket.join(groupName);
  });

  socket.on('send_direct_message', async (data) => {
    const { sender, recipient, text, isGroup } = data;
    try {
      const msg = new Message({ sender, recipient, text, isGroup: !!isGroup });
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
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => console.log(`running on :${PORT}`));
