require('dotenv').config();

module.exports = {
  JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key',
  DATABASE_URL: process.env.DATABASE_URL || 'postgres://username:password@localhost:5432/sleepstop'
};