/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  Admin Controller — Patient 360°
 *  ─────────────────────────────────────────────────────────────────────────
 *  Admin-only endpoints mounted under /api/admin.
 *
 *  Functions:
 *    1. getStatistics              — Dashboard KPIs
 *    2. getAllDoctors              — List all doctors with details
 *    3. getDoctorById              — Single doctor lookup
 *    4. createDoctor               — Admin creates doctor directly
 *    5. updateDoctor               — Update doctor fields
 *    6. deactivateDoctor           — Soft-disable doctor account
 *    7. activateDoctor             — Re-enable deactivated doctor
 *    8. getAllPatients             — List patients (adults AND children)
 *    9. getPatientById             — Single patient lookup
 *   10. updatePatient              — Update patient fields
 *   11. deactivatePatient          — Soft-disable patient account
 *   12. activatePatient            — Re-enable deactivated patient
 *   13. getAuditLogs               — Browse audit logs with pagination
 *   14. getUserAuditLogs           — Audit logs for one specific user
 *   15. getAllDoctorRequests       — List doctor registration requests
 *   16. getDoctorRequestById       — Single doctor request detail
 *   17. approveDoctorRequest       — Approve and create Person+Account+Doctor
 *   18. rejectDoctorRequest        — Reject with reason
 *
 *  Conventions kept from existing code:
 *    - Arabic error messages, emoji-marked console logs
 *    - { success, message, [data] } response shape
 *    - Try/catch in every async function
 *    - Uses req.user._id (auth middleware aliases this to req.account)
 * ═══════════════════════════════════════════════════════════════════════════
 */

const {
  Account, Person, Children, Patient, Doctor,
  Visit, AuditLog, DoctorRequest
} = require('../models');

// Allowed deactivation reasons — matches locked Account schema enum
const ALLOWED_DEACTIVATION_REASONS = [
  'voluntary', 'administrative', 'security',
  'retirement', 'deceased', 'duplicate', 'fraud'
];

// ============================================================================
// 1. STATISTICS
// ============================================================================

/**
 * @route   GET /api/admin/statistics
 * @desc    Dashboard KPIs
 * @access  Private (admin)
 */
exports.getStatistics = async (req, res) => {
  try {
    const startOfToday = new Date(new Date().setHours(0, 0, 0, 0));

    const [
      totalDoctors,
      totalAdultPatients,
      totalChildPatients,
      totalVisits,
      todayVisits,
      pendingDoctorRequests
    ] = await Promise.all([
      Doctor.countDocuments(),
      Patient.countDocuments({ personId: { $exists: true, $ne: null } }),
      Patient.countDocuments({ childId: { $exists: true, $ne: null } }),
      Visit.countDocuments(),
      Visit.countDocuments({ visitDate: { $gte: startOfToday } }),
      DoctorRequest.countDocuments({ status: 'pending' })
    ]);

    return res.json({
      success: true,
      statistics: {
        totalDoctors,
        totalPatients: totalAdultPatients + totalChildPatients,
        totalAdultPatients,
        totalChildPatients,
        totalVisits,
        todayVisits,
        pendingDoctorRequests
      }
    });
  } catch (error) {
    console.error('Get statistics error:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في جلب الإحصائيات'
    });
  }
};

// ============================================================================
// 2. GET ALL DOCTORS
// ============================================================================

/**
 * @route   GET /api/admin/doctors
 * @desc    List all doctors with their Person + Account info
 * @access  Private (admin)
 */
exports.getAllDoctors = async (req, res) => {
  try {
    console.log('📥 getAllDoctors called');

    const doctors = await Doctor.find().lean();
    console.log(`✅ Found ${doctors.length} doctors`);

    if (doctors.length === 0) {
      return res.json({ success: true, count: 0, doctors: [] });
    }

    // Bulk-load all Persons and Accounts in 2 queries (avoids N+1)
    const personIds = doctors.map(d => d.personId);
    const [persons, accounts] = await Promise.all([
      Person.find({ _id: { $in: personIds } }).lean(),
      Account.find({ personId: { $in: personIds } }).lean()
    ]);

    // Build lookup maps
    const personById = new Map(persons.map(p => [String(p._id), p]));
    const accountByPersonId = new Map(accounts.map(a => [String(a.personId), a]));

    const validDoctors = doctors
      .map(doctor => {
        const person = personById.get(String(doctor.personId));
        if (!person) {
          console.warn(`⚠️  Person missing for doctor ${doctor._id}`);
          return null;
        }
        const account = accountByPersonId.get(String(doctor.personId));

        return {
          id: doctor._id,
          firstName: person.firstName || '',
          fatherName: person.fatherName || '',
          lastName: person.lastName || '',
          motherName: person.motherName || '',
          nationalId: person.nationalId || '',
          phoneNumber: person.phoneNumber || '',
          email: account?.email || '',
          isActive: account?.isActive ?? true,
          specialization: doctor.specialization || '',
          subSpecialization: doctor.subSpecialization || null,
          licenseNumber: doctor.medicalLicenseNumber || '',
          hospitalAffiliation: doctor.hospitalAffiliation || '',
          yearsOfExperience: doctor.yearsOfExperience || 0,
          consultationFee: doctor.consultationFee || 0,
          currency: doctor.currency || 'SYP',
          availableDays: doctor.availableDays || [],
          governorate: person.governorate || '',
          city: person.city || '',
          isECGSpecialist: doctor.isECGSpecialist || false,
          verificationStatus: doctor.verificationStatus || 'verified',
          averageRating: doctor.averageRating || 0,
          totalReviews: doctor.totalReviews || 0,
          lastLogin: account?.lastLogin || null,
          createdAt: doctor.createdAt
        };
      })
      .filter(d => d !== null);

    console.log(`✅ Returning ${validDoctors.length} valid doctors`);
    return res.json({
      success: true,
      count: validDoctors.length,
      doctors: validDoctors
    });

  } catch (error) {
    console.error('❌ Get doctors error:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في جلب الأطباء',
      error: error.message
    });
  }
};

