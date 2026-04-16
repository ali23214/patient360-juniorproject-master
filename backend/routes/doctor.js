/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  Patient 360° — Doctor Routes
 *  ─────────────────────────────────────────────────────────────────────────
 *  Mounted at:  /api/doctor
 *
 *  All routes require:
 *    1. Authentication  (protect)
 *    2. Doctor role     (restrictTo('doctor'))
 * ═══════════════════════════════════════════════════════════════════════════
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

// Middleware
const { protect, restrictTo } = require('../middleware/auth');

// File upload helper
const FileUploadManager = require('../utils/fileUpload');

// Models
const Patient = require('../models/Patient');
const Person = require('../models/Person');
const Account = require('../models/Account');
const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const Visit = require('../models/Visit');
const LabTest = require('../models/LabTest');
const Prescription = require('../models/Prescription');

// Controllers we delegate to (no new business logic in this file — just routing)
const visitController = require('../controllers/visitController');
const appointmentController = require('../controllers/appointmentController');
const slotController = require('../controllers/availabilitySlotController');
const notificationController = require('../controllers/notificationController');


// ============================================================================
// MULTER CONFIG — visit photo uploads
// ============================================================================

const storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    try {
      const nationalId = req.params.nationalId;
      if (!nationalId) return cb(new Error('Patient ID not found in request'), null);

      const fileInfo = FileUploadManager.generateFilePath('visit', nationalId, file.originalname);
      await FileUploadManager.ensureDirectory(fileInfo.directory);
      cb(null, fileInfo.directory);
    } catch (error) {
      console.error('Error in storage destination:', error);
      cb(error, null);
    }
  },
  filename: function (req, file, cb) {
    try {
      const nationalId = req.params.nationalId;
      const fileInfo = FileUploadManager.generateFilePath('visit', nationalId, file.originalname);
      cb(null, fileInfo.filename);
    } catch (error) {
      console.error('Error generating filename:', error);
      cb(error, null);
    }
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
  if (allowedTypes.includes(file.mimetype)) return cb(null, true);
  cb(new Error('نوع الملف غير مدعوم. الرجاء رفع صورة أو PDF فقط'), false);
};

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter
});


// ============================================================================
// PATIENT SEARCH
// ============================================================================

/**
 * @route   GET /api/doctor/search/:nationalId
 * @desc    Search for a patient by national ID
 * @access  Private (Doctor only)
 */
router.get('/search/:nationalId', protect, restrictTo('doctor'), async (req, res) => {
  try {
    const { nationalId } = req.params;
    console.log('🔍 Searching for:', nationalId);

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

    const patient = await Patient.findOne({ personId: person._id }).lean();
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'لم يتم العثور على بيانات المريض'
      });
    }

    const account = await Account.findOne({ personId: person._id }).select('-password').lean();

    const patientData = {
      ...person,
      ...patient,
      email: account?.email,
      isActive: account?.isActive,
      registrationDate: account?.createdAt
    };

    return res.json({ success: true, patient: patientData });
  } catch (error) {
    console.error('Search patient error:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في البحث عن المريض'
    });
  }
});


/**
 * @route   GET /api/doctor/patients
 * @desc    Get all patients
 * @access  Private (Doctor only)
 */
router.get('/patients', protect, restrictTo('doctor'), async (req, res) => {
  try {
    const patients = await Patient.find().populate('personId').lean();

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
          doctorOpinion: patient.doctorOpinion,
          prescribedMedications: patient.prescribedMedications,
          lastUpdated: patient.updatedAt
        };
      })
    );

    return res.json({ success: true, count: patientData.length, patients: patientData });
  } catch (error) {
    console.error('Get patients error:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في جلب قائمة المرضى'
    });
  }
});


/**
 * @route   PUT /api/doctor/patient/:nationalId
 * @desc    Update patient medical data
 * @access  Private (Doctor only)
 */
router.put('/patient/:nationalId', protect, restrictTo('doctor'), async (req, res) => {
  try {
    const { nationalId } = req.params;
    const { doctorOpinion, ecgResults, aiPrediction, prescribedMedications } = req.body;

    const person = await Person.findOne({ nationalId });
    if (!person) {
      return res.status(404).json({
        success: false,
        message: 'لم يتم العثور على المريض'
      });
    }

    const patient = await Patient.findOneAndUpdate(
      { personId: person._id },
      { $set: { doctorOpinion, ecgResults, aiPrediction, prescribedMedications } },
      { new: true }
    ).populate('personId');

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'لم يتم العثور على بيانات المريض'
      });
    }

    return res.json({
      success: true,
      message: 'تم تحديث بيانات المريض بنجاح',
      patient
    });
  } catch (error) {
    console.error('Update patient error:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في تحديث بيانات المريض'
    });
  }
});


// ============================================================================
// VISIT MANAGEMENT
// ============================================================================

/**
 * @route   POST /api/doctor/patient/:nationalId/visit
 * @desc    Create a new visit for a patient (with optional photo upload)
 * @access  Private (Doctor only)
 */
router.post(
  '/patient/:nationalId/visit',
  protect,
  restrictTo('doctor'),
  upload.single('visitPhoto'),
  visitController.createVisit
);

