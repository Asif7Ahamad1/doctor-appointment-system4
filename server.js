require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./config/db');
const { requestLogger } = require('./middleware/logger');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const statRoutes = require('./routes/statRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// Middlewares
// ==========================================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Custom HTTP Request Logger Middleware
app.use(requestLogger);

// Static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// API Routes
// ==========================================
app.use('/api/auth', authRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/stats', statRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    mysqlConnected: db.getIsConnected(),
    nodeEnv: process.env.NODE_ENV || 'development'
  });
});

// Single Page Application route fallback for direct visits
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 404 & Centralized Error Handlers
app.use(notFoundHandler);
app.use(errorHandler);

// ==========================================
// Start Server and Initialize Database
// ==========================================
function startServer() {
  const server = app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(` Doctor Appointment System is running!`);
    console.log(` Server URL: http://localhost:${PORT}`);
    console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`====================================================`);
  });

  // Connect to database in the background without blocking server startup
  db.initPool().then(connected => {
    console.log(` Database status: ${connected ? 'MySQL Live & Connected' : 'In-Memory Fallback Mode'}`);
  }).catch(err => {
    console.warn('Database initialization warning:', err.message);
  });
}

startServer();

module.exports = app;