// ============================================================================
// 3. GET DOCTOR BY ID
// ============================================================================

/**
 * @route   GET /api/admin/doctors/:id
 * @desc    Get a single doctor's full profile
 * @access  Private (admin)
 */
exports.getDoctorById = async (req, res) => {
  try {
    const { id } = req.params;

    const doctor = await Doctor.findById(id).populate('personId');
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'الطبيب غير موجود'
      });
    }

    const account = await Account.findOne({ personId: doctor.personId._id });
    const visitCount = await Visit.countDocuments({ doctorId: doctor._id });

    return res.json({
      success: true,
      doctor: {
        id: doctor._id,
        firstName: doctor.personId.firstName,
        fatherName: doctor.personId.fatherName,
        lastName: doctor.personId.lastName,
        motherName: doctor.personId.motherName,
        nationalId: doctor.personId.nationalId,
        phoneNumber: doctor.personId.phoneNumber,
        gender: doctor.personId.gender,
        dateOfBirth: doctor.personId.dateOfBirth,
        address: doctor.personId.address,
        governorate: doctor.personId.governorate,
        city: doctor.personId.city,
        email: account?.email,
        isActive: account?.isActive,
        specialization: doctor.specialization,
        subSpecialization: doctor.subSpecialization,
        licenseNumber: doctor.medicalLicenseNumber,
        hospitalAffiliation: doctor.hospitalAffiliation,
        yearsOfExperience: doctor.yearsOfExperience,
        consultationFee: doctor.consultationFee,
        currency: doctor.currency,
        followUpFee: doctor.followUpFee,
        availableDays: doctor.availableDays,
        isECGSpecialist: doctor.isECGSpecialist,
        verificationStatus: doctor.verificationStatus,
        averageRating: doctor.averageRating,
        totalReviews: doctor.totalReviews,
        visitCount,
        createdAt: doctor.createdAt
      }
    });
  } catch (error) {
    console.error('Get doctor error:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في جلب بيانات الطبيب'
    });
  }
};

// ============================================================================
// 4. CREATE DOCTOR (admin direct creation)
// ============================================================================

/**
 * @route   POST /api/admin/doctors
 * @desc    Admin creates a doctor account directly (bypasses doctor request)
 * @access  Private (admin)
 */