/**
 * @route   GET /api/doctor/patient/:nationalId/visits
 * @desc    Get all visits for a specific patient by national ID or CRN
 * @access  Private (Doctor only)
 *
 * The controller expects the URL param as `identifier` (it accepts both
 * national IDs and "CRN-..." child registration numbers). We translate
 * the param name here so the public URL shape stays stable.
 */
router.get(
  '/patient/:nationalId/visits',
  protect,
  restrictTo('doctor'),
  (req, res, next) => {
    req.params.identifier = req.params.nationalId;
    next();
  },
  visitController.getPatientVisits
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
  visitController.getDoctorVisits
);

/**
 * @route   GET /api/doctor/visit/:visitId
 * @desc    Get visit details by visit ID
 * @access  Private (Doctor only)
 *
 * The controller expects the URL param as `id`. Translate here.
 */
router.get(
  '/visit/:visitId',
  protect,
  restrictTo('doctor'),
  (req, res, next) => {
    req.params.id = req.params.visitId;
    next();
  },
  visitController.getVisitById
);

/**
 * @route   PUT /api/doctor/visit/:visitId
 * @desc    Update a visit
 * @access  Private (Doctor only)
 */
router.put(
  '/visit/:visitId',
  protect,
  restrictTo('doctor'),
  visitController.updateVisit
);


// ============================================================================
// DASHBOARD KPIs
// ============================================================================

/**
 * @route   GET /api/doctor/dashboard/kpis
 * @desc    4 KPI numbers for the DoctorDashboard home tiles:
 *            - appointmentsToday
 *            - patientsThisWeek
 *            - pendingLabs
 *            - prescriptionsIssued
 * @access  Private (Doctor only)
 */
router.get('/dashboard/kpis', protect, restrictTo('doctor'), async (req, res) => {
  try {
    const doctor = await Doctor.findOne({ personId: req.user.personId }).lean();
    if (!doctor) {
      return res.status(403).json({
        success: false,
        message: 'لم يتم العثور على ملف الطبيب'
      });
    }

    // Date windows
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart); todayEnd.setDate(todayEnd.getDate() + 1);

    const weekStart = new Date();
    const dayOfWeek = weekStart.getDay();                    // 0 = Sunday
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    weekStart.setDate(weekStart.getDate() - daysFromMonday);
    weekStart.setHours(0, 0, 0, 0);

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [appointmentsToday, pendingLabs, prescriptionsIssued, visitsThisWeek] =
      await Promise.all([
        Appointment.countDocuments({
          doctorId: doctor._id,
          appointmentDate: { $gte: todayStart, $lt: todayEnd },
          status: { $in: ['scheduled', 'confirmed', 'checked_in', 'in_progress'] }
        }),
        LabTest.countDocuments({
          orderedBy: doctor._id,
          status: 'completed',
          isViewedByDoctor: false
        }),
        Prescription.countDocuments({
          doctorId: doctor._id,
          prescriptionDate: { $gte: monthStart }
        }),
        Visit.find(
          { doctorId: doctor._id, visitDate: { $gte: weekStart } },
          { patientPersonId: 1, patientChildId: 1 }
        ).lean()
      ]);

    // Distinct patients this week (de-duplicate across persons + children)
    const unique = new Set();
    visitsThisWeek.forEach((v) => {
      if (v.patientPersonId) unique.add(`p:${v.patientPersonId}`);
      if (v.patientChildId) unique.add(`c:${v.patientChildId}`);
    });

    return res.json({
      success: true,
      appointmentsToday,
      patientsThisWeek: unique.size,
      pendingLabs,
      prescriptionsIssued
    });
  } catch (error) {
    console.error('Dashboard KPIs error:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في تحميل مؤشرات اللوحة'
    });
  }
});


// ============================================================================
// APPOINTMENTS (alias to existing /api/appointments/provider-schedule)
// ============================================================================

/**
 * @route   GET /api/doctor/appointments
 * @desc    The doctor's appointments list (optional ?from=&to= date range).
 * @access  Private (Doctor only)
 */
router.get(
  '/appointments',
  protect,
  restrictTo('doctor'),
  appointmentController.getProviderSchedule
);


// ============================================================================
// AVAILABILITY SLOTS (alias to existing /api/slots endpoints)
// ============================================================================

/**
 * @route   GET /api/doctor/availability-slots
 * @desc    The doctor's availability slots.
 * @access  Private (Doctor only)
 */
router.get(
  '/availability-slots',
  protect,
  restrictTo('doctor'),
  slotController.getMySlots
);

/**
 * @route   POST /api/doctor/availability-slots
 * @desc    Create a new availability slot for the logged-in doctor.
 * @access  Private (Doctor only)
 */
router.post(
  '/availability-slots',
  protect,
  restrictTo('doctor'),
  slotController.createSlot
);


// ============================================================================
// NOTIFICATIONS (alias to existing /api/notifications endpoints)
// ============================================================================

/**
 * @route   GET /api/doctor/notifications
 * @desc    The doctor's notifications (most recent first).
 * @access  Private (Doctor only)
 */
router.get(
  '/notifications',
  protect,
  restrictTo('doctor'),
  notificationController.getMyNotifications
);

/**
 * @route   PATCH /api/doctor/notifications/:id/read
 * @desc    Mark a notification as read.
 * @access  Private (Doctor only)
 */
router.patch(
  '/notifications/:id/read',
  protect,
  restrictTo('doctor'),
  notificationController.markAsRead
);


module.exports = router;