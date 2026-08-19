const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/introvert_hub')
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.log('DB Error:', err));

// Socket.io Realtime Chat
io.on('connection', (socket) => {
  socket.on('join_room', (room) => socket.join(room));
  socket.on('send_message', (data) => {
    io.to(data.room).emit('receive_message', data);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
