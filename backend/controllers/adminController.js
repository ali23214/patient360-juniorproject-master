// backend/controllers/adminController.js
// Admin Controller for Patient360 System
// COMPLETE VERSION - Optimized for AdminDashboard Frontend

const Account = require('../models/Account');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const Person = require('../models/Person');
const Visit = require('../models/Visit');
const AuditLog = require('../models/AuditLog');
const bcrypt = require('bcryptjs');

// ==================== STATISTICS ====================

exports.getStatistics = async (req, res) => {
  try {
    const [
      totalDoctors,
      totalPatients,
      totalVisits,
      todayVisits
    ] = await Promise.all([
      Doctor.countDocuments(),
      Patient.countDocuments(),
      Visit.countDocuments(),
      Visit.countDocuments({
        visitDate: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0))
        }
      })
    ]);

    res.json({
      success: true,
      statistics: {
        totalDoctors,
        totalPatients,
        totalVisits,
        todayVisits
      }
    });
  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في جلب الإحصائيات'
    });
  }
};

// ==================== GET ALL DOCTORS ====================

exports.getAllDoctors = async (req, res) => {
  try {
    console.log('📥 getAllDoctors called');
    
    // Get all doctors
    const doctors = await Doctor.find().lean();
    console.log(`✅ Found ${doctors.length} doctors in database`);
    
    if (doctors.length === 0) {
      return res.json({
        success: true,
        count: 0,
        doctors: []
      });
    }

    // Process each doctor
    const doctorsWithDetails = await Promise.all(
      doctors.map(async (doctor) => {
        try {
          // Get person data
          const person = await Person.findById(doctor.personId).lean();
          
          if (!person) {
            console.warn(`⚠️ Person not found for doctor ${doctor._id}`);
            return null;
          }

          // Get account data
          const account = await Account.findOne({ personId: doctor.personId }).lean();
          
          if (!account) {
            console.warn(`⚠️ Account not found for doctor ${doctor._id}`);
          }

          return {
            id: doctor._id,
            firstName: person.firstName || '',
            lastName: person.lastName || '',
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
            availableDays: doctor.availableDays || [],
            governorate: person.governorate || '',
            city: person.city || '',
            lastLogin: account?.lastLogin || null,
            createdAt: doctor.createdAt || new Date()
          };
        } catch (error) {
          console.error(`❌ Error processing doctor ${doctor._id}:`, error);
          return null;
        }
      })
    );

    // Filter out null values (doctors with missing data)
    const validDoctors = doctorsWithDetails.filter(d => d !== null);
    
    console.log(`✅ Returning ${validDoctors.length} valid doctors`);

    res.json({
      success: true,
      count: validDoctors.length,
      doctors: validDoctors
    });

  } catch (error) {
    console.error('❌ Get doctors error:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في جلب الأطباء',
      error: error.message
    });
  }
};

// ==================== GET DOCTOR BY ID ====================

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

    res.json({
      success: true,
      doctor: {
        id: doctor._id,
        firstName: doctor.personId.firstName,
        lastName: doctor.personId.lastName,
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
        availableDays: doctor.availableDays,
        visitCount,
        createdAt: doctor.createdAt
      }
    });
  } catch (error) {
    console.error('Get doctor error:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في جلب بيانات الطبيب'
    });
  }
};

// ==================== CREATE DOCTOR ====================

