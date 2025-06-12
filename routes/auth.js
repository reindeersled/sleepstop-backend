const express = require('express');
const jwt = require('jsonwebtoken');
const { User } = require('../models'); // Assuming User model is properly exported
const router = express.Router();
require('dotenv').config();
const { Op } = require('sequelize'); // Add this line to import Op
const bcrypt = require('bcryptjs');

// MARK: - ADDED: Initialize Google OAuth2Client for backend verification
// IMPORTANT: Replace 'YOUR_GOOGLE_WEB_CLIENT_ID_HERE' with your actual
// Google OAuth 2.0 Web Client ID. This is typically found in your Google Cloud Console
// under APIs & Services -> Credentials, and it's for type 'Web application'.
// It will look like '1234567890-abcdefghijklmnop.apps.googleusercontent.com'.
const { OAuth2Client } = require('google-auth-library');

// MARK: - ADDED: Initialize Google OAuth2Client for backend verification
const googleClient = new OAuth2Client(process.env.GOOGLE_WEB_CLIENT_ID);

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check if user exists (username and email checks)
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    const existingEmail = await User.findOne({ where: { email } });
    if (existingEmail) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    // Create new user
    const user = await User.create({ username, email, password }); // User model hook hashes password

    // Generate token
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '24h' });

    res.status(201).json({ token, userId: user.id, username: user.username });
  } catch (error) {
    console.error('Detailed registration error:', error);
    res.status(500).json({ message: 'Error registering user', error: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Find user
    const user = await User.findOne({ where: { username } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Validate password
    const isValidPassword = await user.validPassword(password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Generate token
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '24h' });
    
    res.json({ token, userId: user.id, username: user.username });
  } catch (error) {
    res.status(500).json({ message: 'Error logging in', error: error.message });
  }
});

// MARK: - ADDED: Google OAuth Login/Registration Endpoint
router.post('/google/login', async (req, res) => {
  const { idToken, email, name, givenName, familyName } = req.body;

  if (!idToken) {
    return res.status(400).json({ message: 'Google ID token is missing.' });
  }

  try {
    // 1. Verify the Google ID Token
    const ticket = await googleClient.verifyIdToken({
      idToken: idToken,
      audience: process.env.GOOGLE_WEB_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const googleId = payload['sub']; // Unique ID for the user from Google
    
    // Use email from token payload for verification, but keep client-provided email as fallback
    const verifiedEmail = payload['email'] || email;
    if (!verifiedEmail) {
      return res.status(400).json({ message: 'Email verification failed.' });
    }

    // 2. Find or Create User in Your Database
    let user = await User.findOne({ 
      where: { 
        [Op.or]: [
          { googleId: googleId },
          { email: verifiedEmail }
        ]
      } 
    });

    if (!user) {
      // User does not exist, create a new one
      console.log(`Creating new user for Google ID: ${googleId}`);
      user = await User.create({
        googleId: googleId,
        email: verifiedEmail,
        username: name || email.split('@')[0], // Use provided name or derive from email
        isGoogleUser: true
      });
    } else {
      console.log(`Logging in existing Google user: ${googleId}`);
      // Update user's information if it changed
      if (!user.googleId) {
        user.googleId = googleId;
        user.isGoogleUser = true;

        await user.save();
      }
    }

    // 3. Generate Your Backend's JWT for the authenticated user
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '24h' });

    // 4. Send back your app's token and user info to the client
    res.json({ 
      token, 
      userId: user.id, 
      username: user.username,
      email: user.email
    });

  } catch (error) {
    console.error('Google OAuth backend error:', error.message);
    res.status(500).json({ 
      message: 'Google authentication failed on backend.', 
      error: error.message 
    });
  }
});

module.exports = router;