// sleepstop-backend/models/Alarm.js (UPDATED)

// Export a function that takes sequelize and DataTypes
module.exports = (sequelize, DataTypes) => {
  const Alarm = sequelize.define('Alarm', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    location: {
      type: DataTypes.STRING,
      allowNull: false
    },
    coordinates: {
      type: DataTypes.GEOMETRY('POINT'),
      allowNull: false
    },
    audio: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'default.wav'
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    radius: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 100 // meters
    }
  });

  // Define associations
  Alarm.associate = (models) => {
    Alarm.belongsTo(models.User, {
      foreignKey: 'userId',
      onDelete: 'CASCADE'
    });
  };

  return Alarm; // RETURN the defined Alarm model
};