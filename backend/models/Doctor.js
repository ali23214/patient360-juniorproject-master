const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
  personId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Person',
    required: [true, 'معرف الشخص مطلوب'],
    unique: true
  },
  
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
    enum: {
      values: [
        'Cardiologist',
        'Pulmonologist',
        'General Practitioner',
        'Infectious Disease Specialist',
        'Intensive Care Specialist',
        'Rheumatologist',
        'Orthopedic Surgeon',
        'Neurologist',
        'Endocrinologist',
        'Dermatologist',
        'Gastroenterologist',
        'General Surgeon',
        'Hepatologist',
        'Urologist',
        'Gynecologist',
        'Psychiatrist',
        'Hematologist',
        'Oncologist',
        'ENT Specialist',
        'Ophthalmologist',
        'Pediatrician',
        'Nephrologist',
        'Internal Medicine',
        'Emergency Medicine'
      ],
      message: 'التخصص غير صالح'
    }
  },
  
  subSpecialization: {
    type: String,
    default: null,
    minlength: [3, 'التخصص الفرعي يجب أن يكون 3 أحرف على الأقل'],
    maxlength: [100, 'التخصص الفرعي يجب ألا يتجاوز 100 حرف']
  },
  
  yearsOfExperience: {
    type: Number,
    default: 0,
    min: [0, 'سنوات الخبرة يجب أن تكون 0 على الأقل'],
    max: [60, 'سنوات الخبرة يجب ألا تتجاوز 60 سنة']
  },
  
  hospitalAffiliation: {
    type: String,
    required: [true, 'اسم المستشفى مطلوب'],
    trim: true,
    minlength: [3, 'اسم المستشفى يجب أن يكون 3 أحرف على الأقل'],
    maxlength: [150, 'اسم المستشفى يجب ألا يتجاوز 150 حرفاً']
  },
  
  availableDays: {
    type: [String],
    required: [true, 'أيام العمل مطلوبة'],
    validate: {
      validator: function(days) {
        return days.length >= 1 && days.length <= 7;
      },
      message: 'يجب أن يكون هناك يوم واحد على الأقل و 7 أيام كحد أقصى'
    },
    enum: {
      values: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      message: 'اسم اليوم غير صالح'
    }
  },
  
  consultationFee: {
    type: Number,
    default: 0,
    min: [0, 'رسوم الاستشارة يجب أن تكون 0 أو أكثر'],
    max: [1000000, 'رسوم الاستشارة يجب ألا تتجاوز 1,000,000']
  },
  
  // ✅ UPDATED: Available Times with validation
  availableTimes: {
    start: { 
      type: String, 
      default: '09:00',
      // ✅ NEW: Format validation for start time
      validate: {
        validator: function(v) {
          if (!v) return true;
          // HH:mm format (e.g., 09:00, 14:30)
          return /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(v);
        },
        message: 'وقت البدء يجب أن يكون بالصيغة HH:mm (مثال: 09:00)'
      }
    },
    end: { 
      type: String, 
      default: '17:00',
      // ✅ NEW: Format validation for end time
      validate: {
        validator: function(v) {
          if (!v) return true;
          // HH:mm format
          return /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(v);
        },
        message: 'وقت الانتهاء يجب أن يكون بالصيغة HH:mm (مثال: 17:00)'
      }
    }
  },
  
  // ==================== FILE UPLOADS ====================
  // Medical Certificate (شهادة الطب)
  medicalCertificate: {
    fileName: { type: String },
    filePath: { type: String },
    fileUrl: { type: String },
    mimeType: { type: String },
    fileSize: { type: Number },
    uploadedAt: { type: Date }
  },
  
  // License Document (الترخيص الطبي)
  licenseDocument: {
    fileName: { type: String },
    filePath: { type: String },
    fileUrl: { type: String },
    mimeType: { type: String },
    fileSize: { type: Number },
    uploadedAt: { type: Date }
  },
  
  // Profile Photo (الصورة الشخصية)
  profilePhoto: {
    fileName: { type: String },
    filePath: { type: String },
    fileUrl: { type: String },
    mimeType: { type: String },
    fileSize: { type: Number },
    uploadedAt: { type: Date }
  }
}, {
  timestamps: true,
  collection: 'doctors'
});

// ============================================
// PRE-VALIDATE MIDDLEWARE
// ============================================

// ✅ NEW: Validate that end time is after start time
doctorSchema.pre('validate', function(next) {
  if (this.availableTimes && this.availableTimes.start && this.availableTimes.end) {
    const start = this.availableTimes.start;
    const end = this.availableTimes.end;
    
    // Convert HH:mm to minutes for comparison
    const startMinutes = parseInt(start.split(':')[0]) * 60 + parseInt(start.split(':')[1]);
    const endMinutes = parseInt(end.split(':')[0]) * 60 + parseInt(end.split(':')[1]);
    
    if (endMinutes <= startMinutes) {
      this.invalidate('availableTimes.end', 'وقت الانتهاء يجب أن يكون بعد وقت البدء');
    }
  }
  next();
});

// Indexes
doctorSchema.index({ personId: 1 }, { unique: true });
doctorSchema.index({ medicalLicenseNumber: 1 }, { unique: true });
doctorSchema.index({ specialization: 1 });

module.exports = mongoose.model('Doctor', doctorSchema, 'doctors');
