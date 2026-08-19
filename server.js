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

const io = new Server(server, {
  cors: { origin: '*' }
});

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

const uri = process.env.MONGO_URI;
if (uri) {
  mongoose.connect(uri)
    .then(() => console.log('db connected'))
    .catch(err => console.error('db connection error:', err));
}

io.on('connection', (socket) => {
  socket.on('join_room', (room) => socket.join(room));
  socket.on('send_message', (msg) => {
    io.to(msg.room).emit('receive_message', msg);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`running on :${PORT}`);
});
