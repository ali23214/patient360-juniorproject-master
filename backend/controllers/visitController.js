/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  Visit Controller — Patient 360°
 *  ─────────────────────────────────────────────────────────────────────────
 *  Visit (clinical encounter) endpoints mounted under /api/visits.
 *
 *  Patient resolution:
 *    The frontend can identify the patient by either:
 *      - patientNationalId (11 digits) → looks up Person/Children
 *      - patientPersonId / patientChildId (ObjectId) → direct
 *      - childRegistrationNumber (CRN-...) → looks up Children
 *    The controller normalizes whatever is sent into the dual-ref pattern.
 *
 *  Functions:
 *    1. createVisit       — Create new clinical visit
 *    2. getPatientVisits  — List visits for one patient
 *    3. getDoctorVisits   — List visits for one doctor
 *    4. getVisitById      — Single visit detail
 *    5. updateVisit       — Update visit fields (with ownership check)
 *    6. completeVisit     — Mark visit completed + update patient stats
 *    7. deleteVisit       — Soft-delete (admin only)
 *
 *  Conventions kept from existing code:
 *    - Arabic error messages, emoji-marked console logs
 *    - { success, message, [data] } response shape
 *    - Try/catch in every async function
 * ═══════════════════════════════════════════════════════════════════════════
 */

const {
  Visit, Person, Children, Patient, Doctor, AuditLog
} = require('../models');

// ============================================================================
// HELPER: Resolve patient identifier into { patientPersonId | patientChildId }
// ============================================================================

/**
 * The frontend sends one of: patientNationalId, patientPersonId,
 * patientChildId, childRegistrationNumber. Normalize into the dual-ref shape.
 *
 * @returns {{ patientPersonId?: ObjectId, patientChildId?: ObjectId } | null}
 */
async function resolvePatientRef(body) {
  const {
    patientNationalId,
    patientPersonId,
    patientChildId,
    childRegistrationNumber
  } = body;

  // Direct ObjectId provided
  if (patientPersonId) {
    return { patientPersonId };
  }
  if (patientChildId) {
    return { patientChildId };
  }

  // Lookup by CRN
  if (childRegistrationNumber) {
    const child = await Children.findOne({ childRegistrationNumber }).lean();
    return child ? { patientChildId: child._id } : null;
  }

  // Lookup by national ID — could be adult OR child (with assigned nationalId)
  if (patientNationalId) {
    const adult = await Person.findOne({ nationalId: patientNationalId }).lean();
    if (adult) return { patientPersonId: adult._id };

    const child = await Children.findOne({ nationalId: patientNationalId }).lean();
    if (child) return { patientChildId: child._id };
  }

  return null;
}

// ============================================================================
// 1. CREATE VISIT
// ============================================================================

/**
 * @route   POST /api/visits
 * @desc    Create a new clinical visit
 * @access  Private (doctor, dentist)
 *
 * Body:
 *   visitType (required)         — regular | follow_up | emergency | consultation | dental | lab_only
 *   chiefComplaint (required)    — patient's main complaint
 *   patient identifier (one of)  — patientNationalId | patientPersonId | patientChildId | childRegistrationNumber
 *   doctorId / dentistId         — provider (one required)
 *   diagnosis                    — optional
 *   vitalSigns                   — optional structured object (9 fields)
 *   prescribedMedications        — optional array
 *   doctorNotes                  — optional
 *   followUpDate, followUpNotes  — optional
 *   visitPhotoUrl                — optional (X-ray, scan)
 *   appointmentId                — optional link to source appointment
 *   hospitalId                   — optional
 */
