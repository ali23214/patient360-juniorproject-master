const jwt = require('jsonwebtoken');
const Account = require('../models/Account');
const Person = require('../models/Person');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const Admin = require('../models/Admin');

// ✅ FORGET PASSWORD: Import email utilities
const { sendEmail, generateOTP, createOTPEmailTemplate } = require('../utils/sendEmail');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// @desc    Register new patient
// @route   POST /api/auth/register (or /api/auth/signup)
// @access  Public
exports.signup = async (req, res) => {
  console.log('🔵 Signup request received');
  console.log('📦 Request body:', req.body);
  
  try {
    const {
      // Person data
      nationalId,
      parentNationalId,
      isMinor,
      firstName,
      lastName,
      dateOfBirth,
      gender,
      phoneNumber,
      address,
      
      // Account data
      email,
      password,
      
      // Patient data
      bloodType,
      height,
      weight,
      smokingStatus,
      allergies,
      chronicDiseases,
      familyHistory,
      
      // Emergency Contact
      emergencyContact,
      emergencyContactName,
      emergencyContactRelationship,
      emergencyContactPhone
    } = req.body;

    console.log('✅ Step 1: Data extracted from body');

    // ========================================
    // 1. Extract Emergency Contact
    // ========================================
    let emergencyName, emergencyRelationship, emergencyPhone;
    
    if (emergencyContact && typeof emergencyContact === 'object') {
      emergencyName = emergencyContact.name;
      emergencyRelationship = emergencyContact.relationship;
      emergencyPhone = emergencyContact.phone;
      console.log('✅ Emergency contact format: OBJECT');
    } else {
      emergencyName = emergencyContactName;
      emergencyRelationship = emergencyContactRelationship;
      emergencyPhone = emergencyContactPhone;
      console.log('✅ Emergency contact format: SEPARATE FIELDS');
    }

    // ========================================
    // 2. التحقق من وجود البيانات المطلوبة
    // ========================================
    if (!firstName || !lastName || !dateOfBirth || !gender || !phoneNumber || !email || !password) {
      console.log('❌ Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'جميع الحقول المطلوبة يجب أن تكون موجودة'
      });
    }

    if (isMinor && !parentNationalId) {
      console.log('❌ Missing parent national ID for minor');
      return res.status(400).json({
        success: false,
        message: 'رقم الهوية الوطنية للوالد/الوالدة مطلوب للقاصرين'
      });
    }

    if (!isMinor && !nationalId) {
      console.log('❌ Missing national ID for adult');
      return res.status(400).json({
        success: false,
        message: 'رقم الهوية الوطنية مطلوب'
      });
    }

    if (!emergencyName || !emergencyRelationship || !emergencyPhone) {
      console.log('❌ Missing emergency contact');
      return res.status(400).json({
        success: false,
        message: 'معلومات جهة الاتصال للطوارئ مطلوبة'
      });
    }

    console.log('✅ Step 2: All required fields present');

    // ========================================
    // 3. التحقق من عدم وجود حساب مسبق
    // ========================================
    console.log('🔍 Checking for existing account...');
    const existingAccount = await Account.findOne({ email: email.toLowerCase() });
    if (existingAccount) {
      console.log('❌ Email already exists');
      return res.status(400).json({
        success: false,
        message: 'البريد الإلكتروني مستخدم بالفعل'
      });
    }

    if (!isMinor) {
  console.log('🔍 Checking for existing person (adult)...');
  console.log('🔎 National ID being checked:', nationalId);
  console.log('🔎 National ID type:', typeof nationalId);
  
  const existingPerson = await Person.findOne({ nationalId });
  if (existingPerson) {
    console.log('❌ National ID already exists');
    console.log('🔎 Existing person:', existingPerson);
    return res.status(400).json({
      success: false,
      message: 'رقم الهوية الوطنية مستخدم بالفعل'
    });
  }
}

    console.log('✅ Step 3: No duplicate accounts found');

    // ========================================
    // 4. التحقق من صحة تاريخ الميلاد
    // ========================================
     const birthDate = new Date(dateOfBirth);
    const today = new Date();
    
    if (birthDate >= today) {
      console.log('❌ Invalid birth date - future date');
      return res.status(400).json({
        success: false,
        message: 'تاريخ الميلاد يجب أن يكون في الماضي'
      });
    }

    // حساب العمر بالأيام للدقة (يسمح بحديثي الولادة)
    const ageInDays = Math.floor((today - birthDate) / (1000 * 60 * 60 * 24));
    const ageInYears = today.getFullYear() - birthDate.getFullYear();

    // يسمح بالتسجيل من عمر يوم واحد (أو حتى 0 يوم) لغاية 120 سنة
    if (ageInDays < 0 || ageInYears > 120) {
      console.log('❌ Invalid age - days:', ageInDays, 'years:', ageInYears);
      return res.status(400).json({
        success: false,
        message: 'تاريخ الميلاد غير صحيح'
      });
    }

    console.log('✅ Step 4: Birth date validated');
    console.log('   Age in days:', ageInDays);
    console.log('   Age in years:', ageInYears);
    console.log('   Is newborn:', ageInDays < 7 ? 'Yes' : 'No');

    // ========================================
    // 5. Generate Child ID for Minors (SIMPLE - NO UUID)
    // ========================================
    let childId = null;
    if (isMinor) {
      console.log('🔍 Generating unique child ID for minor...');
      
      // Try sequential numbers from 1 to 999
      let foundUniqueId = false;
      
      for (let childNumber = 1; childNumber <= 999; childNumber++) {
        // Format: parentId-001, parentId-002, etc.
        const candidateId = `${parentNationalId}-${childNumber.toString().padStart(3, '0')}`;
        
        // Check if this childId already exists in database
        const existingChild = await Person.findOne({ childId: candidateId });
        
        if (!existingChild) {
          // This ID is available!
          childId = candidateId;
          foundUniqueId = true;
          console.log('✅ Generated unique child ID:', childId);
          break;
        }
        
        console.log(`⚠️  Child ID ${candidateId} already exists, trying next...`);
      }
      
      if (!foundUniqueId) {
        // This should never happen (999 children limit!)
        console.log('❌ Could not generate unique child ID - limit reached');
        return res.status(500).json({
          success: false,
          message: 'تم الوصول للحد الأقصى من الأطفال المسجلين لهذا الوالد'
        });
      }
    }

    // ========================================
    // 6. إنشاء Person Document
    // ========================================
    console.log('📝 Creating Person document...');
    const personData = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      dateOfBirth: birthDate,
      gender,
      phoneNumber: phoneNumber.replace(/\s/g, ''),
      address: address?.trim()
    };

    if (isMinor) {
      personData.nationalId = null;
      personData.parentNationalId = parentNationalId;
      personData.childId = childId;
      personData.isMinor = true;
    } else {
      personData.nationalId = nationalId;
      personData.parentNationalId = undefined;  
personData.childId = undefined;        
      personData.isMinor = false;
    }

    const person = await Person.create(personData);
    console.log('✅ Step 5: Person created with ID:', person._id);

    // ========================================
    // 7. إنشاء Account Document
    // ========================================
    console.log('📝 Creating Account document...');
    const account = await Account.create({
      email: email.trim().toLowerCase(),
      password,
      roles: ['patient'],
      personId: person._id,
      isActive: true
    });
    console.log('✅ Step 6: Account created with ID:', account._id);

    // ========================================
    // 8. تحضير بيانات Patient
    // ========================================
    console.log('📝 Preparing Patient data...');
    const patientData = {
      personId: person._id,
      emergencyContact: {
        name: emergencyName.trim(),
        relationship: emergencyRelationship.trim(),
        phoneNumber: emergencyPhone.replace(/\s/g, '')
      }
    };

    if (bloodType) patientData.bloodType = bloodType;
    if (height) patientData.height = parseFloat(height);
    if (weight) patientData.weight = parseFloat(weight);
    if (smokingStatus) patientData.smokingStatus = smokingStatus;
    if (allergies && Array.isArray(allergies) && allergies.length > 0) {
      patientData.allergies = allergies;
    }
    if (chronicDiseases && Array.isArray(chronicDiseases) && chronicDiseases.length > 0) {
      patientData.chronicDiseases = chronicDiseases;
    }
    if (familyHistory && Array.isArray(familyHistory) && familyHistory.length > 0) {
      patientData.familyHistory = familyHistory;
    }

    // ========================================
    // 9. إنشاء Patient Document
    // ========================================
    console.log('📝 Creating Patient document...');
    const patient = await Patient.create(patientData);
    console.log('✅ Step 7: Patient created with ID:', patient._id);

    // ========================================
    // 10. توليد JWT Token
    // ========================================
    const token = generateToken(account._id);
    console.log('✅ Step 8: Token generated');

    // ========================================
    // 11. إرسال الاستجابة
    // ========================================
    console.log('✅✅✅ SIGNUP SUCCESSFUL! ✅✅✅');
    res.status(201).json({
      success: true,
      message: 'تم التسجيل بنجاح',
      token,
      user: {
        accountId: account._id,
        email: account.email,
        roles: account.roles,
        personId: person._id,
        firstName: person.firstName,
        lastName: person.lastName,
        nationalId: person.nationalId,
        childId: person.childId,
        isMinor: person.isMinor,
        phoneNumber: person.phoneNumber,
        dateOfBirth: person.dateOfBirth,
        gender: person.gender,
        address: person.address
      }
    });

  } catch (error) {
    console.error('❌❌❌ SIGNUP ERROR - FULL DETAILS ❌❌❌');
    console.error('Error Name:', error.name);
    console.error('Error Message:', error.message);
    console.error('Error Stack:', error.stack);

    if (error.name === 'ValidationError') {
      console.error('Validation Error Details:', error.errors);
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: messages[0] || 'خطأ في البيانات المدخلة'
      });
    }

    if (error.code === 11000) {
      console.error('Duplicate Key Error:', error.keyPattern);
      const field = Object.keys(error.keyPattern)[0];
      const arabicFields = {
        email: 'البريد الإلكتروني',
        nationalId: 'رقم الهوية الوطنية',
        phoneNumber: 'رقم الهاتف',
        childId: 'معرف الطفل'
      };
      return res.status(400).json({
        success: false,
        message: `${arabicFields[field] || field} مستخدم بالفعل`
      });
    }

    res.status(500).json({
      success: false,
      message: 'حدث خطأ في السيرفر. الرجاء المحاولة مرة أخرى'
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // ✅ DEBUG: Log login attempt
    console.log('🔵 ========== LOGIN ATTEMPT ==========');
    console.log('📧 Email received:', email);
    console.log('🔐 Password received:', password);
    
    const account = await Account.findOne({ email: email.toLowerCase() });
    
    // ✅ DEBUG: Check if account found
    console.log('🔍 Account found:', account ? 'YES ✅' : 'NO ❌');
    
    if (account) {
      console.log('📧 Account email in DB:', account.email);
      console.log('✅ Account active:', account.isActive);
      console.log('👤 Account roles:', account.roles);
      console.log('🔐 Password hash in DB:', account.password);
    }

    if (!account) {
      console.log('❌ FAILED: Account not found in database!');
      return res.status(401).json({
        success: false,
        message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
      });
    }
    
    if (!account.isActive) {
      console.log('❌ FAILED: Account is not active!');
      return res.status(403).json({
        success: false,
        message: 'الحساب غير مفعّل. الرجاء التواصل مع الإدارة'
      });
    }

    // ✅ DEBUG: Check password comparison
    console.log('🔐 Calling comparePassword method...');
    const isPasswordCorrect = await account.comparePassword(password);
    console.log('🔐 Password comparison result:', isPasswordCorrect ? 'CORRECT ✅' : 'INCORRECT ❌');

    if (!isPasswordCorrect) {
      console.log('❌ FAILED: Password is incorrect!');
      return res.status(401).json({
        success: false,
        message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
      });
    }
    
    console.log('✅ Password verified successfully!');
    
    // Update last login
    account.lastLogin = new Date();
    await account.save();
    console.log('✅ Last login updated');

    const person = await Person.findById(account.personId);

    if (!person) {
      console.log('❌ FAILED: Person not found!');
      return res.status(404).json({
        success: false,
        message: 'بيانات المستخدم غير موجودة'
      });
    }
    
    console.log('✅ Person found:', person.firstName, person.lastName);

    let roleData = {};

    for (const role of account.roles) {
      if (role === 'patient') {
        const patient = await Patient.findOne({ personId: account.personId });
        if (patient) {
          roleData.patient = {
            bloodType: patient.bloodType,
            height: patient.height,
            weight: patient.weight,
            allergies: patient.allergies,
            chronicDiseases: patient.chronicDiseases,
            smokingStatus: patient.smokingStatus,
            emergencyContact: patient.emergencyContact
          };
        }
      }

      if (role === 'doctor') {
        console.log('🔍 Loading doctor data...');
        const doctor = await Doctor.findOne({ personId: account.personId });
        if (doctor) {
          console.log('✅ Doctor found:', doctor.medicalLicenseNumber);
          roleData.doctor = {
            medicalLicenseNumber: doctor.medicalLicenseNumber,
            specialization: doctor.specialization,
            yearsOfExperience: doctor.yearsOfExperience,
            hospitalAffiliation: doctor.hospitalAffiliation,
            consultationFee: doctor.consultationFee
          };
        } else {
          console.log('❌ Doctor not found for personId:', account.personId);
        }
      }

      if (role === 'admin') {
        roleData.admin = {
          hasAdminAccess: true
        };
      }
    }

    const token = generateToken(account._id);
    console.log('✅ Token generated');

    console.log('✅ ========== LOGIN SUCCESS ==========');
    
    res.status(200).json({
      success: true,
      message: 'تم تسجيل الدخول بنجاح',
      token,
      user: {
        accountId: account._id,
        email: account.email,
        roles: account.roles,
        isActive: account.isActive,
        personId: person._id,
        firstName: person.firstName,
        lastName: person.lastName,
        nationalId: person.nationalId,
        childId: person.childId,
        isMinor: person.isMinor,
        phoneNumber: person.phoneNumber,
        dateOfBirth: person.dateOfBirth,
        gender: person.gender,
        address: person.address,
        roleData
      }
    });

  } catch (error) {
    console.error('❌ ========== LOGIN ERROR ==========');
    console.error('Error details:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء تسجيل الدخول'
    });
  }
};