exports.createDoctor = async (req, res) => {
  try {
    const { person, doctor, account } = req.body;

    console.log('📥 Received create doctor request');
    console.log('Person:', person);
    console.log('Doctor:', doctor);
    console.log('Account:', account);

    // Validate required data
    if (!person || !doctor || !account) {
      return res.status(400).json({
        success: false,
        message: 'البيانات غير مكتملة'
      });
    }

    // Check if national ID already exists
    const existingPerson = await Person.findOne({ nationalId: person.nationalId });
    if (existingPerson) {
      return res.status(400).json({
        success: false,
        message: 'الرقم الوطني مستخدم بالفعل'
      });
    }

    // Check if email already exists
    const existingAccount = await Account.findOne({ email: account.email });
    if (existingAccount) {
      return res.status(400).json({
        success: false,
        message: 'البريد الإلكتروني مستخدم بالفعل'
      });
    }

    // Check if license number already exists
    const existingDoctor = await Doctor.findOne({ 
      medicalLicenseNumber: doctor.medicalLicenseNumber.toUpperCase() 
    });
    if (existingDoctor) {
      return res.status(400).json({
        success: false,
        message: 'رقم الترخيص مستخدم بالفعل'
      });
    }

    // Step 1: Create Person
    console.log('1️⃣ Creating Person...');
    const newPerson = await Person.create({
      firstName: person.firstName.trim(),
      lastName: person.lastName.trim(),
      nationalId: person.nationalId.trim(),
      gender: person.gender || 'male',
      dateOfBirth: person.dateOfBirth,
      phoneNumber: person.phoneNumber.trim(),
      address: person.address?.trim() || '',
      governorate: person.governorate,
      city: person.city?.trim() || '',
      isMinor: false
    });
    console.log('✅ Person created:', newPerson._id);

    // Step 2: Hash password
    console.log('2️⃣ Hashing password...');
    const hashedPassword = await bcrypt.hash(account.password, 10);
    console.log('✅ Password hashed');

    // Step 3: Create Account
    console.log('3️⃣ Creating Account...');
    const newAccount = await Account.create({
      email: account.email.toLowerCase().trim(),
      password: hashedPassword,
      personId: newPerson._id,
      roles: ['doctor'],
      isActive: true
    });
    console.log('✅ Account created:', newAccount._id);

    // Step 4: Create Doctor
    console.log('4️⃣ Creating Doctor...');
    const newDoctor = await Doctor.create({
      personId: newPerson._id,
      medicalLicenseNumber: doctor.medicalLicenseNumber.toUpperCase().trim(),
      specialization: doctor.specialization.trim(),
      subSpecialization: doctor.subSpecialization?.trim() || null,
      yearsOfExperience: parseInt(doctor.yearsOfExperience) || 0,
      hospitalAffiliation: doctor.hospitalAffiliation.trim(),
      availableDays: doctor.availableDays || [],
      consultationFee: parseFloat(doctor.consultationFee) || 0,
      availableTimes: doctor.availableTimes || { start: '09:00', end: '17:00' }
    });
    console.log('✅ Doctor created:', newDoctor._id);

    res.status(201).json({
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
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }

    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء إضافة الطبيب: ' + error.message
    });
  }
};

// ==================== UPDATE DOCTOR ====================

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

    // Update doctor fields
    if (updates.specialization) doctor.specialization = updates.specialization;
    if (updates.subSpecialization !== undefined) doctor.subSpecialization = updates.subSpecialization;
    if (updates.yearsOfExperience !== undefined) doctor.yearsOfExperience = updates.yearsOfExperience;
    if (updates.hospitalAffiliation) doctor.hospitalAffiliation = updates.hospitalAffiliation;
    if (updates.availableDays) doctor.availableDays = updates.availableDays;
    if (updates.consultationFee !== undefined) doctor.consultationFee = updates.consultationFee;

    await doctor.save();

    // Update person fields if provided
    if (updates.phoneNumber || updates.address || updates.governorate || updates.city) {
      await Person.findByIdAndUpdate(doctor.personId, {
        ...(updates.phoneNumber && { phoneNumber: updates.phoneNumber }),
        ...(updates.address && { address: updates.address }),
        ...(updates.governorate && { governorate: updates.governorate }),
        ...(updates.city && { city: updates.city })
      });
    }

    res.json({
      success: true,
      message: 'تم تحديث بيانات الطبيب بنجاح'
    });
  } catch (error) {
    console.error('Update doctor error:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في تحديث بيانات الطبيب'
    });
  }
};

// ==================== DEACTIVATE DOCTOR ====================

