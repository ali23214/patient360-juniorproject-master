/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  Auth Controller — Patient 360°
 *  ─────────────────────────────────────────────────────────────────────────
 *  Public-facing authentication endpoints. All routes mounted under /api/auth.
 *
 *  Functions:
 *    1. signup                       — Patient self-registration (adult or child)
 *    2. login                        — Email/password login (all roles)
 *    3. verifyToken                  — Re-validate a JWT and return user info
 *    4. updateLastLogin              — Stamp last login time
 *    5. registerDoctorRequest        — Doctor application with file uploads
 *    6. forgotPassword               — Send 6-digit OTP to email
 *    7. verifyOTP                    — Confirm OTP is correct
 *    8. resetPassword                — Set new password using verified OTP
 *    9. checkDoctorRequestStatus     — Doctor checks if their request was approved
 *   10. registerPharmacistRequest    — Pharmacist application with file uploads
 *   11. registerLabTechnicianRequest — Lab technician application with file uploads
 *   12. checkProfessionalStatus      — Unified status check (doctor/pharmacist/lab)
 * ═══════════════════════════════════════════════════════════════════════════
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const {
  Account,
  Person,
  Children,
  Patient,
  Doctor,
  DoctorRequest
} = require('../models');

const { sendEmail, generateOTP, createOTPEmailTemplate } = require('../utils/sendEmail');

// ============================================================================
// HELPERS
// ============================================================================

