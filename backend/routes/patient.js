/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  Patient Routes — Patient 360°
 *  ─────────────────────────────────────────────────────────────────────────
 *  Mounted at /api/patient
 *
 *  All routes require authentication. Patient-specific routes verify the
 *  caller owns the patient record (or is admin/treating doctor).
 *
 *  Routes:
 *    GET  /me                       — current logged-in patient profile
 *    GET  /me/visits                — current patient's visits
 *    GET  /me/lab-tests             — current patient's lab tests
 *    GET  /me/prescriptions         — current patient's prescriptions
 *    GET  /me/appointments          — current patient's appointments
 *    GET  /me/medical-summary       — overview (last visit, next appt, etc.)
 *
 *    GET  /:identifier              — get patient by nationalId or CRN
 *                                     (admin or treating doctor only)
 *    GET  /:identifier/visits       — visit history
 *    GET  /:identifier/lab-tests    — lab test history
 *    GET  /:identifier/prescriptions — prescription history
 *
 *  Conventions kept:
 *    - Arabic error messages
 *    - { success, ... } response shape
 *    - Express Router pattern
 * ═══════════════════════════════════════════════════════════════════════════
 */

const express = require('express');
const router = express.Router();

const {
  Person, Children, Patient, Visit,
  LabTest, Prescription, Appointment, AuditLog
} = require('../models');

const { protect, authorize } = require('../middleware/auth');

// ============================================================================
// MIDDLEWARE — verify patient ownership or admin/doctor access
// ============================================================================

/**
 * Verify the caller has permission to access the patient identified by
 * req.params.identifier (national ID or CRN).
 *
 * Allowed:
 *   - The patient themselves (matching personId or childId on Account)
 *   - Admin
 *   - Doctor / Dentist (any role with clinical access)
 *
 * Sets req.targetPatient = { patientPersonId? | patientChildId? } for use
 * by downstream handlers.
 */
async function verifyPatientAccess(req, res, next) {
  try {
    const { identifier } = req.params;
    const account = req.account;

    // Resolve identifier into the dual-ref shape
    let targetRef = null;

    if (/^\d{11}$/.test(identifier)) {
      // National ID — try Person first, then Children
      const adult = await Person.findOne({ nationalId: identifier }).lean();
      if (adult) {
        targetRef = { patientPersonId: adult._id };
      } else {
        const child = await Children.findOne({ nationalId: identifier }).lean();
        if (child) targetRef = { patientChildId: child._id };
      }
    } else if (identifier.startsWith('CRN-')) {
      const child = await Children.findOne({
        childRegistrationNumber: identifier
      }).lean();
      if (child) targetRef = { patientChildId: child._id };
    }

    if (!targetRef) {
      return res.status(404).json({
        success: false,
        message: 'لم يتم العثور على المريض'
      });
    }

    // Permission check
    const isAdmin = account.roles.includes('admin');
    const isClinical = account.roles.some(r =>
      ['doctor', 'dentist', 'pharmacist', 'lab_technician'].includes(r)
    );
    const isOwner =
      (targetRef.patientPersonId && String(targetRef.patientPersonId) === String(account.personId))
      || (targetRef.patientChildId && String(targetRef.patientChildId) === String(account.childId));

    if (!isOwner && !isAdmin && !isClinical) {
      console.log('❌ Patient access denied');
      return res.status(403).json({
        success: false,
        message: 'ليس لديك صلاحية للوصول لبيانات هذا المريض'
      });
    }

    req.targetPatient = targetRef;
    return next();
  } catch (error) {
    console.error('verifyPatientAccess error:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في التحقق من الصلاحيات'
    });
  }
}

// ============================================================================
// HELPER — build the dual-ref query for the current logged-in patient
// ============================================================================

function currentPatientRef(account) {
  if (account.personId) return { patientPersonId: account.personId };
  if (account.childId) return { patientChildId: account.childId };
  return null;
}

// ============================================================================
// ME ROUTES — current logged-in patient
// ============================================================================

/**
 * @route   GET /api/patient/me
 * @desc    Current patient's full profile
 * @access  Private (patient)
 */
router.get('/me', protect, authorize('patient'), async (req, res) => {
  try {
    const account = req.account;

    // Load Person or Children profile
    const profile = account.personId
      ? await Person.findById(account.personId).lean()
      : await Children.findById(account.childId).lean();

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'بيانات المريض غير موجودة'
      });
    }

    // Load Patient medical record
    const patientQuery = account.personId
      ? { personId: account.personId }
      : { childId: account.childId };
    const patient = await Patient.findOne(patientQuery).lean();

    return res.json({
      success: true,
      patient: {
        accountId: account._id,
        email: account.email,
        isMinor: !!account.childId,
        ...profile,
        medical: patient || null
      }
    });
  } catch (error) {
    console.error('GET /me error:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في جلب البيانات'
    });
  }
});

/**
 * @route   GET /api/patient/me/visits
 * @desc    Current patient's visits, paginated
 * @access  Private (patient)
 */