exports.deactivateDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, notes } = req.body;

    console.log('🔵 ========== DEACTIVATE DOCTOR REQUEST ==========');
    console.log('📋 Doctor ID:', id);
    console.log('📝 Reason:', reason);
    console.log('📝 Notes:', notes);
    console.log('👤 Admin:', req.user._id);

    // ✅ VALIDATE: Reason is REQUIRED
    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'سبب إلغاء التفعيل مطلوب'
      });
    }

    // ✅ VALIDATE: Reason must be one of the allowed values
    const allowedReasons = ['death', 'license_revoked', 'user_request', 'fraud', 'retirement', 'transfer', 'other'];
    if (!allowedReasons.includes(reason)) {
      return res.status(400).json({
        success: false,
        message: 'سبب إلغاء التفعيل غير صالح'
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
        deactivationNotes: notes || '',
        deactivatedAt: new Date(),
        deactivatedBy: req.user._id
      }
    );

    console.log('✅ Doctor deactivated successfully');
    console.log('✅ ==========================================');

    res.json({
      success: true,
      message: 'تم إلغاء تفعيل الطبيب بنجاح'
    });
  } catch (error) {
    console.error('❌ Deactivate doctor error:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في إلغاء التفعيل'
    });
  }
};

// ==================== ACTIVATE DOCTOR ====================

exports.activateDoctor = async (req, res) => {
  try {
    const { id } = req.params;

    console.log('🔵 ========== REACTIVATE DOCTOR REQUEST ==========');
    console.log('📋 Doctor ID:', id);
    console.log('👤 Admin:', req.user._id);

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
        $set: {
          isActive: true,
          reactivatedAt: new Date(),
          reactivatedBy: req.user._id
        },
        $unset: {
          deactivationReason: '',
          deactivationNotes: '',
          deactivatedAt: '',
          deactivatedBy: ''
        }
      }
    );

    console.log('✅ Doctor reactivated successfully');
    console.log('✅ ==========================================');

    res.json({
      success: true,
      message: 'تم تفعيل الطبيب بنجاح'
    });
  } catch (error) {
    console.error('❌ Activate doctor error:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في التفعيل'
    });
  }
};

// ==================== GET ALL PATIENTS ====================

exports.getAllPatients = async (req, res) => {
  try {
    console.log('📥 getAllPatients called');
    
    // Get all patients
    const patients = await Patient.find().lean();
    console.log(`✅ Found ${patients.length} patients in database`);
    
    if (patients.length === 0) {
      return res.json({
        success: true,
        count: 0,
        patients: []
      });
    }

    // Process each patient
    const patientsWithDetails = await Promise.all(
      patients.map(async (patient) => {
        try {
          // Get person data
          const person = await Person.findById(patient.personId).lean();
          
          if (!person) {
            console.warn(`⚠️ Person not found for patient ${patient._id}`);
            return null;
          }

          // Get account data
          const account = await Account.findOne({ personId: patient.personId }).lean();
          
          if (!account) {
            console.warn(`⚠️ Account not found for patient ${patient._id}`);
          }

          return {
            id: patient._id,
            firstName: person.firstName || '',
            lastName: person.lastName || '',
            nationalId: person.nationalId || '',
            childId: person.childId || null,
            phoneNumber: person.phoneNumber || '',
            email: account?.email || '',
            isActive: account?.isActive ?? true,
            gender: person.gender || '',  // ✅ FIXED: Added gender field
            bloodType: patient.bloodType || '',
            lastLogin: account?.lastLogin || null,
            createdAt: patient.createdAt || new Date()
          };
        } catch (error) {
          console.error(`❌ Error processing patient ${patient._id}:`, error);
          return null;
        }
      })
    );

    // Filter out null values
    const validPatients = patientsWithDetails.filter(p => p !== null);
    
    console.log(`✅ Returning ${validPatients.length} valid patients`);

    res.json({
      success: true,
      count: validPatients.length,
      patients: validPatients
    });

  } catch (error) {
    console.error('❌ Get patients error:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في جلب المرضى',
      error: error.message
    });
  }
};

// ==================== GET PATIENT BY ID ====================

exports.getPatientById = async (req, res) => {
  try {
    const { id } = req.params;

    const patient = await Patient.findById(id).populate('personId');
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'المريض غير موجود'
      });
    }

    const account = await Account.findOne({ personId: patient.personId._id });
    const visitCount = await Visit.countDocuments({ patientId: patient._id });

    res.json({
      success: true,
      patient: {
        id: patient._id,
        firstName: patient.personId.firstName,
        lastName: patient.personId.lastName,
        nationalId: patient.personId.nationalId,
        childId: patient.personId.childId,
        phoneNumber: patient.personId.phoneNumber,
        gender: patient.personId.gender,
        dateOfBirth: patient.personId.dateOfBirth,
        address: patient.personId.address,
        email: account?.email,
        isActive: account?.isActive,
        bloodType: patient.bloodType,
        visitCount,
        createdAt: patient.createdAt
      }
    });
  } catch (error) {
    console.error('Get patient error:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في جلب بيانات المريض'
    });
  }
};

