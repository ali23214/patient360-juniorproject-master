const mongoose = require('mongoose');

const visitSchema = new mongoose.Schema({
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Basic Information
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Person',
    required: [true, 'معرف المريض مطلوب'],
    index: true
  },
  
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: [true, 'معرف الطبيب مطلوب'],
    index: true
  },
  
  // ✅ UPDATED: Visit Date with range validation
  visitDate: {
    type: Date,
    required: [true, 'تاريخ الزيارة مطلوب'],
    default: Date.now,
    index: true,
    validate: {
      validator: function(v) {
        if (!v) return false;
        
        const visitDate = new Date(v);
        const today = new Date();
        
        // ✅ Calculate date ranges
        const oneYearFromNow = new Date();
        oneYearFromNow.setFullYear(today.getFullYear() + 1);
        
        const tenYearsAgo = new Date();
        tenYearsAgo.setFullYear(today.getFullYear() - 10);
        
        // ✅ Visit date must be within reasonable range:
        // - Not more than 1 year in the future
        // - Not more than 10 years in the past
        return visitDate <= oneYearFromNow && visitDate >= tenYearsAgo;
      },
      message: 'تاريخ الزيارة يجب أن يكون خلال السنة القادمة أو خلال الـ 10 سنوات الماضية'
    }
  },
  
  visitType: {
    type: String,
    enum: {
      values: ['regular', 'emergency', 'followup'],
      message: 'نوع الزيارة غير صالح'
    },
    default: 'regular',
    index: true
  },
  
  status: {
    type: String,
    enum: {
      values: ['scheduled', 'completed', 'cancelled'],
      message: 'حالة الزيارة غير صالحة'
    },
    default: 'completed',
    index: true
  },
  
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Medical Data (Visible to Patient)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  chiefComplaint: {
    type: String,
    required: [true, 'الشكوى الرئيسية مطلوبة'],
    trim: true,
    minlength: [5, 'الشكوى الرئيسية يجب أن تكون 5 أحرف على الأقل'],
    maxlength: [2000, 'الشكوى الرئيسية لا يمكن أن تتجاوز 2000 حرف']
  },
  
  diagnosis: {
    type: String,
    required: [true, 'التشخيص مطلوب'],
    trim: true,
    minlength: [5, 'التشخيص يجب أن يكون 5 أحرف على الأقل'],
    maxlength: [2000, 'التشخيص لا يمكن أن يتجاوز 2000 حرف']
  },
  
  prescribedMedications: [{
    medicationName: {
      type: String,
      required: [true, 'اسم الدواء مطلوب'],
      trim: true,
      minlength: [2, 'اسم الدواء يجب أن يكون حرفين على الأقل'],
      maxlength: [100, 'اسم الدواء لا يمكن أن يتجاوز 100 حرف']
    },
    dosage: {
      type: String,
      required: [true, 'الجرعة مطلوبة'],
      trim: true,
      minlength: [2, 'الجرعة يجب أن تكون حرفين على الأقل'],
      maxlength: [50, 'الجرعة لا يمكن أن تتجاوز 50 حرف']
    },
    frequency: {
      type: String,
      required: [true, 'التكرار مطلوب'],
      trim: true,
      minlength: [3, 'التكرار يجب أن يكون 3 أحرف على الأقل'],
      maxlength: [100, 'التكرار لا يمكن أن يتجاوز 100 حرف']
    },
    duration: {
      type: String,
      required: [true, 'المدة مطلوبة'],
      trim: true,
      minlength: [2, 'المدة يجب أن تكون حرفين على الأقل'],
      maxlength: [50, 'المدة لا يمكن أن تتجاوز 50 حرف']
    }
  }],
  
  doctorNotes: {
    type: String,
    trim: true,
    maxlength: [5000, 'ملاحظات الطبيب لا يمكن أن تتجاوز 5000 حرف']
  },
  
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Attachments (Images/PDFs)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  attachments: [{
    fileName: {
      type: String,
      required: [true, 'اسم الملف مطلوب'],
      trim: true,
      maxlength: [255, 'اسم الملف يجب ألا يتجاوز 255 حرفاً']
    },
    fileType: {
      type: String,
      required: [true, 'نوع الملف مطلوب'],
      enum: {
        values: ['image', 'pdf', 'document'],
        message: 'نوع الملف يجب أن يكون image أو pdf أو document'
      }
    },
    mimeType: {
      type: String,
      required: [true, 'نوع MIME مطلوب'],
      enum: {
        values: [
          'image/jpeg',
          'image/jpg', 
          'image/png',
          'image/gif',
          'image/webp',
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ],
        message: 'نوع الملف غير مدعوم'
      }
    },
    fileSize: {
      type: Number,
      required: [true, 'حجم الملف مطلوب'],
      min: [1, 'حجم الملف يجب أن يكون أكبر من 0'],
      max: [10485760, 'حجم الملف يجب ألا يتجاوز 10MB (10485760 bytes)']
    },
    filePath: {
      type: String,
      required: [true, 'مسار الملف مطلوب'],
      trim: true,
      maxlength: [500, 'مسار الملف يجب ألا يتجاوز 500 حرف']
    },
    fileUrl: {
      type: String,
      trim: true,
      maxlength: [500, 'رابط الملف يجب ألا يتجاوز 500 حرف']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [200, 'وصف الملف يجب ألا يتجاوز 200 حرف'],
      default: ''
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: [true, 'معرف المستخدم الذي رفع الملف مطلوب']
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }]
  
}, {
  timestamps: true,
  collection: 'visits'
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Indexes for Performance
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
visitSchema.index({ patientId: 1, visitDate: -1 });
visitSchema.index({ doctorId: 1, visitDate: -1 });
visitSchema.index({ status: 1 });
visitSchema.index({ visitDate: 1 });
visitSchema.index({ visitType: 1 });

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Virtuals for Population
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
visitSchema.virtual('patient', {
  ref: 'Person',
  localField: 'patientId',
  foreignField: '_id',
  justOne: true
});

visitSchema.virtual('doctor', {
  ref: 'Doctor',
  localField: 'doctorId',
  foreignField: '_id',
  justOne: true
});

// Enable virtuals in JSON
visitSchema.set('toJSON', { virtuals: true });
visitSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Visit', visitSchema);
