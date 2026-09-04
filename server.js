
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'ts-web-standalone.html'));
});

const rooms = {};

io.on('connection', (socket) => {
  console.log('Conectou', socket.id);
  socket.on('join-channel', ({ channelId, userName }) => {
    const prev = socket.data.channelId;
    if (prev && rooms[prev]) {
      rooms[prev].delete(socket.id);
      socket.leave(prev);
      io.to(prev).emit('user-left', { id: socket.id });
    }
    if (!rooms[channelId]) rooms[channelId] = new Set();
    rooms[channelId].add(socket.id);
    socket.join(channelId);
    socket.data.userName = userName;
    socket.data.channelId = channelId;
    const usersInChannel = Array.from(rooms[channelId]).map(id => {
      const s = io.sockets.sockets.get(id);
      return { id, name: s?.data.userName || 'Anon' };
    });
    io.to(channelId).emit('channel-users', usersInChannel);
    socket.to(channelId).emit('user-joined', { id: socket.id, name: userName });
    socket.to(channelId).emit('new-peer', { peerId: socket.id });
  });
  socket.on('webrtc-offer', ({ to, offer }) => io.to(to).emit('webrtc-offer', { from: socket.id, offer }));
  socket.on('webrtc-answer', ({ to, answer }) => io.to(to).emit('webrtc-answer', { from: socket.id, answer }));
  socket.on('webrtc-ice', ({ to, candidate }) => io.to(to).emit('webrtc-ice', { from: socket.id, candidate }));
  socket.on('chat-message', ({ channelId, text, userName }) => {
    io.to(channelId).emit('chat-message', { id: Date.now().toString(), userName, text, time: new Date().toLocaleTimeString().slice(0,5), channelId });
  });
  socket.on('disconnect', () => {
    const ch = socket.data.channelId;
    if (ch && rooms[ch]) {
      rooms[ch].delete(socket.id);
      io.to(ch).emit('user-left', { id: socket.id });
    }
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, '0.0.0.0', () => console.log(`TS-Web rodando na porta ${PORT}`));