// ==================== DEACTIVATE PATIENT ====================

exports.deactivatePatient = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, notes } = req.body;

    console.log('🔵 ========== DEACTIVATE PATIENT REQUEST ==========');
    console.log('📋 Patient ID:', id);
    console.log('📝 Reason:', reason);
    console.log('📝 Notes:', notes);
    console.log('👤 Admin:', req.user._id);

    // ✅ VALIDATE: Reason is REQUIRED
    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'سبب إلغاء التفعيل مطلوب'
      });
    }

    // ✅ VALIDATE: Reason must be one of the allowed values
    const allowedReasons = ['death', 'license_revoked', 'user_request', 'fraud', 'retirement', 'transfer', 'other'];
    if (!allowedReasons.includes(reason)) {
      return res.status(400).json({
        success: false,
        message: 'سبب إلغاء التفعيل غير صالح'
      });
    }

    const patient = await Patient.findById(id);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'المريض غير موجود'
      });
    }

    await Account.findOneAndUpdate(
      { personId: patient.personId },
      {
        isActive: false,
        deactivationReason: reason,
        deactivationNotes: notes || '',
        deactivatedAt: new Date(),
        deactivatedBy: req.user._id
      }
    );

    console.log('✅ Patient deactivated successfully');
    console.log('✅ ==========================================');

    res.json({
      success: true,
      message: 'تم إلغاء تفعيل المريض بنجاح'
    });
  } catch (error) {
    console.error('❌ Deactivate patient error:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في إلغاء التفعيل'
    });
  }
};

// ==================== ACTIVATE PATIENT ====================

exports.activatePatient = async (req, res) => {
  try {
    const { id } = req.params;

    console.log('🔵 ========== REACTIVATE PATIENT REQUEST ==========');
    console.log('📋 Patient ID:', id);
    console.log('👤 Admin:', req.user._id);

    const patient = await Patient.findById(id);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'المريض غير موجود'
      });
    }

    await Account.findOneAndUpdate(
      { personId: patient.personId },
      {
        $set: {
          isActive: true,
          reactivatedAt: new Date(),
          reactivatedBy: req.user._id
        },
        $unset: {
          deactivationReason: '',
          deactivationNotes: '',
          deactivatedAt: '',
          deactivatedBy: ''
        }
      }
    );

    console.log('✅ Patient reactivated successfully');
    console.log('✅ ==========================================');

    res.json({
      success: true,
      message: 'تم تفعيل المريض بنجاح'
    });
  } catch (error) {
    console.error('❌ Activate patient error:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في التفعيل'
    });
  }
};

// ==================== UPDATE PATIENT ====================

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

    // Update patient fields
    if (updates.bloodType) patient.bloodType = updates.bloodType;
    await patient.save();

    // Update person fields
    if (updates.phoneNumber || updates.address) {
      await Person.findByIdAndUpdate(patient.personId, {
        ...(updates.phoneNumber && { phoneNumber: updates.phoneNumber }),
        ...(updates.address && { address: updates.address })
      });
    }

    res.json({
      success: true,
      message: 'تم تحديث بيانات المريض بنجاح'
    });
  } catch (error) {
    console.error('Update patient error:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في تحديث بيانات المريض'
    });
  }
};

// ==================== AUDIT LOGS ====================

exports.getAuditLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50, action, startDate, endDate } = req.query;

    const query = {};
    if (action) query.action = action;
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const logs = await AuditLog.find(query)
      .populate('userId', 'email roles')
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const count = await AuditLog.countDocuments(query);

    res.json({
      success: true,
      count,
      page: parseInt(page),
      pages: Math.ceil(count / parseInt(limit)),
      logs: logs.map(log => ({
        id: log._id,
        action: log.action,
        description: log.description,
        resourceType: log.resourceType,
        userEmail: log.userId?.email,
        timestamp: log.timestamp,
        success: log.success
      }))
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في جلب سجلات التدقيق'
    });
  }
};

