import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB } from './config/db.js';

import paintingsRoutes from './routes/paintings.js';
import favoritesRoutes from './routes/favorites.js';
import searchRoutes from './routes/search.js';
import chatRoutes from './routes/chat.js';
import analyzeRoutes from './routes/analyze.js';
import dashboardRoutes from './routes/dashboard.js';
import authRoutes from './routes/auth.js';
import analyticsRoutes from './routes/analytics.js';

const app = express();
const PORT = Number(process.env.PORT) || 5000;

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is required. Add a strong, unique value to server/.env.');
}

// CORS — allow local dev origins and any origins listed in ALLOWED_ORIGINS env var
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5190',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5190',
  ...(process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : [])
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true
}));
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  return next();
});
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'ArtMind AI Portal API is operational'
  });
});

// API Routes
app.use('/api/paintings', paintingsRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/analyze', analyzeRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/analytics', analyticsRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[API Error]', err.stack || err.message);

  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

async function startServer() {
  try {
    await connectDB();

    // Render requires 0.0.0.0 and its PORT environment variable
    app.listen(PORT, '0.0.0.0', () => {
      console.log(
        `[Server] ArtMind AI Portal Server listening on port ${PORT}`
      );
    });
  } catch (error) {
    console.error('[Server] Startup failed:', error.message);
    process.exit(1);
  }
}

startServer();
