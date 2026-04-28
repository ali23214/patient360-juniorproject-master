/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  Admin Controller — Patient 360°
 *  ─────────────────────────────────────────────────────────────────────────
 *  Admin-only endpoints mounted under /api/admin.
 *
 *  Functions:
 *    1.  getStatistics              — Dashboard KPIs
 *    2.  getAllDoctors              — List all doctors with details
 *    3.  getDoctorById              — Single doctor lookup
 *    4.  createDoctor               — Admin creates doctor directly
 *    5.  updateDoctor               — Update doctor fields
 *    6.  deactivateDoctor           — Soft-disable doctor account
 *    7.  activateDoctor             — Re-enable deactivated doctor
 *    8.  getAllPatients             — List patients (adults AND children)
 *    9.  getPatientById             — Single patient lookup
 *   10.  updatePatient              — Update patient fields
 *   11.  deactivatePatient          — Soft-disable patient account
 *   12.  activatePatient            — Re-enable deactivated patient
 *   13.  getAuditLogs               — Browse audit logs with pagination
 *   14.  getUserAuditLogs           — Audit logs for one specific user
 *   15.  getAllDoctorRequests       — List doctor registration requests
 *   16.  getDoctorRequestById       — Single doctor request detail
 *   17.  approveDoctorRequest       — Approve + create Person+Account+Professional
 *   18.  rejectDoctorRequest        — Reject with reason
 *
 *  Conventions:
 *    - Arabic error messages, emoji-marked console logs
 *    - { success, message, [data] } response shape
 *    - Try/catch in every async function
 *    - Uses req.user._id (auth middleware aliases this to req.account)
 *
 *  ───────────────────────────────────────────────────────────────────────
 *  v2 CHANGES (this file) — approveDoctorRequest rewritten:
 *   • Handles newLaboratoryData / newPharmacyData (creates Laboratory/Pharmacy
 *     on-the-fly if request.laboratoryId / pharmacyId is absent).
 *   • Manual rollback across all create steps (no MongoDB transactions — the
 *     local deployment is a standalone mongod, not a replica set).
 *   • All prior functions are preserved byte-for-byte — only approve changed.
 *  ═══════════════════════════════════════════════════════════════════════════
 */