exports.getUserAuditLogs = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const logs = await AuditLog.find({ userId })
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const count = await AuditLog.countDocuments({ userId });

    res.json({
      success: true,
      count,
      page: parseInt(page),
      pages: Math.ceil(count / parseInt(limit)),
      logs
    });
  } catch (error) {
    console.error('Get user audit logs error:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في جلب سجلات المستخدم'
    });
  }
};

// ==================== DOCTOR REQUESTS ====================

/**
 * @desc    Get all doctor requests
 * @route   GET /api/admin/doctor-requests
 * @access  Private (Admin only)
 */
exports.getAllDoctorRequests = async (req, res) => {
  try {
    console.log('📋 Fetching all doctor requests...');

    const { status } = req.query;

    // Build query
    const query = {};
    if (status) {
      query.status = status;
    }

    // Fetch requests
    const DoctorRequest = require('../models/DoctorRequest');
    const requests = await DoctorRequest.find(query)
      .populate('reviewedBy', 'email')
      .populate('createdPersonId', 'firstName lastName')
      .sort({ createdAt: -1 })
      .lean();

    console.log(`✅ Found ${requests.length} doctor requests`);

    // Format response
    const formattedRequests = requests.map(request => ({
      _id: request._id,
      personalInfo: {
        firstName: request.firstName,
        lastName: request.lastName,
        nationalId: request.nationalId,
        dateOfBirth: request.dateOfBirth,
        gender: request.gender,
        phoneNumber: request.phoneNumber,
        address: request.address,
        governorate: request.governorate,
        city: request.city
      },
      accountInfo: {
        email: request.email
      },
      doctorInfo: {
        medicalLicenseNumber: request.medicalLicenseNumber,
        specialization: request.specialization,
        subSpecialization: request.subSpecialization,
        yearsOfExperience: request.yearsOfExperience,
        hospitalAffiliation: request.hospitalAffiliation,
        availableDays: request.availableDays,
        consultationFee: request.consultationFee
      },
      requestInfo: {
        status: request.status,
        submittedAt: request.createdAt,
        reviewedBy: request.reviewedBy,
        reviewedAt: request.reviewedAt,
        rejectionReason: request.rejectionReason,
        adminNotes: request.adminNotes
      }
    }));

    res.json({
      success: true,
      count: formattedRequests.length,
      requests: formattedRequests
    });

  } catch (error) {
    console.error('❌ Error fetching doctor requests:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في جلب طلبات التسجيل'
    });
  }
};

/**
 * @desc    Get doctor request by ID
 * @route   GET /api/admin/doctor-requests/:id
 * @access  Private (Admin only)
 */
exports.getDoctorRequestById = async (req, res) => {
  try {
    const { id } = req.params;

    console.log('📋 Fetching doctor request:', id);

    const DoctorRequest = require('../models/DoctorRequest');
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

    console.log('✅ Doctor request found');

    res.json({
      success: true,
      request
    });

  } catch (error) {
    console.error('❌ Error fetching doctor request:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في جلب تفاصيل الطلب'
    });
  }
};

/**
 * @desc    Approve doctor request
 * @route   POST /api/admin/doctor-requests/:id/approve
 * @access  Private (Admin only)
 */
