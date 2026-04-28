/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  DoctorRequest Model — Patient 360°
 *  ─────────────────────────────────────────────────────────────────────────
 *  Collection: doctor_requests
 *  Source of truth: patient360_db_final.js (collection 22)
 *
 *  Professional registration applications submitted via the public SignUp
 *  page. Supports THREE request types via the `requestType` discriminator:
 *
 *    • 'doctor'         — doctor registration (original flow)
 *    • 'pharmacist'     — pharmacist registration (v2 addition)
 *    • 'lab_technician' — lab technician registration (v2 addition)
 *
 *  Admin reviews each application and either:
 *    • approves → triggers creation of Person + Account + role-specific records
 *    • rejects  → request is archived with a rejection reason
 *
 *  The flat field structure (firstName, fatherName, etc. at the top level
 *  rather than nested inside `personalInfo`) matches what AdminDashboard.jsx
 *  expects. Do NOT nest these — the UI breaks if you do.
 *
 *  ───────────────────────────────────────────────────────────────────────
 *  ⚠️  SECURITY NOTE on `plainPassword`:
 *  See original comment block — plaintext stored intentionally per team
 *  agreement for admin credential handoff workflow.
 *  ───────────────────────────────────────────────────────────────────────
 * ═══════════════════════════════════════════════════════════════════════════
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

// ── Enums ───────────────────────────────────────────────────────────────────

const GOVERNORATES = [
  'damascus', 'aleppo', 'homs', 'hama', 'latakia', 'tartus',
  'idlib', 'deir_ez_zor', 'raqqa', 'hasakah', 'daraa',
  'as_suwayda', 'quneitra', 'rif_dimashq',
];

// Doctor specializations (from patient360_db_final.js — doctors collection)
const DOCTOR_SPECIALIZATIONS = [
  'cardiology', 'dermatology', 'endocrinology', 'gastroenterology',
  'general_practice', 'gynecology', 'hematology', 'internal_medicine',
  'nephrology', 'neurology', 'oncology', 'ophthalmology',
  'orthopedics', 'otolaryngology', 'pediatrics', 'psychiatry',
  'pulmonology', 'radiology', 'rheumatology', 'surgery',
  'urology', 'vascular_surgery', 'emergency_medicine', 'anesthesiology',
];

// Pharmacist specializations (from patient360_db_final.js — pharmacists collection)
const PHARMACIST_SPECIALIZATIONS = [
  'Clinical Pharmacy', 'Hospital Pharmacy', 'Community Pharmacy',
  'Industrial Pharmacy', 'Pharmacology',
];

// Lab technician specializations (from patient360_db_final.js — lab_technicians collection)
const LAB_TECH_SPECIALIZATIONS = [
  'Clinical Chemistry', 'Hematology', 'Microbiology',
  'Immunology', 'Molecular Biology', 'Histopathology',
];

// Combined — all valid specialization values across all three types
const ALL_SPECIALIZATIONS = [
  ...DOCTOR_SPECIALIZATIONS,
  ...PHARMACIST_SPECIALIZATIONS,
  ...LAB_TECH_SPECIALIZATIONS,
];

const REQUEST_TYPES = ['doctor', 'pharmacist', 'lab_technician'];

const STATUSES = ['pending', 'approved', 'rejected'];

const REJECTION_REASONS = [
  'invalid_license', 'fake_documents', 'incomplete_info',
  'duplicate', 'license_expired', 'other',
];

const CURRENCIES = ['SYP', 'USD'];

const GENDERS = ['male', 'female'];

// Pharmacist degrees (from patient360_db_final.js)
const PHARMACIST_DEGREES = ['PharmD', 'BSc Pharmacy', 'MSc Pharmacy'];

// Lab technician degrees (from patient360_db_final.js)
const LAB_TECH_DEGREES = ['Diploma', 'BSc Medical Laboratory', 'MSc Medical Laboratory'];

// Lab technician positions (from patient360_db_final.js)
const LAB_TECH_POSITIONS = ['senior_technician', 'technician', 'assistant'];

// Employment types (shared across pharmacists)
const EMPLOYMENT_TYPES = ['full-time', 'part-time', 'shift-based'];

// ── Sub-schema: uploaded document ───────────────────────────────────────────