exports.createDoctor = async (req, res) => {
  console.log('📥 createDoctor called');

  try {
    const { person, doctor, account } = req.body;

    if (!person || !doctor || !account) {
      return res.status(400).json({
        success: false,
        message: 'البيانات غير مكتملة (person, doctor, account مطلوبة)'
      });
    }

    // ── Validate required Person fields (now includes father+mother names)
    const personRequired = [
      'firstName', 'fatherName', 'lastName', 'motherName',
      'nationalId', 'gender', 'dateOfBirth', 'phoneNumber',
      'address', 'governorate', 'city'
    ];
    const missingPerson = personRequired.filter(f => !person[f]);
    if (missingPerson.length > 0) {
      return res.status(400).json({
        success: false,
        message: `الحقول التالية مطلوبة في person: ${missingPerson.join(', ')}`
      });
    }

    // ── Check duplicates in parallel
    const [existingPerson, existingAccount, existingDoctor] = await Promise.all([
      Person.findOne({ nationalId: person.nationalId }),
      Account.findOne({ email: account.email.toLowerCase() }),
      Doctor.findOne({
        medicalLicenseNumber: doctor.medicalLicenseNumber.toUpperCase()
      })
    ]);

    if (existingPerson) {
      return res.status(400).json({
        success: false,
        message: 'الرقم الوطني مستخدم بالفعل'
      });
    }
    if (existingAccount) {
      return res.status(400).json({
        success: false,
        message: 'البريد الإلكتروني مستخدم بالفعل'
      });
    }
    if (existingDoctor) {
      return res.status(400).json({
        success: false,
        message: 'رقم الترخيص مستخدم بالفعل'
      });
    }

    // ── Step 1: Create Person
    console.log('1️⃣ Creating Person...');
    const newPerson = await Person.create({
      firstName: person.firstName.trim(),
      fatherName: person.fatherName.trim(),
      lastName: person.lastName.trim(),
      motherName: person.motherName.trim(),
      nationalId: person.nationalId.trim(),
      gender: person.gender,
      dateOfBirth: new Date(person.dateOfBirth),
      phoneNumber: person.phoneNumber.replace(/\s/g, ''),
      address: person.address.trim(),
      governorate: person.governorate,
      city: person.city.trim()
    });
    console.log('✅ Person created:', newPerson._id);

    // ── Step 2: Create Account
    // Pass plaintext — Account schema's pre-save hook bcrypt-hashes it
    console.log('2️⃣ Creating Account...');
    const newAccount = await Account.create({
      email: account.email.toLowerCase().trim(),
      password: account.password,
      personId: newPerson._id,
      roles: ['doctor'],
      isActive: true
    });
    console.log('✅ Account created:', newAccount._id);

    // ── Step 3: Create Doctor
    console.log('3️⃣ Creating Doctor...');
    const newDoctor = await Doctor.create({
      personId: newPerson._id,
      medicalLicenseNumber: doctor.medicalLicenseNumber.toUpperCase().trim(),
      specialization: doctor.specialization,
      subSpecialization: doctor.subSpecialization?.trim() || null,
      yearsOfExperience: parseInt(doctor.yearsOfExperience, 10) || 0,
      hospitalAffiliation: doctor.hospitalAffiliation.trim(),
      availableDays: doctor.availableDays || [],
      consultationFee: parseFloat(doctor.consultationFee) || 0,
      currency: doctor.currency || 'SYP'
    });
    console.log('✅ Doctor created:', newDoctor._id);

    return res.status(201).json({
      success: true,
      message: 'تم إضافة الطبيب بنجاح',
      doctor: {
        id: newDoctor._id,
        firstName: newPerson.firstName,
        lastName: newPerson.lastName,
        email: newAccount.email,
        specialization: newDoctor.specialization,
        licenseNumber: newDoctor.medicalLicenseNumber
      }
    });

  } catch (error) {
    console.error('❌ Create doctor error:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء إضافة الطبيب: ' + error.message
    });
  }
};

// ============================================================================
// 5. UPDATE DOCTOR
// ============================================================================

/**
 * @route   PUT /api/admin/doctors/:id
 * @desc    Update doctor fields (and Person fields if provided)
 * @access  Private (admin)
 */
exports.updateDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const doctor = await Doctor.findById(id);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'الطبيب غير موجود'
      });
    }

    // Update Doctor-only fields
    const doctorFields = [
      'specialization', 'subSpecialization', 'yearsOfExperience',
      'hospitalAffiliation', 'availableDays', 'consultationFee',
      'followUpFee', 'currency', 'isAcceptingNewPatients', 'isAvailable'
    ];
    doctorFields.forEach(field => {
      if (updates[field] !== undefined) {
        doctor[field] = updates[field];
      }
    });
    await doctor.save();

    // Update Person fields if provided
    const personFields = ['phoneNumber', 'address', 'governorate', 'city'];
    const personUpdates = {};
    personFields.forEach(field => {
      if (updates[field]) personUpdates[field] = updates[field];
    });
    if (Object.keys(personUpdates).length > 0) {
      await Person.findByIdAndUpdate(doctor.personId, personUpdates);
    }

    return res.json({
      success: true,
      message: 'تم تحديث بيانات الطبيب بنجاح'
    });
  } catch (error) {
    console.error('Update doctor error:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في تحديث بيانات الطبيب'
    });
  }
};

// ============================================================================
// 6. DEACTIVATE DOCTOR
// ============================================================================

/**
 * @route   POST /api/admin/doctors/:id/deactivate
 * @desc    Soft-disable doctor's Account
 * @access  Private (admin)
 *
 * Body: { reason: <one of ALLOWED_DEACTIVATION_REASONS>, notes?: string }
 */
exports.deactivateDoctor = async (req, res) => {
  console.log('🔵 ========== DEACTIVATE DOCTOR ==========');

  try {
    const { id } = req.params;
    const { reason, notes } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'سبب إلغاء التفعيل مطلوب'
      });
    }

    if (!ALLOWED_DEACTIVATION_REASONS.includes(reason)) {
      return res.status(400).json({
        success: false,
        message: `سبب إلغاء التفعيل غير صالح. القيم المسموحة: ${ALLOWED_DEACTIVATION_REASONS.join(', ')}`
      });
    }

    const doctor = await Doctor.findById(id);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'الطبيب غير موجود'
      });
    }

    await Account.findOneAndUpdate(
      { personId: doctor.personId },
      {
        isActive: false,
        deactivationReason: reason,
        deactivatedAt: new Date(),
        deactivatedBy: req.user._id
      }
    );

    // Audit-log the action (fire-and-forget)
    AuditLog.record({
      userId: req.user._id,
      userEmail: req.user.email,
      action: 'DEACTIVATE_DOCTOR',
      description: `Deactivated doctor ${doctor.medicalLicenseNumber}`,
      resourceType: 'doctor',
      resourceId: doctor._id,
      ipAddress: req.ip || 'unknown',
      success: true,
      metadata: { reason, notes: notes || null }
    });

    console.log('✅ Doctor deactivated');
    return res.json({
      success: true,
      message: 'تم إلغاء تفعيل الطبيب بنجاح'
    });
  } catch (error) {
    console.error('❌ Deactivate doctor error:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في إلغاء التفعيل'
    });
  }
};

