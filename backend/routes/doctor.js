const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

// Import middleware
const { protect, restrictTo } = require('../middleware/auth');
const { profileLimiter } = require('../middleware/rateLimiter');

// Import models
const Patient = require('../models/Patient');
const Person = require('../models/Person');
const Account = require('../models/Account');

// Import visit controller
const visitController = require('../controllers/visitController');

// ==========================================
// MULTER CONFIGURATION FOR VISIT ATTACHMENTS
// ==========================================

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/visits/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'visit-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/webp',
    'application/pdf'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('نوع الملف غير مدعوم. الرجاء رفع صورة أو PDF فقط'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: fileFilter
});

/**
 * ALL ROUTES REQUIRE:
 * 1. Authentication (protect)
 * 2. Doctor role only (restrictTo('doctor'))
 * 3. Rate limiting
 */

// ==========================================
// SEARCH PATIENT ROUTE
// ==========================================

/**
 * @route   GET /api/doctor/search/:nationalId
 * @desc    Search for patient by national ID
 * @access  Private (Doctor only)
 */
router.get(
  '/search/:nationalId',
  protect,
  restrictTo('doctor'),
  profileLimiter,
  async (req, res) => {
    try {
      const { nationalId } = req.params;

console.log('🔍 Searching for:', nationalId);

// ✅ Search by nationalId OR childId
const person = await Person.findOne({
  $or: [
    { nationalId: nationalId },
    { childId: nationalId }
  ]
}).lean();

console.log('📥 Person found:', person ? '✅' : '❌');

      if (!person) {
        return res.status(404).json({
          success: false,
          message: 'لم يتم العثور على المريض'
        });
      }

      // Find patient data
      const patient = await Patient.findOne({ personId: person._id }).lean();

      if (!patient) {
        return res.status(404).json({
          success: false,
          message: 'لم يتم العثور على بيانات المريض'
        });
      }

      // Get account data
      const account = await Account.findOne({ personId: person._id })
        .select('-password')
        .lean();

      // Combine all data
      const patientData = {
        ...person,
        ...patient,
        email: account?.email,
        isActive: account?.isActive,
        registrationDate: account?.createdAt
      };

      res.json({
        success: true,
        patient: patientData
      });
    } catch (error) {
      console.error('Search patient error:', error);
      res.status(500).json({
        success: false,
        message: 'حدث خطأ في البحث عن المريض'
      });
    }
  }
);

/**
 * @route   GET /api/doctor/patients
 * @desc    Get all patients list
 * @access  Private (Doctor only)
 */
router.get(
  '/patients',
  protect,
  restrictTo('doctor'),
  profileLimiter,
  async (req, res) => {
    try {
      // Get all patients
      const patients = await Patient.find()
        .populate('personId')
        .lean();

      // Get accounts for registration dates
      const patientData = await Promise.all(
        patients.map(async (patient) => {
          const account = await Account.findOne({ personId: patient.personId._id })
            .select('email isActive createdAt')
            .lean();

          return {
            id: patient._id,
            nationalId: patient.personId.nationalId,
            childId: patient.personId.childId,
            firstName: patient.personId.firstName,
            lastName: patient.personId.lastName,
            dateOfBirth: patient.personId.dateOfBirth,
            gender: patient.personId.gender,
            phoneNumber: patient.personId.phoneNumber,
            email: account?.email,
            isActive: account?.isActive,
            registrationDate: account?.createdAt,
            bloodType: patient.bloodType,
            height: patient.height,
            weight: patient.weight,
            vitalSigns: patient.vitalSigns,
            doctorOpinion: patient.doctorOpinion,
            prescribedMedications: patient.prescribedMedications,
            lastUpdated: patient.updatedAt
          };
        })
      );

      res.json({
        success: true,
        count: patientData.length,
        patients: patientData
      });
    } catch (error) {
      console.error('Get patients error:', error);
      res.status(500).json({
        success: false,
        message: 'حدث خطأ في جلب قائمة المرضى'
      });
    }
  }
);

/**
 * @route   PUT /api/doctor/patient/:nationalId
 * @desc    Update patient medical data
 * @access  Private (Doctor only)
 */
router.put(
  '/patient/:nationalId',
  protect,
  restrictTo('doctor'),
  profileLimiter,
  async (req, res) => {
    try {
      const { nationalId } = req.params;
      const {
        vitalSigns,
        doctorOpinion,
        ecgResults,
        aiPrediction,
        prescribedMedications
      } = req.body;

      // Find person
      const person = await Person.findOne({ nationalId });

      if (!person) {
        return res.status(404).json({
          success: false,
          message: 'لم يتم العثور على المريض'
        });
      }

      // Update patient data
      const patient = await Patient.findOneAndUpdate(
        { personId: person._id },
        {
          $set: {
            vitalSigns,
            doctorOpinion,
            ecgResults,
            aiPrediction,
            prescribedMedications
          }
        },
        { new: true }
      ).populate('personId');

      if (!patient) {
        return res.status(404).json({
          success: false,
          message: 'لم يتم العثور على بيانات المريض'
        });
      }

      res.json({
        success: true,
        message: 'تم تحديث بيانات المريض بنجاح',
        patient
      });
    } catch (error) {
      console.error('Update patient error:', error);
      res.status(500).json({
        success: false,
        message: 'حدث خطأ في تحديث بيانات المريض'
      });
    }
  }
);

// ==========================================
// VISIT MANAGEMENT ROUTES
// ==========================================

/**
 * @route   POST /api/doctor/patient/:nationalId/visit
 * @desc    Create a new visit for a patient (WITH FILE UPLOAD)
 * @access  Private (Doctor only)
 */
router.post(
  '/patient/:nationalId/visit',
  protect,
  restrictTo('doctor'),
  profileLimiter,
  upload.single('visitPhoto'),  // ⬅️ ADDED: File upload middleware
  visitController.createVisit
);

/**
 * @route   GET /api/doctor/patient/:nationalId/visits
 * @desc    Get all visits for a specific patient
 * @access  Private (Doctor only)
 */
router.get(
  '/patient/:nationalId/visits',
  protect,
  restrictTo('doctor'),
  profileLimiter,
  visitController.getPatientVisitsByNationalId
);

/**
 * @route   GET /api/doctor/visits
 * @desc    Get all visits by this doctor
 * @access  Private (Doctor only)
 */
router.get(
  '/visits',
  protect,
  restrictTo('doctor'),
  profileLimiter,
  visitController.getDoctorVisits
);

/**
 * @route   GET /api/doctor/visit/:visitId
 * @desc    Get visit details
 * @access  Private (Doctor only)
 */
router.get(
  '/visit/:visitId',
  protect,
  restrictTo('doctor'),
  profileLimiter,
  visitController.getVisitDetailsDoctor
);

/**
 * @route   PUT /api/doctor/visit/:visitId
 * @desc    Update visit
 * @access  Private (Doctor only)
 */
router.put(
  '/visit/:visitId',
  protect,
  restrictTo('doctor'),
  profileLimiter,
  visitController.updateVisit
);

module.exports = router;