exports.createVisit = async (req, res) => {
  console.log('🔵 ========== CREATE VISIT ==========');

  try {
    // ── HELPERS ──────────────────────────────────────────────────────────
    // Multipart form data can only carry strings, so nested objects and
    // arrays arrive as JSON-encoded strings. Parse them before validating.
    const parseIfJSON = (value) => {
      if (value == null || value === '') return undefined;
      if (typeof value !== 'string') return value;
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    };

    // Mongoose min/max validators reject empty strings. Strip empty-string
    // keys from optional sub-documents so blank fields don't break the save.
    const stripEmpty = (obj) => {
      if (!obj || typeof obj !== 'object') return obj;
      const cleaned = {};
      Object.entries(obj).forEach(([k, v]) => {
        if (v !== '' && v !== null && v !== undefined) cleaned[k] = v;
      });
      return Object.keys(cleaned).length > 0 ? cleaned : undefined;
    };

    // ── DESTRUCTURE BODY ─────────────────────────────────────────────────
    const {
      visitType,
      chiefComplaint,
      doctorId,
      dentistId,
      hospitalId,
      diagnosis,
      doctorNotes,
      followUpDate,
      followUpNotes,
      visitPhotoUrl,
      appointmentId
    } = req.body;

    // Fields that may arrive as JSON strings (multipart)
    const vitalSigns = stripEmpty(parseIfJSON(req.body.vitalSigns));
    const prescribedMedications = parseIfJSON(req.body.prescribedMedications);
    const ecgAnalysis = parseIfJSON(req.body.ecgAnalysis);

    // ── 1. AUTO-RESOLVE PROVIDER ID FROM JWT ─────────────────────────────
    // The caller is already authenticated, so we trust the token to tell us
    // who the provider is instead of asking the frontend to re-declare it.
    let resolvedDoctorId = doctorId;
    let resolvedDentistId = dentistId;

    if (!resolvedDoctorId && !resolvedDentistId && req.user?.personId) {
      if (req.user.roles?.includes('doctor')) {
        const doctor = await Doctor.findOne({ personId: req.user.personId }).lean();
        if (doctor) resolvedDoctorId = doctor._id;
      } else if (req.user.roles?.includes('dentist')) {
        try {
          const Dentist = require('../models/Dentist');
          const dentist = await Dentist.findOne({ personId: req.user.personId }).lean();
          if (dentist) resolvedDentistId = dentist._id;
        } catch (e) {
          console.warn('⚠️  Dentist model not available');
        }
      }
    }

    // ── 2. VALIDATE REQUIRED FIELDS ──────────────────────────────────────
    if (!visitType) {
      return res.status(400).json({
        success: false,
        message: 'نوع الزيارة مطلوب'
      });
    }
    if (!chiefComplaint) {
      return res.status(400).json({
        success: false,
        message: 'الشكوى الرئيسية مطلوبة'
      });
    }
    if (!resolvedDoctorId && !resolvedDentistId) {
      return res.status(400).json({
        success: false,
        message: 'يجب تحديد الطبيب أو طبيب الأسنان'
      });
    }

    // ── 3. RESOLVE PATIENT REFERENCE ─────────────────────────────────────
    // The patient ID can arrive three ways:
    //   • req.params.nationalId  — /patient/:nationalId/visit (doctor dashboard)
    //   • req.body.patientNationalId — admin-created visits
    //   • req.body.childRegistrationNumber — pediatric visits
    // Merge into the shape resolvePatientRef expects.
    const resolverInput = {
      ...req.body,
      patientNationalId: req.body.patientNationalId
        || req.body.nationalId
        || req.params.nationalId
        || req.params.identifier
    };

    const patientRef = await resolvePatientRef(resolverInput);
    if (!patientRef) {
      console.log('❌ Patient not found from any identifier');
      return res.status(404).json({
        success: false,
        message: 'لم يتم العثور على المريض'
      });
    }
    console.log('✅ Patient resolved:', patientRef);

    // ── 4. CREATE VISIT ──────────────────────────────────────────────────
    console.log('📝 Creating visit document...');
    const visit = await Visit.create({
      visitType,
      ...patientRef,                                    // patientPersonId OR patientChildId
      doctorId: resolvedDoctorId || undefined,
      dentistId: resolvedDentistId || undefined,
      hospitalId: hospitalId || undefined,
      appointmentId: appointmentId || undefined,
      visitDate: new Date(),
      status: 'in_progress',
      chiefComplaint: chiefComplaint.trim(),
      diagnosis: diagnosis?.trim(),
      vitalSigns: vitalSigns || undefined,
      prescribedMedications: Array.isArray(prescribedMedications)
        ? prescribedMedications
        : [],
      ecgAnalysis: ecgAnalysis || undefined,
      doctorNotes: doctorNotes?.trim(),
      followUpDate: followUpDate ? new Date(followUpDate) : undefined,
      followUpNotes: followUpNotes?.trim(),
      visitPhotoUrl: visitPhotoUrl || undefined,
      visitPhotoUploadedAt: visitPhotoUrl ? new Date() : undefined
    });
    console.log('✅ Visit created:', visit._id);

    // ── 5. AUDIT LOG ─────────────────────────────────────────────────────
    AuditLog.record({
      userId: req.user._id,
      userEmail: req.user.email,
      action: 'CREATE_VISIT',
      description: `Created ${visitType} visit`,
      resourceType: 'visit',
      resourceId: visit._id,
      patientPersonId: patientRef.patientPersonId,
      patientChildId: patientRef.patientChildId,
      ipAddress: req.ip || 'unknown',
      success: true
    });

    return res.status(201).json({
      success: true,
      message: 'تم إنشاء الزيارة بنجاح',
      visit
    });

  } catch (error) {
    console.error('❌ Create visit error:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: messages[0] || 'خطأ في البيانات'
      });
    }
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في إنشاء الزيارة'
    });
  }
};