// ============================================================================
// 7. ACTIVATE DOCTOR
// ============================================================================

/**
 * @route   POST /api/admin/doctors/:id/activate
 * @desc    Re-enable a previously deactivated doctor
 * @access  Private (admin)
 */
exports.activateDoctor = async (req, res) => {
  console.log('🔵 ========== ACTIVATE DOCTOR ==========');

  try {
    const { id } = req.params;

    const doctor = await Doctor.findById(id);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'الطبيب غير موجود'
      });
    }

    await Account.findOneAndUpdate(
      { personId: doctor.personId },
      {
        $set: { isActive: true },
        $unset: {
          deactivationReason: '',
          deactivatedAt: '',
          deactivatedBy: '',
          accountLockedUntil: '',
          failedLoginAttempts: ''
        }
      }
    );

    AuditLog.record({
      userId: req.user._id,
      userEmail: req.user.email,
      action: 'ACTIVATE_DOCTOR',
      description: `Reactivated doctor ${doctor.medicalLicenseNumber}`,
      resourceType: 'doctor',
      resourceId: doctor._id,
      ipAddress: req.ip || 'unknown',
      success: true
    });

    console.log('✅ Doctor reactivated');
    return res.json({
      success: true,
      message: 'تم تفعيل الطبيب بنجاح'
    });
  } catch (error) {
    console.error('❌ Activate doctor error:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في التفعيل'
    });
  }
};

// ============================================================================
// 8. GET ALL PATIENTS (adults + children)
// ============================================================================

/**
 * @route   GET /api/admin/patients
 * @desc    List all patients including children. Returns a unified shape
 *          regardless of whether the patient links via personId or childId.
 * @access  Private (admin)
 */
exports.getAllPatients = async (req, res) => {
  try {
    console.log('📥 getAllPatients called');

    const patients = await Patient.find().lean();
    console.log(`✅ Found ${patients.length} patient profiles`);

    if (patients.length === 0) {
      return res.json({ success: true, count: 0, patients: [] });
    }

    // Split into adult vs child for bulk loading
    const adultPersonIds = patients
      .filter(p => p.personId)
      .map(p => p.personId);
    const childChildIds = patients
      .filter(p => p.childId)
      .map(p => p.childId);

    // Bulk-load Persons, Children, and Accounts (5 queries → 3 queries)
    const [persons, children, accounts] = await Promise.all([
      Person.find({ _id: { $in: adultPersonIds } }).lean(),
      Children.find({ _id: { $in: childChildIds } }).lean(),
      Account.find({
        $or: [
          { personId: { $in: adultPersonIds } },
          { childId: { $in: childChildIds } }
        ]
      }).lean()
    ]);

    const personById = new Map(persons.map(p => [String(p._id), p]));
    const childById = new Map(children.map(c => [String(c._id), c]));
    const accountByPersonId = new Map();
    const accountByChildId = new Map();
    accounts.forEach(a => {
      if (a.personId) accountByPersonId.set(String(a.personId), a);
      if (a.childId) accountByChildId.set(String(a.childId), a);
    });

    const validPatients = patients
      .map(patient => {
        const isChild = !!patient.childId;
        const profile = isChild
          ? childById.get(String(patient.childId))
          : personById.get(String(patient.personId));

        if (!profile) {
          console.warn(`⚠️  Profile missing for patient ${patient._id}`);
          return null;
        }

        const account = isChild
          ? accountByChildId.get(String(patient.childId))
          : accountByPersonId.get(String(patient.personId));

        return {
          id: patient._id,
          isMinor: isChild,
          firstName: profile.firstName || '',
          fatherName: profile.fatherName || '',
          lastName: profile.lastName || '',
          motherName: profile.motherName || '',
          nationalId: profile.nationalId || null,
          childRegistrationNumber: profile.childRegistrationNumber || null,
          phoneNumber: profile.phoneNumber || '',
          email: account?.email || '',
          isActive: account?.isActive ?? true,
          gender: profile.gender || '',
          dateOfBirth: profile.dateOfBirth,
          governorate: profile.governorate || '',
          city: profile.city || '',
          bloodType: patient.bloodType || 'unknown',
          totalVisits: patient.totalVisits || 0,
          lastVisitDate: patient.lastVisitDate || null,
          lastLogin: account?.lastLogin || null,
          createdAt: patient.createdAt
        };
      })
      .filter(p => p !== null);

    console.log(`✅ Returning ${validPatients.length} valid patients`);
    return res.json({
      success: true,
      count: validPatients.length,
      patients: validPatients
    });

  } catch (error) {
    console.error('❌ Get patients error:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في جلب المرضى',
      error: error.message
    });
  }
};

