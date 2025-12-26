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
  availableTimes: {
    start: { type: String, default: '09:00' },
    end: { type: String, default: '17:00' }
  }
}, {
  timestamps: true,
  collection: 'doctors'
});

// Indexes
doctorSchema.index({ personId: 1 }, { unique: true });
doctorSchema.index({ medicalLicenseNumber: 1 }, { unique: true });
doctorSchema.index({ specialization: 1 });

module.exports = mongoose.model('Doctor', doctorSchema, 'doctors');
