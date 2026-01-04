// backend/routes/auth.js
// COMPLETE FILE - Authentication routes with file upload support

const express = require('express');
const router = express.Router();

// Import controllers
const authController = require('../controllers/authController');

// Import middleware
const security = require('../middleware/security');
const auth = require('../middleware/auth');

// Import file upload middleware
const { uploadFields, handleUploadErrors } = require('../middleware/uploadDoctorFiles');

// ==================== PUBLIC ROUTES ====================

// Patient Signup
router.post('/register', security.loginLimiter, authController.signup);
router.post('/signup', security.loginLimiter, authController.signup);

// Doctor Registration Request (WITH FILE UPLOADS)
// CRITICAL: uploadFields MUST come BEFORE authController.registerDoctorRequest
router.post('/register-doctor', 
  uploadFields,              // Process files FIRST
  handleUploadErrors,        // Handle upload errors
  authController.registerDoctorRequest  // Then process request
);

// Login
router.post('/login', security.loginLimiter, authController.login);

// ==================== FORGET PASSWORD ROUTES ====================

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Send OTP to email
 * @access  Public
 */
router.post('/forgot-password', 
  security.loginLimiter,
  authController.forgotPassword
);

/**
 * @route   POST /api/auth/verify-otp
 * @desc    Verify OTP code
 * @access  Public
 */
router.post('/verify-otp', 
  security.loginLimiter,
  authController.verifyOTP
);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password with OTP
 * @access  Public
 */
router.post('/reset-password', 
  security.loginLimiter,
  authController.resetPassword
);

// ==================== PROTECTED ROUTES ====================

// Verify token
router.get('/verify', auth.protect, authController.verifyToken);

// Update last login
router.post('/update-last-login', auth.protect, authController.updateLastLogin);

module.exports = router;