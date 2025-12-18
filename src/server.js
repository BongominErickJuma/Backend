const env = require('dotenv');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');

env.config({ path: path.resolve(__dirname, '../.env') });

const app = require('./app.js');
const orderController = require('./controllers/orders.controller.js');

const PORT = process.env.PORT || 5000;

// ============================================
// CREATE HTTP SERVER FOR WEBSOCKET
// ============================================
const server = http.createServer(app);

// ============================================
// CONFIGURE SOCKET.IO
// ============================================
const io = socketIo(server, {
  cors: {
    origin: '*', // You might want to restrict this in production
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true
  },
  transports: ['websocket', 'polling'] // Support both
});

// ============================================
// AUTHENTICATION MIDDLEWARE FOR WEBSOCKET
// ============================================
io.use((socket, next) => {
  // You can add JWT authentication here if needed
  // For now, we'll allow all connections and authenticate in handlers
  const token = socket.handshake.auth.token;
  if (token) {
    // Verify JWT token here if needed
    // const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // socket.user = decoded;
  }
  next();
});

// ============================================
// INITIALIZE ORDER WEBSOCKET HANDLERS
// ============================================
orderController.initializeWebSocket(io);

// ============================================
// START SERVER
// ============================================
server.listen(PORT, () => {
  console.log(
    `🚀 Server running on port ${PORT} [${process.env.NODE_ENV || 'adopted'}]`
  );
  console.log(`🔌 WebSocket server is ready on port ${PORT}`);
});

// ============================================
// HANDLE SERVER ERRORS
// ============================================
server.on('error', error => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use`);
    process.exit(1);
  } else {
    console.error('Server error:', error);
  }
});

// ============================================
// GRACEFUL SHUTDOWN
// ============================================
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Closing server gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Closing server gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
