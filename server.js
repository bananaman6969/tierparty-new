// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();

// Allow Express to handle requests from anywhere (simplifies health checks)
app.use(cors());

const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

// --- CONFIGURATION ---
// In Railway, set FRONTEND_URL to your deployed frontend (e.g., https://my-site.vercel.app)
// If not set, it allows "*" (anyone) to connect.
const ALLOWED_ORIGIN = process.env.FRONTEND_URL || "*";

const io = new Server(server, {
  maxHttpBufferSize: 1e7, // 10MB limit for image uploads
  cors: { 
    origin: ALLOWED_ORIGIN, 
    methods: ["GET", "POST"],
    credentials: true
  },
});

// --- DATA STORE ---
const rooms = {};
const socketRoomMap = {};

const DEFAULT_TIERS = {
  S: [], A: [], B: [], C: [], D: [],
  Pool: [],
};

// --- API ---
// 1. Health Check (Crucial for Railway to know app is running)
app.get('/', (req, res) => {
  res.send('Tier List Server is Running! 🚀');
});

// 2. Check Room Existence
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

    // Add player if not present
    const playerList = rooms[roomId].players;
    if (!playerList.find(p => p.id === socket.id)) {
      playerList.push({ id: socket.id, username });
    }

    // Send initial state
    socket.emit('receive_state', rooms[roomId].tiers);
    io.to(roomId).emit('update_players', rooms[roomId].players);
  });

  socket.on('update_tiers', ({ roomId, newTiers }) => {
    if (rooms[roomId]) {
      rooms[roomId].tiers = newTiers;
      // Broadcast to everyone ELSE in the room
      socket.to(roomId).emit('receive_state', newTiers);
    }
  });

  socket.on('add_item', ({ roomId, item }) => {
    if (rooms[roomId]) {
      const currentTiers = rooms[roomId].tiers;
      
      // Duplicate prevention
      const isDuplicate = Object.values(currentTiers).some(tierArray => 
        tierArray.includes(item)
      );

      if (isDuplicate) return;

      rooms[roomId].tiers.Pool.unshift(item);
      // Broadcast to EVERYONE (including sender)
      io.to(roomId).emit('receive_state', rooms[roomId].tiers);
    }
  });

  socket.on('disconnect', () => {
    const roomId = socketRoomMap[socket.id];
    if (roomId && rooms[roomId]) {
      rooms[roomId].players = rooms[roomId].players.filter(p => p.id !== socket.id);
      io.to(roomId).emit('update_players', rooms[roomId].players);
      
      // Cleanup empty rooms to save memory (Optional)
      if (rooms[roomId].players.length === 0) {
         // delete rooms[roomId]; // Uncomment to auto-delete empty rooms
      }
    }
    delete socketRoomMap[socket.id];
    console.log(`User disconnected: ${socket.id}`);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 SERVER RUNNING ON PORT ${PORT}`);
});