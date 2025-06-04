// sleepstop-backend/models/index.js (UPDATED)

const { Sequelize } = require('sequelize');

// Use DATABASE_URL provided by Heroku
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres', // Heroku Postgres is always 'postgres'
  protocol: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false // This is important for Heroku
    }
  },
  logging: false // Optional: set to true to see SQL queries in logs
});

const models = {
  User: require('./User')(sequelize, Sequelize),
  Alarm: require('./Alarm')(sequelize, Sequelize)
};

// Associate models if association exists
// This loop is correct for your 'models' object
Object.keys(models).forEach(modelName => {
  if (models[modelName].associate) {
    models[modelName].associate(models); // Pass the entire 'models' object for associations
  }
});

// Optional: Sync your models (create tables)
// sequelize.sync()
//   .then(() => console.log('Database synced!'))
//   .catch(err => console.error('Database sync error:', err));


module.exports = {
  ...models,
  sequelize,
  Sequelize
};