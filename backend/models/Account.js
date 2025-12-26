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
  password: {
    type: String,
    required: [true, 'كلمة المرور مطلوبة'],
    minlength: [8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل']
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
  
  // NEW: Deactivation tracking fields
  deactivationReason: {
    type: String,
    enum: ['death', 'license_revoked', 'user_request', 'fraud', 'retirement', 'transfer', 'other', null],
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
  reactivatedAt: {
    type: Date,
    default: null
  },
  reactivatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    default: null
  }
}, {
  timestamps: true,
  collection: 'accounts'
});

// Hash password before saving
accountSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    console.log('✅ Password hashed successfully');
    next();
  } catch (error) {
    console.error('❌ Password hashing error:', error);
    next(error);
  }
});

// Compare password method
accountSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    console.error('❌ Password comparison error:', error);
    return false;
  }
};

// Indexes
accountSchema.index({ email: 1 }, { unique: true });
accountSchema.index({ personId: 1 });
accountSchema.index({ isActive: 1 });

module.exports = mongoose.model('Account', accountSchema, 'accounts');
