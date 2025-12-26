// backend/controllers/adminController.js
// Admin Controller for Patient360 System

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
    // Get total doctors count
    const totalDoctors = await Doctor.countDocuments();
    const doctors = await Doctor.find().populate('personId');
    const activeDoctorsCount = doctors.filter(d => {
      const account = d.personId?.account;
      return account?.isActive !== false;
    }).length;

    // Get total patients count
    const totalPatients = await Patient.countDocuments();
    const patients = await Patient.find().populate('personId');
    const activePatientsCount = patients.filter(p => {
      const account = p.personId?.account;
      return account?.isActive !== false;
    }).length;

    // Get visits statistics
    const totalVisits = await Visit.countDocuments();
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todayVisits = await Visit.countDocuments({
      visitDate: {
        $gte: today,
        $lt: tomorrow
      }
    });

    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const firstDayOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    
    const monthlyVisits = await Visit.countDocuments({
      visitDate: {
        $gte: firstDayOfMonth,
        $lt: firstDayOfNextMonth
      }
    });

    // Get specialization statistics
    const specializationStats = await Doctor.aggregate([
      {
        $group: {
          _id: '$specialization',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      }
    ]);

    // Get recent activity (last 20 audit logs)
    const recentActivity = await AuditLog.find()
      .sort({ timestamp: -1 })
      .limit(20)
      .populate('userId', 'email roles');

    res.status(200).json({
      success: true,
      statistics: {
        totalDoctors,
        activeDoctors: activeDoctorsCount,
        inactiveDoctors: totalDoctors - activeDoctorsCount,
        totalPatients,
        activePatients: activePatientsCount,
        inactivePatients: totalPatients - activePatientsCount,
        totalVisits,
        todayVisits,
        monthlyVisits,
        specializationStats: specializationStats.map(s => ({
          specialization: s._id,
          count: s.count
        })),
        recentActivity: recentActivity.map(log => ({
          id: log._id,
          action: log.action,
          description: log.description,
          userEmail: log.userId?.email,
          timestamp: log.timestamp,
          ipAddress: log.ipAddress
        }))
      }
    });
  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الإحصائيات'
    });
  }
};

// ==================== DOCTORS MANAGEMENT ====================

exports.getAllDoctors = async (req, res) => {
  try {
    // Get all doctors with populated person and account data
    const doctors = await Doctor.find()
      .populate({
        path: 'personId',
        select: 'firstName lastName nationalId gender phoneNumber address dateOfBirth'
      })
      .sort({ createdAt: -1 });

    // Get accounts for all persons
    const personIds = doctors.map(d => d.personId._id);
    const accounts = await Account.find({ personId: { $in: personIds } })
      .select('personId email isActive lastLogin');

    // Map accounts to persons
    const accountMap = {};
    accounts.forEach(acc => {
      accountMap[acc.personId.toString()] = acc;
    });

    // Format response
    const formattedDoctors = doctors.map(doctor => {
      const account = accountMap[doctor.personId._id.toString()];
      
      return {
        id: doctor._id,
        personId: doctor.personId._id,
        firstName: doctor.personId.firstName,
        lastName: doctor.personId.lastName,
        nationalId: doctor.personId.nationalId,
        gender: doctor.personId.gender,
        phoneNumber: doctor.personId.phoneNumber,
        address: doctor.personId.address,
        dateOfBirth: doctor.personId.dateOfBirth,
        email: account?.email || 'N/A',
        isActive: account?.isActive !== false,
        lastLogin: account?.lastLogin,
        medicalLicenseNumber: doctor.medicalLicenseNumber,
        specialization: doctor.specialization,
        subSpecialization: doctor.subSpecialization,
        yearsOfExperience: doctor.yearsOfExperience,
        hospitalAffiliation: doctor.hospitalAffiliation,
        consultationFee: doctor.consultationFee,
        availableDays: doctor.availableDays,
        createdAt: doctor.createdAt,
        updatedAt: doctor.updatedAt
      };
    });

    res.status(200).json({
      success: true,
      count: formattedDoctors.length,
      doctors: formattedDoctors
    });
  } catch (error) {
    console.error('Get all doctors error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب بيانات الأطباء'
    });
  }
};

exports.getDoctorById = async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id)
      .populate('personId');

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'الطبيب غير موجود'
      });
    }

    const account = await Account.findOne({ personId: doctor.personId._id });

    // Get doctor's visits statistics
    const totalVisits = await Visit.countDocuments({ doctorId: doctor._id });

    res.status(200).json({
      success: true,
      doctor: {
        ...doctor.toObject(),
        person: doctor.personId,
        email: account?.email,
        isActive: account?.isActive !== false,
        lastLogin: account?.lastLogin,
        totalVisits
      }
    });
  } catch (error) {
    console.error('Get doctor by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب بيانات الطبيب'
    });
  }
};

