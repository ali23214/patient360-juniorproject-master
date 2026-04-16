/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  DoctorRequest Model — Patient 360°
 *  ─────────────────────────────────────────────────────────────────────────
 *  Collection: doctor_requests
 *  Source of truth: patient360_db_final.js (collection 22)
 *
 *  Doctor registration applications submitted via the public SignUp page.
 *  Admin reviews each application and either:
 *    • approves → triggers creation of Person + Account + Doctor records
 *    • rejects  → request is archived with a rejection reason
 *
 *  ───────────────────────────────────────────────────────────────────────
 *  ⚠️  SECURITY NOTE on `plainPassword`:
 *
 *  This model intentionally stores BOTH:
 *    • password       — bcrypt hash (used when creating the Account on approval)
 *    • plainPassword  — plaintext (shown to admin on the approval screen)
 *
 *  This is a deliberate product decision (per team agreement) to support the
 *  workflow: admin approves → admin tells doctor their password verbally /
 *  via secure channel → doctor logs in for the first time.
 *
 *  Tradeoffs accepted:
 *    1. plainPassword is a sensitive field — anyone with DB read access on
 *       this collection can see it. Mitigation: collection-level access
 *       controls, no bulk export of doctor_requests.
 *    2. plainPassword is only useful until the doctor first logs in and
 *       changes their password. A future enhancement could clear this field
 *       on first successful login.
 *    3. plainPassword is not returned by default — `select: false` requires
 *       controllers to explicitly opt in via `.select('+plainPassword')`.
 *  ───────────────────────────────────────────────────────────────────────
 *
 *  The flat field structure (firstName, fatherName, etc. at the top level
 *  rather than nested inside `personalInfo`) matches what AdminDashboard.jsx
 *  expects. Do NOT nest these — the UI breaks if you do.
 * ═══════════════════════════════════════════════════════════════════════════
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

// ── Enums (kept in sync with locked schema) ─────────────────────────────────

const GOVERNORATES = [
  'damascus', 'aleppo', 'homs', 'hama', 'latakia', 'tartus',
  'idlib', 'deir_ez_zor', 'raqqa', 'hasakah', 'daraa',
  'as_suwayda', 'quneitra', 'rif_dimashq',
];

const SPECIALIZATIONS = [
  'cardiology', 'dermatology', 'endocrinology', 'gastroenterology',
  'general_practice', 'gynecology', 'hematology', 'internal_medicine',
  'nephrology', 'neurology', 'oncology', 'ophthalmology',
  'orthopedics', 'otolaryngology', 'pediatrics', 'psychiatry',
  'pulmonology', 'radiology', 'rheumatology', 'surgery',
  'urology', 'vascular_surgery', 'emergency_medicine', 'anesthesiology',
];

const STATUSES = ['pending', 'approved', 'rejected'];

const REJECTION_REASONS = [
  'invalid_license', 'fake_documents', 'incomplete_info',
  'duplicate', 'license_expired', 'other',
];

const CURRENCIES = ['SYP', 'USD'];

const GENDERS = ['male', 'female'];

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
    // ── Public-facing request ID (human-readable, e.g. REQ-20260415-00001) ─
    requestId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },

    // ── Personal info (FLAT — matches AdminDashboard.jsx) ─────────────────
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

    // ── Credentials (see security note at top of file) ────────────────────
    password: {
      type: String,
      required: [true, 'كلمة المرور مطلوبة'],
      select: false, // bcrypt hash — never returned by default
    },
    plainPassword: {
      type: String,
      select: false, // plaintext — only returned with .select('+plainPassword')
    },

    // ── Professional info ─────────────────────────────────────────────────
    medicalLicenseNumber: {
      type: String,
      required: [true, 'رقم الترخيص الطبي مطلوب'],
      trim: true,
      uppercase: true,
      index: true,
    },
    specialization: {
      type: String,
      enum: SPECIALIZATIONS,
      required: [true, 'التخصص مطلوب'],
    },
    subSpecialization: { type: String, trim: true },
    yearsOfExperience: {
      type: Number,
      required: [true, 'سنوات الخبرة مطلوبة'],
      min: 0,
      max: 60,
    },
    hospitalAffiliation: {
      type: String,
      required: [true, 'مكان العمل مطلوب'],
      trim: true,
    },
    consultationFee: {
      type: Number,
      required: [true, 'رسوم الاستشارة مطلوبة'],
      min: 0,
    },
    currency: { type: String, enum: CURRENCIES, default: 'SYP' },
    availableDays: { type: [String], default: [] },

    // ── Documents submitted ───────────────────────────────────────────────
    licenseDocument: { type: UploadedDocumentSchema },
    medicalCertificate: { type: UploadedDocumentSchema },
    profilePhoto: { type: UploadedDocumentSchema },

    // Legacy URL-only fields (kept for backwards compatibility with the
    // .env-based file URL approach in the existing controller).
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

/**
 * Generate a human-readable requestId in the format REQ-YYYYMMDD-XXXXX.
 * The 5-digit sequence is scoped to the current calendar day.
 *
 * @returns {Promise<string>}
 */
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

// ── Instance methods ────────────────────────────────────────────────────────

/**
 * Mark this request as approved by the given admin. Caller is responsible
 * for actually creating the Person/Account/Doctor records BEFORE calling
 * this — pass their IDs in via the `createdRecords` argument so they get
 * stored for traceability.
 *
 * @param {ObjectId} adminAccountId - Account._id of the reviewing admin
 * @param {{ personId: ObjectId, accountId: ObjectId, doctorId: ObjectId }} createdRecords
 * @param {string} [notes] - optional admin notes
 */
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

/**
 * Mark this request as rejected with a reason and optional details.
 *
 * @param {ObjectId} adminAccountId - Account._id of the reviewing admin
 * @param {string} reason - one of REJECTION_REASONS
 * @param {string} [details] - free-text explanation sent to applicant
 */
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