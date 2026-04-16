/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  Doctor Model — Patient 360°
 *  ─────────────────────────────────────────────────────────────────────────
 *  Collection: doctors
 *  Source of truth: patient360_db_final.js (collection 05)
 *
 *  Doctor professional profile. Always linked to an adult Person record.
 *
 *  Specialization is the primary discriminator for what UI tools the doctor
 *  sees — the frontend uses this to decide whether to show ECG AI, X-Ray AI,
 *  etc. The `isECGSpecialist` boolean is denormalized for fast querying.
 *
 *  Verification lifecycle:
 *    • pending   → doctor has applied (via doctor_requests), not yet active
 *    • verified  → admin approved, doctor can log in and see patients
 *    • suspended → temporary disable (license under review, complaint, etc.)
 *    • revoked   → permanent disable (license cancelled by Ministry)
 * ═══════════════════════════════════════════════════════════════════════════
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

// ── Enums (kept in sync with patient360_db_final.js) ────────────────────────

const SPECIALIZATIONS = [
  'cardiology', 'dermatology', 'endocrinology', 'gastroenterology',
  'general_practice', 'gynecology', 'hematology', 'internal_medicine',
  'nephrology', 'neurology', 'oncology', 'ophthalmology',
  'orthopedics', 'otolaryngology', 'pediatrics', 'psychiatry',
  'pulmonology', 'radiology', 'rheumatology', 'surgery',
  'urology', 'vascular_surgery', 'emergency_medicine', 'anesthesiology',
];

const POSITIONS = ['consultant', 'specialist', 'resident', 'intern'];

const EMPLOYMENT_TYPES = ['full-time', 'part-time', 'contract', 'visiting'];

const VERIFICATION_STATUSES = ['pending', 'verified', 'suspended', 'revoked'];

const WEEKDAYS = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday',
  'Thursday', 'Friday', 'Saturday',
];

const CURRENCIES = ['SYP', 'USD'];

// Specializations that get the ECG AI tool by default.
// Used by the pre-save hook to auto-set isECGSpecialist.
const ECG_SPECIALIZATIONS = new Set(['cardiology']);

// ── Main schema ──────────────────────────────────────────────────────────────

const DoctorSchema = new Schema(
  {
    // ── Identity link ─────────────────────────────────────────────────────
    personId: {
      type: Schema.Types.ObjectId,
      ref: 'Person',
      required: [true, 'معرّف الشخص مطلوب'],
      unique: true, // one doctor profile per person
    },

    // ── License & qualifications ──────────────────────────────────────────
    medicalLicenseNumber: {
      type: String,
      required: [true, 'رقم الترخيص الطبي مطلوب'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    specialization: {
      type: String,
      enum: { values: SPECIALIZATIONS, message: 'التخصص غير صالح' },
      required: [true, 'التخصص مطلوب'],
      index: true,
    },
    subSpecialization: { type: String, trim: true },
    yearsOfExperience: {
      type: Number,
      required: [true, 'سنوات الخبرة مطلوبة'],
      min: [0, 'سنوات الخبرة لا يمكن أن تكون سالبة'],
      max: [60, 'سنوات الخبرة يجب ألا تتجاوز 60 سنة'],
    },
    medicalDegree: {
      type: String,
      trim: true,
      // e.g. MD, MBBCh, MBBS
    },
    boardCertifications: { type: [String], default: [] },

    // ── Hospital affiliation ──────────────────────────────────────────────
    hospitalAffiliation: { type: String, trim: true },
    hospitalId: {
      type: Schema.Types.ObjectId,
      ref: 'Hospital',
      sparse: true,
      index: true,
    },
    position: { type: String, enum: POSITIONS },
    employmentType: { type: String, enum: EMPLOYMENT_TYPES },

    // ── Availability & fees ───────────────────────────────────────────────
    availableDays: {
      type: [{ type: String, enum: WEEKDAYS }],
      default: [],
    },
    consultationFee: {
      type: Number,
      required: [true, 'رسوم الاستشارة مطلوبة'],
      min: [0, 'رسوم الاستشارة لا يمكن أن تكون سالبة'],
    },
    followUpFee: { type: Number, min: 0 },
    currency: { type: String, enum: CURRENCIES, default: 'SYP' },

    // ── Flags ─────────────────────────────────────────────────────────────
    isECGSpecialist: { type: Boolean, default: false, index: true },
    isAvailable: { type: Boolean, default: true },
    isAcceptingNewPatients: { type: Boolean, default: true },
    verificationStatus: {
      type: String,
      enum: VERIFICATION_STATUSES,
      default: 'verified',
    },

    // ── Ratings (denormalized for fast doctor list rendering) ─────────────
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0, min: 0 },
  },
  {
    timestamps: true,
    collection: 'doctors',
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// ── Indexes ─────────────────────────────────────────────────────────────────

DoctorSchema.index(
  { isAvailable: 1, isAcceptingNewPatients: 1 },
  { name: 'idx_availability' },
);
DoctorSchema.index({ averageRating: -1 }, { name: 'idx_rating_desc' });

// ── Pre-save: auto-flag isECGSpecialist based on specialization ─────────────

DoctorSchema.pre('save', function autoFlagECG(next) {
  if (this.isModified('specialization')) {
    this.isECGSpecialist = ECG_SPECIALIZATIONS.has(this.specialization);
  }
  next();
});

// ── Query helpers ───────────────────────────────────────────────────────────

DoctorSchema.query.verified = function verified() {
  return this.where({ verificationStatus: 'verified' });
};

DoctorSchema.query.acceptingPatients = function acceptingPatients() {
  return this.where({
    isAvailable: true,
    isAcceptingNewPatients: true,
    verificationStatus: 'verified',
  });
};

DoctorSchema.query.bySpecialization = function bySpecialization(spec) {
  return this.where({ specialization: spec });
};

// ── Instance methods ────────────────────────────────────────────────────────

/**
 * Recompute averageRating from the reviews collection. Called after a new
 * review is approved or removed. Keeps the denormalized rating fresh without
 * a full collection scan on every page load.
 *
 * @returns {Promise<void>}
 */
DoctorSchema.methods.refreshRating = async function refreshRating() {
  const Review = mongoose.model('Review');
  const result = await Review.aggregate([
    { $match: { doctorId: this._id, status: 'approved' } },
    {
      $group: {
        _id: '$doctorId',
        avg: { $avg: '$rating' },
        count: { $sum: 1 },
      },
    },
  ]);

  if (result.length > 0) {
    this.averageRating = Number(result[0].avg.toFixed(2));
    this.totalReviews = result[0].count;
  } else {
    this.averageRating = 0;
    this.totalReviews = 0;
  }
  return this.save();
};

module.exports = mongoose.model('Doctor', DoctorSchema);