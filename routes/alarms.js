const express = require('express');
const router = express.Router();
const { Alarm, sequelize } = require('../models'); // Import Alarm model and the sequelize instance
const { Op } = require('sequelize'); // Import Sequelize operators
const authenticateToken = require('../middleware/auth'); // ADJUST PATH as needed!

// --- Helper function to extract lat/lon from a GeoJSON Point ---
// Sequelize returns GEOMETRY types as GeoJSON objects
const getLatLonFromPoint = (point) => {
    if (point && point.coordinates && point.coordinates.length === 2) {
        // GeoJSON Point coordinates are [longitude, latitude]
        return { longitude: point.coordinates[0], latitude: point.coordinates[1] };
    }
    return { latitude: null, longitude: null };
};


// --- GET All Alarms for the Authenticated User (for /api/alarms) ---
router.get('/', authenticateToken, async (req, res) => {
    console.log('GET /api/alarms endpoint hit!');
    const userId = req.user && req.user.id;

    if (!userId) {
        console.log("Error: User ID not found in token for /api/alarms");
        return res.status(401).json({ message: "Authentication required." });
    }

    try {
        const allAlarms = await Alarm.findAll({
            where: { userId: userId }
        });

        const responseData = {
            alarms: allAlarms.map(alarm => {
                const { latitude, longitude } = getLatLonFromPoint(alarm.coordinates); // Extract lat/lon
                return {
                    id: alarm.id,
                    name: alarm.name,
                    location: alarm.location,
                    latitude: latitude,   // Now extracted from 'coordinates'
                    longitude: longitude, // Now extracted from 'coordinates'
                    radius: alarm.radius,
                    audio: alarm.audio,
                    active: alarm.active
                };
            })
        };

        console.log('Sending /api/alarms response:', JSON.stringify(responseData, null, 2));
        res.json(responseData);

    } catch (error) {
        console.error('Error fetching all alarms:', error);
        res.status(500).json({ message: 'Error fetching alarms', error: error.message });
    }
});

// --- GET Nearby Alarms for the Authenticated User (for /api/alarms/check) ---
router.get('/check', authenticateToken, async (req, res) => {
    console.log('GET /api/alarms/check endpoint hit!');
    const { latitude, longitude } = req.query;

    const userId = req.user && req.user.id;
    if (!userId) {
        console.log("Error: User ID not found in token for /api/alarms/check");
        return res.status(401).json({ message: "Authentication required." });
    }

    if (!latitude || !longitude) {
        return res.status(400).json({ message: "Latitude and longitude are required query parameters" });
    }

    const queryLatitude = parseFloat(latitude);
    const queryLongitude = parseFloat(longitude);

    if (isNaN(queryLatitude) || isNaN(queryLongitude)) {
        return res.status(400).json({ message: "Invalid latitude or longitude provided" });
    }

    console.log(`Checking nearby alarms for user ${userId} at: Lat ${queryLatitude}, Lon ${queryLongitude}`);

    try {
        // Use ST_DWithin directly on the 'coordinates' GEOMETRY column
        // We'll create a GEOGRAPHY point for the user's current location on the fly.
        // The 'coordinates' column from Alarm model is already a GEOMETRY/GEOGRAPHY type.
        // Ensure your 'coordinates' column in DB is actually GEOGRAPHY or cast it to GEOGRAPHY in query.
        // For 'GEOMETRY('POINT')', PostGIS often defaults to geometry.
        // Explicitly cast both to GEOGRAPHY for ST_DWithin with meters.
        const nearbyAlarms = await Alarm.findAll({
            where: {
                userId: userId,
                [Op.and]: sequelize.literal(`ST_DWithin(
                    "Alarm"."coordinates"::geography, -- Alarm's stored point
                    ST_SetSRID(ST_MakePoint(${queryLongitude}, ${queryLatitude}), 4326)::geography, -- User's current point
                    "Alarm"."radius" -- Radius in meters (from alarm table)
                )`)
            }
        });

        const responseData = {
            nearbyAlarms: nearbyAlarms.map(alarm => {
                const { latitude, longitude } = getLatLonFromPoint(alarm.coordinates); // Extract lat/lon
                return {
                    id: alarm.id,
                    name: alarm.name,
                    location: alarm.location,
                    latitude: latitude,
                    longitude: longitude,
                    radius: alarm.radius,
                    audio: alarm.audio,
                    active: alarm.active
                };
            })
        };

        console.log('Sending /api/alarms/check response:', JSON.stringify(responseData, null, 2));
        res.json(responseData);

    } catch (error) {
        console.error('Error checking nearby alarms:', error);
        res.status(500).json({ message: 'Error checking nearby alarms', error: error.message });
    }
});