// @desc    Verify JWT token
// @route   GET /api/auth/verify
// @access  Private
exports.verifyToken = async (req, res) => {
  try {
    const person = await Person.findById(req.account.personId);

    if (!person) {
      return res.status(404).json({
        success: false,
        message: 'بيانات المستخدم غير موجودة'
      });
    }

    let roleData = {};

    for (const role of req.account.roles) {
      if (role === 'patient') {
        const patient = await Patient.findOne({ personId: req.account.personId });
        if (patient) {
          roleData.patient = {
            bloodType: patient.bloodType,
            height: patient.height,
            weight: patient.weight,
            allergies: patient.allergies,
            chronicDiseases: patient.chronicDiseases,
            smokingStatus: patient.smokingStatus
          };
        }
      }

      if (role === 'doctor') {
        const doctor = await Doctor.findOne({ personId: req.account.personId });
        if (doctor) {
          roleData.doctor = {
            medicalLicenseNumber: doctor.medicalLicenseNumber,
            specialization: doctor.specialization,
            yearsOfExperience: doctor.yearsOfExperience,
            hospitalAffiliation: doctor.hospitalAffiliation
          };
        }
      }

      if (role === 'admin') {
        roleData.admin = {
          hasAdminAccess: true
        };
      }
    }

    res.status(200).json({
      success: true,
      user: {
        accountId: req.account._id,
        email: req.account.email,
        roles: req.account.roles,
        isActive: req.account.isActive,
        personId: person._id,
        firstName: person.firstName,
        lastName: person.lastName,
        nationalId: person.nationalId,
        phoneNumber: person.phoneNumber,
        dateOfBirth: person.dateOfBirth,
        gender: person.gender,
        address: person.address,
        roleData
      }
    });

  } catch (error) {
    console.error('Verify Token Error:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء التحقق من الرمز'
    });
  }
};

