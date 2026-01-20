const jwt = require('jsonwebtoken');
const Account = require('../models/Account');
const Person = require('../models/Person');
const Patient = require('../models/Patient');

/**
 * Enhanced Authentication Middleware
 * Protects routes and verifies JWT tokens
 */
exports.protect = async (req, res, next) => {
  try {
    let token;

    // 1. Check if token exists in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'غير مصرح. الرجاء تسجيل الدخول للوصول إلى هذا المورد'
      });
    }

    // 2. Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3. Check if account still exists
    const account = await Account.findById(decoded.id).select('+password');
    
    if (!account) {
      return res.status(401).json({
        success: false,
        message: 'الحساب المرتبط بهذا الرمز لم يعد موجوداً'
      });
    }

    // 4. Check if account is active
    if (!account.isActive) {
      return res.status(401).json({
        success: false,
        message: 'الحساب معطل. الرجاء التواصل مع الإدارة'
      });
    }

    // 5. Check if account is locked
    if (account.lockUntil && account.lockUntil > Date.now()) {
      const minutesLeft = Math.ceil((account.lockUntil - Date.now()) / 60000);
      return res.status(401).json({
        success: false,
        message: `الحساب مقفل. حاول مرة أخرى بعد ${minutesLeft} دقيقة`
      });
    }

    // 6. Get person and patient data
    const person = await Person.findById(account.personId);
    
    if (!person) {
      return res.status(401).json({
        success: false,
        message: 'بيانات المستخدم غير موجودة'
      });
    }

    // 7. Attach user data to request
    req.user = {
      accountId: account._id,
      personId: person._id,
      email: account.email,
      roles: account.roles,
      firstName: person.firstName,
      lastName: person.lastName,
      nationalId: person.nationalId,
      phoneNumber: person.phoneNumber
    };

    // 8. If user is a patient, get patient ID
    if (account.roles.includes('patient')) {
      const patient = await Patient.findOne({ personId: person._id });
      if (patient) {
        req.user.patientId = patient._id;
      }
    }

    next();
  } catch (error) {
    console.error('Authentication Error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'رمز غير صالح. الرجاء تسجيل الدخول مرة أخرى'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'انتهت صلاحية الرمز. الرجاء تسجيل الدخول مرة أخرى'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء التحقق من الصلاحيات'
    });
  }
};

/**
 * Restrict access to specific roles
 * Usage: restrictTo('patient', 'doctor')
 */
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // Check if user has at least one of the required roles
    const hasRole = req.user.roles.some(role => roles.includes(role));
    
    if (!hasRole) {
      return res.status(403).json({
        success: false,
        message: 'ليس لديك صلاحية للوصول إلى هذا المورد'
      });
    }
    
    next();
  };
};

/**
 * CRITICAL SECURITY: Verify patient can only access their own data
 * Prevents patients from accessing other patients' data
 */
exports.verifyPatientOwnership = async (req, res, next) => {
  try {
    // This middleware should only be used after protect middleware
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'المستخدم غير مصادق عليه'
      });
    }

    // If user is not a patient, they shouldn't be accessing patient endpoints
    if (!req.user.roles.includes('patient')) {
      return res.status(403).json({
        success: false,
        message: 'هذا المورد متاح للمرضى فقط'
      });
    }

    // Ensure patient ID exists
    if (!req.user.patientId) {
      return res.status(404).json({
        success: false,
        message: 'بيانات المريض غير موجودة'
      });
    }

    // If route has patientId parameter, verify it matches logged-in patient
    if (req.params.patientId && req.params.patientId !== req.user.patientId.toString()) {
      // CRITICAL: Patient trying to access another patient's data!
      console.warn(`⚠️ SECURITY ALERT: Patient ${req.user.patientId} attempted to access data of patient ${req.params.patientId}`);
      
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بالوصول إلى بيانات مريض آخر'
      });
    }

    // If route has visitId, verify the visit belongs to this patient
    if (req.params.visitId) {
      const Visit = require('../models/Visit');
      const visit = await Visit.findById(req.params.visitId);
      
      if (!visit) {
        return res.status(404).json({
          success: false,
          message: 'الزيارة غير موجودة'
        });
      }
      
      if (visit.patientId.toString() !== req.user.patientId.toString()) {
        console.warn(`⚠️ SECURITY ALERT: Patient ${req.user.patientId} attempted to access visit ${req.params.visitId} belonging to patient ${visit.patientId}`);
        
        return res.status(403).json({
          success: false,
          message: 'غير مصرح لك بالوصول إلى بيانات هذه الزيارة'
        });
      }
    }

    // All checks passed
    next();
  } catch (error) {
    console.error('Ownership Verification Error:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء التحقق من الصلاحيات'
    });
  }
};

/**
 * Optional: Verify if user owns a specific resource
 * Can be extended for other resource types
 */
exports.verifyResourceOwnership = (resourceType) => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[`${resourceType}Id`];
      
      if (!resourceId) {
        return next();
      }

      // Add custom ownership checks based on resource type
      switch (resourceType) {
        case 'patient':
          if (resourceId !== req.user.patientId.toString()) {
            return res.status(403).json({
              success: false,
              message: 'غير مصرح لك بالوصول إلى هذا المورد'
            });
          }
          break;
        
        // Add more resource types as needed
        default:
          break;
      }

      next();
    } catch (error) {
      console.error('Resource Ownership Verification Error:', error);
      return res.status(500).json({
        success: false,
        message: 'حدث خطأ أثناء التحقق من الصلاحيات'
      });
    }
  };
};