const express = require('express');
const cors = require('cors');
const db = require('./models/db');
const authRoutes = require('./routes/auth');
const alarmRoutes = require('./routes/alarms');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/alarms', alarmRoutes);

// Database connection and server start
db.sequelize.sync().then(() => {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});