const generateToken = (accountId) => {
  return jwt.sign({ id: accountId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

const calculateAgeYears = (dateOfBirth) => {
  const birth = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age;
};

const buildRoleData = async (account) => {
  const roleData = {};

  for (const role of account.roles) {
    if (role === 'patient') {
      const query = account.personId
        ? { personId: account.personId }
        : { childId: account.childId };
      const patient = await Patient.findOne(query).lean();
      if (patient) {
        roleData.patient = {
          bloodType: patient.bloodType,
          height: patient.height,
          weight: patient.weight,
          bmi: patient.bmi,
          allergies: patient.allergies,
          chronicDiseases: patient.chronicDiseases,
          familyHistory: patient.familyHistory,
          smokingStatus: patient.smokingStatus,
          emergencyContact: patient.emergencyContact
        };
      }
    }

    if (role === 'doctor' && account.personId) {
      const doctor = await Doctor.findOne({ personId: account.personId }).lean();
      if (doctor) {
        roleData.doctor = {
          medicalLicenseNumber: doctor.medicalLicenseNumber,
          specialization: doctor.specialization,
          subSpecialization: doctor.subSpecialization,
          yearsOfExperience: doctor.yearsOfExperience,
          hospitalAffiliation: doctor.hospitalAffiliation,
          consultationFee: doctor.consultationFee,
          isECGSpecialist: doctor.isECGSpecialist
        };
      }
    }

    if (role === 'admin') {
      roleData.admin = { hasAdminAccess: true };
    }
  }

  return roleData;
};

const buildUserResponse = (account, profile, roleData = {}) => {
  const isChildAccount = !!account.childId;

  return {
    accountId: account._id,
    email: account.email,
    roles: account.roles,
    isActive: account.isActive,

    personId: account.personId || null,
    childId: account.childId || null,
    isMinor: isChildAccount,

    firstName: profile.firstName,
    fatherName: profile.fatherName,
    lastName: profile.lastName,
    motherName: profile.motherName,

    nationalId: profile.nationalId || null,
    childRegistrationNumber: profile.childRegistrationNumber || null,

    phoneNumber: profile.phoneNumber,
    dateOfBirth: profile.dateOfBirth,
    gender: profile.gender,
    address: profile.address,
    governorate: profile.governorate,
    city: profile.city,

    roleData
  };
};

// ============================================================================
// 1. SIGNUP
// ============================================================================

exports.signup = async (req, res) => {
  console.log('🔵 ========== SIGNUP REQUEST ==========');

  try {
    const {
      firstName, fatherName, lastName, motherName,
      dateOfBirth, gender, phoneNumber, address,
      governorate, city,
      nationalId,
      parentNationalId,
      email, password,
      bloodType, height, weight, smokingStatus,
      allergies, chronicDiseases, familyHistory,
      emergencyContact,
      emergencyContactName,
      emergencyContactRelationship,
      emergencyContactPhone
    } = req.body;

    console.log('📦 Email:', email);
    console.log('📦 Date of birth:', dateOfBirth);

    let emergencyName;
    let emergencyRelationship;
    let emergencyPhone;

    if (emergencyContact && typeof emergencyContact === 'object') {
      emergencyName = emergencyContact.name;
      emergencyRelationship = emergencyContact.relationship;
      emergencyPhone = emergencyContact.phoneNumber || emergencyContact.phone;
    } else {
      emergencyName = emergencyContactName;
      emergencyRelationship = emergencyContactRelationship;
      emergencyPhone = emergencyContactPhone;
    }

    const missingFields = [];
    if (!firstName) missingFields.push('firstName');
    if (!fatherName) missingFields.push('fatherName');
    if (!lastName) missingFields.push('lastName');
    if (!motherName) missingFields.push('motherName');
    if (!dateOfBirth) missingFields.push('dateOfBirth');
    if (!gender) missingFields.push('gender');
    if (!phoneNumber) missingFields.push('phoneNumber');
    if (!address) missingFields.push('address');
    if (!governorate) missingFields.push('governorate');
    if (!city) missingFields.push('city');
    if (!email) missingFields.push('email');
    if (!password) missingFields.push('password');

    if (missingFields.length > 0) {
      console.log('❌ Missing required fields:', missingFields);
      return res.status(400).json({
        success: false,
        message: `الحقول التالية مطلوبة: ${missingFields.join(', ')}`
      });
    }

    if (!emergencyName || !emergencyRelationship || !emergencyPhone) {
      console.log('❌ Missing emergency contact');
      return res.status(400).json({
        success: false,
        message: 'معلومات جهة الاتصال للطوارئ مطلوبة'
      });
    }

    const birthDate = new Date(dateOfBirth);
    const today = new Date();

    if (Number.isNaN(birthDate.getTime()) || birthDate >= today) {
      return res.status(400).json({
        success: false,
        message: 'تاريخ الميلاد غير صحيح'
      });
    }

    const ageYears = calculateAgeYears(birthDate);

    if (ageYears > 120) {
      return res.status(400).json({
        success: false,
        message: 'تاريخ الميلاد غير صحيح'
      });
    }

    const isMinor = ageYears < 14;
    console.log(`📦 Age: ${ageYears} years → ${isMinor ? 'MINOR (Children)' : 'ADULT (Person)'}`);

    if (isMinor && !parentNationalId) {
      return res.status(400).json({
        success: false,
        message: 'الرقم الوطني للوالد مطلوب للقاصرين'
      });
    }

    if (!isMinor && !nationalId) {
      return res.status(400).json({
        success: false,
        message: 'الرقم الوطني مطلوب'
      });
    }

    const existingAccount = await Account.findOne({ email: email.toLowerCase() });
    if (existingAccount) {
      console.log('❌ Email already exists:', email);
      return res.status(400).json({
        success: false,
        message: 'البريد الإلكتروني مستخدم بالفعل'
      });
    }

    let profile;
    let account;
    let patient;

    if (isMinor) {
      console.log('👶 Routing to Children collection');

      const parent = await Person.findOne({ nationalId: parentNationalId });
      if (!parent) {
        console.log('❌ Parent not found:', parentNationalId);
        return res.status(404).json({
          success: false,
          message: 'لم يتم العثور على حساب الوالد. يجب تسجيل الوالد أولاً'
        });
      }
      console.log('✅ Parent found:', parent.firstName, parent.lastName);

      const childRegistrationNumber = await Children.generateRegistrationNumber();
      console.log('✅ Generated CRN:', childRegistrationNumber);

      profile = await Children.create({
        childRegistrationNumber,
        parentNationalId,
        parentPersonId: parent._id,
        firstName: firstName.trim(),
        fatherName: fatherName.trim(),
        lastName: lastName.trim(),
        motherName: motherName.trim(),
        dateOfBirth: birthDate,
        gender,
        phoneNumber: phoneNumber.replace(/\s/g, ''),
        governorate,
        city: city.trim(),
        address: address.trim(),
        migrationStatus: 'pending',
        hasReceivedNationalId: false
      });
      console.log('✅ Children doc created:', profile._id);

      account = await Account.create({
        email: email.trim().toLowerCase(),
        password,
        roles: ['patient'],
        childId: profile._id,
        isActive: true
      });
      console.log('✅ Account created (linked to childId):', account._id);

      patient = await Patient.create({
        childId: profile._id,
        bloodType: bloodType || 'unknown',
        height: height ? parseFloat(height) : undefined,
        weight: weight ? parseFloat(weight) : undefined,
        smokingStatus: smokingStatus || undefined,
        allergies: Array.isArray(allergies) ? allergies : [],
        chronicDiseases: Array.isArray(chronicDiseases) ? chronicDiseases : [],
        familyHistory: Array.isArray(familyHistory) ? familyHistory : [],
        emergencyContact: {
          name: emergencyName.trim(),
          relationship: emergencyRelationship.trim(),
          phoneNumber: emergencyPhone.replace(/\s/g, '')
        }
      });
      console.log('✅ Patient profile created:', patient._id);

    } else {
      console.log('👤 Routing to Person collection');

      const existingPerson = await Person.findOne({ nationalId });
      if (existingPerson) {
        console.log('❌ National ID already exists:', nationalId);
        return res.status(400).json({
          success: false,
          message: 'الرقم الوطني مستخدم بالفعل'
        });
      }

      profile = await Person.create({
        nationalId,
        firstName: firstName.trim(),
        fatherName: fatherName.trim(),
        lastName: lastName.trim(),
        motherName: motherName.trim(),
        dateOfBirth: birthDate,
        gender,
        phoneNumber: phoneNumber.replace(/\s/g, ''),
        governorate,
        city: city.trim(),
        address: address.trim()
      });
      console.log('✅ Person doc created:', profile._id);

      account = await Account.create({
        email: email.trim().toLowerCase(),
        password,
        roles: ['patient'],
        personId: profile._id,
        isActive: true
      });
      console.log('✅ Account created (linked to personId):', account._id);

      patient = await Patient.create({
        personId: profile._id,
        bloodType: bloodType || 'unknown',
        height: height ? parseFloat(height) : undefined,
        weight: weight ? parseFloat(weight) : undefined,
        smokingStatus: smokingStatus || undefined,
        allergies: Array.isArray(allergies) ? allergies : [],
        chronicDiseases: Array.isArray(chronicDiseases) ? chronicDiseases : [],
        familyHistory: Array.isArray(familyHistory) ? familyHistory : [],
        emergencyContact: {
          name: emergencyName.trim(),
          relationship: emergencyRelationship.trim(),
          phoneNumber: emergencyPhone.replace(/\s/g, '')
        }
      });
      console.log('✅ Patient profile created:', patient._id);
    }

    const token = generateToken(account._id);
    console.log('✅ Token issued');
    console.log('✅✅✅ SIGNUP SUCCESSFUL ✅✅✅');

    return res.status(201).json({
      success: true,
      message: 'تم التسجيل بنجاح',
      token,
      user: buildUserResponse(account, profile, {
        patient: {
          bloodType: patient.bloodType,
          allergies: patient.allergies,
          chronicDiseases: patient.chronicDiseases,
          emergencyContact: patient.emergencyContact
        }
      })
    });

  } catch (error) {
    console.error('❌❌❌ SIGNUP ERROR ❌❌❌');
    console.error('Name:', error.name);
    console.error('Message:', error.message);

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({
        success: false,
        message: messages[0] || 'خطأ في البيانات المدخلة'
      });
    }

    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      const arabicFields = {
        email: 'البريد الإلكتروني',
        nationalId: 'الرقم الوطني',
        phoneNumber: 'رقم الهاتف',
        childRegistrationNumber: 'رقم تسجيل الطفل'
      };
      return res.status(400).json({
        success: false,
        message: `${arabicFields[field] || field} مستخدم بالفعل`
      });
    }

    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في السيرفر. الرجاء المحاولة مرة أخرى'
    });
  }
};

