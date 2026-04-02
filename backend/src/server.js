/**
 * SEEN POINT — Express Server Entry Point
 * ----------------------------------------
 * Sets up:
 * - Express middleware (CORS, helmet, rate limiting, morgan)
 * - REST API routes (/api/auth, /api/content, /api/user, /api/admin)
 * - WebSocket server (real-time viewer count + notifications)
 * - Cron job to auto-refresh materialized views every hour
 * - DB health check on startup with actionable error messages
 */

'use strict';

require('dotenv').config();

const express   = require('express');
const cors      = require('cors');
const helmet    = require('helmet');
const morgan    = require('morgan');
const rateLimit = require('express-rate-limit');
const http      = require('http');
const WebSocket = require('ws');
const path      = require('path');
const cron      = require('node-cron');

const { pool, checkDatabaseHealth, getPoolStats } = require('./config/database');
const { errorHandler, notFound }                  = require('./middleware/errorHandler');

// Routes
const authRoutes    = require('./routes/auth');
const contentRoutes = require('./routes/content');
const userRoutes    = require('./routes/user');
const adminRoutes   = require('./routes/admin');
const onedriveRoutes = require('./routes/onedrive');

// ─── App Setup ────────────────────────────────────────────────────────────────

const app    = express();
const server = http.createServer(app);
const PORT   = parseInt(process.env.PORT) || 5000;

// ─── Middleware ───────────────────────────────────────────────────────────────

// Security headers (relaxed for development)
app.use(helmet({
    crossOriginResourcePolicy:  { policy: 'cross-origin' },
    contentSecurityPolicy: false, // Disable CSP in dev (enables inline scripts)
}));

// CORS — accept requests from local frontend + deployed frontends
const allowedOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        // Allow no-origin (Postman, curl, mobile) + any localhost port + configured origins
        if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1') || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else if (process.env.NODE_ENV !== 'production') {
            callback(null, true); // Allow all in development
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging (dev: colored output, prod: combined format)
if (process.env.NODE_ENV === 'production') {
    app.use(morgan('combined'));
} else {
    app.use(morgan('dev'));
}

// Rate limiting: 200 req / 15 min per IP
app.use('/api/', rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max:      parseInt(process.env.RATE_LIMIT_MAX)        || 200,
    standardHeaders: true,
    legacyHeaders:   false,
    message: { success: false, message: 'Too many requests — please slow down.' },
    skip: (req) => req.path === '/api/health', // Never rate-limit health checks
}));

// ─── API Routes ───────────────────────────────────────────────────────────────

app.use('/api/auth',    authRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/user',    userRoutes);
app.use('/api/admin',   adminRoutes);
app.use('/api/onedrive', onedriveRoutes);

// ─── Health Check ─────────────────────────────────────────────────────────────

app.get('/api/health', async (req, res) => {
    try {
        const dbResult = await pool.query('SELECT NOW() AS time, version() AS version');
        const poolStats = getPoolStats();

        res.json({
            success: true,
            status:  'healthy',
            timestamp: new Date().toISOString(),
            database: {
                connected: true,
                time: dbResult.rows[0].time,
                version: dbResult.rows[0].version.split(' ')[0] + ' ' + dbResult.rows[0].version.split(' ')[1],
            },
            pool: poolStats,
            uptime: Math.round(process.uptime()) + 's',
            memory: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
        });
    } catch (err) {
        res.status(503).json({
            success:  false,
            status:   'unhealthy',
            database: { connected: false, error: err.message },
        });
    }
});

// ─── Static Frontend (optional single-server deployment) ──────────────────────

if (process.env.SERVE_FRONTEND === 'true') {
    const frontendPath = path.join(__dirname, '../../frontend');
    app.use(express.static(frontendPath));
    app.get('*', (req, res) => {
        if (!req.path.startsWith('/api')) {
            res.sendFile(path.join(frontendPath, 'index.html'));
        }
    });
}

// ─── 404 + Error Handlers ─────────────────────────────────────────────────────
// Must be registered AFTER all routes

app.use(notFound);
app.use(errorHandler);

// ─── WebSocket Server ──────────────────────────────────────────────────────────

const wss              = new WebSocket.Server({ server });
const connectedClients = new Set();

wss.on('connection', (ws, req) => {
    connectedClients.add(ws);

    // Immediately tell new client the current viewer count
    ws.send(JSON.stringify({
        type: 'connection',
        data: { connectedUsers: connectedClients.size, timestamp: new Date().toISOString() },
    }));

    // Broadcast updated count to everyone
    broadcastToAll({ type: 'viewer_count', data: { count: connectedClients.size } });

    ws.on('message', (raw) => {
        try {
            const msg = JSON.parse(raw.toString());

            switch (msg.type) {
                case 'ping':
                    ws.send(JSON.stringify({ type: 'pong', ts: Date.now() }));
                    break;

                case 'watching':
                    // User started watching content — broadcast to all (live viewer widget)
                    if (msg.contentId) {
                        broadcastToAll({
                            type: 'viewer_update',
                            data: { contentId: msg.contentId, viewers: connectedClients.size },
                        });
                    }
                    break;
            }
        } catch { /* ignore malformed messages */ }
    });

    ws.on('close', () => {
        connectedClients.delete(ws);
        broadcastToAll({ type: 'viewer_count', data: { count: connectedClients.size } });
    });

    ws.on('error', () => {
        connectedClients.delete(ws);
    });
});

function broadcastToAll(message) {
    const json = JSON.stringify(message);
    connectedClients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(json);
        }
    });
}

