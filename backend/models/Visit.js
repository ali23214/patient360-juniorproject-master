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
  
  visitDate: {
    type: Date,
    required: [true, 'تاريخ الزيارة مطلوب'],
    default: Date.now,
    index: true
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
  }
  
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