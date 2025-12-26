// backend/routes/auth.js
// Authentication Routes - WITHOUT RATE LIMITING

const express = require('express');
const router = express.Router();

// Import controllers
const authController = require('../controllers/authController');

// Import middleware
const auth = require('../middleware/auth');

// ==========================================
// PUBLIC ROUTES
// ==========================================

/**
 * @route   POST /api/auth/register
 * @desc    Register new user (patient)
 * @access  Public
 */
router.post('/register', authController.signup);

/**
 * @route   POST /api/auth/signup
 * @desc    Signup new user (alias for register)
 * @access  Public
 */
router.post('/signup', authController.signup);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', authController.login);

// ==========================================
// PROTECTED ROUTES
// ==========================================

/**
 * @route   GET /api/auth/verify
 * @desc    Verify JWT token
 * @access  Private
 */
router.get('/verify', auth.protect, authController.verifyToken);

/**
 * @route   POST /api/auth/update-last-login
 * @desc    Update last login timestamp
 * @access  Private
 */
router.post('/update-last-login', auth.protect, authController.updateLastLogin);

module.exports = router;