// ============================================================================
// 9. GET PATIENT BY ID
// ============================================================================

/**
 * @route   GET /api/admin/patients/:id
 * @desc    Get a single patient (adult or child) full profile
 * @access  Private (admin)
 */
exports.getPatientById = async (req, res) => {
  try {
    const { id } = req.params;

    const patient = await Patient.findById(id);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'المريض غير موجود'
      });
    }

    const isChild = !!patient.childId;
    const profile = isChild
      ? await Children.findById(patient.childId).lean()
      : await Person.findById(patient.personId).lean();

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'بيانات المريض الشخصية غير موجودة'
      });
    }

    const account = isChild
      ? await Account.findOne({ childId: patient.childId })
      : await Account.findOne({ personId: patient.personId });

    // Visit count using whichever patient ref applies
    const visitCount = isChild
      ? await Visit.countDocuments({ patientChildId: patient.childId })
      : await Visit.countDocuments({ patientPersonId: patient.personId });

    return res.json({
      success: true,
      patient: {
        id: patient._id,
        isMinor: isChild,
        firstName: profile.firstName,
        fatherName: profile.fatherName,
        lastName: profile.lastName,
        motherName: profile.motherName,
        nationalId: profile.nationalId || null,
        childRegistrationNumber: profile.childRegistrationNumber || null,
        phoneNumber: profile.phoneNumber,
        gender: profile.gender,
        dateOfBirth: profile.dateOfBirth,
        address: profile.address,
        governorate: profile.governorate,
        city: profile.city,
        email: account?.email,
        isActive: account?.isActive,
        bloodType: patient.bloodType,
        height: patient.height,
        weight: patient.weight,
        bmi: patient.bmi,
        allergies: patient.allergies || [],
        chronicDiseases: patient.chronicDiseases || [],
        familyHistory: patient.familyHistory || [],
        smokingStatus: patient.smokingStatus,
        emergencyContact: patient.emergencyContact,
        visitCount,
        totalVisits: patient.totalVisits || 0,
        lastVisitDate: patient.lastVisitDate,
        createdAt: patient.createdAt
      }
    });
  } catch (error) {
    console.error('Get patient error:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في جلب بيانات المريض'
    });
  }
};

// ============================================================================
// 10. UPDATE PATIENT
// ============================================================================

/**
 * @route   PUT /api/admin/patients/:id
 * @desc    Update patient medical fields and underlying profile fields
 * @access  Private (admin)
 */
exports.updatePatient = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const patient = await Patient.findById(id);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'المريض غير موجود'
      });
    }

    // Update Patient fields
    const patientFields = [
      'bloodType', 'rhFactor', 'height', 'weight',
      'smokingStatus', 'allergies', 'chronicDiseases',
      'familyHistory', 'emergencyContact'
    ];
    patientFields.forEach(field => {
      if (updates[field] !== undefined) patient[field] = updates[field];
    });
    await patient.save();

    // Update underlying Person/Children fields if provided
    const profileFields = ['phoneNumber', 'address', 'governorate', 'city'];
    const profileUpdates = {};
    profileFields.forEach(field => {
      if (updates[field]) profileUpdates[field] = updates[field];
    });

    if (Object.keys(profileUpdates).length > 0) {
      const Model = patient.childId ? Children : Person;
      const profileId = patient.childId || patient.personId;
      await Model.findByIdAndUpdate(profileId, profileUpdates);
    }

    return res.json({
      success: true,
      message: 'تم تحديث بيانات المريض بنجاح'
    });
  } catch (error) {
    console.error('Update patient error:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في تحديث بيانات المريض'
    });
  }
};

// ============================================================================
// 11. DEACTIVATE PATIENT
// ============================================================================

/**
 * @route   POST /api/admin/patients/:id/deactivate
 * @desc    Soft-disable patient's Account
 * @access  Private (admin)
 */