// @desc    Update last login timestamp
// @route   POST /api/auth/update-last-login
// @access  Private
exports.updateLastLogin = async (req, res) => {
  try {
    req.account.lastLogin = new Date();
    await req.account.save();

    res.status(200).json({
      success: true,
      message: 'تم تحديث آخر تسجيل دخول'
    });

  } catch (error) {
    console.error('Update Last Login Error:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء التحديث'
    });
  }
};

// ==================== DOCTOR REGISTRATION REQUEST ====================

const DoctorRequest = require('../models/DoctorRequest');
const bcrypt = require('bcryptjs');
const path = require('path');

/**
 * @desc    Submit doctor registration request WITH FILES
 * @route   POST /api/auth/register-doctor
 * @access  Public
 */
exports.registerDoctorRequest = async (req, res) => {
  console.log('📋 Doctor registration request received');
  console.log('📦 Request body:', req.body);
  console.log('📎 Files:', req.files);

  try {
    const {
      // Personal Information
      firstName,
      lastName,
      nationalId,
      dateOfBirth,
      gender,
      phoneNumber,
      address,
      governorate,
      city,
      
      // Account Information
      email,
      password,
      
      // Doctor Information
      medicalLicenseNumber,
      specialization,
      subSpecialization,
      yearsOfExperience,
      hospitalAffiliation,
      availableDays,
      consultationFee
    } = req.body;

    // ==================== VALIDATION ====================
    console.log('🔍 Step 1: Validating required fields...');

    if (!firstName || !lastName || !nationalId || !dateOfBirth || !gender || 
        !phoneNumber || !address || !governorate || !email || !password || 
        !medicalLicenseNumber || !specialization || !hospitalAffiliation || 
        !availableDays || yearsOfExperience === undefined) {
      return res.status(400).json({
        success: false,
        message: 'جميع الحقول المطلوبة يجب أن تكون مملوءة'
      });
    }

    // Parse availableDays if it's a string (from FormData)
    let parsedAvailableDays = availableDays;
    if (typeof availableDays === 'string') {
      try {
        parsedAvailableDays = JSON.parse(availableDays);
      } catch (e) {
        return res.status(400).json({
          success: false,
          message: 'صيغة أيام العمل غير صحيحة'
        });
      }
    }

    // ==================== CHECK DUPLICATES ====================
    console.log('🔍 Step 2: Checking for duplicates...');

    const existingRequestByNationalId = await DoctorRequest.findOne({ nationalId });
    if (existingRequestByNationalId) {
      return res.status(400).json({
        success: false,
        message: 'يوجد طلب تسجيل سابق بهذا الرقم الوطني'
      });
    }

    const existingPerson = await Person.findOne({ nationalId });
    if (existingPerson) {
      return res.status(400).json({
        success: false,
        message: 'هذا الرقم الوطني مسجل مسبقاً في النظام'
      });
    }

    const existingRequestByEmail = await DoctorRequest.findOne({ email });
    if (existingRequestByEmail) {
      return res.status(400).json({
        success: false,
        message: 'يوجد طلب تسجيل سابق بهذا البريد الإلكتروني'
      });
    }

    const existingAccount = await Account.findOne({ email });
    if (existingAccount) {
      return res.status(400).json({
        success: false,
        message: 'هذا البريد الإلكتروني مسجل مسبقاً في النظام'
      });
    }

    const existingRequestByLicense = await DoctorRequest.findOne({ medicalLicenseNumber });
    if (existingRequestByLicense) {
      return res.status(400).json({
        success: false,
        message: 'يوجد طلب تسجيل سابق بهذا رقم الترخيص الطبي'
      });
    }

    const existingDoctor = await Doctor.findOne({ medicalLicenseNumber });
    if (existingDoctor) {
      return res.status(400).json({
        success: false,
        message: 'رقم الترخيص الطبي مسجل مسبقاً في النظام'
      });
    }

    // ==================== PROCESS FILES ====================
    console.log('📎 Step 3: Processing uploaded files...');
    
    const fileData = {};
    
    if (req.files) {
      // Medical Certificate
      if (req.files.medicalCertificate && req.files.medicalCertificate[0]) {
        const file = req.files.medicalCertificate[0];
        fileData.medicalCertificate = {
          fileName: file.originalname,
          filePath: file.path,
          fileUrl: `/uploads/doctor-requests/${file.filename}`,
          mimeType: file.mimetype,
          fileSize: file.size,
          uploadedAt: new Date()
        };
        console.log('✅ Medical certificate uploaded:', file.filename);
      }
      
      // License Document
      if (req.files.licenseDocument && req.files.licenseDocument[0]) {
        const file = req.files.licenseDocument[0];
        fileData.licenseDocument = {
          fileName: file.originalname,
          filePath: file.path,
          fileUrl: `/uploads/doctor-requests/${file.filename}`,
          mimeType: file.mimetype,
          fileSize: file.size,
          uploadedAt: new Date()
        };
        console.log('✅ License document uploaded:', file.filename);
      }
      
      // Profile Photo
      if (req.files.profilePhoto && req.files.profilePhoto[0]) {
        const file = req.files.profilePhoto[0];
        fileData.profilePhoto = {
          fileName: file.originalname,
          filePath: file.path,
          fileUrl: `/uploads/doctor-requests/${file.filename}`,
          mimeType: file.mimetype,
          fileSize: file.size,
          uploadedAt: new Date()
        };
        console.log('✅ Profile photo uploaded:', file.filename);
      }
    }

// ==================== HASH PASSWORD ====================
console.log('🔐 Step 4: Hashing password...');

const hashedPassword = await bcrypt.hash(password, 10);
console.log('✅ Password hashed successfully');
console.log('📝 Storing plaintext password for admin display');

// ==================== CREATE REQUEST ====================
console.log('💾 Step 5: Creating doctor request...');

const doctorRequest = await DoctorRequest.create({
  // Personal Information
  firstName,
  lastName,
  nationalId,
  dateOfBirth,
  gender,
  phoneNumber,
  address,
  governorate,
  city: city || null,
  
  // Account Information
  email,
  password: hashedPassword,      // ← للحفظ في Account
  plainPassword: password,       // ← للعرض للـ Admin
  
      
      // Doctor Information
      medicalLicenseNumber,
      specialization,
      subSpecialization: subSpecialization || null,
      yearsOfExperience,
      hospitalAffiliation,
      availableDays: parsedAvailableDays,
      consultationFee: consultationFee || 0,
      
      // Files
      ...fileData,
      
      // Request Status
      status: 'pending'
    });

    console.log('✅ Doctor request created:', doctorRequest._id);

    // ==================== SEND RESPONSE ====================
    res.status(201).json({
      success: true,
      message: 'تم إرسال طلب التسجيل بنجاح. سيتم مراجعته من قبل الإدارة قريباً.',
      requestId: doctorRequest._id,
      data: {
        firstName: doctorRequest.firstName,
        lastName: doctorRequest.lastName,
        email: doctorRequest.email,
        medicalLicenseNumber: doctorRequest.medicalLicenseNumber,
        status: doctorRequest.status,
        submittedAt: doctorRequest.createdAt,
        uploadedFiles: {
          medicalCertificate: !!fileData.medicalCertificate,
          licenseDocument: !!fileData.licenseDocument,
          profilePhoto: !!fileData.profilePhoto
        }
      }
    });

  } catch (error) {
    console.error('❌ Doctor registration request error:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'خطأ في البيانات المدخلة',
        errors
      });
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      let arabicField = field;
      if (field === 'nationalId') arabicField = 'الرقم الوطني';
      if (field === 'email') arabicField = 'البريد الإلكتروني';
      if (field === 'medicalLicenseNumber') arabicField = 'رقم الترخيص الطبي';
      
      return res.status(400).json({
        success: false,
        message: `${arabicField} مسجل مسبقاً في النظام`
      });
    }

    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء إرسال طلب التسجيل'
    });
  }
};
// ==========================================
// FORGET PASSWORD FUNCTIONS
// ==========================================

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Send OTP to user's email
 * @access  Public
 */
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    console.log('🔵 ========== FORGOT PASSWORD REQUEST ==========');
    console.log('📧 Email:', email);

    // Validate email
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'البريد الإلكتروني مطلوب'
      });
    }

    // Find account
    const account = await Account.findOne({ email: email.toLowerCase() });
    
    if (!account) {
      // ⚠️ Security: Don't reveal if email exists
      return res.json({
        success: true,
        message: 'إذا كان البريد الإلكتروني مسجلاً، سيتم إرسال رمز التحقق'
      });
    }

    // Check if account is active
    if (!account.isActive) {
      return res.status(403).json({
        success: false,
        message: 'الحساب غير نشط. يرجى التواصل مع الإدارة'
      });
    }

    // Generate 6-digit OTP
    const otp = generateOTP();
    console.log('🔢 Generated OTP:', otp);

    // Save OTP and expiry time (10 minutes)
    account.resetPasswordOTP = otp;
    account.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    await account.save();

    // Create email template
    const emailHTML = createOTPEmailTemplate(otp, email);

    // Send email
    try {
      await sendEmail({
        email: account.email,
        subject: 'رمز استعادة كلمة المرور - Patient 360°',
        message: emailHTML
      });

      console.log('✅ OTP email sent successfully');
      console.log('✅ ==========================================');

      res.json({
        success: true,
        message: 'تم إرسال رمز التحقق إلى بريدك الإلكتروني'
      });

    } catch (emailError) {
      console.error('❌ Failed to send email:', emailError);
      
      // Clear OTP if email fails
      account.resetPasswordOTP = null;
      account.resetPasswordExpires = null;
      await account.save();

      return res.status(500).json({
        success: false,
        message: 'فشل إرسال البريد الإلكتروني. يرجى المحاولة لاحقاً'
      });
    }

  } catch (error) {
    console.error('❌ Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في النظام'
    });
  }
};

