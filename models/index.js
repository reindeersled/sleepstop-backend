// sleepstop-backend/models/index.js

const { sequelize, Sequelize } = require('./db'); // Import sequelize and Sequelize from db.js

// Import the already defined models
const User = require('./User');
const Alarm = require('./Alarm');

// Define associations:
// This is crucial for linking your models.
// It's best practice to define associations in a central place like index.js
// after all models have been loaded.
Object.keys(Alarm).forEach(key => { // Or use Alarm.associate if it's a static method
  if (typeof Alarm[key].associate === 'function') {
    Alarm[key].associate(module.exports); // Pass the exported models object
  }
});

Object.keys(User).forEach(key => { // Or use User.associate if it's a static method
  if (typeof User[key].associate === 'function') {
    User[key].associate(module.exports); // Pass the exported models object
  }
});


// More direct way to call associate if defined as a static method on the model
if (typeof Alarm.associate === 'function') {
  Alarm.associate(module.exports); // Pass the exports object to Alarm.associate
}
if (typeof User.associate === 'function') {
  User.associate(module.exports); // Pass the exports object to User.associate
}

// Ensure all models are synced (creates tables if they don't exist)
// You might want to move this to app.js or a separate sync script
// to avoid syncing on every app restart in production.
// For development, it's fine here.
// sequelize.sync(); // or sequelize.sync({ force: true }) for development to recreate tables

// Export all models and the sequelize instance
module.exports = {
  sequelize,
  Sequelize, // Export Sequelize constructor if needed elsewhere
  User,
  Alarm
  // Add any other models here as you create them
};