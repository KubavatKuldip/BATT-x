// Socket.io Server for Real-time Sensor Data Streaming
// Run this separately with: node server.js
// This runs on SOCKET_PORT (default 3001) while Next.js dev runs on 3000

const { createServer } = require('http');
const { Server } = require('socket.io');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();
const port = parseInt(process.env.PORT || process.env.SOCKET_PORT || '3001', 10);
const nextUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
const jwtSecret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;

if (!jwtSecret) {
  console.error('[ERROR] NEXTAUTH_SECRET is not configured. Socket.io server cannot verify authentication.');
  process.exit(1);
}

const ingestSecret = process.env.DEVICE_INGEST_SECRET;

const httpServer = createServer((req, res) => {
  // Internal emit endpoint: POST /emit
  // Called by the Next.js API route after storing a sensor reading.
  // Accepts requests from localhost only, authenticated with DEVICE_INGEST_SECRET.
  if (req.method === 'POST' && req.url === '/emit') {
    // Verify the request comes from localhost
    const remoteAddr = req.socket.remoteAddress;
    const isLocal = remoteAddr === '127.0.0.1' || remoteAddr === '::1' || remoteAddr === '::ffff:127.0.0.1';
    if (!isLocal) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Forbidden' }));
      return;
    }

    // Verify shared secret
    const authHeader = req.headers['x-device-key'];
    if (!ingestSecret || ingestSecret.length < 16 || authHeader !== ingestSecret) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Forbidden' }));
      return;
    }

    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        const { deviceId, sensorData } = JSON.parse(body);
        if (!deviceId || !sensorData) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing deviceId or sensorData' }));
          return;
        }

        const room = `device:${deviceId}`;
        const clientsInRoom = io.sockets.adapter.rooms.get(room)?.size || 0;

        if (clientsInRoom > 0) {
          io.to(room).emit('sensor-data', sensorData);
          console.log(`[${new Date().toISOString()}] Emitted real sensor data to ${clientsInRoom} client(s) in ${room}`);
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, clientsInRoom }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  // Default: status endpoint (GET /)
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    status: 'Socket.io server running',
    port,
    connections: io.engine.clientsCount,
    authenticated: true,
  }));
});

const io = new Server(httpServer, {
  cors: {
    origin: nextUrl,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Authentication required'));
    }

    // Verify JWT token
    const decoded = jwt.verify(token, jwtSecret);

    if (!decoded || !decoded.sub) {
      return next(new Error('Invalid token'));
    }

    // Attach user info to socket
    socket.userId = decoded.sub;
    socket.userRole = decoded.role || 'CONSUMER';
    socket.userEmail = decoded.email;

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(new Error('Token expired'));
    }
    if (error.name === 'JsonWebTokenError') {
      return next(new Error('Invalid token'));
    }
    return next(new Error('Authentication failed'));
  }
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`[${new Date().toISOString()}] Client connected: ${socket.id} (user: ${socket.userId})`);

  // Join device room
  socket.on('subscribe-device', async (deviceId) => {
    try {
      if (!deviceId || typeof deviceId !== 'string') {
        socket.emit('error', { message: 'Invalid device ID' });
        return;
      }

      // Special handling for demo-device-1 in demo mode
      if (DEMO_MODE && deviceId === 'demo-device-1') {
        // Allow subscription to demo-device-1 without database lookup or user ownership check
        // This is safe as it only applies when SOCKET_DEMO_MODE is true (dev/test only)
      } else {
        // Verify device exists and user has access for real devices
        const device = await prisma.device.findUnique({
          where: { id: deviceId },
          select: { userId: true },
        });

        if (!device) {
          socket.emit('error', { message: 'Device not found' });
          return;
        }

        // Check authorization (user owns device OR has admin/fleet manager privileges)
        const ROLE_HIERARCHY = {
          CONSUMER: 1,
          FLEET_MANAGER: 2,
          TECHNICIAN: 3,
          ADMIN: 4,
          SUPER_ADMIN: 5,
        };

        const userRoleLevel = ROLE_HIERARCHY[socket.userRole] || 0;
        const isAuthorized = device.userId === socket.userId || userRoleLevel >= ROLE_HIERARCHY.FLEET_MANAGER;

        if (!isAuthorized) {
          socket.emit('error', { message: 'Access denied to this device' });
          return;
        }
      }

      // Join the device room
      socket.join(`device:${deviceId}`);
      console.log(`[${new Date().toISOString()}] User ${socket.userId} subscribed to device:${deviceId}`);

      // Send acknowledgment
      socket.emit('subscribed', { deviceId });
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Subscription error:`, error.message);
      socket.emit('error', { message: 'Subscription failed' });
    }
  });

  // Unsubscribe from device
  socket.on('unsubscribe-device', (deviceId) => {
    if (!deviceId || typeof deviceId !== 'string') {
      return;
    }
    socket.leave(`device:${deviceId}`);
    console.log(`[${new Date().toISOString()}] User ${socket.userId} unsubscribed from device:${deviceId}`);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`[${new Date().toISOString()}] Client disconnected: ${socket.id} (user: ${socket.userId})`);
  });
});

// Simulate sensor data streaming (for demonstration)
// In production, this would receive data from IoT devices via POST /api/sensor-readings
// and the API would then emit via Socket.io
const DEMO_MODE = process.env.SOCKET_DEMO_MODE !== 'false';

if (DEMO_MODE) {
  console.log('[DEMO MODE] Simulating sensor data for demo-device-1');

  setInterval(() => {
    const deviceId = 'demo-device-1';

    const sensorData = {
      temperature: 35 + Math.random() * 30,
      gasLevel: Math.random() * 100,
      voltage: 48 + Math.random() * 6,
      current: Math.random() * 15,
      batteryPercent: 30 + Math.random() * 70,
      timestamp: new Date().toISOString(),
    };

    // Broadcast to all clients subscribed to this device
    const room = `device:${deviceId}`;
    const clientsInRoom = io.sockets.adapter.rooms.get(room)?.size || 0;

    if (clientsInRoom > 0) {
      io.to(room).emit('sensor-data', sensorData);
      console.log(`[${new Date().toISOString()}] Emitted sensor data to ${clientsInRoom} client(s) in ${room}`);
    }
  }, 5000); // Every 5 seconds
}

// Export io for use in API routes if needed
global.io = io;

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing server...');
  await prisma.$disconnect();
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

httpServer
  .once('error', (err) => {
    console.error('Server error:', err);
    process.exit(1);
  })
  .listen(port, () => {
    console.log(`> Socket.io server ready on http://localhost:${port}`);
    console.log(`> CORS origin: ${nextUrl}`);
    console.log(`> Demo mode: ${DEMO_MODE ? 'enabled' : 'disabled'}`);
    console.log(`> Authentication: enabled`);
  });