exports.deactivatePatient = async (req, res) => {
  console.log('🔵 ========== DEACTIVATE PATIENT ==========');

  try {
    const { id } = req.params;
    const { reason, notes } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'سبب إلغاء التفعيل مطلوب'
      });
    }

    if (!ALLOWED_DEACTIVATION_REASONS.includes(reason)) {
      return res.status(400).json({
        success: false,
        message: `سبب إلغاء التفعيل غير صالح. القيم المسموحة: ${ALLOWED_DEACTIVATION_REASONS.join(', ')}`
      });
    }

    const patient = await Patient.findById(id);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'المريض غير موجود'
      });
    }

    // Find account by personId OR childId
    const accountQuery = patient.childId
      ? { childId: patient.childId }
      : { personId: patient.personId };

    await Account.findOneAndUpdate(
      accountQuery,
      {
        isActive: false,
        deactivationReason: reason,
        deactivatedAt: new Date(),
        deactivatedBy: req.user._id
      }
    );

    AuditLog.record({
      userId: req.user._id,
      userEmail: req.user.email,
      action: 'DEACTIVATE_PATIENT',
      description: `Deactivated patient ${patient._id}`,
      resourceType: 'patient',
      resourceId: patient._id,
      patientPersonId: patient.personId,
      patientChildId: patient.childId,
      ipAddress: req.ip || 'unknown',
      success: true,
      metadata: { reason, notes: notes || null }
    });

    console.log('✅ Patient deactivated');
    return res.json({
      success: true,
      message: 'تم إلغاء تفعيل المريض بنجاح'
    });
  } catch (error) {
    console.error('❌ Deactivate patient error:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في إلغاء التفعيل'
    });
  }
};

// ============================================================================
// 12. ACTIVATE PATIENT
// ============================================================================

/**
 * @route   POST /api/admin/patients/:id/activate
 * @desc    Re-enable a previously deactivated patient
 * @access  Private (admin)
 */
exports.activatePatient = async (req, res) => {
  console.log('🔵 ========== ACTIVATE PATIENT ==========');

  try {
    const { id } = req.params;

    const patient = await Patient.findById(id);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'المريض غير موجود'
      });
    }

    const accountQuery = patient.childId
      ? { childId: patient.childId }
      : { personId: patient.personId };

    await Account.findOneAndUpdate(
      accountQuery,
      {
        $set: { isActive: true },
        $unset: {
          deactivationReason: '',
          deactivatedAt: '',
          deactivatedBy: '',
          accountLockedUntil: '',
          failedLoginAttempts: ''
        }
      }
    );

    AuditLog.record({
      userId: req.user._id,
      userEmail: req.user.email,
      action: 'ACTIVATE_PATIENT',
      description: `Reactivated patient ${patient._id}`,
      resourceType: 'patient',
      resourceId: patient._id,
      patientPersonId: patient.personId,
      patientChildId: patient.childId,
      ipAddress: req.ip || 'unknown',
      success: true
    });

    console.log('✅ Patient reactivated');
    return res.json({
      success: true,
      message: 'تم تفعيل المريض بنجاح'
    });
  } catch (error) {
    console.error('❌ Activate patient error:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في التفعيل'
    });
  }
};

// ============================================================================
// 13. AUDIT LOGS
// ============================================================================

/**
 * @route   GET /api/admin/audit-logs
 * @desc    Browse audit logs with filtering and pagination
 * @access  Private (admin)
 */
exports.getAuditLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50, action, startDate, endDate } = req.query;

    const query = {};
    if (action) query.action = action.toUpperCase();
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const safeLimit = Math.min(parseInt(limit, 10) || 50, 200);
    const safePage = Math.max(parseInt(page, 10) || 1, 1);

    const [logs, count] = await Promise.all([
      AuditLog.find(query)
        .populate('userId', 'email roles')
        .sort({ timestamp: -1 })
        .limit(safeLimit)
        .skip((safePage - 1) * safeLimit)
        .lean(),
      AuditLog.countDocuments(query)
    ]);

    return res.json({
      success: true,
      count,
      page: safePage,
      pages: Math.ceil(count / safeLimit),
      logs: logs.map(log => ({
        id: log._id,
        action: log.action,
        description: log.description,
        resourceType: log.resourceType,
        resourceId: log.resourceId,
        userEmail: log.userEmail || log.userId?.email,
        userRole: log.userRole,
        ipAddress: log.ipAddress,
        platform: log.platform,
        timestamp: log.timestamp,
        success: log.success,
        errorMessage: log.errorMessage
      }))
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في جلب سجلات التدقيق'
    });
  }
};

/**
 * @route   GET /api/admin/audit-logs/user/:userId
 * @desc    Audit logs for a specific user
 * @access  Private (admin)
 */
exports.getUserAuditLogs = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const safeLimit = Math.min(parseInt(limit, 10) || 50, 200);
    const safePage = Math.max(parseInt(page, 10) || 1, 1);

    const [logs, count] = await Promise.all([
      AuditLog.find({ userId })
        .sort({ timestamp: -1 })
        .limit(safeLimit)
        .skip((safePage - 1) * safeLimit)
        .lean(),
      AuditLog.countDocuments({ userId })
    ]);

    return res.json({
      success: true,
      count,
      page: safePage,
      pages: Math.ceil(count / safeLimit),
      logs
    });
  } catch (error) {
    console.error('Get user audit logs error:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في جلب سجلات المستخدم'
    });
  }
};

// ============================================================================
// 15. GET ALL DOCTOR REQUESTS
// ============================================================================

/**
 * @route   GET /api/admin/doctor-requests
 * @desc    List doctor registration requests
 * @access  Private (admin)
 */