// --- POST Create Alarm ---
router.post('/', authenticateToken, async (req, res) => {
    console.log('POST /api/alarms endpoint hit!');
    const userId = req.user && req.user.id;
    if (!userId) {
        return res.status(401).json({ message: "Authentication required." });
    }

    const { name, location, latitude, longitude, radius, audio } = req.body;

    if (!name || !location || latitude === undefined || longitude === undefined || radius === undefined || !audio) {
        return res.status(400).json({ message: "Missing required alarm fields." });
    }

    try {
        // Construct the GEOMETRY('POINT') object from latitude and longitude
        // GeoJSON Point format: { type: 'Point', coordinates: [longitude, latitude] }
        const coordinatesPoint = {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)],
            crs: { type: 'name', properties: { name: 'EPSG:4326' } } // Important for spatial queries
        };

        const newAlarm = await Alarm.create({
            userId,
            name,
            location,
            coordinates: coordinatesPoint, // Assign the GEOMETRY object
            radius: parseFloat(radius),
            audio,
            active: true
        });

        // To ensure the response to the frontend matches the expected format,
        // extract lat/lon from the saved coordinates for the response object.
        const { latitude: resLat, longitude: resLon } = getLatLonFromPoint(newAlarm.coordinates);

        console.log('New alarm created:', newAlarm.toJSON());
        res.status(201).json({
            id: newAlarm.id,
            name: newAlarm.name,
            location: newAlarm.location,
            latitude: resLat,
            longitude: resLon,
            radius: newAlarm.radius,
            audio: newAlarm.audio,
            active: newAlarm.active
        });
    } catch (error) {
        console.error('Error creating alarm:', error);
        res.status(500).json({ message: 'Error creating alarm', error: error.message });
    }
});

// --- PUT Update Alarm ---
router.put('/:id', authenticateToken, async (req, res) => {
    console.log(`PUT /api/alarms/${req.params.id} endpoint hit!`);
    const alarmId = req.params.id;
    const userId = req.user && req.user.id;
    if (!userId) {
        return res.status(401).json({ message: "Authentication required." });
    }

    const { name, location, latitude, longitude, radius, audio, active } = req.body;

    try {
        const alarm = await Alarm.findOne({ where: { id: alarmId, userId: userId } });

        if (!alarm) {
            return res.status(404).json({ message: 'Alarm not found or unauthorized.' });
        }

        // Update fields based on what's provided
        alarm.name = name ?? alarm.name;
        alarm.location = location ?? alarm.location;
        alarm.radius = radius ?? alarm.radius;
        alarm.audio = audio ?? alarm.audio;
        alarm.active = active ?? alarm.active;

        // If latitude or longitude are provided, update the coordinates point
        if (latitude !== undefined && longitude !== undefined) {
            alarm.coordinates = {
                type: 'Point',
                coordinates: [parseFloat(longitude), parseFloat(latitude)],
                crs: { type: 'name', properties: { name: 'EPSG:4326' } }
            };
        }

        await alarm.save();

        // For the response, extract lat/lon from the updated coordinates
        const { latitude: resLat, longitude: resLon } = getLatLonFromPoint(alarm.coordinates);

        console.log('Alarm updated:', alarm.toJSON());
        res.json({
            id: alarm.id,
            name: alarm.name,
            location: alarm.location,
            latitude: resLat,
            longitude: resLon,
            radius: alarm.radius,
            audio: alarm.audio,
            active: alarm.active
        });

    } catch (error) {
        console.error('Error updating alarm:', error);
        res.status(500).json({ message: 'Error updating alarm', error: error.message });
    }
});

// --- DELETE Alarm ---
router.delete('/:id', authenticateToken, async (req, res) => {
    console.log(`DELETE /api/alarms/${req.params.id} endpoint hit!`);
    const alarmId = req.params.id;
    const userId = req.user && req.user.id;
    if (!userId) {
        return res.status(401).json({ message: "Authentication required." });
    }

    try {
        const result = await Alarm.destroy({
            where: {
                id: alarmId,
                userId: userId
            }
        });

        if (result === 0) {
            return res.status(404).json({ message: 'Alarm not found or unauthorized.' });
        }

        console.log(`Alarm ${alarmId} deleted successfully.`);
        res.status(204).send();

    } catch (error) {
        console.error('Error deleting alarm:', error);
        res.status(500).json({ message: 'Error deleting alarm', error: error.message });
    }
});


module.exports = router;