const UploadedDocumentSchema = new Schema(
  {
    fileName: { type: String, trim: true },
    filePath: { type: String, trim: true },
    fileUrl: { type: String, trim: true },
    mimeType: { type: String, trim: true },
    fileSize: { type: Number, min: 0 },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

// ── Main schema ──────────────────────────────────────────────────────────────

const DoctorRequestSchema = new Schema(
  {
    // ── Request type discriminator ────────────────────────────────────────
    // Tells the admin dashboard and approval logic what type of professional
    // this request is for. Defaults to 'doctor' for backward compatibility.
    requestType: {
      type: String,
      enum: REQUEST_TYPES,
      default: 'doctor',
    },

    // ── Public-facing request ID (human-readable, e.g. REQ-20260415-00001) ─
    requestId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },

    // ── Personal info (FLAT — matches AdminDashboard.jsx) ─────────────────
    // Shared across ALL request types (doctor, pharmacist, lab_technician)
    firstName: {
      type: String,
      required: [true, 'الاسم الأول مطلوب'],
      trim: true,
      minlength: 2,
      maxlength: 50,
    },
    fatherName: {
      type: String,
      required: [true, 'اسم الأب مطلوب'],
      trim: true,
      minlength: 2,
      maxlength: 50,
    },
    lastName: {
      type: String,
      required: [true, 'اسم العائلة مطلوب'],
      trim: true,
      minlength: 2,
      maxlength: 50,
    },
    motherName: {
      type: String,
      required: [true, 'اسم الأم مطلوب'],
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    nationalId: {
      type: String,
      required: [true, 'الرقم الوطني مطلوب'],
      match: [/^\d{11}$/, 'الرقم الوطني يجب أن يكون 11 رقم بالضبط'],
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: [true, 'البريد الإلكتروني مطلوب'],
      trim: true,
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'البريد الإلكتروني غير صحيح'],
      index: true,
    },
    phoneNumber: {
      type: String,
      required: [true, 'رقم الهاتف مطلوب'],
      trim: true,
    },
    dateOfBirth: {
      type: Date,
      required: [true, 'تاريخ الميلاد مطلوب'],
    },
    gender: {
      type: String,
      enum: GENDERS,
      required: [true, 'الجنس مطلوب'],
    },
    governorate: {
      type: String,
      enum: GOVERNORATES,
      required: [true, 'المحافظة مطلوبة'],
    },
    city: {
      type: String,
      required: [true, 'المدينة مطلوبة'],
      trim: true,
    },
    address: {
      type: String,
      required: [true, 'العنوان مطلوب'],
      trim: true,
    },

    // ── Credentials ───────────────────────────────────────────────────────
    password: {
      type: String,
      required: [true, 'كلمة المرور مطلوبة'],
      select: false,
    },
    plainPassword: {
      type: String,
      select: false,
    },

    // ══════════════════════════════════════════════════════════════════════
    // DOCTOR-SPECIFIC FIELDS (used when requestType = 'doctor')
    // NOT required — because pharmacist/lab requests don't have these
    // ══════════════════════════════════════════════════════════════════════
    medicalLicenseNumber: {
      type: String,
      trim: true,
      uppercase: true,
      index: true,
    },
    specialization: {
      type: String,
      enum: ALL_SPECIALIZATIONS,
    },
    subSpecialization: { type: String, trim: true },
    yearsOfExperience: {
      type: Number,
      min: 0,
      max: 60,
    },
    hospitalAffiliation: {
      type: String,
      trim: true,
    },
    consultationFee: {
      type: Number,
      min: 0,
    },
    currency: { type: String, enum: CURRENCIES, default: 'SYP' },
    availableDays: { type: [String], default: [] },

    // ══════════════════════════════════════════════════════════════════════
    // PHARMACIST-SPECIFIC FIELDS (used when requestType = 'pharmacist')
    // ══════════════════════════════════════════════════════════════════════
    pharmacyLicenseNumber: {
      type: String,
      trim: true,
      uppercase: true,
    },
    degree: {
      type: String,
      enum: [...PHARMACIST_DEGREES, ...LAB_TECH_DEGREES],
    },
    employmentType: {
      type: String,
      enum: EMPLOYMENT_TYPES,
    },
    pharmacyId: {
      type: Schema.Types.ObjectId,
      ref: 'Pharmacy',
    },
    newPharmacyData: {
      type: Schema.Types.Mixed,
    },

    // ══════════════════════════════════════════════════════════════════════
    // LAB TECHNICIAN-SPECIFIC FIELDS (used when requestType = 'lab_technician')
    // ══════════════════════════════════════════════════════════════════════
    licenseNumber: {
      type: String,
      trim: true,
      uppercase: true,
    },
    position: {
      type: String,
      enum: LAB_TECH_POSITIONS,
    },
    laboratoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Laboratory',
    },
    newLaboratoryData: {
      type: Schema.Types.Mixed,
    },

    // ── Additional notes (all types) ──────────────────────────────────────
    additionalNotes: { type: String, trim: true },

    // ── Documents submitted ───────────────────────────────────────────────
    licenseDocument: { type: UploadedDocumentSchema },
    medicalCertificate: { type: UploadedDocumentSchema },
    degreeDocument: { type: UploadedDocumentSchema },
    profilePhoto: { type: UploadedDocumentSchema },

    // Legacy URL-only fields (backwards compatibility)
    licenseDocumentUrl: { type: String, trim: true },
    degreeDocumentUrl: { type: String, trim: true },
    nationalIdDocumentUrl: { type: String, trim: true },

    // ── Review workflow ───────────────────────────────────────────────────
    status: {
      type: String,
      enum: STATUSES,
      default: 'pending',
      index: true,
    },
    reviewedAt: { type: Date },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'Account' },
    rejectionReason: { type: String, enum: REJECTION_REASONS },
    rejectionDetails: { type: String, trim: true },
    adminNotes: { type: String, trim: true },

    // ── Created records (set after approval — for traceability) ───────────
    createdPersonId: { type: Schema.Types.ObjectId, ref: 'Person' },
    createdAccountId: { type: Schema.Types.ObjectId, ref: 'Account' },
    createdDoctorId: { type: Schema.Types.ObjectId, ref: 'Doctor' },
  },
  {
    timestamps: true,
    collection: 'doctor_requests',
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// ── Indexes ─────────────────────────────────────────────────────────────────

DoctorRequestSchema.index(
  { status: 1, createdAt: -1 },
  { name: 'idx_status_date' },
);

DoctorRequestSchema.index(
  { requestType: 1, status: 1 },
  { name: 'idx_type_status' },
);

// ── Virtuals ────────────────────────────────────────────────────────────────

DoctorRequestSchema.virtual('fullName').get(function () {
  return [this.firstName, this.fatherName, this.lastName]
    .filter(Boolean)
    .join(' ');
});

DoctorRequestSchema.virtual('isPending').get(function () {
  return this.status === 'pending';
});

// ── Static helpers ──────────────────────────────────────────────────────────

DoctorRequestSchema.statics.generateRequestId = async function generateRequestId() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const datePart = `${yyyy}${mm}${dd}`;
  const prefix = `REQ-${datePart}-`;

  const todayCount = await this.countDocuments({
    requestId: { $regex: `^${prefix}` },
  });

  const sequence = String(todayCount + 1).padStart(5, '0');
  return `${prefix}${sequence}`;
};

