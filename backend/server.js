require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const { Pool } = require('pg');
const { createClient } = require('redis');
const { createAdapter } = require('@socket.io/redis-adapter');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// --- Postgres ---
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'chatdb',
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      username VARCHAR(50) NOT NULL,
      room VARCHAR(50) NOT NULL DEFAULT 'general',
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
  console.log('[db] schema ready');
}

// --- Redis adapter (lets socket.io scale across multiple backend replicas) ---
async function setupRedisAdapter() {
  const url = `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`;
  const pubClient = createClient({ url });
  const subClient = pubClient.duplicate();
  pubClient.on('error', (err) => console.error('[redis pub]', err));
  subClient.on('error', (err) => console.error('[redis sub]', err));
  await Promise.all([pubClient.connect(), subClient.connect()]);
  io.adapter(createAdapter(pubClient, subClient));
  console.log('[redis] adapter connected');
}

// --- REST routes ---
app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.get('/api/messages/:room', async (req, res) => {
  try {
    const { room } = req.params;
    const result = await pool.query(
      'SELECT username, content, created_at FROM messages WHERE room = $1 ORDER BY created_at ASC LIMIT 100',
      [room]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal_error' });
  }
});

// --- Socket.io events ---
io.on('connection', (socket) => {
  console.log('[socket] connected', socket.id);

  socket.on('join_room', (room) => {
    socket.join(room);
  });

  socket.on('send_message', async ({ username, room, content }) => {
    if (!username || !room || !content) return;
    try {
      await pool.query(
        'INSERT INTO messages (username, room, content) VALUES ($1, $2, $3)',
        [username, room, content]
      );
      io.to(room).emit('receive_message', { username, content, created_at: new Date() });
    } catch (err) {
      console.error(err);
    }
  });

  socket.on('disconnect', () => {
    console.log('[socket] disconnected', socket.id);
  });
});

const PORT = process.env.PORT || 4000;

(async () => {
  // Simple retry loop so the container doesn't crash-loop while
  // postgres/redis are still starting up (useful in docker-compose).
  const maxRetries = 15;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await initDb();
      await setupRedisAdapter();
      break;
    } catch (err) {
      console.error(`[startup] attempt ${attempt}/${maxRetries} failed:`, err.message);
      if (attempt === maxRetries) process.exit(1);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  server.listen(PORT, () => console.log(`[server] listening on port ${PORT}`));
})();