// ============================================================================
// 2. LOGIN
// ============================================================================

exports.login = async (req, res) => {
  console.log('🔵 ========== LOGIN ATTEMPT ==========');

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'البريد الإلكتروني وكلمة المرور مطلوبان'
      });
    }

    console.log('📧 Email:', email);

    const account = await Account.findForLogin(email);

    if (!account) {
      console.log('❌ Account not found');
      return res.status(401).json({
        success: false,
        message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
      });
    }

    if (!account.isActive) {
      console.log('❌ Account deactivated');
      return res.status(403).json({
        success: false,
        message: 'الحساب غير مفعّل. الرجاء التواصل مع الإدارة'
      });
    }

    if (account.isLocked()) {
      const minutesLeft = Math.ceil(
        (account.accountLockedUntil - new Date()) / 60000
      );
      console.log(`❌ Account locked for ${minutesLeft} more minutes`);
      return res.status(403).json({
        success: false,
        message: `الحساب مغلق مؤقتاً. حاول مرة أخرى بعد ${minutesLeft} دقيقة`
      });
    }

    const isPasswordCorrect = await account.comparePassword(password);

    if (!isPasswordCorrect) {
      console.log('❌ Wrong password');
      await account.recordFailedLogin();
      const remaining = 5 - account.failedLoginAttempts;
      return res.status(401).json({
        success: false,
        message: remaining > 0
          ? `البريد الإلكتروني أو كلمة المرور غير صحيحة. محاولات متبقية: ${remaining}`
          : 'تم قفل الحساب لـ 15 دقيقة بسبب محاولات فاشلة متعددة'
      });
    }

    const clientIp = req.ip || req.connection?.remoteAddress;
    await account.recordSuccessfulLogin(clientIp);
    console.log('✅ Password verified, login state reset');

    let profile;
    if (account.personId) {
      profile = await Person.findById(account.personId).lean();
    } else if (account.childId) {
      profile = await Children.findById(account.childId).lean();
    }

    if (!profile) {
      console.log('❌ Profile (Person/Children) not found');
      return res.status(404).json({
        success: false,
        message: 'بيانات المستخدم غير موجودة'
      });
    }

    const roleData = await buildRoleData(account);

    const token = generateToken(account._id);
    console.log('✅✅✅ LOGIN SUCCESS ✅✅✅');

    return res.status(200).json({
      success: true,
      message: 'تم تسجيل الدخول بنجاح',
      token,
      user: buildUserResponse(account, profile, roleData)
    });

  } catch (error) {
    console.error('❌ LOGIN ERROR:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء تسجيل الدخول'
    });
  }
};

