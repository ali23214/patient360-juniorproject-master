const express = require('express');
const router = express.Router();

// Import controllers
const authController = require('../controllers/authController');
const simpleSignupController = require('../controllers/simpleSignup');

// Import middleware
const security = require('../middleware/security');
const auth = require('../middleware/auth');

// Public routes

// Simple Signup (الطريقة الجديدة البسيطة)
router.post('/register', security.loginLimiter, authController.signup);
router.post('/signup', security.loginLimiter, authController.signup);

// Original Signup
router.post('/signup', security.loginLimiter, authController.signup);

// Login route - REMOVED VALIDATION FOR NOW
router.post('/login', 
  security.loginLimiter,
  authController.login
);

// Protected routes
router.get('/verify', auth.protect, authController.verifyToken);
router.post('/update-last-login', auth.protect, authController.updateLastLogin);

module.exports = router;