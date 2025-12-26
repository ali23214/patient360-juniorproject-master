const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  personId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Person',
    required: [true, 'معرف الشخص مطلوب'],
    unique: true
  },
  
  bloodType: {
    type: String,
    enum: {
      values: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
      message: 'فصيلة الدم غير صالحة'
    }
  },
  
  height: {
    type: Number,
    min: [50, 'الطول يجب أن يكون بين 50 و 250 سم'],
    max: [250, 'الطول يجب أن يكون بين 50 و 250 سم']
  },
  
  weight: {
    type: Number,
    min: [2, 'الوزن يجب أن يكون بين 2 و 300 كجم'],
    max: [300, 'الوزن يجب أن يكون بين 2 و 300 كجم']
  },
  
  allergies: [{
    type: String,
    minlength: [2, 'كل حساسية يجب أن تكون حرفين على الأقل'],
    maxlength: [100, 'كل حساسية يجب ألا تتجاوز 100 حرف']
  }],
  
  chronicDiseases: [{
    type: String,
    minlength: [2, 'كل مرض يجب أن يكون حرفين على الأقل'],
    maxlength: [100, 'كل مرض يجب ألا يتجاوز 100 حرف']
  }],
  
  familyHistory: [{
    type: String,
    minlength: [5, 'كل سجل عائلي يجب أن يكون 5 أحرف على الأقل'],
    maxlength: [200, 'كل سجل عائلي يجب ألا يتجاوز 200 حرف']
  }],
  
  smokingStatus: {
    type: String,
    enum: {
      values: ['non-smoker', 'former smoker', 'current smoker'],
      message: 'حالة التدخين غير صالحة'
    }
  },
  
  // NEW: Current Medications
  currentMedications: [{
    medicationName: {
      type: String,
      required: [true, 'اسم الدواء مطلوب']
    },
    dosage: {
      type: String,
      required: [true, 'الجرعة مطلوبة'],
      match: [/^[0-9]+\s?(mg|g|ml|units?)$/i, 'الجرعة يجب أن تكون بالصيغة: 500mg أو 2g أو 10ml']
    },
    frequency: {
      type: String,
      required: [true, 'التكرار مطلوب']
    },
    startDate: {
      type: Date,
      required: [true, 'تاريخ البدء مطلوب']
    },
    endDate: {
      type: Date
    },
    prescribedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor'
    },
    visitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Visit'
    },
    isActive: {
      type: Boolean,
      default: true
    },
    notes: {
      type: String,
      maxlength: [500, 'الملاحظات يجب ألا تتجاوز 500 حرف']
    }
  }],
  
  // NEW: Children (for parents)
  children: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient'
  }],
  
  emergencyContact: {
    name: {
      type: String,
      required: [true, 'اسم جهة الاتصال للطوارئ مطلوب'],
      minlength: [2, 'الاسم يجب أن يكون حرفين على الأقل'],
      maxlength: [100, 'الاسم يجب ألا يتجاوز 100 حرف'],
      match: [/^[a-zA-Z\u0600-\u06FF\s]+$/, 'الاسم يجب أن يحتوي على أحرف عربية أو إنجليزية فقط']
    },
    relationship: {
      type: String,
      required: [true, 'صلة القرابة مطلوبة'],
      minlength: [2, 'صلة القرابة يجب أن تكون حرفين على الأقل'],
      maxlength: [50, 'صلة القرابة يجب ألا تتجاوز 50 حرفاً']
    },
    phoneNumber: {
      type: String,
      required: [true, 'رقم هاتف الطوارئ مطلوب'],
      match: [/^(\+963[0-9]{9}|09[0-9]{8}|0[0-9]{9})$/, 'رقم الهاتف يجب أن يكون بالصيغة السورية']
    }
  }
}, {
  timestamps: true,
  collection: 'patients'
});

// Indexes
patientSchema.index({ personId: 1 }, { unique: true });

module.exports = mongoose.model('Patient', patientSchema, 'patients');