// Export broadcast + WS utils for use in admin routes  
app.locals.broadcast          = broadcastToAll;
app.locals.getConnectedCount  = () => connectedClients.size;

// ─── Cron Job: Auto-Refresh Materialized Views ────────────────────────────────

/**
 * Refresh all materialized views every hour at :30 past the hour.
 * This keeps the trending_content view current without locking reads.
 * 
 * Schedule: "30 * * * *" = every hour at minute 30
 * In production, consider pg_cron for in-DB scheduling.
 */
function scheduleMVRefresh() {
    cron.schedule('30 * * * *', async () => {
        try {
            const start = Date.now();
            await pool.query(`SELECT refresh_all_materialized_views()`);
            console.log(`🔄 [Cron] Materialized views refreshed (${Date.now() - start}ms)`);
        } catch (err) {
            console.error('🔴 [Cron] MV refresh failed:', err.message);
        }
    }, {
        scheduled: true,
        timezone: 'UTC',
    });

    console.log('  ⏰ Cron job scheduled: MV refresh every hour at :30');
}

// ─── Startup ──────────────────────────────────────────────────────────────────

async function startServer() {
    console.log('\n  ╔══════════════════════════════════════════════╗');
    console.log('  ║   🎬  SEEN POINT Streaming Platform           ║');
    console.log('  ║   DBMS Final Year Project — Node.js API      ║');
    console.log('  ╚══════════════════════════════════════════════╝\n');

    // Check DB health before accepting requests
    console.log('  Checking database connection...');
    await checkDatabaseHealth();

    // Start HTTP + WebSocket server
    server.listen(PORT, () => {
        console.log('\n  ─────────────────────────────────────────────');
        console.log(`  🌐 API Server:    http://localhost:${PORT}`);
        console.log(`  🔌 WebSocket:     ws://localhost:${PORT}`);
        console.log(`  🏥 Health Check:  http://localhost:${PORT}/api/health`);
        console.log(`  📋 Environment:   ${process.env.NODE_ENV || 'development'}`);
        console.log('  ─────────────────────────────────────────────\n');
    });

    // Start cron job only if DB is up
    scheduleMVRefresh();
}

// ─── Graceful Shutdown ────────────────────────────────────────────────────────

async function shutdown(signal) {
    console.log(`\n  📴 ${signal} received — shutting down gracefully...`);

    // Stop accepting new WebSocket connections
    wss.close();

    // Close HTTP server (stop accepting new requests)
    server.close(async () => {
        // Drain the DB pool
        await pool.end();
        console.log('  ✅ Shutdown complete.');
        process.exit(0);
    });

    // Force exit after 10s if shutdown hangs
    setTimeout(() => {
        console.error('  ⚠️  Forced shutdown after timeout');
        process.exit(1);
    }, 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

// Catch unhandled promise rejections
process.on('unhandledRejection', (reason) => {
    console.error('🔴 Unhandled Promise Rejection:', reason);
});

// ─── Start ────────────────────────────────────────────────────────────────────

startServer().catch((err) => {
    console.error('💥 Server startup failed:', err.message);
    process.exit(1);
});
