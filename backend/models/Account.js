const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const accountSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'البريد الإلكتروني مطلوب'],
    unique: true,
    lowercase: true,
    match: [/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, 'البريد الإلكتروني غير صحيح']
  },
  
  // ✅ UPDATED: Password with strength validation
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
        
        // ✅ Password strength requirements:
        // - At least 8 characters
        // - At least 1 uppercase letter (A-Z)
        // - At least 1 lowercase letter (a-z)
        // - At least 1 number (0-9)
        // - At least 1 special character (!@#$%^&*)
        
        const hasUppercase = /[A-Z]/.test(v);
        const hasLowercase = /[a-z]/.test(v);
        const hasNumber = /[0-9]/.test(v);
        const hasSpecial = /[!@#$%^&*]/.test(v);
        
        return hasUppercase && hasLowercase && hasNumber && hasSpecial;
      },
      message: 'كلمة المرور يجب أن تحتوي على: حرف كبير، حرف صغير، رقم، ورمز خاص (!@#$%^&*)'
    }
  },
  
  roles: {
    type: [String],
    required: true,
    validate: {
      validator: function(roles) {
        return roles.length >= 1 && roles.length <= 4;
      },
      message: 'يجب أن يكون هناك دور واحد على الأقل و 4 أدوار كحد أقصى'
    },
    enum: {
      values: ['patient', 'doctor', 'admin', 'pharmacist', 'laboratory'],
      message: 'الدور غير صالح'
    },
    default: ['patient']
  },
  
  personId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Person',
    required: [true, 'معرف الشخص مطلوب']
  },
  
  isActive: {
    type: Boolean,
    required: [true, 'حالة الحساب مطلوبة'],
    default: true
  },
  
  lastLogin: {
    type: Date,
    default: null
  },
  
  // ==========================================
  // DEACTIVATION TRACKING FIELDS
  // ==========================================
  deactivationReason: {
    type: String,
    enum: {
      values: ['death', 'license_revoked', 'user_request', 'fraud', 'retirement', 'transfer', 'other', null],
      message: 'سبب إلغاء التفعيل غير صالح'
    },
    default: null
  },
  
  deactivationNotes: {
    type: String,
    maxlength: [1000, 'ملاحظات إلغاء التفعيل يجب ألا تتجاوز 1000 حرف'],
    default: null
  },
  
  deactivatedAt: {
    type: Date,
    default: null
  },
  
  deactivatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    default: null
  },
  
  // ==========================================
  // REACTIVATION TRACKING FIELDS
  // ==========================================
  reactivatedAt: {
    type: Date,
    default: null
  },
  
  reactivatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    default: null
  },
  
  // ==========================================
  // FORGET PASSWORD FIELDS
  // ==========================================
  resetPasswordOTP: {
    type: String,
    default: null
  },
  
  resetPasswordExpires: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  collection: 'accounts'
});

// ==========================================
// PRE-SAVE MIDDLEWARE: Hash password
// ==========================================
accountSchema.pre('save', async function(next) {
  // Only hash if password is modified
  if (!this.isModified('password')) {
    return next();
  }

  try {
    // ✅ Check if password is already hashed
    const isAlreadyHashed = this.password.startsWith('$2b$') || this.password.startsWith('$2a$');
    
    if (isAlreadyHashed) {
      console.log('✅ Password already hashed, skipping hash');
      return next();
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    console.log('✅ Password hashed successfully');
    next();
  } catch (error) {
    console.error('❌ Password hashing error:', error);
    next(error);
  }
});

// ==========================================
// INSTANCE METHOD: Compare password
// ==========================================
accountSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    console.error('❌ Password comparison error:', error);
    return false;
  }
};

// ==========================================
// INDEXES
// ==========================================
accountSchema.index({ email: 1 }, { unique: true });
accountSchema.index({ personId: 1 });
accountSchema.index({ isActive: 1 });

module.exports = mongoose.model('Account', accountSchema, 'accounts');
