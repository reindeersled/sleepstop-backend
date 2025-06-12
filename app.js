const express = require('express');
const cors = require('cors');
// REMOVED: const db = require('./models/db'); // No longer needed
const { sequelize } = require('./models'); // <-- NEW: Import sequelize from models/index.js
const authRoutes = require('./routes/auth');
const alarmRoutes = require('./routes/alarms');

const app = express();
require('dotenv').config();
app.use((req, res, next) => {
  console.log(`${req.method} ${req.originalUrl}`);
  next();
});

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/alarms', alarmRoutes);

// Database connection and server start
// CHANGED: db.sequelize.sync().then(() => { ... });
sequelize.sync({ alter: true }).then(() => { // <-- Use { alter: true } for development/migrations
  const PORT = process.env.PORT || 8080;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Failed to sync DB:', err);
  process.exit(1); // Exit if DB sync fails
});