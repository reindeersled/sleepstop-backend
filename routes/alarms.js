const express = require('express');
const jwt = require('jsonwebtoken');
const { Alarm, User } = require('../models');
const router = express.Router();
require('dotenv').config();

// Middleware to verify JWT
const authenticate = (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token) return res.status(401).json({ message: 'No token provided' });

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ message: 'Failed to authenticate token' });
    req.userId = decoded.id;
    next();
  });
};

// Get all alarms for user
router.get('/', authenticate, async (req, res) => {
  try {
    const alarms = await Alarm.findAll({ 
      where: { userId: req.userId },
      order: [['createdAt', 'DESC']]
    });
    res.json(alarms);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching alarms', error: error.message });
  }
});

// Create new alarm
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, location, coordinates, audio, active, radius } = req.body;
    
    const alarm = await Alarm.create({
      name,
      location,
      coordinates: {
        type: 'Point',
        coordinates: [coordinates.longitude, coordinates.latitude]
      },
      audio,
      active: active !== false,
      radius: radius || 100,
      userId: req.userId
    });
    
    res.status(201).json(alarm);
  } catch (error) {
    res.status(500).json({ message: 'Error creating alarm', error: error.message });
  }
});

// Update alarm
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, active } = req.body;
    
    const alarm = await Alarm.findOne({ where: { id, userId: req.userId } });
    if (!alarm) {
      return res.status(404).json({ message: 'Alarm not found' });
    }
    
    if (name !== undefined) alarm.name = name;
    if (active !== undefined) alarm.active = active;
    
    await alarm.save();
    
    res.json(alarm);
  } catch (error) {
    res.status(500).json({ message: 'Error updating alarm', error: error.message });
  }
});

// Delete alarm
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    const alarm = await Alarm.findOne({ where: { id, userId: req.userId } });
    if (!alarm) {
      return res.status(404).json({ message: 'Alarm not found' });
    }
    
    await alarm.destroy();
    
    res.json({ message: 'Alarm deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting alarm', error: error.message });
  }
});

// Check if user is near any active alarms
router.get('/check', authenticate, async (req, res) => {
  try {
    const { latitude, longitude } = req.query;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }
    
    const alarms = await Alarm.findAll({
      where: {
        userId: req.userId,
        active: true
      }
    });
    
    const nearbyAlarms = alarms.filter(alarm => {
      const [alarmLng, alarmLat] = alarm.coordinates.coordinates;
      const distance = getDistance(
        parseFloat(latitude),
        parseFloat(longitude),
        alarmLat,
        alarmLng
      );
      return distance <= alarm.radius;
    });
    
    res.json({ nearbyAlarms });
  } catch (error) {
    res.status(500).json({ message: 'Error checking alarms', error: error.message });
  }
});

// Helper function to calculate distance between two points in meters
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

module.exports = router;