exports.getAllDoctorRequests = async (req, res) => {
  try {
    console.log('📋 Fetching doctor requests...');
 
    // ── Build query ────────────────────────────────────────────────────────
    const { status } = req.query;
    const query = {};
    if (status) query.status = status;
 
    // ── Fetch with populated associations ─────────────────────────────────
    const requests = await DoctorRequest.find(query)
      .populate('reviewedBy', 'email')
      .populate('createdPersonId', 'firstName lastName')
      .sort({ createdAt: -1 })
      .lean();
 
    console.log(`✅ Found ${requests.length} requests`);
 
    // ── Flatten to the shape the frontend expects ─────────────────────────
    const flattened = requests.map((r) => ({
      // Identity
      _id: r._id,
      requestId: r.requestId,
 
      // Personal information (FLAT — do not wrap in personalInfo)
      firstName: r.firstName,
      fatherName: r.fatherName,
      lastName: r.lastName,
      motherName: r.motherName,
      nationalId: r.nationalId,
      dateOfBirth: r.dateOfBirth,
      gender: r.gender,
      phoneNumber: r.phoneNumber,
      address: r.address,
      governorate: r.governorate,
      city: r.city,
 
      // Account
      email: r.email,
 
      // Professional information
      medicalLicenseNumber: r.medicalLicenseNumber,
      specialization: r.specialization,
      subSpecialization: r.subSpecialization,
      yearsOfExperience: r.yearsOfExperience,
      hospitalAffiliation: r.hospitalAffiliation,
      availableDays: r.availableDays || [],
      consultationFee: r.consultationFee,
      currency: r.currency || 'SYP',
 
      // Uploaded document URLs — lifted to top-level *Url keys
      licenseDocumentUrl: r.licenseDocument?.fileUrl || null,
      medicalCertificateUrl: r.medicalCertificate?.fileUrl || null,
      profilePhotoUrl: r.profilePhoto?.fileUrl || null,
 
      // Review workflow
      status: r.status,
      rejectionReason: r.rejectionReason,
      rejectionDetails: r.rejectionDetails,
      adminNotes: r.adminNotes,
      reviewedBy: r.reviewedBy, // populated → { _id, email } or null
      reviewedAt: r.reviewedAt,
      createdPersonId: r.createdPersonId, // populated → { _id, firstName, lastName } or null
 
      // Timestamps
      createdAt: r.createdAt,
      updatedAt: r.updatedAt
    }));
 
    return res.json({
      success: true,
      count: flattened.length,
      requests: flattened
    });
  } catch (error) {
    console.error('❌ Error fetching doctor requests:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في جلب طلبات التسجيل'
    });
  }
};

// ============================================================================
// 16. GET DOCTOR REQUEST BY ID
// ============================================================================

/**
 * @route   GET /api/admin/doctor-requests/:id
 * @desc    Single doctor request detail
 * @access  Private (admin)
 */
exports.getDoctorRequestById = async (req, res) => {
  try {
    const { id } = req.params;

    const request = await DoctorRequest.findById(id)
      .populate('reviewedBy', 'email')
      .populate('createdPersonId', 'firstName lastName')
      .populate('createdAccountId', 'email')
      .populate('createdDoctorId')
      .lean();

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'طلب التسجيل غير موجود'
      });
    }

    return res.json({ success: true, request });
  } catch (error) {
    console.error('❌ Error fetching doctor request:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في جلب تفاصيل الطلب'
    });
  }
};

// ============================================================================
// 17. APPROVE DOCTOR REQUEST
// ============================================================================

/**
 * @route   POST /api/admin/doctor-requests/:id/approve
 * @desc    Approve request → create Person + Account + Doctor records
 * @access  Private (admin)
 */
