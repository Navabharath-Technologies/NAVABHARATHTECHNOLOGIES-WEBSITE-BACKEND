require('dotenv').config();

const express = require('express');
const helmet  = require('helmet');
const cors    = require('cors');
const path    = require('path');

const authRoutes        = require('./routes/auth');
const jobRoutes         = require('./routes/jobs');
const applicationRoutes = require('./routes/applications');
const webhookRoutes     = require('./routes/webhooks');
const adminRoutes       = require('./routes/admin');

const { globalLimiter } = require('./middleware/rateLimit');
const { startQueue }    = require('./lib/queue');
const { UPLOAD_DIR }    = require('./lib/storage');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Trust Render's proxy ────────────────────────────────────────
app.set('trust proxy', 1);

// ── Security headers ────────────────────────────────────────────
app.use(helmet());

// ── CORS ────────────────────────────────────────────────────────
const allowedOrigins = [
  'https://www.navabharathtechnologies.com',
  'https://navabharathtechnologies.com',
  // Allow localhost in development
  ...(process.env.NODE_ENV !== 'production'
    ? ['http://localhost:5500', 'http://127.0.0.1:5500', 'http://localhost:3001']
    : []),
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g., Postman, server-to-server)
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// ── Global rate limiter ─────────────────────────────────────────
app.use(globalLimiter);

// ── Webhook route FIRST — needs raw body for HMAC verification ──
// Must be registered before express.json() strips the raw body
app.use('/api/webhooks', webhookRoutes);

// ── Body parsers ────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ── Serve uploaded resumes (static) ────────────────────────────
// NOTE: For production scale, move files to S3/Cloudflare R2 and remove this
app.use('/uploads', express.static(UPLOAD_DIR));

// ── API routes ──────────────────────────────────────────────────
app.use('/api/auth',         authRoutes);
app.use('/api/jobs',         jobRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/admin',        adminRoutes);

// ── Health check ────────────────────────────────────────────────
app.get('/', (_req, res) => {
  res.json({
    service:   'Navabharath Technologies Backend',
    version:   '2.0.0',
    status:    'running',
    endpoints: [
      'POST   /api/auth/register',
      'POST   /api/auth/login',
      'POST   /api/auth/refresh',
      'GET    /api/jobs',
      'GET    /api/jobs/:id',
      'POST   /api/applications',
      'GET    /api/applications/mine',
      'GET    /api/applications/:id',
      'DELETE /api/applications/:id',
      'POST   /api/webhooks/ats-update',
      'GET    /api/admin/stats',
      'POST   /api/admin/jobs',
      'GET    /api/admin/applications',
    ],
  });
});

// ── 404 catch-all ───────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Global error handler ────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err.message);
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'CORS not allowed' });
  }
  res.status(500).json({ error: 'Internal server error' });
});

// ── Bootstrap ───────────────────────────────────────────────────
async function start() {
  try {
    await startQueue();          // Start pg-boss job queue
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

start();
