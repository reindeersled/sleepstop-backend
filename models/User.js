// sleepstop-backend/models/User.js (UPDATED)

const bcrypt = require('bcryptjs');

// Export a function that takes sequelize and DataTypes
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false
    }
  }, {
    hooks: {
      beforeCreate: async (user) => {
        user.password = await bcrypt.hash(user.password, 10);
      },
      beforeUpdate: async (user) => {
        if (user.changed('password')) {
          user.password = await bcrypt.hash(user.password, 10);
        }
      }
    }
  });

  User.prototype.validPassword = async function(password) {
    return await bcrypt.compare(password, this.password);
  };

  // Define associations (if User has any, e.g., hasMany Alarms)
  // This 'associate' method will be called from index.js
  User.associate = (models) => {
    User.hasMany(models.Alarm, { // Example association: User has many Alarms
      foreignKey: 'userId',
      as: 'alarms', // Optional: alias for the association
      onDelete: 'CASCADE'
    });
  };

  return User; // RETURN the defined User model
};