// ============================================================================
// 2. GET PATIENT VISITS
// ============================================================================

/**
 * @route   GET /api/visits/patient/:identifier
 * @desc    List all visits for a patient identified by nationalId or CRN.
 *          Returns latest first, with optional pagination.
 * @access  Private (patient owner, admin, treating doctor)
 */
exports.getPatientVisits = async (req, res) => {
  try {
    const { identifier } = req.params;
    const { page = 1, limit = 20 } = req.query;

    // Resolve identifier — could be nationalId (11 digits) or CRN (CRN-...)
    let patientRef;
    if (/^\d{11}$/.test(identifier)) {
      // National ID — check Person first, then Children
      const adult = await Person.findOne({ nationalId: identifier }).lean();
      if (adult) {
        patientRef = { patientPersonId: adult._id };
      } else {
        const child = await Children.findOne({ nationalId: identifier }).lean();
        if (child) patientRef = { patientChildId: child._id };
      }
    } else if (identifier.startsWith('CRN-')) {
      const child = await Children.findOne({ childRegistrationNumber: identifier }).lean();
      if (child) patientRef = { patientChildId: child._id };
    }

    if (!patientRef) {
      return res.status(404).json({
        success: false,
        message: 'لم يتم العثور على المريض'
      });
    }

    const safeLimit = Math.min(parseInt(limit, 10) || 20, 100);
    const safePage = Math.max(parseInt(page, 10) || 1, 1);

    const [visits, total] = await Promise.all([
      Visit.find(patientRef)
        .populate('doctorId', 'specialization medicalLicenseNumber')
        .populate('dentistId', 'specialization dentalLicenseNumber')
        .populate('hospitalId', 'name arabicName')
        .sort({ visitDate: -1 })
        .limit(safeLimit)
        .skip((safePage - 1) * safeLimit)
        .lean(),
      Visit.countDocuments(patientRef)
    ]);

    return res.json({
      success: true,
      count: total,
      page: safePage,
      pages: Math.ceil(total / safeLimit),
      visits
    });
  } catch (error) {
    console.error('Get patient visits error:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في جلب زيارات المريض'
    });
  }
};

// ============================================================================
// 3. GET DOCTOR VISITS
// ============================================================================

/**
 * @route   GET /api/visits/doctor/:doctorId
 * @desc    List visits handled by a specific doctor
 * @access  Private (doctor self, admin)
 */
exports.getDoctorVisits = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { page = 1, limit = 20, status } = req.query;

    const query = { doctorId };
    if (status) query.status = status;

    const safeLimit = Math.min(parseInt(limit, 10) || 20, 100);
    const safePage = Math.max(parseInt(page, 10) || 1, 1);

    const [visits, total] = await Promise.all([
      Visit.find(query)
        .populate('patientPersonId', 'firstName lastName nationalId')
        .populate('patientChildId', 'firstName lastName childRegistrationNumber')
        .sort({ visitDate: -1 })
        .limit(safeLimit)
        .skip((safePage - 1) * safeLimit)
        .lean(),
      Visit.countDocuments(query)
    ]);

    return res.json({
      success: true,
      count: total,
      page: safePage,
      pages: Math.ceil(total / safeLimit),
      visits
    });
  } catch (error) {
    console.error('Get doctor visits error:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في جلب زيارات الطبيب'
    });
  }
};

// ============================================================================
// 4. GET VISIT BY ID
// ============================================================================

/**
 * @route   GET /api/visits/:id
 * @desc    Get a single visit detail with all populated refs
 * @access  Private (patient owner, treating doctor, admin)
 */
exports.getVisitById = async (req, res) => {
  try {
    const { id } = req.params;

    const visit = await Visit.findById(id)
      .populate('patientPersonId', 'firstName lastName nationalId phoneNumber')
      .populate('patientChildId', 'firstName lastName childRegistrationNumber phoneNumber')
      .populate('doctorId', 'specialization medicalLicenseNumber')
      .populate('dentistId', 'specialization dentalLicenseNumber')
      .populate('hospitalId', 'name arabicName')
      .lean();

    if (!visit) {
      return res.status(404).json({
        success: false,
        message: 'الزيارة غير موجودة'
      });
    }

    return res.json({ success: true, visit });
  } catch (error) {
    console.error('Get visit by id error:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في جلب الزيارة'
    });
  }
};

// ============================================================================
// 5. UPDATE VISIT
// ============================================================================

/**
 * @route   PUT /api/visits/:id
 * @desc    Update visit fields. Only the visit's owning doctor or admin
 *          can update.
 * @access  Private (treating doctor, admin)
 */