exports.approveDoctorRequest = async (req, res) => {
  console.log('✅ ========== APPROVE DOCTOR REQUEST ==========');

  try {
    const { id } = req.params;
    const { adminNotes } = req.body;

    // Load request WITH plainPassword (select: false in schema)
    const request = await DoctorRequest.findById(id).select('+plainPassword +password');

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'طلب التسجيل غير موجود'
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `هذا الطلب ${request.status === 'approved' ? 'مقبول' : 'مرفوض'} مسبقاً`
      });
    }

    // ── Step 1: Create Person
    console.log('1️⃣ Creating Person...');
    const person = await Person.create({
      nationalId: request.nationalId,
      firstName: request.firstName,
      fatherName: request.fatherName,
      lastName: request.lastName,
      motherName: request.motherName,
      dateOfBirth: request.dateOfBirth,
      gender: request.gender,
      phoneNumber: request.phoneNumber,
      address: request.address,
      governorate: request.governorate,
      city: request.city
    });
    console.log('✅ Person created:', person._id);

    // ── Step 2: Create Account
    // Use the bcrypt hash from the request directly (already hashed at signup)
    // Note: Account pre-save hook detects existing bcrypt hashes and skips re-hashing.
    console.log('2️⃣ Creating Account...');
    const emailToUse = request.email.trim().toLowerCase();

    // Defensive duplicate check (rare race condition)
    const existingAccount = await Account.findOne({ email: emailToUse });
    if (existingAccount) {
      console.error('❌ Email already taken:', emailToUse);
      // Roll back Person creation
      await Person.findByIdAndDelete(person._id);
      return res.status(400).json({
        success: false,
        message: `البريد الإلكتروني ${emailToUse} موجود مسبقاً في النظام`
      });
    }

    const account = await Account.create({
      email: emailToUse,
      password: request.password,    // already bcrypt-hashed
      roles: ['doctor'],
      personId: person._id,
      isActive: true
    });
    console.log('✅ Account created:', account._id);

    // ── Step 3: Create Doctor (NO availableTimes — that field is gone)
    console.log('3️⃣ Creating Doctor...');
    const doctor = await Doctor.create({
      personId: person._id,
      medicalLicenseNumber: request.medicalLicenseNumber,
      specialization: request.specialization,
      subSpecialization: request.subSpecialization,
      yearsOfExperience: request.yearsOfExperience,
      hospitalAffiliation: request.hospitalAffiliation,
      availableDays: request.availableDays,
      consultationFee: request.consultationFee,
      currency: request.currency || 'SYP'
    });
    console.log('✅ Doctor created:', doctor._id);

    // ── Step 4: Mark request approved using the model method
    await request.markApproved(
      req.user._id,
      {
        personId: person._id,
        accountId: account._id,
        doctorId: doctor._id
      },
      adminNotes
    );
    console.log('✅ Request marked approved');

    // ── Audit log
    AuditLog.record({
      userId: req.user._id,
      userEmail: req.user.email,
      action: 'APPROVE_DOCTOR_REQUEST',
      description: `Approved doctor request for ${emailToUse}`,
      resourceType: 'doctor_request',
      resourceId: request._id,
      ipAddress: req.ip || 'unknown',
      success: true,
      metadata: {
        doctorId: doctor._id,
        medicalLicenseNumber: doctor.medicalLicenseNumber
      }
    });

    return res.json({
      success: true,
      message: 'تم قبول طلب التسجيل وإنشاء حساب الطبيب بنجاح',
      data: {
        doctorId: doctor._id,
        personId: person._id,
        accountId: account._id,
        email: emailToUse,
        password: request.plainPassword,    // shown to admin once
        doctorName: `${person.firstName} ${person.lastName}`,
        medicalLicenseNumber: doctor.medicalLicenseNumber,
        specialization: doctor.specialization
      }
    });

  } catch (error) {
    console.error('❌ Error approving doctor request:', error);

    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      const arabicFields = {
        nationalId: 'الرقم الوطني',
        email: 'البريد الإلكتروني',
        medicalLicenseNumber: 'رقم الترخيص الطبي'
      };
      return res.status(400).json({
        success: false,
        message: `${arabicFields[field] || field} موجود مسبقاً في النظام`
      });
    }

    return res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء قبول الطلب: ' + error.message
    });
  }
};

// ============================================================================
// 18. REJECT DOCTOR REQUEST
// ============================================================================

/**
 * @route   POST /api/admin/doctor-requests/:id/reject
 * @desc    Reject doctor request with reason
 * @access  Private (admin)
 */
exports.rejectDoctorRequest = async (req, res) => {
  console.log('❌ ========== REJECT DOCTOR REQUEST ==========');

  try {
    const { id } = req.params;
    const { rejectionReason, rejectionDetails } = req.body;

    if (!rejectionReason) {
      return res.status(400).json({
        success: false,
        message: 'سبب الرفض مطلوب'
      });
    }

    const request = await DoctorRequest.findById(id);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'طلب التسجيل غير موجود'
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `هذا الطلب ${request.status === 'approved' ? 'مقبول' : 'مرفوض'} مسبقاً`
      });
    }

    // Use the model method (validates reason against enum)
    try {
      await request.markRejected(req.user._id, rejectionReason, rejectionDetails);
    } catch (modelError) {
      return res.status(400).json({
        success: false,
        message: modelError.message
      });
    }

    AuditLog.record({
      userId: req.user._id,
      userEmail: req.user.email,
      action: 'REJECT_DOCTOR_REQUEST',
      description: `Rejected doctor request for ${request.email}`,
      resourceType: 'doctor_request',
      resourceId: request._id,
      ipAddress: req.ip || 'unknown',
      success: true,
      metadata: { rejectionReason, rejectionDetails }
    });

    console.log('✅ Request rejected');
    return res.json({
      success: true,
      message: 'تم رفض طلب التسجيل',
      data: {
        requestId: request._id,
        doctorName: `${request.firstName} ${request.lastName}`,
        email: request.email,
        rejectionReason: request.rejectionReason,
        rejectionDetails: request.rejectionDetails,
        reviewedAt: request.reviewedAt
      }
    });

  } catch (error) {
    console.error('❌ Error rejecting doctor request:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء رفض الطلب'
    });
  }
};