const {
  Account, Person, Children, Patient, Doctor, Pharmacist, LabTechnician,
  Pharmacy, Laboratory,
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

exports.getAllDoctors = async (req, res) => {
  try {
    console.log('📥 getAllDoctors called');

    const doctors = await Doctor.find().lean();
    console.log(`✅ Found ${doctors.length} doctors`);

    if (doctors.length === 0) {
      return res.json({ success: true, count: 0, doctors: [] });
    }

    const personIds = doctors.map(d => d.personId);
    const [persons, accounts] = await Promise.all([
      Person.find({ _id: { $in: personIds } }).lean(),
      Account.find({ personId: { $in: personIds } }).lean()
    ]);

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

    console.log('2️⃣ Creating Account...');
    const newAccount = await Account.create({
      email: account.email.toLowerCase().trim(),
      password: account.password,
      personId: newPerson._id,
      roles: ['doctor'],
      isActive: true
    });
    console.log('✅ Account created:', newAccount._id);

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

exports.getAllPatients = async (req, res) => {
  try {
    console.log('📥 getAllPatients called');

    const patients = await Patient.find().lean();
    console.log(`✅ Found ${patients.length} patient profiles`);

    if (patients.length === 0) {
      return res.json({ success: true, count: 0, patients: [] });
    }

    const adultPersonIds = patients
      .filter(p => p.personId)
      .map(p => p.personId);
    const childChildIds = patients
      .filter(p => p.childId)
      .map(p => p.childId);

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

    const patientFields = [
      'bloodType', 'rhFactor', 'height', 'weight',
      'smokingStatus', 'allergies', 'chronicDiseases',
      'familyHistory', 'emergencyContact'
    ];
    patientFields.forEach(field => {
      if (updates[field] !== undefined) patient[field] = updates[field];
    });
    await patient.save();

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

// ============================================================================
// 14. GET USER AUDIT LOGS
// ============================================================================

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

exports.getAllDoctorRequests = async (req, res) => {
  try {
    console.log('📋 Fetching doctor requests...');

    const { status } = req.query;
    const query = {};
    if (status) query.status = status;

    const requests = await DoctorRequest.find(query)
      .populate('reviewedBy', 'email')
      .populate('createdPersonId', 'firstName lastName')
      .sort({ createdAt: -1 })
      .lean();

    console.log(`✅ Found ${requests.length} requests`);

    // Flatten to the shape AdminDashboard.jsx expects. Professional-specific
    // fields (pharmacist/lab tech) are included alongside doctor fields so
    // the UI can read what it needs based on requestType.
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

      // Doctor-specific fields (only set when requestType='doctor')
      medicalLicenseNumber: r.medicalLicenseNumber,
      specialization: r.specialization,
      subSpecialization: r.subSpecialization,
      yearsOfExperience: r.yearsOfExperience,
      hospitalAffiliation: r.hospitalAffiliation,
      availableDays: r.availableDays || [],
      consultationFee: r.consultationFee,
      currency: r.currency || 'SYP',

      // Pharmacist-specific fields
      pharmacyLicenseNumber: r.pharmacyLicenseNumber,
      degree: r.degree,
      employmentType: r.employmentType,
      pharmacyId: r.pharmacyId,
      newPharmacyData: r.newPharmacyData,

      // Lab technician-specific fields
      licenseNumber: r.licenseNumber,
      position: r.position,
      laboratoryId: r.laboratoryId,
      newLaboratoryData: r.newLaboratoryData,

      // Uploaded document URLs — lifted to top-level *Url keys
      licenseDocumentUrl: r.licenseDocument?.fileUrl || r.licenseDocumentUrl || null,
      medicalCertificateUrl: r.medicalCertificate?.fileUrl || null,
      degreeDocumentUrl: r.degreeDocument?.fileUrl || r.degreeDocumentUrl || null,
      profilePhotoUrl: r.profilePhoto?.fileUrl || null,

      // Review workflow
      status: r.status,
      requestType: r.requestType || 'doctor',
      rejectionReason: r.rejectionReason,
      rejectionDetails: r.rejectionDetails,
      adminNotes: r.adminNotes,
      reviewedBy: r.reviewedBy,
      reviewedAt: r.reviewedAt,
      createdPersonId: r.createdPersonId,

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
// 17. APPROVE PROFESSIONAL REQUEST (doctor / pharmacist / lab_technician)
// ──────────────────────────────────────────────────────────────────────────
// ⚠️  This function was completely rewritten in v2 to:
//
//   1. Handle BOTH scenarios for pharmacist / lab_technician:
//        (a) Applicant selected an existing facility  → request.pharmacyId
//            / request.laboratoryId is already set    → use directly
//        (b) Applicant reported a new facility        → request.newPharmacyData
//            / request.newLaboratoryData is set       → CREATE the facility
//            on the fly, then use the new _id
//
//   2. Manual rollback across ALL create steps.
//      MongoDB transactions are NOT used because this deployment is a
//      standalone mongod (confirmed via `rs.status()` → NoReplicationEnabled).
//      If step N fails, we delete everything created in steps 1..N-1, in
//      REVERSE order, so the DB remains clean. Orphan records are never
//      left behind.
//
//   3. Reject the request (with NO partial data created) if the applicant
//      did NOT supply facility info AND no new facility data is present.
//      For pharmacist → pharmacyId or newPharmacyData required.
//      For lab tech   → laboratoryId or newLaboratoryData required.
//
// ============================================================================

/**
 * Helper: build Laboratory payload from newLaboratoryData in a DoctorRequest.
 * The request carries a loosely-typed Mixed object; here we validate the
 * required schema fields and normalise into the strict Laboratory shape.
 *
 * Throws a user-facing Arabic error on missing required fields.
 */
function buildLaboratoryPayload(newData, applicant) {
  if (!newData || typeof newData !== 'object') {
    throw new Error('بيانات المختبر الجديد غير صالحة');
  }

  const name = (newData.name || '').trim();
  const license = (newData.license || newData.registrationNumber || '').trim();
  const governorate = newData.governorate;
  const city = (newData.city || '').trim();
  const address = (newData.address || '').trim();

  if (!name) throw new Error('اسم المختبر الجديد مطلوب');
  if (!license) throw new Error('رقم ترخيص المختبر الجديد مطلوب');
  if (!governorate) throw new Error('محافظة المختبر الجديد مطلوبة');
  if (!city) throw new Error('مدينة المختبر الجديد مطلوبة');
  if (!address) throw new Error('عنوان المختبر الجديد مطلوب');

  // Placeholder GeoJSON at the center of the chosen governorate — Laboratory
  // schema validator requires coordinates within Syria. Admin can refine
  // the exact coordinates later via the Laboratories admin panel.
  const GOVERNORATE_CENTROIDS = {
    damascus:     [36.2765, 33.5138],
    rif_dimashq:  [36.3090, 33.5238],
    aleppo:       [37.1613, 36.2021],
    homs:         [36.7156, 34.7324],
    hama:         [36.7443, 35.1318],
    latakia:      [35.7833, 35.5167],
    tartus:       [35.8867, 34.8890],
    idlib:        [36.6335, 35.9306],
    deir_ez_zor:  [40.1500, 35.3333],
    raqqa:        [39.0167, 35.9500],
    hasakah:      [40.7417, 36.4833],
    daraa:        [36.1062, 32.6189],
    as_suwayda:   [36.5697, 32.7095],
    quneitra:     [35.8242, 33.1258]
  };
  const coords = GOVERNORATE_CENTROIDS[governorate] || [36.2765, 33.5138];

  return {
    name,
    arabicName: name,
    registrationNumber: license.toUpperCase(),
    labLicense: license.toUpperCase(),
    labType: 'independent',
    phoneNumber: applicant.phoneNumber || '0000000000',
    governorate,
    city,
    address,
    location: {
      type: 'Point',
      coordinates: coords
    },
    isActive: true,
    isAcceptingTests: true
  };
}

/**
 * Helper: build Pharmacy payload from newPharmacyData in a DoctorRequest.
 */
function buildPharmacyPayload(newData, applicant) {
  if (!newData || typeof newData !== 'object') {
    throw new Error('بيانات الصيدلية الجديدة غير صالحة');
  }

  const name = (newData.name || '').trim();
  const license = (newData.license || newData.pharmacyLicense || '').trim();
  const governorate = newData.governorate;
  const city = (newData.city || '').trim();
  const address = (newData.address || '').trim();

  if (!name) throw new Error('اسم الصيدلية الجديدة مطلوب');
  if (!license) throw new Error('رقم ترخيص الصيدلية الجديدة مطلوب');
  if (!governorate) throw new Error('محافظة الصيدلية الجديدة مطلوبة');
  if (!city) throw new Error('مدينة الصيدلية الجديدة مطلوبة');
  if (!address) throw new Error('عنوان الصيدلية الجديدة مطلوب');

  const GOVERNORATE_CENTROIDS = {
    damascus:     [36.2765, 33.5138],
    rif_dimashq:  [36.3090, 33.5238],
    aleppo:       [37.1613, 36.2021],
    homs:         [36.7156, 34.7324],
    hama:         [36.7443, 35.1318],
    latakia:      [35.7833, 35.5167],
    tartus:       [35.8867, 34.8890],
    idlib:        [36.6335, 35.9306],
    deir_ez_zor:  [40.1500, 35.3333],
    raqqa:        [39.0167, 35.9500],
    hasakah:      [40.7417, 36.4833],
    daraa:        [36.1062, 32.6189],
    as_suwayda:   [36.5697, 32.7095],
    quneitra:     [35.8242, 33.1258]
  };
  const coords = GOVERNORATE_CENTROIDS[governorate] || [36.2765, 33.5138];

  // Pharmacy schema requires BOTH registrationNumber and pharmacyLicense
  // (two separate unique indexes). The applicant provides one value, so
  // we reuse it for both — if this collides later, the admin can edit it.
  return {
    name,
    arabicName: name,
    registrationNumber: license.toUpperCase(),
    pharmacyLicense: license.toUpperCase(),
    pharmacyType: 'community',
    phoneNumber: applicant.phoneNumber || '0000000000',
    governorate,
    city,
    address,
    location: {
      type: 'Point',
      coordinates: coords
    },
    isActive: true,
    isAcceptingOrders: true
  };
}

exports.approveDoctorRequest = async (req, res) => {
  console.log('✅ ========== APPROVE PROFESSIONAL REQUEST ==========');

  // ── Rollback bookkeeping ──────────────────────────────────────────────
  // We track every document we create so we can delete them in reverse
  // order if any step fails. This is a manual substitute for a Mongoose
  // transaction (this deployment is a standalone mongod, no replica set).
  const createdIds = {
    laboratoryId: null,
    pharmacyId: null,
    personId: null,
    accountId: null,
    professionalId: null
  };

  const rollback = async (reason) => {
    console.error(`🔄 Rolling back because: ${reason}`);
    try {
      if (createdIds.professionalId) {
        // We don't know the professional model at rollback time if the
        // error was very early — safest to try all three but log outcomes.
        await Promise.all([
          Doctor.deleteOne({ _id: createdIds.professionalId }).catch(() => null),
          Pharmacist.deleteOne({ _id: createdIds.professionalId }).catch(() => null),
          LabTechnician.deleteOne({ _id: createdIds.professionalId }).catch(() => null)
        ]);
      }
      if (createdIds.accountId) {
        await Account.deleteOne({ _id: createdIds.accountId }).catch(() => null);
      }
      if (createdIds.personId) {
        await Person.deleteOne({ _id: createdIds.personId }).catch(() => null);
      }
      if (createdIds.laboratoryId) {
        await Laboratory.deleteOne({ _id: createdIds.laboratoryId }).catch(() => null);
      }
      if (createdIds.pharmacyId) {
        await Pharmacy.deleteOne({ _id: createdIds.pharmacyId }).catch(() => null);
      }
      console.log('🔄 Rollback complete');
    } catch (rollbackErr) {
      console.error('⚠️  Rollback itself errored (non-fatal):', rollbackErr.message);
    }
  };

  try {
    const { id } = req.params;
    const { adminNotes } = req.body;

    // ── Load the request WITH plainPassword & password (select:false in schema)
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

    const requestType = request.requestType || 'doctor';
    console.log(`📋 Request type: ${requestType}`);
    console.log(`📋 Applicant: ${request.firstName} ${request.lastName} (${request.email})`);

    // ══════════════════════════════════════════════════════════════════
    // PRE-FLIGHT CHECKS — validate facility info BEFORE creating anything
    // ══════════════════════════════════════════════════════════════════

    if (requestType === 'pharmacist') {
      const hasExisting = !!request.pharmacyId;
      const hasNew = !!(request.newPharmacyData && Object.keys(request.newPharmacyData).length > 0);
      if (!hasExisting && !hasNew) {
        return res.status(400).json({
          success: false,
          message: 'لا يمكن قبول الطلب: لم يحدد المتقدم صيدلية موجودة ولم يقدم بيانات صيدلية جديدة'
        });
      }
      if (hasExisting) {
        const pharmExists = await Pharmacy.findById(request.pharmacyId);
        if (!pharmExists) {
          return res.status(400).json({
            success: false,
            message: 'الصيدلية المحددة في الطلب غير موجودة في النظام (ربما حُذفت). يرجى مراجعة الطلب.'
          });
        }
      }
    }

    if (requestType === 'lab_technician') {
      const hasExisting = !!request.laboratoryId;
      const hasNew = !!(request.newLaboratoryData && Object.keys(request.newLaboratoryData).length > 0);
      if (!hasExisting && !hasNew) {
        return res.status(400).json({
          success: false,
          message: 'لا يمكن قبول الطلب: لم يحدد المتقدم مختبراً موجوداً ولم يقدم بيانات مختبر جديد'
        });
      }
      if (hasExisting) {
        const labExists = await Laboratory.findById(request.laboratoryId);
        if (!labExists) {
          return res.status(400).json({
            success: false,
            message: 'المختبر المحدد في الطلب غير موجود في النظام (ربما حُذف). يرجى مراجعة الطلب.'
          });
        }
      }
    }

    // ══════════════════════════════════════════════════════════════════
    // STEP 0 — (if needed) CREATE NEW FACILITY FIRST
    // We do this BEFORE Person/Account so the facility has a stable _id
    // for the LabTechnician/Pharmacist creation downstream.
    // ══════════════════════════════════════════════════════════════════

    let resolvedFacilityId = null;

    if (requestType === 'lab_technician') {
      if (request.laboratoryId) {
        resolvedFacilityId = request.laboratoryId;
        console.log(`🏢 Using existing laboratory: ${resolvedFacilityId}`);
      } else {
        console.log('🏢 Creating new Laboratory from newLaboratoryData...');
        try {
          const labPayload = buildLaboratoryPayload(request.newLaboratoryData, {
            phoneNumber: request.phoneNumber
          });
          const newLab = await Laboratory.create(labPayload);
          createdIds.laboratoryId = newLab._id;
          resolvedFacilityId = newLab._id;
          console.log(`✅ New Laboratory created: ${newLab._id} (${newLab.name})`);
        } catch (labErr) {
          console.error('❌ Laboratory creation failed:', labErr.message);
          await rollback('Laboratory.create failed');
          // Handle duplicate registrationNumber specifically
          if (labErr.code === 11000) {
            return res.status(400).json({
              success: false,
              message: 'رقم ترخيص المختبر الجديد مستخدم بالفعل. يرجى مراجعة البيانات.'
            });
          }
          return res.status(400).json({
            success: false,
            message: 'فشل إنشاء المختبر الجديد: ' + labErr.message
          });
        }
      }
    }

    if (requestType === 'pharmacist') {
      if (request.pharmacyId) {
        resolvedFacilityId = request.pharmacyId;
        console.log(`🏢 Using existing pharmacy: ${resolvedFacilityId}`);
      } else {
        console.log('🏢 Creating new Pharmacy from newPharmacyData...');
        try {
          const pharmPayload = buildPharmacyPayload(request.newPharmacyData, {
            phoneNumber: request.phoneNumber
          });
          const newPharm = await Pharmacy.create(pharmPayload);
          createdIds.pharmacyId = newPharm._id;
          resolvedFacilityId = newPharm._id;
          console.log(`✅ New Pharmacy created: ${newPharm._id} (${newPharm.name})`);
        } catch (pharmErr) {
          console.error('❌ Pharmacy creation failed:', pharmErr.message);
          await rollback('Pharmacy.create failed');
          if (pharmErr.code === 11000) {
            return res.status(400).json({
              success: false,
              message: 'رقم ترخيص الصيدلية الجديدة مستخدم بالفعل. يرجى مراجعة البيانات.'
            });
          }
          return res.status(400).json({
            success: false,
            message: 'فشل إنشاء الصيدلية الجديدة: ' + pharmErr.message
          });
        }
      }
    }

    // ══════════════════════════════════════════════════════════════════
    // STEP 1 — CREATE PERSON (shared across all types)
    // ══════════════════════════════════════════════════════════════════

    console.log('1️⃣ Creating Person...');
    let person;
    try {
      person = await Person.create({
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
      createdIds.personId = person._id;
      console.log(`✅ Person created: ${person._id}`);
    } catch (personErr) {
      console.error('❌ Person creation failed:', personErr.message);
      await rollback('Person.create failed');
      if (personErr.code === 11000) {
        return res.status(400).json({
          success: false,
          message: 'الرقم الوطني موجود مسبقاً في النظام'
        });
      }
      throw personErr;
    }

    // ══════════════════════════════════════════════════════════════════
    // STEP 2 — CREATE ACCOUNT (check email uniqueness first)
    // ══════════════════════════════════════════════════════════════════

    console.log('2️⃣ Creating Account...');
    const emailToUse = request.email.trim().toLowerCase();

    const existingAccount = await Account.findOne({ email: emailToUse });
    if (existingAccount) {
      console.error(`❌ Email already taken: ${emailToUse}`);
      await rollback('Account email collision');
      return res.status(400).json({
        success: false,
        message: `البريد الإلكتروني ${emailToUse} موجود مسبقاً في النظام`
      });
    }

    const roleMap = {
      doctor: 'doctor',
      pharmacist: 'pharmacist',
      lab_technician: 'lab_technician'
    };

    let account;
    try {
      account = await Account.create({
        email: emailToUse,
        password: request.password,   // already bcrypt-hashed by authController at signup
        roles: [roleMap[requestType] || 'doctor'],
        personId: person._id,
        isActive: true
      });
      createdIds.accountId = account._id;
      console.log(`✅ Account created: ${account._id} (role: ${account.roles[0]})`);
    } catch (accountErr) {
      console.error('❌ Account creation failed:', accountErr.message);
      await rollback('Account.create failed');
      throw accountErr;
    }

    // ══════════════════════════════════════════════════════════════════
    // STEP 3 — CREATE PROFESSIONAL RECORD (branches by requestType)
    // ══════════════════════════════════════════════════════════════════

    let professionalRecord;

    try {
      if (requestType === 'doctor') {
        console.log('3️⃣ Creating Doctor...');
        professionalRecord = await Doctor.create({
          personId: person._id,
          medicalLicenseNumber: request.medicalLicenseNumber,
          specialization: request.specialization,
          ...(request.subSpecialization && request.subSpecialization.trim()
            ? { subSpecialization: request.subSpecialization }
            : {}),
          yearsOfExperience: request.yearsOfExperience,
          hospitalAffiliation: request.hospitalAffiliation,
          availableDays: request.availableDays || [],
          consultationFee: request.consultationFee,
          currency: request.currency || 'SYP'
        });
        createdIds.professionalId = professionalRecord._id;
        console.log(`✅ Doctor created: ${professionalRecord._id}`);

      } else if (requestType === 'pharmacist') {
        console.log('3️⃣ Creating Pharmacist...');
        professionalRecord = await Pharmacist.create({
          personId: person._id,
          pharmacyLicenseNumber: request.pharmacyLicenseNumber,
          pharmacyId: resolvedFacilityId,  // ⭐ resolved above (existing or newly created)
          ...(request.degree && { degree: request.degree }),
          ...(request.specialization && { specialization: request.specialization }),
          yearsOfExperience: request.yearsOfExperience || 0,
          ...(request.employmentType && { employmentType: request.employmentType }),
          isAvailable: true,
          totalPrescriptionsDispensed: 0
        });
        createdIds.professionalId = professionalRecord._id;
        console.log(`✅ Pharmacist created: ${professionalRecord._id}`);

      } else if (requestType === 'lab_technician') {
        console.log('3️⃣ Creating LabTechnician...');
        professionalRecord = await LabTechnician.create({
          personId: person._id,
          licenseNumber: request.licenseNumber,
          laboratoryId: resolvedFacilityId,  // ⭐ resolved above (existing or newly created)
          ...(request.degree && { degree: request.degree }),
          ...(request.specialization && { specialization: request.specialization }),
          ...(request.position && { position: request.position }),
          yearsOfExperience: request.yearsOfExperience || 0,
          isAvailable: true,
          totalTestsPerformed: 0
        });
        createdIds.professionalId = professionalRecord._id;
        console.log(`✅ LabTechnician created: ${professionalRecord._id}`);

      } else {
        throw new Error(`Unknown requestType: ${requestType}`);
      }

    } catch (profErr) {
      console.error('❌ Professional record creation failed:', profErr.message);
      await rollback('Professional.create failed');

      if (profErr.code === 11000) {
        const field = Object.keys(profErr.keyPattern || {})[0];
        const arabicFields = {
          medicalLicenseNumber: 'رقم الترخيص الطبي',
          pharmacyLicenseNumber: 'رقم ترخيص الصيدلية',
          licenseNumber: 'رقم الترخيص المهني',
          personId: 'الشخص'
        };
        return res.status(400).json({
          success: false,
          message: `${arabicFields[field] || field} موجود مسبقاً في النظام`
        });
      }

      if (profErr.name === 'ValidationError') {
        const messages = Object.values(profErr.errors).map(e => e.message);
        return res.status(400).json({
          success: false,
          message: `فشل التحقق من البيانات: ${messages.join(', ')}`
        });
      }

      return res.status(500).json({
        success: false,
        message: 'فشل إنشاء السجل المهني: ' + profErr.message
      });
    }

    // ══════════════════════════════════════════════════════════════════
    // STEP 4 — MARK REQUEST APPROVED (final success step)
    // ══════════════════════════════════════════════════════════════════

    try {
      await request.markApproved(
        req.user._id,
        {
          personId: person._id,
          accountId: account._id,
          doctorId: professionalRecord._id
        },
        adminNotes
      );
      console.log('✅ Request marked approved');
    } catch (markErr) {
      // At this point all creates succeeded — if markApproved fails we still
      // consider the approval successful and log the status discrepancy, because
      // rolling back 4 successful creates over a status bookkeeping error would
      // be worse than leaving the request in 'pending' (the admin can retry).
      console.error('⚠️  markApproved failed but all records created. Manual fix needed:', markErr.message);
    }

    // ── Audit log (fire-and-forget)
    AuditLog.record({
      userId: req.user._id,
      userEmail: req.user.email,
      action: `APPROVE_${requestType.toUpperCase()}_REQUEST`,
      description: `Approved ${requestType} request for ${emailToUse}`,
      resourceType: 'doctor_request',
      resourceId: request._id,
      ipAddress: req.ip || 'unknown',
      success: true,
      metadata: {
        professionalId: professionalRecord._id,
        professionalType: requestType,
        facilityId: resolvedFacilityId || null,
        facilityCreated: !!(createdIds.laboratoryId || createdIds.pharmacyId)
      }
    });

    const typeLabels = {
      doctor: 'الطبيب',
      pharmacist: 'الصيدلي',
      lab_technician: 'فني المختبر'
    };

    return res.json({
      success: true,
      message: `تم قبول طلب التسجيل وإنشاء حساب ${typeLabels[requestType]} بنجاح`,
      data: {
        professionalId: professionalRecord._id,
        professionalType: requestType,
        personId: person._id,
        accountId: account._id,
        email: emailToUse,
        password: request.plainPassword,
        fullName: `${person.firstName} ${person.lastName}`,
        facilityId: resolvedFacilityId || null,
        facilityCreated: !!(createdIds.laboratoryId || createdIds.pharmacyId)
      }
    });

  } catch (error) {
    console.error('❌ Unexpected error approving request:', error);
    await rollback('unexpected error in outer try/catch');

    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0];
      const arabicFields = {
        nationalId: 'الرقم الوطني',
        email: 'البريد الإلكتروني',
        medicalLicenseNumber: 'رقم الترخيص الطبي',
        pharmacyLicenseNumber: 'رقم ترخيص الصيدلية',
        licenseNumber: 'رقم الترخيص'
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
