// sleepstop-backend/middleware/auth.js

const jwt = require('jsonwebtoken');
require('dotenv').config(); // Load environment variables here too for JWT_SECRET

// Ensure this JWT_SECRET is the SAME as the one used in your auth.js for signing!
const JWT_SECRET = process.env.JWT_SECRET; // It should be loaded from your .env file

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Extracts the token after "Bearer"

    if (token == null) {
        console.log("Authentication Error: No token provided (401).");
        return res.sendStatus(401); // Unauthorized - No token
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.error("JWT Verification Error:", err.message, "(403).");
            return res.sendStatus(403); // Forbidden - Token invalid or expired
        }

        // --- THIS IS THE CRUCIAL LINE ---
        // If verification is successful, the 'user' payload from the token
        // (which contains { id: user.id }) is attached to req.user.
        req.user = user;
        console.log(`Authentication Successful: User ID from token: ${req.user.id}`);
        // ---------------------------------

        next(); // Proceed to the next middleware or route handler
    });
};

module.exports = authenticateToken;