const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const { router: authRouter, sessions } = require('./routes/auth');
const uploadRouter = require('./routes/upload');
const groupRouter = require('./routes/groups');
const chatSocket = require('./websocket/chat');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all for local dev simplicity
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/auth', authRouter);
app.use('/api', uploadRouter);
app.use('/api/groups', groupRouter);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Socket.IO
chatSocket(io, sessions);

const PORT = 3000;

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});