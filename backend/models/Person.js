const mongoose = require('mongoose');

const personSchema = new mongoose.Schema({
  // National ID - NULL for minors, required for adults
  nationalId: {
    type: String,
    required: false,
    unique: true,
    sparse: true, // Allows multiple null values
    match: [/^[0-9]{11}$/, 'الرقم الوطني يجب أن يكون 11 رقماً بالضبط']
  },
  
  // Parent National ID - Required for minors only
  parentNationalId: {
    type: String,
    required: false,
    match: [/^[0-9]{11}$/, 'رقم الهوية الوطنية للوالد/الوالدة يجب أن يكون 11 رقماً']
  },
  
  // Child ID - Auto-generated for minors (format: PARENT_ID-001, PARENT_ID-002, etc.)
  childId: {
    type: String,
    required: false,
    unique: true,
    sparse: true,
    // ✅ NEW: Format validation for childId
    validate: {
      validator: function(v) {
        if (!v) return true; // Allow null/empty
        return /^[0-9]{11}-[0-9]{3}$/.test(v);
      },
      message: 'معرف الطفل يجب أن يكون بالصيغة: XXXXXXXXXXX-XXX'
    }
  },
  
  // Is Minor flag (age < 18)
  isMinor: {
    type: Boolean,
    default: false
  },
  
  firstName: {
    type: String,
    required: [true, 'الاسم الأول مطلوب'],
    minlength: [2, 'الاسم الأول يجب أن يكون حرفين على الأقل'],
    maxlength: [50, 'الاسم الأول يجب ألا يتجاوز 50 حرفاً'],
    match: [/^[a-zA-Z\u0600-\u06FF\s]+$/, 'الاسم يجب أن يحتوي على أحرف عربية أو إنجليزية فقط']
  },
  
  lastName: {
    type: String,
    required: [true, 'اسم العائلة مطلوب'],
    minlength: [2, 'اسم العائلة يجب أن يكون حرفين على الأقل'],
    maxlength: [50, 'اسم العائلة يجب ألا يتجاوز 50 حرفاً'],
    match: [/^[a-zA-Z\u0600-\u06FF\s]+$/, 'الاسم يجب أن يحتوي على أحرف عربية أو إنجليزية فقط']
  },
  
  // ✅ UPDATED: Date of Birth with validation
  dateOfBirth: {
    type: Date,
    required: [true, 'تاريخ الميلاد مطلوب'],
    validate: {
      validator: function(v) {
        if (!v) return false;
        
        const today = new Date();
        const birthDate = new Date(v);
        
        // ✅ Cannot be in the future
        if (birthDate > today) {
          return false;
        }
        
        // ✅ Calculate age
        const age = Math.floor((today - birthDate) / (365.25 * 24 * 60 * 60 * 1000));
        
        // ✅ Age must be between 0-120 years
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
    enum: {
      values: ['male', 'female'],
      message: 'الجنس يجب أن يكون ذكر أو أنثى'
    }
  },
  
  phoneNumber: {
    type: String,
    required: [true, 'رقم الهاتف مطلوب'],
    match: [/^(\+963[0-9]{9}|09[0-9]{8}|0[0-9]{9})$/, 'رقم الهاتف يجب أن يكون بالصيغة السورية']
  },
  
  address: {
    type: String,
    required: false,
    minlength: [5, 'العنوان يجب أن يكون 5 أحرف على الأقل'],
    maxlength: [200, 'العنوان يجب ألا يتجاوز 200 حرف']
  },
  
  // Governorate field
  governorate: {
    type: String,
    required: false,
    enum: {
      values: [
        'damascus', 'rif_dimashq', 'aleppo', 'homs', 'hama', 
        'latakia', 'tartus', 'idlib', 'deir_ez_zor', 'hasakah',
        'raqqa', 'daraa', 'suwayda', 'quneitra'
      ],
      message: 'المحافظة غير صالحة'
    }
  },
  
  // City field
  city: {
    type: String,
    required: false,
    minlength: [2, 'اسم المدينة يجب أن يكون حرفين على الأقل'],
    maxlength: [50, 'اسم المدينة يجب ألا يتجاوز 50 حرفاً']
  }
}, {
  timestamps: true,
  collection: 'persons'
});

// Indexes
personSchema.index({ nationalId: 1 }, { unique: true, sparse: true });
personSchema.index({ childId: 1 }, { unique: true, sparse: true });
personSchema.index({ parentNationalId: 1 });
personSchema.index({ firstName: 1, lastName: 1 });

// ============================================
// PRE-SAVE MIDDLEWARE
// ============================================

// ✅ NEW: Auto-calculate isMinor based on dateOfBirth
personSchema.pre('save', function(next) {
  if (this.dateOfBirth) {
    const today = new Date();
    const birthDate = new Date(this.dateOfBirth);
    const age = Math.floor((today - birthDate) / (365.25 * 24 * 60 * 60 * 1000));
    
    // ✅ Auto-set isMinor flag
    this.isMinor = age < 18;
    
    console.log(`✅ Auto-calculated: age=${age}, isMinor=${this.isMinor}`);
  }
  
  next();
});

// ============================================
// PRE-VALIDATE MIDDLEWARE
// ============================================

// Custom validation: Either nationalId OR parentNationalId must be present
personSchema.pre('validate', function(next) {
  if (this.isMinor) {
    // Minor: must have parentNationalId, nationalId should be null
    if (!this.parentNationalId) {
      this.invalidate('parentNationalId', 'رقم الهوية الوطنية للوالد/الوالدة مطلوب للقاصرين');
    }
    if (this.nationalId) {
      this.invalidate('nationalId', 'القاصرون لا يمكنهم الحصول على رقم هوية وطنية');
    }
  } else {
    // Adult: must have nationalId, parentNationalId should be null
    if (!this.nationalId) {
      this.invalidate('nationalId', 'رقم الهوية الوطنية مطلوب للبالغين');
    }
    if (this.parentNationalId) {
      this.invalidate('parentNationalId', 'البالغون لا يحتاجون لرقم هوية الوالد/الوالدة');
    }
  }
  next();
});

module.exports = mongoose.model('Person', personSchema, 'persons');
