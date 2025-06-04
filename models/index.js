const { Sequelize } = require('sequelize');
// FIX THIS LINE: Correct the path to your config.js file
const config = require('../config/config'); // <-- CHANGE THIS LINE!

// Initialize Sequelize using the DATABASE_URL from your config file
const sequelize = new Sequelize(config.DATABASE_URL, {
  dialect: 'postgres',
  protocol: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  },
  logging: false
});

// Test the database connection
sequelize.authenticate()
  .then(() => console.log('Database connection has been established successfully.'))
  .catch(err => console.error('Unable to connect to the database:', err));


const models = {
  User: require('./User')(sequelize, Sequelize),
  Alarm: require('./Alarm')(sequelize, Sequelize)
};

Object.keys(models).forEach(modelName => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

module.exports = {
  ...models,
  sequelize,
  Sequelize
};