// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();

// --- CONFIGURATION ---
// I added your specific domain here so it works immediately
const ALLOWED_ORIGINS = [
  "https://tierparty-new-production.up.railway.app", // Your specific frontend
  "http://localhost:3000", // For local testing
  "http://localhost:3001"
];

app.use(cors({
  origin: ALLOWED_ORIGINS,
  methods: ["GET", "POST"],
  credentials: true
}));

const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

const io = new Server(server, {
  maxHttpBufferSize: 1e7, // 10MB limit
  cors: { 
    origin: ALLOWED_ORIGINS, // Allow your frontend to connect
    methods: ["GET", "POST"],
    credentials: true
  },
});

// --- DATA ---
const rooms = {};
const socketRoomMap = {};

const DEFAULT_TIERS = {
  S: [], A: [], B: [], C: [], D: [],
  Pool: [],
};

// --- API ---
// Health check for Railway
app.get('/', (req, res) => {
  res.send('Tier List Backend is Running! 🚀');
});

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

  socket.on('add_item', ({ roomId, item }) => {
    if (rooms[roomId]) {
      const currentTiers = rooms[roomId].tiers;
      const isDuplicate = Object.values(currentTiers).some(tierArray => 
        tierArray.includes(item)
      );

      if (isDuplicate) return;

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
  console.log(`🚀 SERVER RUNNING ON PORT ${PORT}`);
});