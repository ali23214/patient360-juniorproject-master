// backend/routes/auth.js
// Authentication routes with file upload support - NO RATE LIMITER

const express = require('express');
const router = express.Router();

// Import controllers
const authController = require('../controllers/authController');

// Import middleware
const auth = require('../middleware/auth');

// Import file upload middleware
const { uploadFields, handleUploadErrors } = require('../middleware/uploadDoctorFiles');

// ==================== PUBLIC ROUTES ====================

// Patient Signup
router.post('/register', authController.signup);
router.post('/signup', authController.signup);

// Doctor Registration Request (WITH FILE UPLOADS)
router.post('/register-doctor', 
  uploadFields,
  handleUploadErrors,
  authController.registerDoctorRequest
);

// ✅ NEW: Check Doctor Request Status
/**
 * @route   POST /api/auth/check-doctor-status
 * @desc    Check doctor registration request status and get credentials if approved
 * @access  Public
 * @body    { email: String }
 */
router.post('/check-doctor-status', authController.checkDoctorRequestStatus);

// Login
router.post('/login', authController.login);

// ==================== FORGET PASSWORD ROUTES ====================

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Send OTP to email
 * @access  Public
 */
router.post('/forgot-password', authController.forgotPassword);

/**
 * @route   POST /api/auth/verify-otp
 * @desc    Verify OTP code
 * @access  Public
 */
router.post('/verify-otp', authController.verifyOTP);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password with OTP
 * @access  Public
 */
router.post('/reset-password', authController.resetPassword);

// ==================== PROTECTED ROUTES ====================

// Verify token
router.get('/verify', auth.protect, authController.verifyToken);

// Update last login
router.post('/update-last-login', auth.protect, authController.updateLastLogin);

module.exports = router;