// ============================================================================
// 3. VERIFY TOKEN
// ============================================================================

exports.verifyToken = async (req, res) => {
  try {
    const account = req.account;

    let profile;
    if (account.personId) {
      profile = await Person.findById(account.personId).lean();
    } else if (account.childId) {
      profile = await Children.findById(account.childId).lean();
    }

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'بيانات المستخدم غير موجودة'
      });
    }

    const roleData = await buildRoleData(account);

    return res.status(200).json({
      success: true,
      user: buildUserResponse(account, profile, roleData)
    });

  } catch (error) {
    console.error('❌ Verify Token Error:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء التحقق من الرمز'
    });
  }
};

// ============================================================================
// 4. UPDATE LAST LOGIN
// ============================================================================

exports.updateLastLogin = async (req, res) => {
  try {
    req.account.lastLogin = new Date();
    await req.account.save();

    return res.status(200).json({
      success: true,
      message: 'تم تحديث آخر تسجيل دخول'
    });
  } catch (error) {
    console.error('❌ Update Last Login Error:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء التحديث'
    });
  }
};

// ============================================================================
// 5. DOCTOR REGISTRATION REQUEST (with file uploads)
// ============================================================================

exports.registerDoctorRequest = async (req, res) => {
  console.log('📋 ========== DOCTOR REGISTRATION REQUEST ==========');

  try {
    const {
      firstName, fatherName, lastName, motherName,
      nationalId, dateOfBirth, gender,
      phoneNumber, address, governorate, city,
      email, password,
      medicalLicenseNumber, specialization, subSpecialization,
      yearsOfExperience, hospitalAffiliation, availableDays, consultationFee
    } = req.body;

    const required = [
      'firstName', 'fatherName', 'lastName', 'motherName',
      'nationalId', 'dateOfBirth', 'gender',
      'phoneNumber', 'address', 'governorate', 'city',
      'email', 'password',
      'medicalLicenseNumber', 'specialization', 'hospitalAffiliation'
    ];
    const missing = required.filter((f) => !req.body[f]);
    if (missing.length > 0 || yearsOfExperience === undefined) {
      console.log('❌ Missing fields:', missing);
      return res.status(400).json({
        success: false,
        message: 'جميع الحقول المطلوبة يجب أن تكون مملوءة'
      });
    }

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

    const checks = await Promise.all([
      DoctorRequest.findOne({ nationalId }),
      Person.findOne({ nationalId }),
      DoctorRequest.findOne({ email: email.toLowerCase() }),
      Account.findOne({ email: email.toLowerCase() }),
      DoctorRequest.findOne({ medicalLicenseNumber: medicalLicenseNumber.toUpperCase() }),
      Doctor.findOne({ medicalLicenseNumber: medicalLicenseNumber.toUpperCase() })
    ]);

    if (checks[0] || checks[1]) {
      return res.status(400).json({ success: false, message: 'الرقم الوطني مسجل مسبقاً في النظام' });
    }
    if (checks[2] || checks[3]) {
      return res.status(400).json({ success: false, message: 'البريد الإلكتروني مسجل مسبقاً في النظام' });
    }
    if (checks[4] || checks[5]) {
      return res.status(400).json({ success: false, message: 'رقم الترخيص الطبي مسجل مسبقاً في النظام' });
    }

    const fileData = {};
    if (req.files) {
      ['medicalCertificate', 'licenseDocument', 'profilePhoto'].forEach((key) => {
        const file = req.files[key]?.[0];
        if (file) {
          fileData[key] = {
            fileName: file.originalname,
            filePath: file.path,
            fileUrl: `/uploads/doctor-requests/${file.filename}`,
            mimeType: file.mimetype,
            fileSize: file.size,
            uploadedAt: new Date()
          };
          console.log(`✅ ${key}:`, file.filename);
        }
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const insertPayload = {
      firstName: firstName.trim(),
      fatherName: fatherName.trim(),
      lastName: lastName.trim(),
      motherName: motherName.trim(),
      nationalId: nationalId.trim(),
      dateOfBirth: new Date(dateOfBirth),
      gender,
      phoneNumber: phoneNumber.replace(/\s/g, ''),
      address: address.trim(),
      governorate,
      city: city.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      plainPassword: password,
      medicalLicenseNumber: medicalLicenseNumber.toUpperCase().trim(),
      specialization,
      ...(subSpecialization && { subSpecialization: subSpecialization.trim() }),
      yearsOfExperience: parseInt(yearsOfExperience, 10),
      hospitalAffiliation: hospitalAffiliation.trim(),
      availableDays: parsedAvailableDays || [],
      consultationFee: parseFloat(consultationFee) || 0,
      ...fileData,
      status: 'pending'
    };

    console.log('📝 Insert payload values for enums:');
    console.log('   gender:        ', insertPayload.gender);
    console.log('   governorate:   ', insertPayload.governorate);
    console.log('   specialization:', insertPayload.specialization);
    console.log('   status:        ', insertPayload.status);

    const doctorRequest = await DoctorRequest.create(insertPayload);
    console.log('✅ Doctor request created:', doctorRequest._id);

    return res.status(201).json({
      success: true,
      message: 'تم إرسال طلب التسجيل بنجاح. سيتم مراجعته من قبل الإدارة قريباً.',
      requestId: doctorRequest._id,
      data: {
        firstName: doctorRequest.firstName,
        lastName: doctorRequest.lastName,
        email: doctorRequest.email,
        medicalLicenseNumber: doctorRequest.medicalLicenseNumber,
        status: doctorRequest.status,
        submittedAt: doctorRequest.createdAt
      }
    });

  } catch (error) {
    console.error('❌ Doctor request error:', error.message);
    if (error.errInfo && error.errInfo.details) {
      console.error('🔍 MongoDB schema validation details:', JSON.stringify(error.errInfo.details, null, 2));
    }
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages[0] || 'خطأ في البيانات المدخلة' });
    }
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      const arabicFields = { nationalId: 'الرقم الوطني', email: 'البريد الإلكتروني', medicalLicenseNumber: 'رقم الترخيص الطبي' };
      return res.status(400).json({ success: false, message: `${arabicFields[field] || field} مسجل مسبقاً في النظام` });
    }
    return res.status(500).json({ success: false, message: 'حدث خطأ أثناء إرسال طلب التسجيل' });
  }
};

