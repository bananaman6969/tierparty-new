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

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

// --- DATA STRUCTURES ---
// rooms[roomId] = { tiers: {...}, players: [{id, name}, ...] }
const rooms = {};
// helper to track which room a socket is in: socketRoomMap[socketId] = roomId
const socketRoomMap = {}; 

const DEFAULT_TIERS = {
  S: [], A: [], B: [], C: [], D: [],
  Pool: ['Pizza', 'Burger', 'Sushi', 'Döner', 'Salat', 'Pasta', 'Currywurst', 'Schnitzel', 'Tacos', 'Eis'],
};

// API Check
app.get('/api/check-room/:roomId', (req, res) => {
  const exists = !!rooms[req.params.roomId];
  res.json({ exists });
});

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // 1. JOIN ROOM
  socket.on('join_room', ({ roomId, username }) => {
    socket.join(roomId);
    socketRoomMap[socket.id] = roomId;

    // Create room if needed
    if (!rooms[roomId]) {
      rooms[roomId] = {
        tiers: JSON.parse(JSON.stringify(DEFAULT_TIERS)),
        players: []
      };
    }

    // Add player to list
    const playerList = rooms[roomId].players;
    if (!playerList.find(p => p.id === socket.id)) {
      playerList.push({ id: socket.id, username });
    }

    // Send Initial Data
    socket.emit('receive_state', rooms[roomId].tiers);
    
    // Broadcast NEW Player List to everyone
    io.to(roomId).emit('update_players', rooms[roomId].players);
  });

  // 2. UPDATE TIERS
  socket.on('update_tiers', ({ roomId, newTiers }) => {
    if (rooms[roomId]) {
      rooms[roomId].tiers = newTiers;
      socket.to(roomId).emit('receive_state', newTiers);
    }
  });

  // 3. DISCONNECT
  socket.on('disconnect', () => {
    const roomId = socketRoomMap[socket.id];
    
    if (roomId && rooms[roomId]) {
      // Remove player from array
      rooms[roomId].players = rooms[roomId].players.filter(p => p.id !== socket.id);
      
      // Notify remaining players
      io.to(roomId).emit('update_players', rooms[roomId].players);
      
      // Optional: Delete room if empty
      if (rooms[roomId].players.length === 0) {
        delete rooms[roomId];
      }
    }
    delete socketRoomMap[socket.id];
    console.log('User disconnected');
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 SERVER RUNNING on port ${PORT}`);
});