// sleepstop-backend/models/User.js (UPDATED FOR GOOGLE OAUTH)

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
      // MARK: - MODIFIED: Allow password to be null for Google-authenticated users
      allowNull: true 
    },
    // MARK: - ADDED: Field to store Google User ID
    googleId: {
      type: DataTypes.STRING,
      allowNull: true, // This can be null for users who register with username/password
      unique: true,    // Ensure uniqueness for Google IDs if present
    },
    // MARK: - ADDED: Fields for user's name
    firstName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    // MARK: - Optional: Add a flag to identify users authenticated via Google
    isGoogleUser: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    }
  }, {
    hooks: {
      // MARK: - MODIFIED: Conditionally hash password only if it exists
      beforeCreate: async (user) => {
        if (user.password) { // Only hash if a password is provided (for traditional registration)
          user.password = await bcrypt.hash(user.password, 10);
        }
      },
      beforeUpdate: async (user) => {
        // Only hash if password changed AND is not null
        if (user.changed('password') && user.password) {
          user.password = await bcrypt.hash(user.password, 10);
        }
      }
    }
  });

  // MARK: - MODIFIED: Add a check for validPassword only if a password exists for the user
  User.prototype.validPassword = async function(password) {
    // If the user doesn't have a password set (e.g., they're a Google user),
    // then traditional password validation is not applicable.
    if (!this.password) {
      return false; // Or throw an error, depending on desired behavior
    }
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