router.get('/me/visits', protect, authorize('patient'), async (req, res) => {
  try {
    const ref = currentPatientRef(req.account);
    if (!ref) {
      return res.status(400).json({
        success: false,
        message: 'الحساب غير مرتبط بمريض'
      });
    }

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);

    const [visits, total] = await Promise.all([
      Visit.find(ref)
        .populate('doctorId', 'specialization medicalLicenseNumber')
        .populate('hospitalId', 'name arabicName')
        .sort({ visitDate: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Visit.countDocuments(ref)
    ]);

    return res.json({
      success: true,
      count: total,
      page,
      pages: Math.ceil(total / limit),
      visits
    });
  } catch (error) {
    console.error('GET /me/visits error:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في جلب الزيارات'
    });
  }
});

/**
 * @route   GET /api/patient/me/lab-tests
 * @desc    Current patient's lab tests
 * @access  Private (patient)
 */
router.get('/me/lab-tests', protect, authorize('patient'), async (req, res) => {
  try {
    const ref = currentPatientRef(req.account);
    if (!ref) {
      return res.status(400).json({
        success: false,
        message: 'الحساب غير مرتبط بمريض'
      });
    }

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);

    const [labTests, total] = await Promise.all([
      LabTest.find(ref)
        .populate('orderedBy', 'specialization medicalLicenseNumber')
        .populate('laboratoryId', 'name arabicName')
        .sort({ orderDate: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      LabTest.countDocuments(ref)
    ]);

    return res.json({
      success: true,
      count: total,
      page,
      pages: Math.ceil(total / limit),
      labTests
    });
  } catch (error) {
    console.error('GET /me/lab-tests error:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في جلب الفحوصات'
    });
  }
});

/**
 * @route   GET /api/patient/me/prescriptions
 * @desc    Current patient's prescriptions
 * @access  Private (patient)
 */
router.get('/me/prescriptions', protect, authorize('patient'), async (req, res) => {
  try {
    const ref = currentPatientRef(req.account);
    if (!ref) {
      return res.status(400).json({
        success: false,
        message: 'الحساب غير مرتبط بمريض'
      });
    }

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);

    const [prescriptions, total] = await Promise.all([
      Prescription.find(ref)
        .populate('doctorId', 'specialization medicalLicenseNumber')
        .populate('dentistId', 'specialization dentalLicenseNumber')
        .sort({ prescriptionDate: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Prescription.countDocuments(ref)
    ]);

    return res.json({
      success: true,
      count: total,
      page,
      pages: Math.ceil(total / limit),
      prescriptions
    });
  } catch (error) {
    console.error('GET /me/prescriptions error:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في جلب الوصفات'
    });
  }
});

/**
 * @route   GET /api/patient/me/appointments
 * @desc    Current patient's appointments (upcoming + past)
 * @access  Private (patient)
 */
router.get('/me/appointments', protect, authorize('patient'), async (req, res) => {
  try {
    const ref = currentPatientRef(req.account);
    if (!ref) {
      return res.status(400).json({
        success: false,
        message: 'الحساب غير مرتبط بمريض'
      });
    }

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const { status } = req.query;

    const query = { ...ref };
    if (status) query.status = status;

    const [appointments, total] = await Promise.all([
      Appointment.find(query)
        .populate('doctorId', 'specialization medicalLicenseNumber')
        .populate('dentistId', 'specialization dentalLicenseNumber')
        .populate('laboratoryId', 'name arabicName')
        .populate('hospitalId', 'name arabicName')
        .sort({ appointmentDate: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Appointment.countDocuments(query)
    ]);

    return res.json({
      success: true,
      count: total,
      page,
      pages: Math.ceil(total / limit),
      appointments
    });
  } catch (error) {
    console.error('GET /me/appointments error:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في جلب المواعيد'
    });
  }
});

/**
 * @route   GET /api/patient/me/medical-summary
 * @desc    High-level overview for the patient dashboard:
 *          last visit, next appointment, active prescriptions count,
 *          pending lab tests count, unread results count
 * @access  Private (patient)
 */
router.get('/me/medical-summary', protect, authorize('patient'), async (req, res) => {
  try {
    const ref = currentPatientRef(req.account);
    if (!ref) {
      return res.status(400).json({
        success: false,
        message: 'الحساب غير مرتبط بمريض'
      });
    }

    const now = new Date();

    // Run all summary queries in parallel
    const [
      lastVisit,
      nextAppointment,
      activePrescriptions,
      pendingLabTests,
      unreadCriticalResults
    ] = await Promise.all([
      Visit.findOne(ref)
        .sort({ visitDate: -1 })
        .populate('doctorId', 'specialization')
        .lean(),

      Appointment.findOne({
        ...ref,
        appointmentDate: { $gte: now },
        status: { $in: ['scheduled', 'confirmed'] }
      })
        .sort({ appointmentDate: 1 })
        .populate('doctorId', 'specialization')
        .populate('dentistId', 'specialization')
        .lean(),

      Prescription.countDocuments({
        ...ref,
        status: { $in: ['active', 'partially_dispensed'] }
      }),

      LabTest.countDocuments({
        ...ref,
        status: { $in: ['ordered', 'scheduled', 'in_progress'] }
      }),

      LabTest.countDocuments({
        ...ref,
        isCritical: true,
        isViewedByPatient: false,
        status: 'completed'
      })
    ]);

    return res.json({
      success: true,
      summary: {
        lastVisit,
        nextAppointment,
        activePrescriptionsCount: activePrescriptions,
        pendingLabTestsCount: pendingLabTests,
        unreadCriticalResultsCount: unreadCriticalResults
      }
    });
  } catch (error) {
    console.error('GET /me/medical-summary error:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في جلب الملخص الطبي'
    });
  }
});

