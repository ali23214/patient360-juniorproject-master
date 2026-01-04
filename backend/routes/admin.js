// backend/routes/admin.js
// Admin Routes - COMPLETE VERSION WITH DEACTIVATION SUPPORT
// Supports both PUT and PATCH methods for flexibility

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protect, restrictTo } = require('../middleware/auth');
const { auditLog } = require('../middleware/auditLog');

// ==========================================
// APPLY AUTHENTICATION TO ALL ADMIN ROUTES
// ==========================================
router.use(protect);
router.use(restrictTo('admin'));

// ==========================================
// STATISTICS
// ==========================================
/**
 * @route   GET /api/admin/statistics
 * @desc    Get system statistics (doctors, patients, visits)
 * @access  Private (Admin only)
 */
router.get('/statistics', 
  auditLog('VIEW_STATISTICS'), 
  adminController.getStatistics
);

// ==========================================
// DOCTOR REQUESTS MANAGEMENT
// ==========================================
/**
 * @route   GET /api/admin/doctor-requests
 * @desc    Get all pending doctor registration requests
 * @access  Private (Admin only)
 */
router.get('/doctor-requests',
  auditLog('VIEW_DOCTOR_REQUESTS'),
  adminController.getAllDoctorRequests
);

/**
 * @route   GET /api/admin/doctor-requests/:id
 * @desc    Get single doctor request details
 * @access  Private (Admin only)
 */
router.get('/doctor-requests/:id',
  auditLog('VIEW_DOCTOR_REQUEST_DETAILS'),
  adminController.getDoctorRequestById
);

/**
 * @route   POST /api/admin/doctor-requests/:id/accept
 * @desc    Accept/approve doctor registration request
 * @access  Private (Admin only)
 */
router.post('/doctor-requests/:id/accept',
  auditLog('APPROVE_DOCTOR_REQUEST'),
  adminController.approveDoctorRequest
);

/**
 * @route   POST /api/admin/doctor-requests/:id/reject
 * @desc    Reject doctor registration request
 * @access  Private (Admin only)
 */
router.post('/doctor-requests/:id/reject',
  auditLog('REJECT_DOCTOR_REQUEST'),
  adminController.rejectDoctorRequest
);

// ==========================================
// DOCTORS MANAGEMENT
// ==========================================
/**
 * @route   GET /api/admin/doctors
 * @desc    Get all doctors with account details
 * @access  Private (Admin only)
 */
router.get('/doctors', 
  auditLog('VIEW_DOCTORS'), 
  adminController.getAllDoctors
);

/**
 * @route   GET /api/admin/doctors/:id
 * @desc    Get single doctor details
 * @access  Private (Admin only)
 */
router.get('/doctors/:id', 
  auditLog('VIEW_DOCTOR_DETAILS'), 
  adminController.getDoctorById
);

/**
 * @route   POST /api/admin/doctors
 * @desc    Create new doctor (manual registration)
 * @access  Private (Admin only)
 */
router.post('/doctors', 
  auditLog('ADD_DOCTOR'), 
  adminController.createDoctor
);

/**
 * @route   PATCH /api/admin/doctors/:id/deactivate
 * @route   PUT /api/admin/doctors/:id/deactivate
 * @desc    Deactivate doctor account (with reason)
 * @access  Private (Admin only)
 * @body    { reason: String (required), notes: String (optional) }
 */
router.patch('/doctors/:id/deactivate', 
  auditLog('DEACTIVATE_DOCTOR'), 
  adminController.deactivateDoctor
);

router.put('/doctors/:id/deactivate', 
  auditLog('DEACTIVATE_DOCTOR'), 
  adminController.deactivateDoctor
);

/**
 * @route   PATCH /api/admin/doctors/:id/activate
 * @route   PUT /api/admin/doctors/:id/reactivate
 * @desc    Reactivate doctor account
 * @access  Private (Admin only)
 */
router.patch('/doctors/:id/activate', 
  auditLog('ACTIVATE_DOCTOR'), 
  adminController.activateDoctor
);

router.put('/doctors/:id/reactivate', 
  auditLog('ACTIVATE_DOCTOR'), 
  adminController.activateDoctor
);

/**
 * @route   PATCH /api/admin/doctors/:id
 * @desc    Update doctor information
 * @access  Private (Admin only)
 */
router.patch('/doctors/:id', 
  auditLog('UPDATE_DOCTOR'), 
  adminController.updateDoctor
);

// ==========================================
// PATIENTS MANAGEMENT
// ==========================================
/**
 * @route   GET /api/admin/patients
 * @desc    Get all patients with account details
 * @access  Private (Admin only)
 */
router.get('/patients', 
  auditLog('VIEW_PATIENTS'), 
  adminController.getAllPatients
);

/**
 * @route   GET /api/admin/patients/:id
 * @desc    Get single patient details
 * @access  Private (Admin only)
 */
router.get('/patients/:id', 
  auditLog('VIEW_PATIENT_DETAILS'), 
  adminController.getPatientById
);

/**
 * @route   PATCH /api/admin/patients/:id/deactivate
 * @route   PUT /api/admin/patients/:id/deactivate
 * @desc    Deactivate patient account (with reason)
 * @access  Private (Admin only)
 * @body    { reason: String (required), notes: String (optional) }
 */
router.patch('/patients/:id/deactivate', 
  auditLog('DEACTIVATE_PATIENT'), 
  adminController.deactivatePatient
);

router.put('/patients/:id/deactivate', 
  auditLog('DEACTIVATE_PATIENT'), 
  adminController.deactivatePatient
);

/**
 * @route   PATCH /api/admin/patients/:id/activate
 * @route   PUT /api/admin/patients/:id/reactivate
 * @desc    Reactivate patient account
 * @access  Private (Admin only)
 */
router.patch('/patients/:id/activate', 
  auditLog('ACTIVATE_PATIENT'), 
  adminController.activatePatient
);

router.put('/patients/:id/reactivate', 
  auditLog('ACTIVATE_PATIENT'), 
  adminController.activatePatient
);

/**
 * @route   PATCH /api/admin/patients/:id
 * @desc    Update patient information
 * @access  Private (Admin only)
 */
router.patch('/patients/:id', 
  auditLog('UPDATE_PATIENT'), 
  adminController.updatePatient
);

// ==========================================
// AUDIT LOGS
// ==========================================
/**
 * @route   GET /api/admin/audit-logs
 * @desc    Get all audit logs
 * @access  Private (Admin only)
 */
router.get('/audit-logs', 
  auditLog('VIEW_AUDIT_LOGS'), 
  adminController.getAuditLogs
);

/**
 * @route   GET /api/admin/audit-logs/user/:userId
 * @desc    Get audit logs for specific user
 * @access  Private (Admin only)
 */
router.get('/audit-logs/user/:userId', 
  auditLog('VIEW_USER_AUDIT_LOGS'), 
  adminController.getUserAuditLogs
);

module.exports = router;