// ============================================================================
// 6. FORGOT PASSWORD
// ============================================================================

exports.forgotPassword = async (req, res) => {
  console.log('🔵 ========== FORGOT PASSWORD ==========');
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'البريد الإلكتروني مطلوب' });
    }
    const account = await Account.findOne({ email: email.toLowerCase() });
    if (!account) {
      return res.json({ success: true, message: 'إذا كان البريد الإلكتروني مسجلاً، سيتم إرسال رمز التحقق' });
    }
    if (!account.isActive) {
      return res.status(403).json({ success: false, message: 'الحساب غير نشط. يرجى التواصل مع الإدارة' });
    }
    const otp = generateOTP();
    account.resetPasswordOTP = otp;
    account.resetPasswordExpires = Date.now() + 10 * 60 * 1000;
    await account.save();
    console.log('🔢 OTP generated and saved');
    try {
      const emailHTML = createOTPEmailTemplate(otp, email);
      await sendEmail({ email: account.email, subject: 'رمز استعادة كلمة المرور - Patient 360°', message: emailHTML });
      console.log('✅ OTP email sent');
    } catch (emailError) {
      console.error('❌ Email send failed:', emailError);
      account.resetPasswordOTP = null;
      account.resetPasswordExpires = null;
      await account.save();
      return res.status(500).json({ success: false, message: 'فشل إرسال البريد الإلكتروني. يرجى المحاولة لاحقاً' });
    }
    return res.json({ success: true, message: 'تم إرسال رمز التحقق إلى بريدك الإلكتروني' });
  } catch (error) {
    console.error('❌ Forgot password error:', error);
    return res.status(500).json({ success: false, message: 'حدث خطأ في النظام' });
  }
};

// ============================================================================
// 7. VERIFY OTP
// ============================================================================

exports.verifyOTP = async (req, res) => {
  console.log('🔵 ========== VERIFY OTP ==========');
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'البريد الإلكتروني ورمز التحقق مطلوبان' });
    }
    const otpString = String(otp).trim();
    const account = await Account.findOne({ email: email.toLowerCase() }).select('+resetPasswordOTP +resetPasswordExpires');
    if (!account) {
      return res.status(400).json({ success: false, message: 'البريد الإلكتروني غير صحيح' });
    }
    if (!account.resetPasswordOTP) {
      return res.status(400).json({ success: false, message: 'لم يتم طلب رمز تحقق. يرجى طلب رمز جديد' });
    }
    if (account.resetPasswordExpires < Date.now()) {
      account.resetPasswordOTP = null;
      account.resetPasswordExpires = null;
      await account.save();
      return res.status(400).json({ success: false, message: 'انتهت صلاحية رمز التحقق. يرجى طلب رمز جديد' });
    }
    if (account.resetPasswordOTP !== otpString) {
      return res.status(400).json({ success: false, message: 'رمز التحقق غير صحيح' });
    }
    console.log('✅ OTP verified');
    return res.json({ success: true, message: 'تم التحقق من الرمز بنجاح' });
  } catch (error) {
    console.error('❌ Verify OTP error:', error);
    return res.status(500).json({ success: false, message: 'حدث خطأ في التحقق' });
  }
};