exports.approveDoctorRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminNotes } = req.body;

    console.log('✅ Approving doctor request:', id);

    // ==================== FIND REQUEST ====================
    const DoctorRequest = require('../models/DoctorRequest');
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

    // ==================== CREATE PERSON ====================
    console.log('1️⃣ Creating Person...');

    const person = await Person.create({
      nationalId: request.nationalId,
      firstName: request.firstName,
      lastName: request.lastName,
      dateOfBirth: request.dateOfBirth,
      gender: request.gender,
      phoneNumber: request.phoneNumber,
      address: request.address,
      governorate: request.governorate,
      city: request.city,
      isMinor: false
    });

    console.log('✅ Person created:', person._id);

    // ==================== CREATE ACCOUNT ====================
    console.log('2️⃣ Creating Account...');

    // ✅ Use doctor's ORIGINAL signup credentials
    const emailToUse = request.email.trim().toLowerCase();
    const passwordToUse = request.password;  // ← Already hashed from signup!
    const plainPasswordToShow = request.plainPassword;  // ← للعرض فقط

    console.log('📧 Email from signup:', emailToUse);
    console.log('🔐 Password from signup: [HASHED]');
    console.log('📝 Plain password for display:', plainPasswordToShow);

    // Check if email already exists
    const existingAccount = await Account.findOne({ email: emailToUse });
    if (existingAccount) {
      console.error('❌ Email already exists:', emailToUse);
      return res.status(400).json({
        success: false,
        message: `البريد الإلكتروني ${emailToUse} موجود مسبقاً في النظام`
      });
    }

    const account = await Account.create({
      email: emailToUse,
      password: passwordToUse,  // ← Already hashed from signup!
      roles: ['doctor'],
      personId: person._id,
      isActive: true
    });

    console.log('✅ Account created:', account._id);
    console.log('✅ Email:', account.email);
    console.log('✅ Using original signup password');

    // ==================== CREATE DOCTOR ====================
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
      availableTimes: {
        start: '09:00',
        end: '17:00'
      }
    });

    console.log('✅ Doctor created:', doctor._id);

    // ==================== UPDATE REQUEST ====================
    console.log('4️⃣ Updating request status...');

    request.status = 'approved';
    request.reviewedBy = req.user._id;
    request.reviewedAt = new Date();
    request.adminNotes = adminNotes || '';
    request.createdPersonId = person._id;
    request.createdAccountId = account._id;
    request.createdDoctorId = doctor._id;

    await request.save();

    console.log('✅ Request approved successfully');

    // ==================== SEND RESPONSE ====================
    res.json({
      success: true,
      message: 'تم قبول طلب التسجيل وإنشاء حساب الطبيب بنجاح',
      data: {
        doctorId: doctor._id,
        personId: person._id,
        accountId: account._id,
        email: emailToUse,
        password: plainPasswordToShow,  // ← ✅ من signup (plaintext)
        doctorName: `${person.firstName} ${person.lastName}`,
        medicalLicenseNumber: doctor.medicalLicenseNumber,
        specialization: doctor.specialization
      }
    });

  } catch (error) {
    console.error('❌ Error approving doctor request:', error);

    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      let arabicField = field;
      if (field === 'nationalId') arabicField = 'الرقم الوطني';
      if (field === 'email') arabicField = 'البريد الإلكتروني';
      if (field === 'medicalLicenseNumber') arabicField = 'رقم الترخيص الطبي';
      
      return res.status(400).json({
        success: false,
        message: `${arabicField} موجود مسبقاً في النظام`
      });
    }

    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء قبول الطلب: ' + error.message
    });
  }
};

/**
 * @desc    Reject doctor request
 * @route   POST /api/admin/doctor-requests/:id/reject
 * @access  Private (Admin only)
 */
exports.rejectDoctorRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason, adminNotes } = req.body;

    console.log('❌ Rejecting doctor request:', id);

    // Validate rejection reason
    if (!rejectionReason) {
      return res.status(400).json({
        success: false,
        message: 'سبب الرفض مطلوب'
      });
    }

    // ==================== FIND REQUEST ====================
    const DoctorRequest = require('../models/DoctorRequest');
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

    // ==================== UPDATE REQUEST ====================
    request.status = 'rejected';
    request.reviewedBy = req.user._id;
    request.reviewedAt = new Date();
    request.rejectionReason = rejectionReason;
    request.adminNotes = adminNotes || '';

    await request.save();

    console.log('✅ Request rejected successfully');

    // ==================== SEND RESPONSE ====================
    res.json({
      success: true,
      message: 'تم رفض طلب التسجيل',
      data: {
        requestId: request._id,
        doctorName: `${request.firstName} ${request.lastName}`,
        email: request.email,
        rejectionReason: request.rejectionReason,
        reviewedAt: request.reviewedAt
      }
    });

  } catch (error) {
    console.error('❌ Error rejecting doctor request:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء رفض الطلب'
    });
  }
};