/**
 * @route   POST /api/auth/verify-otp
 * @desc    Verify OTP code
 * @access  Public
 */
exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    console.log('🔵 ========== VERIFY OTP REQUEST ==========');
    console.log('📧 Email:', email);
    console.log('🔢 OTP received:', otp);
    console.log('🔢 OTP type:', typeof otp);

    // Validate inputs
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'البريد الإلكتروني ورمز التحقق مطلوبان'
      });
    }

    // Convert OTP to string and trim
    const otpString = String(otp).trim();
    console.log('🔢 OTP after trim:', otpString);

    // Find account
    const account = await Account.findOne({ 
      email: email.toLowerCase()
    });

    if (!account) {
      console.log('❌ Account not found');
      return res.status(400).json({
        success: false,
        message: 'البريد الإلكتروني غير صحيح'
      });
    }

    console.log('🔢 OTP in database:', account.resetPasswordOTP);
    console.log('⏰ OTP expires at:', account.resetPasswordExpires);
    console.log('⏰ Current time:', new Date());

    // Check if OTP exists
    if (!account.resetPasswordOTP) {
      console.log('❌ No OTP found in database');
      return res.status(400).json({
        success: false,
        message: 'لم يتم طلب رمز تحقق. يرجى طلب رمز جديد'
      });
    }

    // Check if OTP expired
    if (account.resetPasswordExpires < Date.now()) {
      console.log('❌ OTP expired');
      // Clear expired OTP
      account.resetPasswordOTP = null;
      account.resetPasswordExpires = null;
      await account.save();

      return res.status(400).json({
        success: false,
        message: 'انتهت صلاحية رمز التحقق. يرجى طلب رمز جديد'
      });
    }

    // Compare OTPs
    const isMatch = account.resetPasswordOTP === otpString;
    console.log('🔐 OTP Match:', isMatch);

    if (!isMatch) {
      console.log('❌ OTP does not match');
      return res.status(400).json({
        success: false,
        message: 'رمز التحقق غير صحيح'
      });
    }

    console.log('✅ OTP verified successfully');
    console.log('✅ ==========================================');

    res.json({
      success: true,
      message: 'تم التحقق من الرمز بنجاح'
    });

  } catch (error) {
    console.error('❌ Verify OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في التحقق'
    });
  }
};

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password with verified OTP
 * @access  Public
 */
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    console.log('🔵 ========== RESET PASSWORD REQUEST ==========');
    console.log('📧 Email:', email);
    console.log('🔢 OTP received:', otp);

    // Validate inputs
    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'جميع الحقول مطلوبة'
      });
    }

    // Validate password length
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'
      });
    }

    // Convert OTP to string and trim
    const otpString = String(otp).trim();

    // Find account
    const account = await Account.findOne({ 
      email: email.toLowerCase()
    });

    if (!account) {
      console.log('❌ Account not found');
      return res.status(400).json({
        success: false,
        message: 'البريد الإلكتروني غير صحيح'
      });
    }

    console.log('🔢 OTP in database:', account.resetPasswordOTP);
    console.log('🔢 OTP provided:', otpString);

    // Check if OTP exists
    if (!account.resetPasswordOTP) {
      console.log('❌ No OTP in database');
      return res.status(400).json({
        success: false,
        message: 'لم يتم التحقق من رمز التحقق. يرجى المحاولة مرة أخرى'
      });
    }

    // Check if OTP expired
    if (account.resetPasswordExpires < Date.now()) {
      console.log('❌ OTP expired');
      // Clear expired OTP
      account.resetPasswordOTP = null;
      account.resetPasswordExpires = null;
      await account.save();

      return res.status(400).json({
        success: false,
        message: 'انتهت صلاحية رمز التحقق'
      });
    }

    // Compare OTPs
    const isMatch = account.resetPasswordOTP === otpString;
    console.log('🔐 OTP Match:', isMatch);

    if (!isMatch) {
      console.log('❌ OTP does not match');
      return res.status(400).json({
        success: false,
        message: 'رمز التحقق غير صحيح'
      });
    }

    // Update password (will be hashed by pre-save middleware)
    account.password = newPassword;
    
    // Clear OTP fields
    account.resetPasswordOTP = null;
    account.resetPasswordExpires = null;
    
    await account.save();

    console.log('✅ Password reset successfully');
    console.log('✅ ==========================================');

    res.json({
      success: true,
      message: 'تم تغيير كلمة المرور بنجاح'
    });

  } catch (error) {
    console.error('❌ Reset password error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: errors[0] || 'خطأ في البيانات المدخلة'
      });
    }

    res.status(500).json({
      success: false,
      message: 'حدث خطأ في تغيير كلمة المرور'
    });
  }
};