// ============================================================================
// 8. RESET PASSWORD
// ============================================================================

exports.resetPassword = async (req, res) => {
  console.log('🔵 ========== RESET PASSWORD ==========');
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ success: false, message: 'جميع الحقول مطلوبة' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' });
    }
    const otpString = String(otp).trim();
    const account = await Account.findOne({ email: email.toLowerCase() }).select('+resetPasswordOTP +resetPasswordExpires +password');
    if (!account) {
      return res.status(400).json({ success: false, message: 'البريد الإلكتروني غير صحيح' });
    }
    if (!account.resetPasswordOTP) {
      return res.status(400).json({ success: false, message: 'لم يتم التحقق من رمز التحقق. يرجى المحاولة مرة أخرى' });
    }
    if (account.resetPasswordExpires < Date.now()) {
      account.resetPasswordOTP = null;
      account.resetPasswordExpires = null;
      await account.save();
      return res.status(400).json({ success: false, message: 'انتهت صلاحية رمز التحقق' });
    }
    if (account.resetPasswordOTP !== otpString) {
      return res.status(400).json({ success: false, message: 'رمز التحقق غير صحيح' });
    }
    account.password = newPassword;
    account.resetPasswordOTP = null;
    account.resetPasswordExpires = null;
    account.failedLoginAttempts = 0;
    account.accountLockedUntil = undefined;
    await account.save();
    console.log('✅ Password reset successfully');
    return res.json({ success: true, message: 'تم تغيير كلمة المرور بنجاح' });
  } catch (error) {
    console.error('❌ Reset password error:', error);
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: errors[0] || 'خطأ في البيانات المدخلة' });
    }
    return res.status(500).json({ success: false, message: 'حدث خطأ في تغيير كلمة المرور' });
  }
};

// ============================================================================
// 9. CHECK DOCTOR REQUEST STATUS
// ============================================================================

exports.checkDoctorRequestStatus = async (req, res) => {
  console.log('🔍 ========== CHECK DOCTOR REQUEST STATUS ==========');
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'البريد الإلكتروني مطلوب' });
    }
    const request = await DoctorRequest.findOne({ email: email.toLowerCase() })
      .select('+plainPassword status email firstName lastName createdAt reviewedAt rejectionReason rejectionDetails')
      .lean();
    if (!request) {
      return res.status(404).json({ success: false, message: 'لم يتم العثور على طلب تسجيل بهذا البريد الإلكتروني' });
    }
    const response = { success: true, status: request.status, submittedAt: request.createdAt };
    if (request.status === 'pending') {
      response.message = 'طلبك قيد المراجعة من قبل الإدارة';
    } else if (request.status === 'approved') {
      response.message = 'تم قبول طلبك! يمكنك الآن تسجيل الدخول';
      response.credentials = { email: request.email, password: request.plainPassword, name: `${request.firstName} ${request.lastName}` };
      response.reviewedAt = request.reviewedAt;
    } else if (request.status === 'rejected') {
      response.message = 'تم رفض طلبك';
      response.rejectionReason = request.rejectionReason || 'لم يتم تحديد سبب';
      response.rejectionDetails = request.rejectionDetails || null;
      response.reviewedAt = request.reviewedAt;
    }
    return res.status(200).json(response);
  } catch (error) {
    console.error('❌ Check status error:', error);
    return res.status(500).json({ success: false, message: 'حدث خطأ أثناء التحقق من حالة الطلب' });
  }
};

// ============================================================================
// 10. PHARMACIST REGISTRATION REQUEST (with file uploads)
// ============================================================================