// ── Pre-save: auto-generate requestId on first save ─────────────────────────

DoctorRequestSchema.pre('save', async function autoGenerateRequestId(next) {
  if (this.isNew && !this.requestId) {
    try {
      this.requestId = await this.constructor.generateRequestId();
    } catch (err) {
      return next(err);
    }
  }
  return next();
});

// ── Query helpers ───────────────────────────────────────────────────────────

DoctorRequestSchema.query.pending = function pending() {
  return this.where({ status: 'pending' });
};

DoctorRequestSchema.query.reviewed = function reviewed() {
  return this.where({ status: { $in: ['approved', 'rejected'] } });
};

DoctorRequestSchema.query.ofType = function ofType(requestType) {
  return this.where({ requestType });
};

// ── Instance methods ────────────────────────────────────────────────────────

DoctorRequestSchema.methods.markApproved = async function markApproved(
  adminAccountId,
  createdRecords,
  notes,
) {
  if (this.status !== 'pending') {
    throw new Error(`لا يمكن قبول طلب حالته ${this.status}`);
  }
  this.status = 'approved';
  this.reviewedAt = new Date();
  this.reviewedBy = adminAccountId;
  this.adminNotes = notes || '';
  this.createdPersonId = createdRecords.personId;
  this.createdAccountId = createdRecords.accountId;
  this.createdDoctorId = createdRecords.doctorId;
  return this.save();
};

DoctorRequestSchema.methods.markRejected = async function markRejected(
  adminAccountId,
  reason,
  details,
) {
  if (this.status !== 'pending') {
    throw new Error(`لا يمكن رفض طلب حالته ${this.status}`);
  }
  if (!REJECTION_REASONS.includes(reason)) {
    throw new Error(`سبب الرفض غير صالح: ${reason}`);
  }
  this.status = 'rejected';
  this.reviewedAt = new Date();
  this.reviewedBy = adminAccountId;
  this.rejectionReason = reason;
  this.rejectionDetails = details || '';
  return this.save();
};

module.exports = mongoose.model('DoctorRequest', DoctorRequestSchema);