exports.createDoctor = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      nationalId,
      licenseNumber,
      specialization,
      subSpecialization,
      gender,
      dateOfBirth,
      phoneNumber,
      email,
      password,
      education,
      yearsOfExperience,
      institution,
      clinicAddress,
      governorate,
      city
    } = req.body;

    // Check if national ID already exists
    const existingPerson = await Person.findOne({ nationalId });
    if (existingPerson) {
      return res.status(400).json({
        success: false,
        message: 'الرقم الوطني مسجل مسبقاً'
      });
    }

    // Check if email already exists
    const existingAccount = await Account.findOne({ email });
    if (existingAccount) {
      return res.status(400).json({
        success: false,
        message: 'البريد الإلكتروني مسجل مسبقاً'
      });
    }

    // Check if license number already exists
    const existingDoctor = await Doctor.findOne({ medicalLicenseNumber: licenseNumber });
    if (existingDoctor) {
      return res.status(400).json({
        success: false,
        message: 'رقم الترخيص الطبي مسجل مسبقاً'
      });
    }

    // Create Person
    const person = await Person.create({
      firstName,
      lastName,
      nationalId,
      gender,
      dateOfBirth,
      phoneNumber,
      address: `${clinicAddress}, ${city}, ${governorate}`,
      isMinor: false
    });

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create Account
    const account = await Account.create({
      email,
      password: hashedPassword,
      roles: ['doctor'],
      personId: person._id,
      isActive: true
    });

    // Create Doctor
    const doctor = await Doctor.create({
      personId: person._id,
      medicalLicenseNumber: licenseNumber,
      specialization,
      subSpecialization: subSpecialization || null,
      yearsOfExperience: parseInt(yearsOfExperience) || 0,
      hospitalAffiliation: institution || 'N/A',
      consultationFee: 0
    });

    res.status(201).json({
      success: true,
      message: 'تم إضافة الطبيب بنجاح',
      doctor: {
        id: doctor._id,
        personId: person._id,
        accountId: account._id,
        email,
        firstName,
        lastName,
        specialization
      }
    });
  } catch (error) {
    console.error('Create doctor error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إضافة الطبيب'
    });
  }
};

exports.deactivateDoctor = async (req, res) => {
  try {
    const { reason, notes } = req.body;

    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'الطبيب غير موجود'
      });
    }

    // Update account status
    const account = await Account.findOneAndUpdate(
      { personId: doctor.personId },
      { 
        isActive: false,
        deactivationReason: reason,
        deactivationNotes: notes,
        deactivatedAt: new Date(),
        deactivatedBy: req.user._id
      },
      { new: true }
    );

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'حساب الطبيب غير موجود'
      });
    }

    res.status(200).json({
      success: true,
      message: 'تم إلغاء تفعيل الطبيب بنجاح'
    });
  } catch (error) {
    console.error('Deactivate doctor error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إلغاء تفعيل الطبيب'
    });
  }
};

exports.activateDoctor = async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'الطبيب غير موجود'
      });
    }

    // Update account status
    const account = await Account.findOneAndUpdate(
      { personId: doctor.personId },
      { 
        isActive: true,
        $unset: { 
          deactivationReason: '',
          deactivationNotes: '',
          deactivatedAt: '',
          deactivatedBy: ''
        },
        reactivatedAt: new Date(),
        reactivatedBy: req.user._id
      },
      { new: true }
    );

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'حساب الطبيب غير موجود'
      });
    }

    res.status(200).json({
      success: true,
      message: 'تم تفعيل الطبيب بنجاح'
    });
  } catch (error) {
    console.error('Activate doctor error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تفعيل الطبيب'
    });
  }
};

exports.updateDoctor = async (req, res) => {
  try {
    const updates = req.body;
    
    const doctor = await Doctor.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'الطبيب غير موجود'
      });
    }

    res.status(200).json({
      success: true,
      message: 'تم تحديث بيانات الطبيب بنجاح',
      doctor
    });
  } catch (error) {
    console.error('Update doctor error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث بيانات الطبيب'
    });
  }
};

// ==================== PATIENTS MANAGEMENT ====================

