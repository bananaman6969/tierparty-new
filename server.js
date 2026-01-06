// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const os = require('os');

const app = express();
app.use(cors());

const server = http.createServer(app);
const PORT = 3001;

function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return 'localhost';
}
const localIp = getLocalIp();

const io = new Server(server, {
  // Allow large images (10MB limit)
  maxHttpBufferSize: 1e7,
  cors: { origin: "*", methods: ["GET", "POST"] },
});

// --- DATA ---
const rooms = {};
const socketRoomMap = {};

const DEFAULT_TIERS = {
  S: [], A: [], B: [], C: [], D: [],
  Pool: [],
};

// --- API ---
app.get('/api/check-room/:roomId', (req, res) => {
  const exists = !!rooms[req.params.roomId];
  res.json({ exists });
});

// --- SOCKETS ---
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('join_room', ({ roomId, username }) => {
    socket.join(roomId);
    socketRoomMap[socket.id] = roomId;

    if (!rooms[roomId]) {
      rooms[roomId] = {
        tiers: JSON.parse(JSON.stringify(DEFAULT_TIERS)),
        players: []
      };
    }

    const playerList = rooms[roomId].players;
    if (!playerList.find(p => p.id === socket.id)) {
      playerList.push({ id: socket.id, username });
    }

    socket.emit('receive_state', rooms[roomId].tiers);
    io.to(roomId).emit('update_players', rooms[roomId].players);
  });

  socket.on('update_tiers', ({ roomId, newTiers }) => {
    if (rooms[roomId]) {
      rooms[roomId].tiers = newTiers;
      socket.to(roomId).emit('receive_state', newTiers);
    }
  });

  // --- MODIFIED ADD ITEM LOGIC (PREVENTS DUPLICATES) ---
  socket.on('add_item', ({ roomId, item }) => {
    if (rooms[roomId]) {
      const currentTiers = rooms[roomId].tiers;
      
      // Check if item exists in ANY tier or the Pool
      const isDuplicate = Object.values(currentTiers).some(tierArray => 
        tierArray.includes(item)
      );

      if (isDuplicate) {
        // If duplicate, do nothing. This prevents React "Duplicate Key" crashes.
        return; 
      }

      // If unique, add to Pool
      rooms[roomId].tiers.Pool.unshift(item);
      io.to(roomId).emit('receive_state', rooms[roomId].tiers);
    }
  });

  socket.on('disconnect', () => {
    const roomId = socketRoomMap[socket.id];
    if (roomId && rooms[roomId]) {
      rooms[roomId].players = rooms[roomId].players.filter(p => p.id !== socket.id);
      io.to(roomId).emit('update_players', rooms[roomId].players);
    }
    delete socketRoomMap[socket.id];
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 SERVER RUNNING http://${localIp}:${PORT}`);
});