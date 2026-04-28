// backend/routes/auth.js
// Authentication routes with file upload support

const express = require('express');
const router = express.Router();

// Import controllers
const authController = require('../controllers/authController');

// Import middleware
const auth = require('../middleware/auth');

// Import file upload middleware
const {
  uploadFields,
  uploadPharmacistFields,
  uploadLabTechFields,
  handleUploadErrors
} = require('../middleware/uploadDoctorFiles');

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

// Pharmacist Registration Request (WITH FILE UPLOADS)
router.post('/register-pharmacist',
  uploadPharmacistFields,
  handleUploadErrors,
  authController.registerPharmacistRequest
);

// Lab Technician Registration Request (WITH FILE UPLOADS)
router.post('/register-lab-technician',
  uploadLabTechFields,
  handleUploadErrors,
  authController.registerLabTechnicianRequest
);

// Check Doctor Request Status (legacy — kept for backward compatibility)
router.post('/check-doctor-status', authController.checkDoctorRequestStatus);

// Check Professional Status (unified — works for doctor, pharmacist, lab tech)
router.post('/check-professional-status', authController.checkProfessionalStatus);

// Login
router.post('/login', authController.login);

// ==================== FORGET PASSWORD ROUTES ====================

router.post('/forgot-password', authController.forgotPassword);
router.post('/verify-otp', authController.verifyOTP);
router.post('/reset-password', authController.resetPassword);

// ==================== PROTECTED ROUTES ====================

router.get('/verify', auth.protect, authController.verifyToken);
router.post('/update-last-login', auth.protect, authController.updateLastLogin);

module.exports = router;