exports.getAllPatients = async (req, res) => {
  try {
    // Get all patients with populated person data
    const patients = await Patient.find()
      .populate({
        path: 'personId',
        select: 'firstName lastName nationalId gender phoneNumber address dateOfBirth'
      })
      .sort({ createdAt: -1 });

    // Get accounts for all persons
    const personIds = patients.map(p => p.personId._id);
    const accounts = await Account.find({ personId: { $in: personIds } })
      .select('personId email isActive lastLogin');

    // Map accounts to persons
    const accountMap = {};
    accounts.forEach(acc => {
      accountMap[acc.personId.toString()] = acc;
    });

    // Format response
    const formattedPatients = patients.map(patient => {
      const account = accountMap[patient.personId._id.toString()];
      
      return {
        id: patient._id,
        personId: patient.personId._id,
        firstName: patient.personId.firstName,
        lastName: patient.personId.lastName,
        nationalId: patient.personId.nationalId,
        gender: patient.personId.gender,
        phoneNumber: patient.personId.phoneNumber,
        address: patient.personId.address,
        dateOfBirth: patient.personId.dateOfBirth,
        email: account?.email || 'N/A',
        isActive: account?.isActive !== false,
        lastLogin: account?.lastLogin,
        bloodType: patient.bloodType,
        height: patient.height,
        weight: patient.weight,
        allergies: patient.allergies,
        chronicDiseases: patient.chronicDiseases,
        emergencyContact: patient.emergencyContact,
        createdAt: patient.createdAt,
        updatedAt: patient.updatedAt
      };
    });

    res.status(200).json({
      success: true,
      count: formattedPatients.length,
      patients: formattedPatients
    });
  } catch (error) {
    console.error('Get all patients error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب بيانات المرضى'
    });
  }
};

exports.getPatientById = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id)
      .populate('personId');

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'المريض غير موجود'
      });
    }

    const account = await Account.findOne({ personId: patient.personId._id });

    // Get patient's visits statistics
    const totalVisits = await Visit.countDocuments({ patientId: patient._id });

    res.status(200).json({
      success: true,
      patient: {
        ...patient.toObject(),
        person: patient.personId,
        email: account?.email,
        isActive: account?.isActive !== false,
        lastLogin: account?.lastLogin,
        totalVisits
      }
    });
  } catch (error) {
    console.error('Get patient by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب بيانات المريض'
    });
  }
};

exports.deactivatePatient = async (req, res) => {
  try {
    const { reason, notes } = req.body;

    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'المريض غير موجود'
      });
    }

    // Update account status
    const account = await Account.findOneAndUpdate(
      { personId: patient.personId },
      { 
        isActive: false,
        deactivationReason: reason,
        deactivationNotes: notes,
        deactivatedAt: new Date(),
        deactivatedBy: req.user._id
      },
      { new: true }
    );

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'حساب المريض غير موجود'
      });
    }

    res.status(200).json({
      success: true,
      message: 'تم إلغاء تفعيل المريض بنجاح'
    });
  } catch (error) {
    console.error('Deactivate patient error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إلغاء تفعيل المريض'
    });
  }
};

exports.activatePatient = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'المريض غير موجود'
      });
    }

    // Update account status
    const account = await Account.findOneAndUpdate(
      { personId: patient.personId },
      { 
        isActive: true,
        $unset: { 
          deactivationReason: '',
          deactivationNotes: '',
          deactivatedAt: '',
          deactivatedBy: ''
        },
        reactivatedAt: new Date(),
        reactivatedBy: req.user._id
      },
      { new: true }
    );

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'حساب المريض غير موجود'
      });
    }

    res.status(200).json({
      success: true,
      message: 'تم تفعيل المريض بنجاح'
    });
  } catch (error) {
    console.error('Activate patient error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تفعيل المريض'
    });
  }
};

exports.updatePatient = async (req, res) => {
  try {
    const updates = req.body;
    
    const patient = await Patient.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'المريض غير موجود'
      });
    }

    res.status(200).json({
      success: true,
      message: 'تم تحديث بيانات المريض بنجاح',
      patient
    });
  } catch (error) {
    console.error('Update patient error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث بيانات المريض'
    });
  }
};

// ==================== AUDIT LOGS ====================

exports.getAuditLogs = async (req, res) => {
  try {
    const { limit = 100, page = 1, action, startDate, endDate } = req.query;

    const query = {};
    
    if (action) {
      query.action = action;
    }
    
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

    const total = await AuditLog.countDocuments(query);

    res.status(200).json({
      success: true,
      count: logs.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      logs: logs.map(log => ({
        id: log._id,
        action: log.action,
        description: log.description,
        resourceType: log.resourceType,
        resourceId: log.resourceId,
        userEmail: log.userId?.email,
        userRoles: log.userId?.roles,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        timestamp: log.timestamp,
        success: log.success,
        errorMessage: log.errorMessage
      }))
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب سجلات التدقيق'
    });
  }
};

exports.getUserAuditLogs = async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50 } = req.query;

    const logs = await AuditLog.find({ userId })
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: logs.length,
      logs
    });
  } catch (error) {
    console.error('Get user audit logs error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب سجلات المستخدم'
    });
  }
};
