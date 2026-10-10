const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const helmet = require('helmet');
const authRoutes = require('./routes/auth');
const unitRoutes = require('./routes/units');
const bookingRoutes = require('./routes/bookings');
const adminRoutes = require('./routes/admin');
const statsRoutes = require('./routes/stats');
const offerRoutes = require('./routes/offers');
const telegram = require('./telegram');
const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
const allowedOrigins = (process.env.FRONTEND_URL || '').split(',').map(v => v.trim()).filter(Boolean);
const apiOrigin = (process.env.API_ORIGIN || '').trim();
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' }, contentSecurityPolicy: { directives: { imgSrc: ["'self'", 'data:', 'blob:'], connectSrc: ["'self'", ...(apiOrigin ? [apiOrigin] : [])] } } }));
app.use(cors({ origin(origin, callback) {
  // Allow server-to-server/health requests without an Origin header.
  if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) return callback(null, true);
  return callback(new Error('Origin is not allowed by CORS'));
}, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.get('/api/health', (req, res) => res.json({ ok: true, service: 'kosmos-stays' }));
app.use('/api/auth', authRoutes);
app.use('/api/units', unitRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/offers', offerRoutes);
app.use((err, req, res, next) => {
  if (err.message === 'Origin is not allowed by CORS') return res.status(403).json({ message: 'This website is not allowed to access the API.' });
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) return res.status(400).json({ message: 'Invalid request body.' });
  if (err && (err.name === 'MulterError' || /Upload a JPG/.test(err.message || ''))) return res.status(400).json({ message: err.message || 'Invalid upload.' });
  console.error('Unhandled API error:', err.message);
  return res.status(500).json({ message: 'Something went wrong. Please try again.' });
});
const port = Number(process.env.PORT || 4001);
if (!process.env.MONGODB_URI) { console.error('MONGODB_URI is required'); process.exit(1); }
if (process.env.NODE_ENV === 'production' && !allowedOrigins.length) { console.error('FRONTEND_URL is required in production'); process.exit(1); }
mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000, maxPoolSize: 10 })
  .then(() => {
    console.log('MongoDB connected');
    app.listen(port, '0.0.0.0', () => {
      console.log(`Kosmos Stays API listening on port ${port}`);
      if (process.env.TELEGRAM_BOT_TOKEN) {
        telegram.poll(process.env.TELEGRAM_BOT_TOKEN);
        setInterval(() => telegram.alertOverdue().catch(e => console.error('Cleaning alert monitor:', e.message)), 60 * 1000);
      }
    });
  })
  .catch(error => { console.error('MongoDB connection failed:', error.message); process.exit(1); });