// ============================================================================
// LOOKUP ROUTES — by identifier (admin/doctor access)
// ============================================================================

/**
 * @route   GET /api/patient/:identifier
 * @desc    Get patient profile by national ID or child registration number.
 *          Used by doctors during a visit to look up a patient.
 * @access  Private (admin, doctor, dentist, pharmacist, lab_technician)
 */
router.get('/:identifier', protect, verifyPatientAccess, async (req, res) => {
  try {
    const { patientPersonId, patientChildId } = req.targetPatient;

    // Load profile from the right collection
    const profile = patientPersonId
      ? await Person.findById(patientPersonId).lean()
      : await Children.findById(patientChildId).lean();

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'بيانات المريض غير موجودة'
      });
    }

    // Load Patient medical record
    const patientQuery = patientPersonId
      ? { personId: patientPersonId }
      : { childId: patientChildId };
    const patient = await Patient.findOne(patientQuery).lean();

    // Audit-log lookups by clinical staff
    if (req.account.roles.some(r => ['doctor', 'pharmacist', 'lab_technician'].includes(r))) {
      AuditLog.record({
        userId: req.account._id,
        userEmail: req.account.email,
        action: 'VIEW_PATIENT',
        description: `Viewed patient ${req.params.identifier}`,
        resourceType: 'patient',
        resourceId: patient?._id,
        patientPersonId,
        patientChildId,
        ipAddress: req.ip || 'unknown',
        success: true
      });
    }

    return res.json({
      success: true,
      patient: {
        isMinor: !!patientChildId,
        ...profile,
        medical: patient || null
      }
    });
  } catch (error) {
    console.error('GET /:identifier error:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في جلب بيانات المريض'
    });
  }
});

/**
 * @route   GET /api/patient/:identifier/visits
 * @desc    Visit history for a patient (paginated, latest first)
 * @access  Private (admin, doctor)
 */
router.get('/:identifier/visits', protect, verifyPatientAccess, async (req, res) => {
  try {
    const ref = req.targetPatient;

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);

    const [visits, total] = await Promise.all([
      Visit.find(ref)
        .populate('doctorId', 'specialization medicalLicenseNumber')
        .populate('dentistId', 'specialization')
        .populate('hospitalId', 'name arabicName')
        .sort({ visitDate: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Visit.countDocuments(ref)
    ]);

    return res.json({
      success: true,
      count: total,
      page,
      pages: Math.ceil(total / limit),
      visits
    });
  } catch (error) {
    console.error('GET /:identifier/visits error:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في جلب الزيارات'
    });
  }
});

/**
 * @route   GET /api/patient/:identifier/lab-tests
 * @desc    Lab test history for a patient
 * @access  Private (admin, doctor, lab_technician)
 */
router.get('/:identifier/lab-tests', protect, verifyPatientAccess, async (req, res) => {
  try {
    const ref = req.targetPatient;

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);

    const [labTests, total] = await Promise.all([
      LabTest.find(ref)
        .populate('orderedBy', 'specialization')
        .populate('laboratoryId', 'name arabicName')
        .sort({ orderDate: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      LabTest.countDocuments(ref)
    ]);

    return res.json({
      success: true,
      count: total,
      page,
      pages: Math.ceil(total / limit),
      labTests
    });
  } catch (error) {
    console.error('GET /:identifier/lab-tests error:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في جلب الفحوصات'
    });
  }
});

/**
 * @route   GET /api/patient/:identifier/prescriptions
 * @desc    Prescription history for a patient
 * @access  Private (admin, doctor, pharmacist)
 */
router.get('/:identifier/prescriptions', protect, verifyPatientAccess, async (req, res) => {
  try {
    const ref = req.targetPatient;

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);

    const [prescriptions, total] = await Promise.all([
      Prescription.find(ref)
        .populate('doctorId', 'specialization')
        .populate('dentistId', 'specialization')
        .sort({ prescriptionDate: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Prescription.countDocuments(ref)
    ]);

    return res.json({
      success: true,
      count: total,
      page,
      pages: Math.ceil(total / limit),
      prescriptions
    });
  } catch (error) {
    console.error('GET /:identifier/prescriptions error:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في جلب الوصفات'
    });
  }
});

module.exports = router;