exports.updateVisit = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const visit = await Visit.findById(id);
    if (!visit) {
      return res.status(404).json({
        success: false,
        message: 'الزيارة غير موجودة'
      });
    }

    // ── Ownership check: only the treating doctor or admin can update ─────
    const isAdmin = req.user.roles?.includes('admin');
    const isOwnerDoctor = visit.doctorId
      && String(visit.doctorId) === String(req.user.personId);
    // Note: comparing to req.user.personId is approximate; in practice you
    // would look up the Doctor by personId. For now this gates obvious abuse.

    if (!isAdmin && !isOwnerDoctor) {
      // Looser fallback — verify by the doctor record
      const doctor = await Doctor.findOne({ personId: req.user.personId }).lean();
      const isDoctorOwner = doctor && String(visit.doctorId) === String(doctor._id);
      if (!isDoctorOwner) {
        console.log('❌ Update blocked — not owner');
        return res.status(403).json({
          success: false,
          message: 'ليس لديك صلاحية لتعديل هذه الزيارة'
        });
      }
    }

    // ── Update allowed fields
    const allowedFields = [
      'diagnosis', 'vitalSigns', 'prescribedMedications',
      'doctorNotes', 'followUpDate', 'followUpNotes',
      'visitPhotoUrl', 'paymentStatus', 'paymentMethod',
      'ecgAnalysis'
    ];
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) visit[field] = updates[field];
    });

    if (updates.visitPhotoUrl) {
      visit.visitPhotoUploadedAt = new Date();
    }

    await visit.save();
    console.log('✅ Visit updated');

    return res.json({
      success: true,
      message: 'تم تحديث الزيارة بنجاح',
      visit
    });
  } catch (error) {
    console.error('Update visit error:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: messages[0] || 'خطأ في البيانات'
      });
    }
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في تحديث الزيارة'
    });
  }
};

// ============================================================================
// 6. COMPLETE VISIT
// ============================================================================

/**
 * @route   POST /api/visits/:id/complete
 * @desc    Mark visit as completed and refresh the patient's denormalized
 *          totalVisits + lastVisitDate counters via Patient.recordVisit().
 * @access  Private (treating doctor, admin)
 */
exports.completeVisit = async (req, res) => {
  console.log('🔵 ========== COMPLETE VISIT ==========');

  try {
    const { id } = req.params;

    const visit = await Visit.findById(id);
    if (!visit) {
      return res.status(404).json({
        success: false,
        message: 'الزيارة غير موجودة'
      });
    }

    if (visit.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'الزيارة مكتملة بالفعل'
      });
    }

    await visit.markCompleted();
    console.log('✅ Visit marked completed');

    // Refresh patient stats (totalVisits, lastVisitDate)
    const patientQuery = visit.patientChildId
      ? { childId: visit.patientChildId }
      : { personId: visit.patientPersonId };
    const patient = await Patient.findOne(patientQuery);
    if (patient) {
      await patient.recordVisit(visit.visitDate);
      console.log('✅ Patient stats refreshed');
    }

    AuditLog.record({
      userId: req.user._id,
      userEmail: req.user.email,
      action: 'COMPLETE_VISIT',
      resourceType: 'visit',
      resourceId: visit._id,
      patientPersonId: visit.patientPersonId,
      patientChildId: visit.patientChildId,
      ipAddress: req.ip || 'unknown',
      success: true
    });

    return res.json({
      success: true,
      message: 'تم إنهاء الزيارة بنجاح',
      visit
    });
  } catch (error) {
    console.error('Complete visit error:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في إنهاء الزيارة'
    });
  }
};

// ============================================================================
// 7. DELETE VISIT (admin only — soft delete via status)
// ============================================================================

/**
 * @route   DELETE /api/visits/:id
 * @desc    Soft-delete visit by setting status='cancelled'. Admin-only because
 *          visit history is medically significant — patients should never
 *          be able to remove visits from their own record.
 * @access  Private (admin)
 */
exports.deleteVisit = async (req, res) => {
  try {
    const { id } = req.params;

    const visit = await Visit.findById(id);
    if (!visit) {
      return res.status(404).json({
        success: false,
        message: 'الزيارة غير موجودة'
      });
    }

    visit.status = 'cancelled';
    await visit.save();

    AuditLog.record({
      userId: req.user._id,
      userEmail: req.user.email,
      action: 'CANCEL_VISIT',
      resourceType: 'visit',
      resourceId: visit._id,
      patientPersonId: visit.patientPersonId,
      patientChildId: visit.patientChildId,
      ipAddress: req.ip || 'unknown',
      success: true
    });

    return res.json({
      success: true,
      message: 'تم إلغاء الزيارة'
    });
  } catch (error) {
    console.error('Delete visit error:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في حذف الزيارة'
    });
  }
};