exports.registerPharmacistRequest = async (req, res) => {
  console.log('📋 ========== PHARMACIST REGISTRATION REQUEST ==========');
  try {
    const {
      firstName, fatherName, lastName, motherName,
      nationalId, dateOfBirth, gender,
      phoneNumber, address, governorate, city,
      email, password,
      pharmacyLicenseNumber, degree, specialization,
      yearsOfExperience, employmentType,
      pharmacyId, newPharmacyData,
      additionalNotes
    } = req.body;

    const required = [
      'firstName', 'fatherName', 'lastName', 'motherName',
      'nationalId', 'dateOfBirth', 'gender',
      'phoneNumber', 'address', 'governorate', 'city',
      'email', 'password',
      'pharmacyLicenseNumber'
    ];
    const missing = required.filter((f) => !req.body[f]);
    if (missing.length > 0) {
      console.log('❌ Missing fields:', missing);
      return res.status(400).json({ success: false, message: 'جميع الحقول المطلوبة يجب أن تكون مملوءة' });
    }

    const checks = await Promise.all([
      DoctorRequest.findOne({ nationalId }),
      Person.findOne({ nationalId }),
      DoctorRequest.findOne({ email: email.toLowerCase() }),
      Account.findOne({ email: email.toLowerCase() })
    ]);
    if (checks[0] || checks[1]) {
      return res.status(400).json({ success: false, message: 'الرقم الوطني مسجل مسبقاً في النظام' });
    }
    if (checks[2] || checks[3]) {
      return res.status(400).json({ success: false, message: 'البريد الإلكتروني مسجل مسبقاً في النظام' });
    }

    const fileData = {};
    if (req.files) {
      ['licenseDocument', 'degreeDocument', 'profilePhoto'].forEach((key) => {
        const file = req.files[key]?.[0];
        if (file) {
          fileData[key] = {
            fileName: file.originalname, filePath: file.path,
            fileUrl: `/uploads/doctor-requests/${file.filename}`,
            mimeType: file.mimetype, fileSize: file.size, uploadedAt: new Date()
          };
          console.log(`✅ ${key}:`, file.filename);
        }
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    let parsedNewPharmacy = null;
    if (newPharmacyData) {
      try {
        parsedNewPharmacy = typeof newPharmacyData === 'string' ? JSON.parse(newPharmacyData) : newPharmacyData;
      } catch (e) {
        return res.status(400).json({ success: false, message: 'بيانات الصيدلية الجديدة غير صالحة' });
      }
    }

    const insertPayload = {
      requestType: 'pharmacist',
      firstName: firstName.trim(), fatherName: fatherName.trim(),
      lastName: lastName.trim(), motherName: motherName.trim(),
      nationalId: nationalId.trim(), dateOfBirth: new Date(dateOfBirth), gender,
      phoneNumber: phoneNumber.replace(/\s/g, ''), address: address.trim(),
      governorate, city: city.trim(),
      email: email.trim().toLowerCase(), password: hashedPassword, plainPassword: password,
      pharmacyLicenseNumber: pharmacyLicenseNumber.toUpperCase().trim(),
      ...(degree && { degree }), ...(specialization && { specialization }),
      yearsOfExperience: parseInt(yearsOfExperience, 10) || 0,
      ...(employmentType && { employmentType }),
      ...(pharmacyId && { pharmacyId }),
      ...(parsedNewPharmacy && { newPharmacyData: parsedNewPharmacy }),
      ...(additionalNotes && { additionalNotes: additionalNotes.trim() }),
      ...fileData,
      status: 'pending'
    };

    console.log('📝 Pharmacist request — requestType:', insertPayload.requestType, 'status:', insertPayload.status);
    const request = await DoctorRequest.create(insertPayload);
    console.log('✅ Pharmacist request created:', request._id);

    return res.status(201).json({
      success: true,
      message: 'تم إرسال طلب تسجيل الصيدلي بنجاح. سيتم مراجعته من قبل الإدارة قريباً.',
      requestId: request._id,
      data: { firstName: request.firstName, lastName: request.lastName, email: request.email, status: request.status, submittedAt: request.createdAt }
    });
  } catch (error) {
    console.error('❌ Pharmacist request error:', error.message);
    if (error.errInfo?.details) console.error('   Schema details:', JSON.stringify(error.errInfo.details, null, 2));
    return res.status(500).json({ success: false, message: 'حدث خطأ في تقديم طلب تسجيل الصيدلي' });
  }
};

// ============================================================================
// 11. LAB TECHNICIAN REGISTRATION REQUEST (with file uploads)
// ============================================================================

exports.registerLabTechnicianRequest = async (req, res) => {
  console.log('📋 ========== LAB TECHNICIAN REGISTRATION REQUEST ==========');
  try {
    const {
      firstName, fatherName, lastName, motherName,
      nationalId, dateOfBirth, gender,
      phoneNumber, address, governorate, city,
      email, password,
      licenseNumber, degree, specialization, position,
      yearsOfExperience,
      laboratoryId, newLaboratoryData,
      additionalNotes
    } = req.body;

    const required = [
      'firstName', 'fatherName', 'lastName', 'motherName',
      'nationalId', 'dateOfBirth', 'gender',
      'phoneNumber', 'address', 'governorate', 'city',
      'email', 'password',
      'licenseNumber'
    ];
    const missing = required.filter((f) => !req.body[f]);
    if (missing.length > 0) {
      console.log('❌ Missing fields:', missing);
      return res.status(400).json({ success: false, message: 'جميع الحقول المطلوبة يجب أن تكون مملوءة' });
    }

    const checks = await Promise.all([
      DoctorRequest.findOne({ nationalId }),
      Person.findOne({ nationalId }),
      DoctorRequest.findOne({ email: email.toLowerCase() }),
      Account.findOne({ email: email.toLowerCase() })
    ]);
    if (checks[0] || checks[1]) {
      return res.status(400).json({ success: false, message: 'الرقم الوطني مسجل مسبقاً في النظام' });
    }
    if (checks[2] || checks[3]) {
      return res.status(400).json({ success: false, message: 'البريد الإلكتروني مسجل مسبقاً في النظام' });
    }

    const fileData = {};
    if (req.files) {
      ['licenseDocument', 'degreeDocument', 'profilePhoto'].forEach((key) => {
        const file = req.files[key]?.[0];
        if (file) {
          fileData[key] = {
            fileName: file.originalname, filePath: file.path,
            fileUrl: `/uploads/doctor-requests/${file.filename}`,
            mimeType: file.mimetype, fileSize: file.size, uploadedAt: new Date()
          };
          console.log(`✅ ${key}:`, file.filename);
        }
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    let parsedNewLab = null;
    if (newLaboratoryData) {
      try {
        parsedNewLab = typeof newLaboratoryData === 'string' ? JSON.parse(newLaboratoryData) : newLaboratoryData;
      } catch (e) {
        return res.status(400).json({ success: false, message: 'بيانات المختبر الجديد غير صالحة' });
      }
    }

    const insertPayload = {
      requestType: 'lab_technician',
      firstName: firstName.trim(), fatherName: fatherName.trim(),
      lastName: lastName.trim(), motherName: motherName.trim(),
      nationalId: nationalId.trim(), dateOfBirth: new Date(dateOfBirth), gender,
      phoneNumber: phoneNumber.replace(/\s/g, ''), address: address.trim(),
      governorate, city: city.trim(),
      email: email.trim().toLowerCase(), password: hashedPassword, plainPassword: password,
      licenseNumber: licenseNumber.toUpperCase().trim(),
      ...(degree && { degree }), ...(specialization && { specialization }),
      ...(position && { position }),
      yearsOfExperience: parseInt(yearsOfExperience, 10) || 0,
      ...(laboratoryId && { laboratoryId }),
      ...(parsedNewLab && { newLaboratoryData: parsedNewLab }),
      ...(additionalNotes && { additionalNotes: additionalNotes.trim() }),
      ...fileData,
      status: 'pending'
    };

    console.log('📝 Lab tech request — requestType:', insertPayload.requestType, 'status:', insertPayload.status);
    const request = await DoctorRequest.create(insertPayload);
    console.log('✅ Lab technician request created:', request._id);

    return res.status(201).json({
      success: true,
      message: 'تم إرسال طلب تسجيل فني المختبر بنجاح. سيتم مراجعته من قبل الإدارة قريباً.',
      requestId: request._id,
      data: { firstName: request.firstName, lastName: request.lastName, email: request.email, status: request.status, submittedAt: request.createdAt }
    });
  } catch (error) {
    console.error('❌ Lab technician request error:', error.message);
    if (error.errInfo?.details) console.error('   Schema details:', JSON.stringify(error.errInfo.details, null, 2));
    return res.status(500).json({ success: false, message: 'حدث خطأ في تقديم طلب تسجيل فني المختبر' });
  }
};

// ============================================================================
// 12. UNIFIED PROFESSIONAL STATUS CHECK
// ============================================================================

exports.checkProfessionalStatus = async (req, res) => {
  console.log('🔍 ========== CHECK PROFESSIONAL STATUS ==========');
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'البريد الإلكتروني مطلوب' });
    }
    const request = await DoctorRequest.findOne({ email: email.toLowerCase() })
      .select('+plainPassword status email firstName lastName requestType createdAt reviewedAt rejectionReason rejectionDetails')
      .lean();
    if (!request) {
      return res.status(404).json({ success: false, message: 'لم يتم العثور على طلب تسجيل بهذا البريد الإلكتروني' });
    }
    const response = {
      success: true,
      status: request.status,
      requestType: request.requestType || 'doctor',
      submittedAt: request.createdAt
    };
    if (request.status === 'pending') {
      response.message = 'طلبك قيد المراجعة من قبل الإدارة';
    } else if (request.status === 'approved') {
      response.message = 'تم قبول طلبك! يمكنك الآن تسجيل الدخول';
      response.credentials = { email: request.email, password: request.plainPassword, name: `${request.firstName} ${request.lastName}` };
      response.reviewedAt = request.reviewedAt;
    } else if (request.status === 'rejected') {
      response.message = 'تم رفض طلبك';
      response.rejectionReason = request.rejectionReason || 'لم يتم تحديد سبب';
      response.rejectionDetails = request.rejectionDetails || null;
      response.reviewedAt = request.reviewedAt;
    }
    return res.status(200).json(response);
  } catch (error) {
    console.error('❌ Check professional status error:', error);
    return res.status(500).json({ success: false, message: 'حدث خطأ أثناء التحقق من حالة الطلب' });
  }
};