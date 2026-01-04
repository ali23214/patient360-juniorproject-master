const express = require('express');
const router = express.Router();
const axios = require('axios');

// Import controllers
const patientController = require('../controllers/patientController');
const visitController = require('../controllers/visitController');
const medicationController = require('../controllers/medicationController');

// Import middleware
const { protect, restrictTo, verifyPatientOwnership } = require('../middleware/auth');
const { auditLog } = require('../middleware/auditLog');
const { 
  profileLimiter, 
  visitsLimiter, 
  medicationsLimiter 
} = require('../middleware/rateLimiter');

/**
 * ALL ROUTES REQUIRE:
 * 1. Authentication (protect)
 * 2. Patient role only (restrictTo('patient'))
 * 3. Ownership verification (verifyPatientOwnership)
 * 4. Audit logging
 * 5. Rate limiting
 */

// ==========================================
// PATIENT PROFILE ROUTES
// ==========================================

/**
 * @route   GET /api/patient/profile
 * @desc    Get complete patient profile
 * @access  Private (Patient only)
 */
router.get(
  '/profile',
  protect,
  restrictTo('patient'),
  verifyPatientOwnership,
  profileLimiter,
  auditLog('PATIENT_PROFILE'),
  patientController.getProfile
);

/**
 * @route   PUT /api/patient/profile
 * @desc    Update patient profile (limited fields)
 * @access  Private (Patient only)
 */
router.put(
  '/profile',
  protect,
  restrictTo('patient'),
  verifyPatientOwnership,
  profileLimiter,
  auditLog('PATIENT_PROFILE'),
  patientController.updateProfile
);

/**
 * @route   GET /api/patient/medical-history
 * @desc    Get medical history summary
 * @access  Private (Patient only)
 */
router.get(
  '/medical-history',
  protect,
  restrictTo('patient'),
  verifyPatientOwnership,
  profileLimiter,
  auditLog('MEDICAL_HISTORY'),
  patientController.getMedicalHistory
);

// ==========================================
// VISIT ROUTES
// ==========================================

/**
 * @route   GET /api/patient/visits/stats
 * @desc    Get visit statistics
 * @access  Private (Patient only)
 * @note    This route MUST come before /:visitId to avoid conflicts
 */
router.get(
  '/visits/stats',
  protect,
  restrictTo('patient'),
  verifyPatientOwnership,
  visitsLimiter,
  auditLog('VISIT'),
  visitController.getVisitStats
);

/**
 * @route   GET /api/patient/visits/by-doctor
 * @desc    Get visits grouped by doctor
 * @access  Private (Patient only)
 */
router.get(
  '/visits/by-doctor',
  protect,
  restrictTo('patient'),
  verifyPatientOwnership,
  visitsLimiter,
  auditLog('VISIT'),
  visitController.getVisitsByDoctor
);

/**
 * @route   GET /api/patient/visits
 * @desc    Get all patient visits with filters
 * @access  Private (Patient only)
 * @query   startDate, endDate, doctorId, search, status, page, limit
 */
router.get(
  '/visits',
  protect,
  restrictTo('patient'),
  verifyPatientOwnership,
  visitsLimiter,
  auditLog('VISIT'),
  visitController.getVisits
);

/**
 * @route   GET /api/patient/visits/:visitId
 * @desc    Get single visit details
 * @access  Private (Patient only - ownership verified)
 */
router.get(
  '/visits/:visitId',
  protect,
  restrictTo('patient'),
  verifyPatientOwnership,
  visitsLimiter,
  auditLog('VISIT'),
  visitController.getVisitDetails
);

// ==========================================
// MEDICATION ROUTES
// ==========================================

/**
 * @route   GET /api/patient/medications/schedule
 * @desc    Get weekly medication schedule
 * @access  Private (Patient only)
 * @note    This route MUST come before /medications/:id to avoid conflicts
 */
router.get(
  '/medications/schedule',
  protect,
  restrictTo('patient'),
  verifyPatientOwnership,
  medicationsLimiter,
  auditLog('MEDICATION'),
  medicationController.getMedicationSchedule
);

/**
 * @route   GET /api/patient/medications/history
 * @desc    Get medication history with filters
 * @access  Private (Patient only)
 * @query   startDate, endDate, medicationName, page, limit
 */
router.get(
  '/medications/history',
  protect,
  restrictTo('patient'),
  verifyPatientOwnership,
  medicationsLimiter,
  auditLog('MEDICATION'),
  medicationController.getMedicationHistory
);

/**
 * @route   GET /api/patient/medications/interactions
 * @desc    Check for medication interactions
 * @access  Private (Patient only)
 */
router.get(
  '/medications/interactions',
  protect,
  restrictTo('patient'),
  verifyPatientOwnership,
  medicationsLimiter,
  auditLog('MEDICATION'),
  medicationController.checkInteractions
);

/**
 * @route   GET /api/patient/medications
 * @desc    Get current active medications
 * @access  Private (Patient only)
 */
router.get(
  '/medications',
  protect,
  restrictTo('patient'),
  verifyPatientOwnership,
  medicationsLimiter,
  auditLog('MEDICATION'),
  medicationController.getCurrentMedications
);

// ==========================================
// ✨ NEW: AI SYMPTOM ANALYSIS ROUTE ✨
// ==========================================

/**
 * @route   POST /api/patient/ai-symptom-analysis
 * @desc    Analyze patient symptoms using AI model
 * @access  Private (Patient only)
 */
router.post(
  '/ai-symptom-analysis',
  protect,
  restrictTo('patient'),
  verifyPatientOwnership,
  profileLimiter,
  auditLog('PATIENT_PROFILE'),
  async (req, res) => {
    try {
      const { symptoms } = req.body;
      
      // Validation
      if (!symptoms || symptoms.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'يرجى إدخال الأعراض'
        });
      }

      console.log('📝 Patient symptoms:', symptoms);
      console.log('🤖 Calling AI service...');
      
      // Call AI service (FastAPI running on port 8000)
      const aiResponse = await axios.post('http://localhost:8001/predict', {
        symptoms: symptoms
      }, {
        timeout: 30000 // 30 second timeout
      });
      
      console.log('✅ AI Response:', aiResponse.data);
      
      res.status(200).json({
        success: true,
        data: aiResponse.data
      });
      
    } catch (error) {
      console.error('❌ AI Analysis Error:', error.message);
      
      if (error.code === 'ECONNREFUSED') {
        return res.status(503).json({
          success: false,
          message: 'خدمة الذكاء الاصطناعي غير متاحة حالياً. يرجى المحاولة لاحقاً'
        });
      }
      
      if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
        return res.status(504).json({
          success: false,
          message: 'انتهت مهلة الاتصال بخدمة الذكاء الاصطناعي. يرجى المحاولة مرة أخرى'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'حدث خطأ أثناء تحليل الأعراض'
      });
    }
  }
);

module.exports = router;
