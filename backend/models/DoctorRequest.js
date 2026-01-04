const mongoose = require('mongoose');

const doctorRequestSchema = new mongoose.Schema({
  // ==================== PERSONAL INFORMATION ====================
  firstName: {
    type: String,
    required: [true, 'الاسم الأول مطلوب'],
    trim: true,
    minlength: [2, 'الاسم الأول يجب أن يكون حرفين على الأقل'],
    maxlength: [50, 'الاسم الأول يجب ألا يتجاوز 50 حرفاً'],
    match: [/^[a-zA-Z\u0600-\u06FF\s]+$/, 'الاسم يجب أن يحتوي على أحرف عربية أو إنجليزية فقط']
  },
  
  lastName: {
    type: String,
    required: [true, 'اسم العائلة مطلوب'],
    trim: true,
    minlength: [2, 'اسم العائلة يجب أن يكون حرفين على الأقل'],
    maxlength: [50, 'اسم العائلة يجب ألا يتجاوز 50 حرفاً'],
    match: [/^[a-zA-Z\u0600-\u06FF\s]+$/, 'الاسم يجب أن يحتوي على أحرف عربية أو إنجليزية فقط']
  },
  
  nationalId: {
    type: String,
    required: [true, 'الرقم الوطني مطلوب'],
    unique: true,
    match: [/^[0-9]{11}$/, 'الرقم الوطني يجب أن يكون 11 رقماً']
  },
  
  // ✅ UPDATED: Date of Birth with validation (from Person.js)
  dateOfBirth: {
    type: Date,
    required: [true, 'تاريخ الميلاد مطلوب'],
    validate: {
      validator: function(v) {
        if (!v) return false;
        
        const today = new Date();
        const birthDate = new Date(v);
        
        // Cannot be in the future
        if (birthDate > today) {
          return false;
        }
        
        // Calculate age
        const age = Math.floor((today - birthDate) / (365.25 * 24 * 60 * 60 * 1000));
        
        // Age must be between 0-120 years
        if (age < 0 || age > 120) {
          return false;
        }
        
        return true;
      },
      message: 'تاريخ الميلاد يجب أن يكون في الماضي والعمر بين 0-120 سنة'
    }
  },
  
  gender: {
    type: String,
    required: [true, 'الجنس مطلوب'],
    enum: ['male', 'female']
  },
  
  phoneNumber: {
    type: String,
    required: [true, 'رقم الهاتف مطلوب'],
    match: [/^(\+963[0-9]{9}|09[0-9]{8}|0[0-9]{9})$/, 'رقم الهاتف يجب أن يكون بالصيغة السورية']
  },
  
  address: {
    type: String,
    required: [true, 'العنوان مطلوب'],
    trim: true
  },
  
  governorate: {
    type: String,
    required: [true, 'المحافظة مطلوبة'],
    enum: ['damascus', 'rif_dimashq', 'aleppo', 'homs', 'hama', 'latakia', 'tartus', 'idlib', 'deir_ez_zor', 'hasakah', 'raqqa', 'daraa', 'suwayda', 'quneitra']
  },
  
  city: {
    type: String,
    trim: true
  },
  
  // ==================== ACCOUNT INFORMATION ====================
  email: {
    type: String,
    required: [true, 'البريد الإلكتروني مطلوب'],
    unique: true,
    lowercase: true,
    match: [/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, 'البريد الإلكتروني غير صحيح']
  },
  
  // ✅ UPDATED: Password with strength validation (from Account.js)
  password: {
    type: String,
    required: [true, 'كلمة المرور مطلوبة'],
    minlength: [8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'],
    validate: {
      validator: function(v) {
        // Skip validation if password is already hashed
        if (v.startsWith('$2b$') || v.startsWith('$2a$')) {
          return true;
        }
        
        // Password strength requirements
        const hasUppercase = /[A-Z]/.test(v);
        const hasLowercase = /[a-z]/.test(v);
        const hasNumber = /[0-9]/.test(v);
        const hasSpecial = /[!@#$%^&*]/.test(v);
        
        return hasUppercase && hasLowercase && hasNumber && hasSpecial;
      },
      message: 'كلمة المرور يجب أن تحتوي على: حرف كبير، حرف صغير، رقم، ورمز خاص (!@#$%^&*)'
    }
  },
  
  plainPassword: {
    type: String,
    required: [true, 'كلمة المرور الأصلية مطلوبة'],
    minlength: [8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل']
  },

  // ==================== DOCTOR INFORMATION ====================
  medicalLicenseNumber: {
    type: String,
    required: [true, 'رقم الترخيص الطبي مطلوب'],
    unique: true,
    trim: true,
    match: [/^[A-Z0-9]{8,20}$/, 'رقم الترخيص يجب أن يكون 8-20 حرفاً كبيراً أو رقماً']
  },
  
  specialization: {
    type: String,
    required: [true, 'التخصص مطلوب'],
    enum: [
      'Cardiologist', 'Pulmonologist', 'General Practitioner', 'Infectious Disease Specialist',
      'Intensive Care Specialist', 'Rheumatologist', 'Orthopedic Surgeon', 'Neurologist',
      'Endocrinologist', 'Dermatologist', 'Gastroenterologist', 'General Surgeon',
      'Hepatologist', 'Urologist', 'Gynecologist', 'Psychiatrist', 'Hematologist',
      'Oncologist', 'ENT Specialist', 'Ophthalmologist', 'Pediatrician', 'Nephrologist',
      'Internal Medicine', 'Emergency Medicine'
    ]
  },
  
  subSpecialization: {
    type: String,
    trim: true
  },
  
  yearsOfExperience: {
    type: Number,
    required: [true, 'سنوات الخبرة مطلوبة'],
    min: [0, 'سنوات الخبرة يجب أن تكون 0 على الأقل'],
    max: [60, 'سنوات الخبرة يجب ألا تتجاوز 60 سنة']
  },
  
  hospitalAffiliation: {
    type: String,
    required: [true, 'اسم المستشفى مطلوب'],
    trim: true
  },
  
  availableDays: {
    type: [String],
    required: [true, 'أيام العمل مطلوبة'],
    enum: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  },
  
  consultationFee: {
    type: Number,
    default: 0,
    min: [0, 'رسوم الاستشارة يجب أن تكون 0 أو أكثر']
  },
  
  // ==================== FILE UPLOADS ====================
  medicalCertificate: {
    fileName: { type: String },
    filePath: { type: String },
    fileUrl: { type: String },
    mimeType: { type: String },
    fileSize: { type: Number },
    uploadedAt: { type: Date, default: Date.now }
  },
  
  licenseDocument: {
    fileName: { type: String },
    filePath: { type: String },
    fileUrl: { type: String },
    mimeType: { type: String },
    fileSize: { type: Number },
    uploadedAt: { type: Date, default: Date.now }
  },
  
  profilePhoto: {
    fileName: { type: String },
    filePath: { type: String },
    fileUrl: { type: String },
    mimeType: { type: String },
    fileSize: { type: Number },
    uploadedAt: { type: Date, default: Date.now }
  },
  
  // ==================== REQUEST STATUS ====================
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  
  // Admin Actions
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    default: null
  },
  
  reviewedAt: {
    type: Date,
    default: null
  },
  
  rejectionReason: {
    type: String,
    trim: true,
    maxlength: [500, 'سبب الرفض يجب ألا يتجاوز 500 حرف']
  },
  
  adminNotes: {
    type: String,
    trim: true,
    maxlength: [1000, 'ملاحظات الأدمن يجب ألا تتجاوز 1000 حرف']
  },
  
  // Created IDs (after approval)
  createdPersonId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Person',
    default: null
  },
  
  createdAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    default: null
  },
  
  createdDoctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    default: null
  }
}, {
  timestamps: true,
  collection: 'doctor_requests'
});

// Indexes
doctorRequestSchema.index({ status: 1, createdAt: -1 });
doctorRequestSchema.index({ nationalId: 1 }, { unique: true });
doctorRequestSchema.index({ email: 1 }, { unique: true });
doctorRequestSchema.index({ medicalLicenseNumber: 1 }, { unique: true });

module.exports = mongoose.model('DoctorRequest', doctorRequestSchema, 'doctor_requests');