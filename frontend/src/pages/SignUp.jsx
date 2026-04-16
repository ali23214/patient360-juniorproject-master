/**
 * ═══════════════════════════════════════════════════════════════════════
 *  Patient 360° — SignUp Page
 *  ─────────────────────────────────────────────────────────────────────
 *  Stack       : React 18 + React Router v6 + Lucide React
 *  Design      : Teal Medica (Light + Dark via [data-theme])
 *  Direction   : RTL (Arabic primary)
 *  Backend     : authAPI from src/services/api.js
 *  DB enums    : All values match patient360_db_final.js (persons, children,
 *                doctor_requests, accounts collections)
 *
 *  Architecture:
 *  - Single-file component with 4-step wizard for both patients and doctors
 *  - Patient flow: 4 steps (personal → medical → history → password)
 *  - Doctor flow: 4 steps (personal → professional → docs → review)
 *  - Age-based branching: under 18 → children collection, adult → persons
 *  - All API calls go through authAPI (no hardcoded URLs)
 * ═══════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  // Identity & user types
  User,
  Users,
  Stethoscope,
  UserPlus,
  Baby,

  // Form & inputs
  Mail,
  Lock,
  Eye,
  EyeOff,
  Phone,
  Calendar,
  MapPin,
  Building2,
  IdCard,
  Search,

  // Medical
  Heart,
  Brain,
  Bone,
  Activity,
  Droplet,
  Pill,
  Scissors,
  TestTube,
  Stethoscope as StethIcon,
  Syringe,
  Wind,
  ScanLine,
  Smile,
  Microscope,

  // Files & uploads
  FileText,
  GraduationCap,
  Camera,
  Upload,
  Paperclip,

  // Actions
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  Check,
  X,
  Loader2,
  Copy,

  // Status
  CheckCircle2,
  AlertCircle,
  Info,
  Clock,
  XCircle,
  ShieldCheck,
  Shield,
  Sparkles,
  Briefcase,
  ClipboardList,
  ClipboardCheck,
  Building,
  Award,
  Hospital,
  AlertTriangle,
  Send,
  LogIn,
  HeartPulse,
  Bell,
} from 'lucide-react';

import Navbar from '../components/common/Navbar';
import { authAPI } from '../services/api';
import {
  calculateAge,
  getTodayDate,
  validateSyrianPhone,
  validateNationalId,
} from '../utils/ageCalculator';
import LoadingSpinner from '../components/LoadingSpinner';
import '../styles/SignUp.css';


/* ═══════════════════════════════════════════════════════════════════════
   CONSTANTS — module-scoped (stable references, not recreated on render)
   ═══════════════════════════════════════════════════════════════════════ */

/**
 * Medical specializations — IDs match the doctors.specialization enum
 * in patient360_db_final.js. Each specialization gets a Lucide icon for
 * the new card-based picker UI (replaces the old emoji <select>).
 */
const MEDICAL_SPECIALIZATIONS = [
  { id: 'cardiology',         nameAr: 'طب القلب',           Icon: Heart,        hasECG: true  },
  { id: 'pulmonology',        nameAr: 'أمراض الرئة',         Icon: Wind,         hasECG: false },
  { id: 'general_practice',   nameAr: 'طب عام',              Icon: StethIcon,    hasECG: false },
  { id: 'rheumatology',       nameAr: 'الروماتيزم',          Icon: Bone,         hasECG: false },
  { id: 'orthopedics',        nameAr: 'جراحة العظام',        Icon: Bone,         hasECG: false },
  { id: 'neurology',          nameAr: 'طب الأعصاب',          Icon: Brain,        hasECG: false },
  { id: 'endocrinology',      nameAr: 'الغدد الصماء',        Icon: TestTube,     hasECG: false },
  { id: 'dermatology',        nameAr: 'الجلدية',             Icon: Sparkles,     hasECG: false },
  { id: 'gastroenterology',   nameAr: 'الجهاز الهضمي',       Icon: Activity,     hasECG: false },
  { id: 'surgery',            nameAr: 'الجراحة العامة',       Icon: Scissors,     hasECG: false },
  { id: 'urology',            nameAr: 'المسالك البولية',     Icon: Droplet,      hasECG: false },
  { id: 'gynecology',         nameAr: 'النساء والتوليد',     Icon: Baby,         hasECG: false },
  { id: 'psychiatry',         nameAr: 'الطب النفسي',         Icon: Brain,        hasECG: false },
  { id: 'hematology',         nameAr: 'أمراض الدم',          Icon: Droplet,      hasECG: false },
  { id: 'oncology',           nameAr: 'الأورام',             Icon: Microscope,   hasECG: false },
  { id: 'otolaryngology',     nameAr: 'أنف أذن حنجرة',       Icon: Activity,     hasECG: false },
  { id: 'ophthalmology',      nameAr: 'طب العيون',           Icon: Eye,          hasECG: false },
  { id: 'pediatrics',         nameAr: 'طب الأطفال',          Icon: Baby,         hasECG: false },
  { id: 'nephrology',         nameAr: 'طب الكلى',            Icon: Droplet,      hasECG: false },
  { id: 'internal_medicine',  nameAr: 'الطب الباطني',        Icon: Hospital,     hasECG: false },
  { id: 'emergency_medicine', nameAr: 'طب الطوارئ',          Icon: HeartPulse,   hasECG: false },
  { id: 'vascular_surgery',   nameAr: 'جراحة الأوعية',       Icon: HeartPulse,   hasECG: false },
  { id: 'anesthesiology',     nameAr: 'التخدير',             Icon: Syringe,      hasECG: false },
  { id: 'radiology',          nameAr: 'الأشعة',              Icon: ScanLine,     hasECG: false },
];

/**
 * Syrian governorates — IDs match the governorate enum in
 * patient360_db_final.js (persons, children, doctor_requests, hospitals,
 * pharmacies, laboratories collections all share this enum).
 */
const SYRIAN_GOVERNORATES = [
  { id: 'damascus',     nameAr: 'دمشق' },
  { id: 'rif_dimashq',  nameAr: 'ريف دمشق' },
  { id: 'aleppo',       nameAr: 'حلب' },
  { id: 'homs',         nameAr: 'حمص' },
  { id: 'hama',         nameAr: 'حماة' },
  { id: 'latakia',      nameAr: 'اللاذقية' },
  { id: 'tartus',       nameAr: 'طرطوس' },
  { id: 'idlib',        nameAr: 'إدلب' },
  { id: 'deir_ez_zor',  nameAr: 'دير الزور' },
  { id: 'hasakah',      nameAr: 'الحسكة' },
  { id: 'raqqa',        nameAr: 'الرقة' },
  { id: 'daraa',        nameAr: 'درعا' },
  { id: 'as_suwayda',   nameAr: 'السويداء' },
  { id: 'quneitra',     nameAr: 'القنيطرة' },
];

const WEEKDAYS = [
  { id: 'Sunday',    nameAr: 'الأحد' },
  { id: 'Monday',    nameAr: 'الإثنين' },
  { id: 'Tuesday',   nameAr: 'الثلاثاء' },
  { id: 'Wednesday', nameAr: 'الأربعاء' },
  { id: 'Thursday',  nameAr: 'الخميس' },
  { id: 'Friday',    nameAr: 'الجمعة' },
  { id: 'Saturday',  nameAr: 'السبت' },
];

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const SMOKING_STATUSES = [
  { value: 'non-smoker',      label: 'غير مدخن' },
  { value: 'former_smoker',   label: 'مدخن سابق' },
  { value: 'current_smoker',  label: 'مدخن حالي' },
];

const PATIENT_TOTAL_STEPS = 4;
const DOCTOR_TOTAL_STEPS = 4;


/* ═══════════════════════════════════════════════════════════════════════
   VALIDATION HELPERS — pure functions
   ═══════════════════════════════════════════════════════════════════════ */

const isValidEmail = (email) =>
  /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);

const isValidName = (name) =>
  /^[a-zA-Z\u0600-\u06FF\s]+$/.test(name);

const isDateInPast = (dateString) => {
  if (!dateString) return false;
  const selected = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return selected < today;
};

/**
 * Password strength evaluator — returns granular requirement booleans
 * plus an overall score (0-4) for the strength meter.
 */
const evaluatePassword = (password) => {
  const minLength   = password.length >= 8;
  const hasUpper    = /[A-Z]/.test(password);
  const hasLower    = /[a-z]/.test(password);
  const hasNumber   = /[0-9]/.test(password);
  const hasSpecial  = /[!@#$%^&*]/.test(password);

  // Score: 1 point per requirement met (cap at 4 visual bars)
  const requirements = [minLength, hasUpper, hasNumber, hasSpecial];
  const score = requirements.filter(Boolean).length;

  return {
    minLength,
    hasUpper,
    hasLower,
    hasNumber,
    hasSpecial,
    score,
    isValid: minLength && hasUpper && hasNumber && hasSpecial,
  };
};

const STRENGTH_LABELS = {
  0: { label: 'ضعيفة جداً',  className: 'weak' },
  1: { label: 'ضعيفة',       className: 'weak' },
  2: { label: 'متوسطة',      className: 'medium' },
  3: { label: 'قوية',        className: 'strong' },
  4: { label: 'ممتازة',      className: 'excellent' },
};


/* ═══════════════════════════════════════════════════════════════════════
   REUSABLE PRESENTATIONAL COMPONENTS
   ═══════════════════════════════════════════════════════════════════════ */

/**
 * Modal — generic alert modal with bouncing icon and pulse ring.
 * Used for success/error/info messages throughout the signup flow.
 */
const Modal = ({ isOpen, type, title, message, onClose, buttonLabel = 'حسناً' }) => {
  // Lock body scroll while modal is open
  useEffect(() => {
    if (!isOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = original; };
  }, [isOpen]);

  // ESC key closes modal
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const IconComponent = type === 'success' ? CheckCircle2
                      : type === 'error'   ? XCircle
                      :                       Info;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-icon-wrapper">
            <div className={`modal-icon ${type}`}>
              <IconComponent size={40} strokeWidth={2} />
            </div>
            <div className={`modal-icon-pulse ${type}`} />
          </div>
          <h2 className="modal-title">{title}</h2>
        </div>
        <div className="modal-body">
          <p className="modal-message">{message}</p>
        </div>
        <div className="modal-footer">
          <button type="button" className="modal-button" onClick={onClose} autoFocus>
            {buttonLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * PasswordStrengthMeter — visual 4-bar meter + checklist of requirements.
 */
const PasswordStrengthMeter = ({ password }) => {
  if (!password) return null;
  const v = evaluatePassword(password);
  const strength = STRENGTH_LABELS[v.score];

  return (
    <div className="password-strength">
      <div className="strength-header">
        <span className="strength-label">قوة كلمة المرور</span>
        <span className={`strength-score ${strength.className}`}>{strength.label}</span>
      </div>
      <div className="strength-bars">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`strength-bar ${i < v.score ? `active ${strength.className}` : ''}`}
          />
        ))}
      </div>
      <div className="strength-checklist">
        <span className={v.minLength ? 'valid' : ''}>
          {v.minLength ? <Check size={12} strokeWidth={3} /> : <X size={12} strokeWidth={2.5} />}
          8 أحرف على الأقل
        </span>
        <span className={v.hasUpper ? 'valid' : ''}>
          {v.hasUpper ? <Check size={12} strokeWidth={3} /> : <X size={12} strokeWidth={2.5} />}
          حرف كبير (A-Z)
        </span>
        <span className={v.hasNumber ? 'valid' : ''}>
          {v.hasNumber ? <Check size={12} strokeWidth={3} /> : <X size={12} strokeWidth={2.5} />}
          رقم (0-9)
        </span>
        <span className={v.hasSpecial ? 'valid' : ''}>
          {v.hasSpecial ? <Check size={12} strokeWidth={3} /> : <X size={12} strokeWidth={2.5} />}
          رمز خاص (!@#$%)
        </span>
      </div>
    </div>
  );
};

/**
 * FileUploadField — modern drop-zone style upload with success state
 * and remove button. Replaces the old "click to upload" plain box.
 */
const FileUploadField = ({
  id,
  label,
  hint,
  required,
  accept,
  Icon,
  file,
  error,
  onFileChange,
  onFileRemove,
}) => {
  const inputRef = useRef(null);

  const handleChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected) onFileChange(selected);
  };

  const handleRemove = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (inputRef.current) inputRef.current.value = '';
    onFileRemove();
  };

  return (
    <div className="form-group">
      <label className="form-label">
        {label}
        {required && <span className="required-mark">*</span>}
      </label>
      <div className="file-upload-box">
        <input
          ref={inputRef}
          type="file"
          id={id}
          accept={accept}
          onChange={handleChange}
          className="file-input"
          aria-label={label}
        />
        <label
          htmlFor={id}
          className={`file-upload-label ${error ? 'error' : ''} ${file ? 'has-file' : ''}`}
        >
          <div className="upload-icon">
            {file ? <Check size={22} strokeWidth={2.5} /> : <Icon size={22} strokeWidth={2} />}
          </div>
          <div className="upload-content">
            <span className="upload-title">
              {file ? 'تم رفع الملف' : 'اضغط لاختيار ملف'}
            </span>
            <span className="upload-subtitle">
              {file ? file.name : (hint || 'PDF, JPG, PNG حتى 5MB')}
            </span>
          </div>
          {file && (
            <button
              type="button"
              className="file-remove-btn"
              onClick={handleRemove}
              aria-label="إزالة الملف"
            >
              <X size={16} strokeWidth={2.5} />
            </button>
          )}
        </label>
      </div>
      {error && (
        <span className="error-message">
          <AlertCircle size={14} strokeWidth={2.2} />
          {error}
        </span>
      )}
    </div>
  );
};


/* ═══════════════════════════════════════════════════════════════════════
   MAIN COMPONENT — SignUp
   ═══════════════════════════════════════════════════════════════════════ */

const SignUp = () => {
  const navigate = useNavigate();

  /* ─────────────────────────────────────────────────────────────────
     STATE
     ───────────────────────────────────────────────────────────────── */

  // Flow control
  const [userType, setUserType] = useState(null);   // 'patient' | 'doctor' | null
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Patient age detection (drives the children/persons branching)
  const [age, setAge] = useState(0);
  const [isMinor, setIsMinor] = useState(false);

  // Modal state
  const [modal, setModal] = useState({
    isOpen: false,
    type: '',
    title: '',
    message: '',
    onClose: null,
  });

  // Doctor request status (after submission)
  const [requestStatus, setRequestStatus] = useState(null);
  const [requestId, setRequestId] = useState(null);

  // Existing request lookup result (from "check status" feature)
  const [existingRequest, setExistingRequest] = useState(null);

  // Status check modal (rename from old `nationalId` to actual `email` field)
  const [statusCheckModal, setStatusCheckModal] = useState({
    isOpen: false,
    email: '',
    isLoading: false,
    error: '',
  });

  // Password visibility toggles
  const [showPatientPassword, setShowPatientPassword] = useState(false);
  const [showPatientConfirm, setShowPatientConfirm] = useState(false);
  const [showDoctorPassword, setShowDoctorPassword] = useState(false);
  const [showDoctorConfirm, setShowDoctorConfirm] = useState(false);

  // Specialization picker search
  const [specSearch, setSpecSearch] = useState('');

  // Patient form data
  const [patientFormData, setPatientFormData] = useState({
    nationalId: '',
    parentNationalId: '',
    firstName: '',
    fatherName: '',
    lastName: '',
    motherName: '',
    dateOfBirth: '',
    gender: '',
    phoneNumber: '',
    governorate: '',
    city: '',
    address: '',
    email: '',
    password: '',
    confirmPassword: '',
    bloodType: '',
    height: '',
    weight: '',
    smokingStatus: '',
    allergies: '',
    chronicDiseases: '',
    familyHistory: '',
    emergencyContactName: '',
    emergencyContactRelationship: '',
    emergencyContactPhone: '',
  });

  // Doctor form data
  const [doctorFormData, setDoctorFormData] = useState({
    firstName: '',
    fatherName: '',
    lastName: '',
    motherName: '',
    nationalId: '',
    dateOfBirth: '',
    gender: 'male',
    phoneNumber: '',
    email: '',
    password: '',
    confirmPassword: '',
    address: '',
    governorate: '',
    city: '',
    medicalLicenseNumber: '',
    specialization: '',
    subSpecialization: '',
    yearsOfExperience: '',
    hospitalAffiliation: '',
    availableDays: [],
    consultationFee: '',
    licenseDocument: null,
    medicalCertificate: null,
    profilePhoto: null,
    additionalNotes: '',
  });

  const [errors, setErrors] = useState({});

  /* ─────────────────────────────────────────────────────────────────
     MEMOIZED LOOKUPS
     ───────────────────────────────────────────────────────────────── */

  const filteredSpecializations = useMemo(() => {
    if (!specSearch.trim()) return MEDICAL_SPECIALIZATIONS;
    const q = specSearch.trim().toLowerCase();
    return MEDICAL_SPECIALIZATIONS.filter((s) =>
      s.nameAr.toLowerCase().includes(q) || s.id.includes(q)
    );
  }, [specSearch]);

  const selectedSpecialization = useMemo(
    () => MEDICAL_SPECIALIZATIONS.find((s) => s.id === doctorFormData.specialization),
    [doctorFormData.specialization]
  );

  /* ─────────────────────────────────────────────────────────────────
     MODAL HELPERS
     ───────────────────────────────────────────────────────────────── */

  const openModal = useCallback((type, title, message, onClose = null) => {
    setModal({ isOpen: true, type, title, message, onClose });
  }, []);

  const closeModal = useCallback(() => {
    if (modal.onClose) modal.onClose();
    setModal({ isOpen: false, type: '', title: '', message: '', onClose: null });
  }, [modal]);

  /* ─────────────────────────────────────────────────────────────────
     PATIENT HANDLERS
     ───────────────────────────────────────────────────────────────── */

  const handlePatientChange = useCallback((e) => {
    const { name, value } = e.target;
    setPatientFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }, []);

  const handlePatientDateOfBirthChange = useCallback((e) => {
    const dob = e.target.value;
    setPatientFormData((prev) => ({ ...prev, dateOfBirth: dob }));

    const calculatedAge = calculateAge(dob);
    setAge(calculatedAge);
    const minor = calculatedAge < 18;
    setIsMinor(minor);

    // Clear the now-irrelevant ID field when toggling minor/adult
    if (minor) {
      setPatientFormData((prev) => ({ ...prev, nationalId: '' }));
      setErrors((prev) => {
        if (!prev.nationalId) return prev;
        const next = { ...prev };
        delete next.nationalId;
        return next;
      });
    } else {
      setPatientFormData((prev) => ({ ...prev, parentNationalId: '' }));
      setErrors((prev) => {
        if (!prev.parentNationalId) return prev;
        const next = { ...prev };
        delete next.parentNationalId;
        return next;
      });
    }
  }, []);

  /* ─────────────────────────────────────────────────────────────────
     DOCTOR HANDLERS
     ───────────────────────────────────────────────────────────────── */

  const handleDoctorChange = useCallback((e) => {
    const { name, value } = e.target;
    setDoctorFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }, []);

  const handleSpecializationSelect = useCallback((specId) => {
    setDoctorFormData((prev) => ({ ...prev, specialization: specId }));
    setErrors((prev) => {
      if (!prev.specialization) return prev;
      const next = { ...prev };
      delete next.specialization;
      return next;
    });
  }, []);

  const handleDayToggle = useCallback((day) => {
    setDoctorFormData((prev) => ({
      ...prev,
      availableDays: prev.availableDays.includes(day)
        ? prev.availableDays.filter((d) => d !== day)
        : [...prev.availableDays, day],
    }));
    setErrors((prev) => {
      if (!prev.availableDays) return prev;
      const next = { ...prev };
      delete next.availableDays;
      return next;
    });
  }, []);

  const handleFileUpload = useCallback((fieldName, file) => {
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      openModal('error', 'حجم الملف كبير', 'حجم الملف يجب أن لا يتجاوز 5 ميجابايت');
      return;
    }
    setDoctorFormData((prev) => ({ ...prev, [fieldName]: file }));
    setErrors((prev) => {
      if (!prev[fieldName]) return prev;
      const next = { ...prev };
      delete next[fieldName];
      return next;
    });
  }, [openModal]);

  const handleFileRemove = useCallback((fieldName) => {
    setDoctorFormData((prev) => ({ ...prev, [fieldName]: null }));
  }, []);

  /* ─────────────────────────────────────────────────────────────────
     PATIENT VALIDATION
     ───────────────────────────────────────────────────────────────── */

  const validatePatientStep = useCallback(() => {
    const e = {};

    if (currentStep === 1) {
      // First name
      if (!patientFormData.firstName.trim()) {
        e.firstName = 'الاسم الأول مطلوب';
      } else if (patientFormData.firstName.trim().length < 2) {
        e.firstName = 'الاسم الأول يجب أن يكون حرفين على الأقل';
      } else if (!isValidName(patientFormData.firstName)) {
        e.firstName = 'الاسم يجب أن يحتوي على أحرف فقط';
      }

      // Father name
      if (!patientFormData.fatherName.trim()) {
        e.fatherName = 'اسم الأب مطلوب';
      } else if (patientFormData.fatherName.trim().length < 2) {
        e.fatherName = 'اسم الأب يجب أن يكون حرفين على الأقل';
      } else if (!isValidName(patientFormData.fatherName)) {
        e.fatherName = 'الاسم يجب أن يحتوي على أحرف فقط';
      }

      // Last name
      if (!patientFormData.lastName.trim()) {
        e.lastName = 'اسم العائلة مطلوب';
      } else if (patientFormData.lastName.trim().length < 2) {
        e.lastName = 'اسم العائلة يجب أن يكون حرفين على الأقل';
      } else if (!isValidName(patientFormData.lastName)) {
        e.lastName = 'الاسم يجب أن يحتوي على أحرف فقط';
      }

      // Mother name
      if (!patientFormData.motherName.trim()) {
        e.motherName = 'اسم الأم مطلوب';
      } else if (patientFormData.motherName.trim().length < 2) {
        e.motherName = 'اسم الأم يجب أن يكون حرفين على الأقل';
      }

      // Email
      if (!patientFormData.email.trim()) {
        e.email = 'البريد الإلكتروني مطلوب';
      } else if (!isValidEmail(patientFormData.email)) {
        e.email = 'البريد الإلكتروني غير صحيح';
      }

      // Phone
      if (!patientFormData.phoneNumber.trim()) {
        e.phoneNumber = 'رقم الهاتف مطلوب';
      } else if (!validateSyrianPhone(patientFormData.phoneNumber)) {
        e.phoneNumber = 'رقم الهاتف غير صحيح (يجب أن يبدأ بـ +963 أو 09)';
      }

      // Date of birth
      if (!patientFormData.dateOfBirth) {
        e.dateOfBirth = 'تاريخ الميلاد مطلوب';
      } else if (!isDateInPast(patientFormData.dateOfBirth)) {
        e.dateOfBirth = 'تاريخ الميلاد يجب أن يكون في الماضي';
      }

      // National ID — branches by age
      if (isMinor) {
        if (!patientFormData.parentNationalId.trim()) {
          e.parentNationalId = 'رقم الهوية الوطنية للوالد/الوالدة مطلوب';
        } else if (!validateNationalId(patientFormData.parentNationalId)) {
          e.parentNationalId = 'رقم الهوية يجب أن يكون 11 رقم بالضبط';
        }
      } else {
        if (!patientFormData.nationalId.trim()) {
          e.nationalId = 'رقم الهوية الوطنية مطلوب';
        } else if (!validateNationalId(patientFormData.nationalId)) {
          e.nationalId = 'رقم الهوية يجب أن يكون 11 رقم بالضبط';
        }
      }

      if (!patientFormData.gender) e.gender = 'يرجى اختيار الجنس';
      if (!patientFormData.governorate) e.governorate = 'المحافظة مطلوبة';
      if (!patientFormData.city.trim()) e.city = 'المدينة مطلوبة';
    }

    if (currentStep === 2) {
      if (patientFormData.height && (patientFormData.height < 50 || patientFormData.height > 300)) {
        e.height = 'الطول يجب أن يكون بين 50 و 300 سم';
      }
      if (patientFormData.weight && (patientFormData.weight < 2 || patientFormData.weight > 300)) {
        e.weight = 'الوزن يجب أن يكون بين 2 و 300 كجم';
      }
    }

    if (currentStep === 3) {
      if (!patientFormData.emergencyContactName.trim()) {
        e.emergencyContactName = 'اسم جهة الاتصال للطوارئ مطلوب';
      }
      if (!patientFormData.emergencyContactRelationship.trim()) {
        e.emergencyContactRelationship = 'صلة القرابة مطلوبة';
      }
      if (!patientFormData.emergencyContactPhone.trim()) {
        e.emergencyContactPhone = 'رقم هاتف الطوارئ مطلوب';
      } else if (!validateSyrianPhone(patientFormData.emergencyContactPhone)) {
        e.emergencyContactPhone = 'رقم الهاتف غير صحيح';
      }
    }

    if (currentStep === 4) {
      const v = evaluatePassword(patientFormData.password);
      if (!patientFormData.password) {
        e.password = 'كلمة المرور مطلوبة';
      } else if (!v.minLength) {
        e.password = 'كلمة المرور يجب أن تكون 8 أحرف على الأقل';
      } else if (!v.hasUpper) {
        e.password = 'كلمة المرور يجب أن تحتوي على حرف كبير';
      } else if (!v.hasNumber) {
        e.password = 'كلمة المرور يجب أن تحتوي على رقم';
      } else if (!v.hasSpecial) {
        e.password = 'كلمة المرور يجب أن تحتوي على رمز خاص';
      }

      if (!patientFormData.confirmPassword) {
        e.confirmPassword = 'تأكيد كلمة المرور مطلوب';
      } else if (patientFormData.password !== patientFormData.confirmPassword) {
        e.confirmPassword = 'كلمات المرور غير متطابقة';
      }
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  }, [currentStep, patientFormData, isMinor]);

  /* ─────────────────────────────────────────────────────────────────
     DOCTOR VALIDATION
     ───────────────────────────────────────────────────────────────── */

  const validateDoctorStep = useCallback(() => {
    const e = {};

    if (currentStep === 1) {
      if (!doctorFormData.firstName.trim()) e.firstName = 'الاسم الأول مطلوب';
      else if (!isValidName(doctorFormData.firstName)) e.firstName = 'الاسم يجب أن يحتوي على أحرف فقط';

      if (!doctorFormData.fatherName.trim()) e.fatherName = 'اسم الأب مطلوب';
      else if (!isValidName(doctorFormData.fatherName)) e.fatherName = 'الاسم يجب أن يحتوي على أحرف فقط';

      if (!doctorFormData.lastName.trim()) e.lastName = 'الكنية مطلوبة';
      else if (!isValidName(doctorFormData.lastName)) e.lastName = 'الاسم يجب أن يحتوي على أحرف فقط';

      if (!doctorFormData.motherName.trim()) e.motherName = 'اسم الأم مطلوب';

      if (!doctorFormData.nationalId.trim()) {
        e.nationalId = 'الرقم الوطني مطلوب';
      } else if (!validateNationalId(doctorFormData.nationalId)) {
        e.nationalId = 'الرقم الوطني يجب أن يكون 11 رقم';
      }

      if (!doctorFormData.dateOfBirth) e.dateOfBirth = 'تاريخ الميلاد مطلوب';

      if (!doctorFormData.phoneNumber.trim()) {
        e.phoneNumber = 'رقم الهاتف مطلوب';
      } else if (!validateSyrianPhone(doctorFormData.phoneNumber)) {
        e.phoneNumber = 'رقم الهاتف غير صحيح';
      }

      if (!doctorFormData.email.trim()) {
        e.email = 'البريد الإلكتروني مطلوب';
      } else if (!isValidEmail(doctorFormData.email)) {
        e.email = 'البريد الإلكتروني غير صحيح';
      }

      if (!doctorFormData.governorate) e.governorate = 'المحافظة مطلوبة';
      if (!doctorFormData.city.trim()) e.city = 'المدينة مطلوبة';
      if (!doctorFormData.address.trim()) e.address = 'العنوان مطلوب';

      // Password
      const v = evaluatePassword(doctorFormData.password);
      if (!doctorFormData.password) {
        e.password = 'كلمة المرور مطلوبة';
      } else if (!v.minLength) {
        e.password = 'كلمة المرور يجب أن تكون 8 أحرف على الأقل';
      } else if (!v.hasUpper) {
        e.password = 'كلمة المرور يجب أن تحتوي على حرف كبير';
      } else if (!v.hasNumber) {
        e.password = 'كلمة المرور يجب أن تحتوي على رقم';
      } else if (!v.hasSpecial) {
        e.password = 'كلمة المرور يجب أن تحتوي على رمز خاص';
      }

      if (!doctorFormData.confirmPassword) {
        e.confirmPassword = 'تأكيد كلمة المرور مطلوب';
      } else if (doctorFormData.password !== doctorFormData.confirmPassword) {
        e.confirmPassword = 'كلمات المرور غير متطابقة';
      }
    }

    if (currentStep === 2) {
      if (!doctorFormData.medicalLicenseNumber.trim()) {
        e.medicalLicenseNumber = 'رقم الترخيص الطبي مطلوب';
      } else if (!/^[A-Z0-9]{8,20}$/i.test(doctorFormData.medicalLicenseNumber.trim())) {
        e.medicalLicenseNumber = 'رقم الترخيص يجب أن يكون 8-20 حرف/رقم';
      }

      if (!doctorFormData.specialization) e.specialization = 'التخصص مطلوب';
      if (!doctorFormData.hospitalAffiliation.trim()) e.hospitalAffiliation = 'مكان العمل مطلوب';
      if (doctorFormData.availableDays.length === 0) {
        e.availableDays = 'يجب اختيار يوم عمل واحد على الأقل';
      }

      const years = parseInt(doctorFormData.yearsOfExperience, 10);
      if (Number.isNaN(years) || years < 0 || years > 60) {
        e.yearsOfExperience = 'سنوات الخبرة يجب أن تكون بين 0-60';
      }

      if (!doctorFormData.consultationFee || parseFloat(doctorFormData.consultationFee) < 0) {
        e.consultationFee = 'رسوم الاستشارة مطلوبة';
      }
    }

    if (currentStep === 3) {
      if (!doctorFormData.licenseDocument) e.licenseDocument = 'صورة الترخيص الطبي مطلوبة';
      if (!doctorFormData.medicalCertificate) e.medicalCertificate = 'صورة شهادة الطب مطلوبة';
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  }, [currentStep, doctorFormData]);

  /* ─────────────────────────────────────────────────────────────────
     NAVIGATION
     ───────────────────────────────────────────────────────────────── */

  const handleNext = useCallback(() => {
    const isValid = userType === 'patient' ? validatePatientStep() : validateDoctorStep();
    if (isValid) {
      setCurrentStep((prev) => prev + 1);
      // Scroll to top of form for better UX
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [userType, validatePatientStep, validateDoctorStep]);

  const handlePrev = useCallback(() => {
    setCurrentStep((prev) => prev - 1);
    setErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleBackToSelection = useCallback(() => {
    setUserType(null);
    setCurrentStep(1);
    setErrors({});
  }, []);

  /* ─────────────────────────────────────────────────────────────────
     PATIENT SUBMISSION
     ───────────────────────────────────────────────────────────────── */

  const handlePatientSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!validatePatientStep()) return;

    setLoading(true);
    try {
      const registrationData = {
        firstName: patientFormData.firstName.trim(),
        fatherName: patientFormData.fatherName.trim(),
        lastName: patientFormData.lastName.trim(),
        motherName: patientFormData.motherName.trim(),
        dateOfBirth: patientFormData.dateOfBirth,
        nationalId: isMinor ? null : patientFormData.nationalId.trim(),
        parentNationalId: isMinor ? patientFormData.parentNationalId.trim() : null,
        isMinor,
        gender: patientFormData.gender,
        phoneNumber: patientFormData.phoneNumber.trim(),
        governorate: patientFormData.governorate,
        city: patientFormData.city.trim(),
        address: patientFormData.address.trim() || null,
        email: patientFormData.email.trim().toLowerCase(),
        password: patientFormData.password,
        bloodType: patientFormData.bloodType || null,
        height: patientFormData.height ? parseFloat(patientFormData.height) : null,
        weight: patientFormData.weight ? parseFloat(patientFormData.weight) : null,
        smokingStatus: patientFormData.smokingStatus || null,
        allergies: patientFormData.allergies.trim()
          ? patientFormData.allergies.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
        chronicDiseases: patientFormData.chronicDiseases.trim()
          ? patientFormData.chronicDiseases.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
        familyHistory: patientFormData.familyHistory.trim()
          ? patientFormData.familyHistory.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
        emergencyContact: {
          name: patientFormData.emergencyContactName.trim(),
          relationship: patientFormData.emergencyContactRelationship.trim(),
          phoneNumber: patientFormData.emergencyContactPhone.trim(),
        },
      };

      const response = await authAPI.register(registrationData);
      setLoading(false);

      const successMessage = isMinor
        ? `مرحباً ${patientFormData.firstName} ${patientFormData.lastName}\n\nتم تسجيلك كمريض في منصة Patient 360° بنجاح.\n\nمعرف الطفل: ${response.childId}\n\nيمكنك الآن تسجيل الدخول.`
        : `مرحباً ${patientFormData.firstName} ${patientFormData.lastName}\n\nتم تسجيلك كمريض في منصة Patient 360° بنجاح.\n\nيمكنك الآن تسجيل الدخول.`;

      openModal('success', 'تم إنشاء الحساب بنجاح', successMessage, () => navigate('/'));
    } catch (error) {
      console.error('[SignUp] Patient registration error:', error);
      setLoading(false);
      openModal('error', 'خطأ في التسجيل', error.message || 'حدث خطأ أثناء إنشاء الحساب');
    }
  }, [validatePatientStep, patientFormData, isMinor, openModal, navigate]);

  /* ─────────────────────────────────────────────────────────────────
     DOCTOR SUBMISSION  (now uses authAPI.registerDoctor — no raw fetch)
     ───────────────────────────────────────────────────────────────── */

  const handleDoctorSubmit = useCallback(async (e) => {
    e.preventDefault();

    if (doctorFormData.password !== doctorFormData.confirmPassword) {
      openModal('error', 'خطأ', 'كلمات المرور غير متطابقة');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();

      // Personal info
      formData.append('firstName', doctorFormData.firstName.trim());
      formData.append('fatherName', doctorFormData.fatherName.trim());
      formData.append('lastName', doctorFormData.lastName.trim());
      formData.append('motherName', doctorFormData.motherName.trim());
      formData.append('nationalId', doctorFormData.nationalId.trim());
      formData.append('dateOfBirth', doctorFormData.dateOfBirth);
      formData.append('gender', doctorFormData.gender);
      formData.append('phoneNumber', doctorFormData.phoneNumber.trim());
      formData.append('email', doctorFormData.email.trim().toLowerCase());
      formData.append('password', doctorFormData.password);
      formData.append('address', doctorFormData.address.trim());
      formData.append('governorate', doctorFormData.governorate);
      formData.append('city', doctorFormData.city.trim());

      // Professional info
      formData.append('medicalLicenseNumber', doctorFormData.medicalLicenseNumber.toUpperCase().trim());
      formData.append('specialization', doctorFormData.specialization);
      formData.append('subSpecialization', doctorFormData.subSpecialization.trim());
      formData.append('yearsOfExperience', doctorFormData.yearsOfExperience);
      formData.append('hospitalAffiliation', doctorFormData.hospitalAffiliation.trim());
      formData.append('availableDays', JSON.stringify(doctorFormData.availableDays));
      formData.append('consultationFee', doctorFormData.consultationFee || '0');

      // Files
      if (doctorFormData.medicalCertificate) {
        formData.append('medicalCertificate', doctorFormData.medicalCertificate);
      }
      if (doctorFormData.licenseDocument) {
        formData.append('licenseDocument', doctorFormData.licenseDocument);
      }
      if (doctorFormData.profilePhoto) {
        formData.append('profilePhoto', doctorFormData.profilePhoto);
      }

      const data = await authAPI.registerDoctor(formData);
      setLoading(false);

      setRequestStatus('pending');
      setRequestId(data.requestId);
    } catch (error) {
      console.error('[SignUp] Doctor request error:', error);
      setLoading(false);
      openModal(
        'error',
        'خطأ في تقديم الطلب',
        error.message || 'حدث خطأ في الاتصال بالخادم. الرجاء المحاولة مرة أخرى.'
      );
    }
  }, [doctorFormData, openModal]);

  /* ─────────────────────────────────────────────────────────────────
     STATUS CHECK MODAL
     ───────────────────────────────────────────────────────────────── */

  const openStatusCheckModal = useCallback(() => {
    setStatusCheckModal({ isOpen: true, email: '', isLoading: false, error: '' });
  }, []);

  const closeStatusCheckModal = useCallback(() => {
    setStatusCheckModal({ isOpen: false, email: '', isLoading: false, error: '' });
  }, []);

  const handleStatusCheckSubmit = useCallback(async () => {
    const email = statusCheckModal.email.trim();

    if (!email) {
      setStatusCheckModal((p) => ({ ...p, error: 'الرجاء إدخال البريد الإلكتروني' }));
      return;
    }
    if (!isValidEmail(email)) {
      setStatusCheckModal((p) => ({ ...p, error: 'البريد الإلكتروني غير صحيح' }));
      return;
    }

    setStatusCheckModal((p) => ({ ...p, isLoading: true, error: '' }));

    try {
      const data = await authAPI.checkDoctorStatus(email);
      closeStatusCheckModal();
      setExistingRequest({
        status: data.status,
        email: data.credentials?.email || email,
        password: data.credentials?.password,
        name: data.credentials?.name,
        submittedAt: data.submittedAt,
        reviewedAt: data.reviewedAt,
        rejectionReason: data.rejectionReason,
        message: data.message,
      });
    } catch (error) {
      console.error('[SignUp] Status check error:', error);
      setStatusCheckModal((p) => ({
        ...p,
        isLoading: false,
        error: error.message || 'لم يتم العثور على طلب بهذا البريد الإلكتروني',
      }));
    }
  }, [statusCheckModal.email, closeStatusCheckModal]);

  /* ─────────────────────────────────────────────────────────────────
     COPY TO CLIPBOARD HELPER
     ───────────────────────────────────────────────────────────────── */

  const copyToClipboard = useCallback((text) => {
    navigator.clipboard?.writeText(text).catch(() => {
      // Silent fail — clipboard API not available
    });
  }, []);

  /* ─────────────────────────────────────────────────────────────────
     LOADING STATE
     ───────────────────────────────────────────────────────────────── */

  if (loading) {
    return (
      <LoadingSpinner
        message={userType === 'doctor' ? 'جاري تقديم الطلب...' : 'جاري إنشاء حسابك...'}
      />
    );
  }

  // ────────────────────────────────────────────────────────────────────
  // RENDER CONTINUES IN PART B / PART C
  // ────────────────────────────────────────────────────────────────────
  // [Part B will contain the main return() with all the conditional renders:
  //   1. requestStatus screen (after successful doctor submission)
  //   2. existingRequest screen (after status check lookup)
  //   3. !userType screen (user type selection landing)
  //   4. userType === 'patient' screen (4-step patient form)
  //   5. userType === 'doctor' screen (4-step doctor form)
  // ]
  /* ═════════════════════════════════════════════════════════════════
     RENDER — REQUEST STATUS PAGE (after successful doctor submission)
     ═════════════════════════════════════════════════════════════════ */

  if (requestStatus) {
    return (
      <div className="signup-page">
        <Navbar />
        <Modal
          isOpen={modal.isOpen}
          type={modal.type}
          title={modal.title}
          message={modal.message}
          onClose={closeModal}
        />

        <div className="signup-container">
          <div className="request-status-container">
            <div className="status-card">
              <div className="status-icon pending">
                <Clock size={48} strokeWidth={2} />
                <div className="status-pulse" />
              </div>

              <h1>تم تقديم طلبك بنجاح</h1>
              <p className="status-subtitle">طلب تسجيل طبيب جديد في منصة Patient 360°</p>

              <div className="status-details">
                <div className="status-detail-row">
                  <span className="detail-label">رقم الطلب</span>
                  <span className="detail-value" dir="ltr">{requestId}</span>
                </div>
                <div className="status-detail-row highlight">
                  <span className="detail-label">حالة الطلب</span>
                  <span className="detail-value">
                    <span className="status-badge pending">
                      <Clock size={12} strokeWidth={2.5} />
                      قيد المراجعة
                    </span>
                  </span>
                </div>
                <div className="status-detail-row">
                  <span className="detail-label">تاريخ التقديم</span>
                  <span className="detail-value">
                    {new Date().toLocaleDateString('ar-EG')}
                  </span>
                </div>
              </div>

              <div className="status-info-box">
                <Info size={20} strokeWidth={2} />
                <div className="info-text">
                  <p>سيتم مراجعة طلبك من قبل وزارة الصحة السورية.</p>
                  <p>عند قبول الطلب، سيتم إرسال بيانات الدخول إلى بريدك الإلكتروني:</p>
                  <span className="email-highlight">{doctorFormData.email}</span>
                </div>
              </div>

              <div className="status-timeline">
                <div className="timeline-item completed">
                  <div className="timeline-dot" />
                  <div className="timeline-content">
                    <span className="timeline-title">تقديم الطلب</span>
                    <span className="timeline-date">تم</span>
                  </div>
                </div>
                <div className="timeline-item active">
                  <div className="timeline-dot" />
                  <div className="timeline-content">
                    <span className="timeline-title">مراجعة الوثائق</span>
                    <span className="timeline-date">جاري...</span>
                  </div>
                </div>
                <div className="timeline-item">
                  <div className="timeline-dot" />
                  <div className="timeline-content">
                    <span className="timeline-title">قرار القبول</span>
                    <span className="timeline-date">قريباً</span>
                  </div>
                </div>
                <div className="timeline-item">
                  <div className="timeline-dot" />
                  <div className="timeline-content">
                    <span className="timeline-title">تفعيل الحساب</span>
                    <span className="timeline-date">بانتظار القبول</span>
                  </div>
                </div>
              </div>

              <button type="button" className="btn-primary" onClick={() => navigate('/')}>
                <ArrowLeft size={18} strokeWidth={2.2} />
                <span>العودة للصفحة الرئيسية</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ═════════════════════════════════════════════════════════════════
     RENDER — EXISTING REQUEST LOOKUP PAGE
     ═════════════════════════════════════════════════════════════════ */

  if (existingRequest) {
    const statusConfig = {
      pending:  { Icon: Clock,        label: 'قيد المراجعة', className: 'pending' },
      approved: { Icon: CheckCircle2, label: 'تم القبول',     className: 'approved' },
      rejected: { Icon: XCircle,      label: 'مرفوض',         className: 'rejected' },
    };
    const status = statusConfig[existingRequest.status] || statusConfig.pending;
    const StatusIcon = status.Icon;

    return (
      <div className="signup-page">
        <Navbar />
        <Modal
          isOpen={modal.isOpen}
          type={modal.type}
          title={modal.title}
          message={modal.message}
          onClose={closeModal}
        />

        <div className="signup-container">
          <div className="request-status-container">
            <div className="status-card">
              <div className={`status-icon ${existingRequest.status}`}>
                <StatusIcon size={48} strokeWidth={2} />
                {existingRequest.status === 'pending' && <div className="status-pulse" />}
              </div>

              <h1>حالة طلب التسجيل</h1>

              <div className="status-details">
                {existingRequest.name && (
                  <div className="status-detail-row">
                    <span className="detail-label">الاسم</span>
                    <span className="detail-value">{existingRequest.name}</span>
                  </div>
                )}
                <div className="status-detail-row">
                  <span className="detail-label">البريد الإلكتروني</span>
                  <span className="detail-value" dir="ltr">{existingRequest.email}</span>
                </div>
                <div className="status-detail-row highlight">
                  <span className="detail-label">حالة الطلب</span>
                  <span className="detail-value">
                    <span className={`status-badge ${status.className}`}>
                      <StatusIcon size={12} strokeWidth={2.5} />
                      {status.label}
                    </span>
                  </span>
                </div>
                {existingRequest.submittedAt && (
                  <div className="status-detail-row">
                    <span className="detail-label">تاريخ التقديم</span>
                    <span className="detail-value">
                      {new Date(existingRequest.submittedAt).toLocaleDateString('ar-EG')}
                    </span>
                  </div>
                )}
                {existingRequest.reviewedAt && (
                  <div className="status-detail-row">
                    <span className="detail-label">تاريخ المراجعة</span>
                    <span className="detail-value">
                      {new Date(existingRequest.reviewedAt).toLocaleDateString('ar-EG')}
                    </span>
                  </div>
                )}
              </div>

              {existingRequest.status === 'pending' && (
                <div className="status-info-box pending-info">
                  <Clock size={20} strokeWidth={2} />
                  <div className="info-text">
                    <p><strong>طلبك قيد المراجعة</strong></p>
                    <p>سيتم مراجعة طلبك من قبل فريق وزارة الصحة السورية. ستتلقى إشعاراً عند اتخاذ القرار.</p>
                  </div>
                </div>
              )}

              {existingRequest.status === 'rejected' && existingRequest.rejectionReason && (
                <div className="rejection-reason-box">
                  <AlertTriangle size={20} strokeWidth={2} />
                  <div className="info-text">
                    <p className="reason-title">سبب الرفض:</p>
                    <p>{existingRequest.rejectionReason}</p>
                  </div>
                </div>
              )}

              {existingRequest.status === 'approved' && existingRequest.password && (
                <div className="success-info-box">
                  <Sparkles size={20} strokeWidth={2} />
                  <div className="info-text">
                    <p><strong>تهانينا! تم قبول طلبك.</strong></p>
                    <p>يمكنك الآن تسجيل الدخول باستخدام البيانات التالية:</p>
                    <div className="credentials-box">
                      <div className="credential-item">
                        <span className="credential-label">البريد الإلكتروني</span>
                        <span className="credential-value">{existingRequest.email}</span>
                        <button
                          type="button"
                          className="copy-btn"
                          onClick={() => copyToClipboard(existingRequest.email)}
                          aria-label="نسخ البريد الإلكتروني"
                        >
                          <Copy size={14} strokeWidth={2.2} />
                        </button>
                      </div>
                      <div className="credential-item">
                        <span className="credential-label">كلمة المرور</span>
                        <span className="credential-value">{existingRequest.password}</span>
                        <button
                          type="button"
                          className="copy-btn"
                          onClick={() => copyToClipboard(existingRequest.password)}
                          aria-label="نسخ كلمة المرور"
                        >
                          <Copy size={14} strokeWidth={2.2} />
                        </button>
                      </div>
                    </div>
                    <p className="important-note">
                      <AlertTriangle size={14} strokeWidth={2.2} />
                      احفظ هذه البيانات في مكان آمن
                    </p>
                  </div>
                </div>
              )}

              <div className="status-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setExistingRequest(null)}
                >
                  <ArrowRight size={18} strokeWidth={2.2} />
                  <span>رجوع</span>
                </button>
                <button type="button" className="btn-primary" onClick={() => navigate('/')}>
                  {existingRequest.status === 'approved' ? (
                    <>
                      <LogIn size={18} strokeWidth={2.2} />
                      <span>تسجيل الدخول</span>
                    </>
                  ) : (
                    <>
                      <ArrowLeft size={18} strokeWidth={2.2} />
                      <span>الصفحة الرئيسية</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ═════════════════════════════════════════════════════════════════
     RENDER — USER TYPE SELECTION (landing screen)
     ═════════════════════════════════════════════════════════════════ */

  if (!userType) {
    return (
      <div className="signup-page">
        <Navbar />
        <Modal
          isOpen={modal.isOpen}
          type={modal.type}
          title={modal.title}
          message={modal.message}
          onClose={closeModal}
        />

        {/* Status check modal */}
        {statusCheckModal.isOpen && (
          <div
            className="modal-overlay"
            onClick={closeStatusCheckModal}
            role="dialog"
            aria-modal="true"
          >
            <div className="status-check-modal" onClick={(e) => e.stopPropagation()}>
              <div className="scm-header">
                <div className="scm-icon-wrapper">
                  <div className="scm-icon">
                    <Search size={36} strokeWidth={2} />
                  </div>
                  <div className="scm-icon-pulse" />
                </div>
                <h2>التحقق من حالة الطلب</h2>
                <p>أدخل البريد الإلكتروني المستخدم عند التسجيل للتحقق من حالة طلبك</p>
              </div>

              <div className="scm-body">
                {statusCheckModal.error && (
                  <div className="scm-error">
                    <AlertCircle size={18} strokeWidth={2.2} />
                    <span>{statusCheckModal.error}</span>
                  </div>
                )}

                <div className="scm-form-group">
                  <label htmlFor="status-check-email">البريد الإلكتروني</label>
                  <div className="form-input-wrapper">
                    <span className="form-input-icon" aria-hidden="true">
                      <Mail size={18} strokeWidth={2} />
                    </span>
                    <input
                      id="status-check-email"
                      type="email"
                      className="form-input"
                      placeholder="example@domain.com"
                      value={statusCheckModal.email}
                      onChange={(e) => setStatusCheckModal((p) => ({
                        ...p,
                        email: e.target.value,
                        error: '',
                      }))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !statusCheckModal.isLoading) {
                          handleStatusCheckSubmit();
                        }
                      }}
                      disabled={statusCheckModal.isLoading}
                      dir="ltr"
                      autoComplete="email"
                      autoFocus
                    />
                  </div>
                  <span className="scm-input-hint">
                    <Info size={12} strokeWidth={2.2} />
                    البريد الإلكتروني المستخدم عند التسجيل
                  </span>
                </div>

                <button
                  type="button"
                  className="scm-submit-btn"
                  onClick={handleStatusCheckSubmit}
                  disabled={statusCheckModal.isLoading || !statusCheckModal.email}
                >
                  {statusCheckModal.isLoading ? (
                    <span className="btn-loading">
                      <Loader2 size={18} className="btn-spin" />
                      جارٍ البحث...
                    </span>
                  ) : (
                    <>
                      <Search size={18} strokeWidth={2.2} />
                      <span>التحقق من الحالة</span>
                    </>
                  )}
                </button>
              </div>

              <div className="scm-footer">
                <button type="button" className="scm-close-btn" onClick={closeStatusCheckModal}>
                  إلغاء
                </button>
              </div>

              <div className="scm-security-note">
                <Shield size={14} strokeWidth={2.2} />
                <span>بياناتك محمية ومشفرة</span>
              </div>
            </div>
          </div>
        )}

        <div className="signup-container">
          <div className="user-type-selection">
            {/* Header */}
            <div className="selection-header">
              <div className="selection-icon-main">
                <Hospital size={40} strokeWidth={1.6} />
              </div>
              <h1>مرحباً بك في Patient 360°</h1>
              <p>منصة الرعاية الصحية الموحدة — وزارة الصحة السورية</p>
            </div>

            {/* Subtitle */}
            <div className="selection-subtitle">
              <h2>اختر نوع الحساب</h2>
              <p>حدد نوع المستخدم للمتابعة في عملية التسجيل</p>
            </div>

            {/* Cards */}
            <div className="user-type-cards">
              {/* Patient card */}
              <button
                type="button"
                className="user-type-card"
                onClick={() => setUserType('patient')}
              >
                <div className="type-card-icon">
                  <User size={32} strokeWidth={1.8} />
                </div>
                <h3>تسجيل كمريض</h3>
                <p>إنشاء حساب للوصول إلى خدمات الرعاية الصحية الشاملة</p>
                <ul className="type-features">
                  <li>
                    <Check size={16} strokeWidth={2.5} />
                    سجل طبي إلكتروني شامل
                  </li>
                  <li>
                    <Check size={16} strokeWidth={2.5} />
                    حجز المواعيد بسهولة
                  </li>
                  <li>
                    <Check size={16} strokeWidth={2.5} />
                    متابعة الوصفات الطبية
                  </li>
                  <li>
                    <Check size={16} strokeWidth={2.5} />
                    التواصل مع الأطباء
                  </li>
                </ul>
                <div className="type-card-action">
                  <span>ابدأ التسجيل</span>
                  <ArrowLeft size={18} strokeWidth={2.5} />
                </div>
              </button>

              {/* Doctor card */}
              <button
                type="button"
                className="user-type-card"
                onClick={() => setUserType('doctor')}
              >
                <div className="approval-badge">
                  <ShieldCheck size={12} strokeWidth={2.5} />
                  <span>يتطلب موافقة الوزارة</span>
                </div>
                <div className="type-card-icon">
                  <Stethoscope size={32} strokeWidth={1.8} />
                </div>
                <h3>تسجيل كطبيب</h3>
                <p>تقديم طلب انضمام للمنصة كطبيب معتمد لدى وزارة الصحة</p>
                <ul className="type-features">
                  <li>
                    <Check size={16} strokeWidth={2.5} />
                    إدارة المرضى والمواعيد
                  </li>
                  <li>
                    <Check size={16} strokeWidth={2.5} />
                    نظام ECG AI لأطباء القلب
                  </li>
                  <li>
                    <Check size={16} strokeWidth={2.5} />
                    إصدار الوصفات الطبية
                  </li>
                  <li>
                    <Check size={16} strokeWidth={2.5} />
                    التعاون مع المؤسسات الصحية
                  </li>
                </ul>
                <div className="type-card-action">
                  <span>تقديم طلب</span>
                  <ArrowLeft size={18} strokeWidth={2.5} />
                </div>
              </button>
            </div>

            {/* Check status section */}
            <div className="check-status-section">
              <div className="check-status-divider">
                <span>أو</span>
              </div>
              <div className="check-status-card">
                <h4>لديك طلب تسجيل سابق؟</h4>
                <p>تحقق من حالة طلبك باستخدام البريد الإلكتروني المسجل</p>
                <button
                  type="button"
                  className="check-status-btn"
                  onClick={openStatusCheckModal}
                >
                  <Search size={16} strokeWidth={2.2} />
                  <span>تحقق من الحالة</span>
                </button>
              </div>
            </div>

            <div className="login-link">
              لديك حساب بالفعل؟
              <Link to="/">تسجيل الدخول</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ═════════════════════════════════════════════════════════════════
     RENDER — PATIENT REGISTRATION FORM (4 steps)
     ═════════════════════════════════════════════════════════════════ */

  if (userType === 'patient') {
    const progressPercent = ((currentStep - 1) / (PATIENT_TOTAL_STEPS - 1)) * 100;

    return (
      <div className="signup-page">
        <Navbar />
        <Modal
          isOpen={modal.isOpen}
          type={modal.type}
          title={modal.title}
          message={modal.message}
          onClose={closeModal}
          buttonLabel={modal.type === 'success' ? 'تسجيل الدخول' : 'حسناً'}
        />

        <div className="signup-container">
          <div className="signup-wrapper">
            {/* Back button */}
            <button
              type="button"
              className="back-to-selection"
              onClick={handleBackToSelection}
            >
              <ArrowRight size={16} strokeWidth={2.2} />
              <span>العودة لاختيار نوع الحساب</span>
            </button>

            {/* Progress bar */}
            <div className="progress-bar">
              <div className="progress-track" />
              <div
                className="progress-fill"
                style={{ width: `${progressPercent}%` }}
              />
              <div className="progress-steps">
                {[1, 2, 3, 4].map((step) => (
                  <div
                    key={step}
                    className={`progress-step ${
                      currentStep === step ? 'active' : ''
                    } ${currentStep > step ? 'completed' : ''}`}
                  >
                    {currentStep > step ? <Check size={18} strokeWidth={3} /> : step}
                  </div>
                ))}
              </div>
            </div>

            {/* Form header */}
            <div className="form-header">
              <h1 className="form-title">تسجيل مريض جديد</h1>
              <p className="form-subtitle">
                {currentStep === 1 && 'الخطوة 1 من 4 — المعلومات الشخصية'}
                {currentStep === 2 && 'الخطوة 2 من 4 — المعلومات الطبية'}
                {currentStep === 3 && 'الخطوة 3 من 4 — التاريخ الصحي وجهة الاتصال'}
                {currentStep === 4 && 'الخطوة 4 من 4 — كلمة المرور'}
              </p>
            </div>

            {/* Form */}
            <form className="signup-form" onSubmit={handlePatientSubmit} noValidate>
              {/* ═══ STEP 1: Personal Information ═══ */}
              {currentStep === 1 && (
                <div className="form-step">
                  {/* Age indicator */}
                  {patientFormData.dateOfBirth && (
                    <div className={`age-indicator ${isMinor ? 'minor' : 'adult'}`}>
                      {isMinor ? (
                        <Baby size={20} strokeWidth={2} />
                      ) : (
                        <User size={20} strokeWidth={2} />
                      )}
                      <span>
                        العمر: {age} سنة — {isMinor ? 'قاصر (أقل من 18)' : 'بالغ'}
                      </span>
                    </div>
                  )}

                  {/* Names row 1 */}
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label" htmlFor="patient-firstName">
                        الاسم الأول <span className="required-mark">*</span>
                      </label>
                      <div className="form-input-wrapper">
                        <span className="form-input-icon" aria-hidden="true">
                          <User size={18} strokeWidth={2} />
                        </span>
                        <input
                          id="patient-firstName"
                          type="text"
                          name="firstName"
                          className={`form-input ${errors.firstName ? 'error' : ''}`}
                          value={patientFormData.firstName}
                          onChange={handlePatientChange}
                          placeholder="أدخل الاسم الأول"
                          maxLength={50}
                          autoComplete="given-name"
                        />
                      </div>
                      {errors.firstName && (
                        <span className="error-message">
                          <AlertCircle size={14} strokeWidth={2.2} />
                          {errors.firstName}
                        </span>
                      )}
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="patient-fatherName">
                        اسم الأب <span className="required-mark">*</span>
                      </label>
                      <div className="form-input-wrapper">
                        <span className="form-input-icon" aria-hidden="true">
                          <User size={18} strokeWidth={2} />
                        </span>
                        <input
                          id="patient-fatherName"
                          type="text"
                          name="fatherName"
                          className={`form-input ${errors.fatherName ? 'error' : ''}`}
                          value={patientFormData.fatherName}
                          onChange={handlePatientChange}
                          placeholder="أدخل اسم الأب"
                          maxLength={50}
                          autoComplete="additional-name"
                        />
                      </div>
                      {errors.fatherName && (
                        <span className="error-message">
                          <AlertCircle size={14} strokeWidth={2.2} />
                          {errors.fatherName}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Names row 2 */}
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label" htmlFor="patient-lastName">
                        اسم العائلة <span className="required-mark">*</span>
                      </label>
                      <div className="form-input-wrapper">
                        <span className="form-input-icon" aria-hidden="true">
                          <User size={18} strokeWidth={2} />
                        </span>
                        <input
                          id="patient-lastName"
                          type="text"
                          name="lastName"
                          className={`form-input ${errors.lastName ? 'error' : ''}`}
                          value={patientFormData.lastName}
                          onChange={handlePatientChange}
                          placeholder="أدخل اسم العائلة"
                          maxLength={50}
                          autoComplete="family-name"
                        />
                      </div>
                      {errors.lastName && (
                        <span className="error-message">
                          <AlertCircle size={14} strokeWidth={2.2} />
                          {errors.lastName}
                        </span>
                      )}
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="patient-motherName">
                        اسم الأم الكامل <span className="required-mark">*</span>
                      </label>
                      <div className="form-input-wrapper">
                        <span className="form-input-icon" aria-hidden="true">
                          <User size={18} strokeWidth={2} />
                        </span>
                        <input
                          id="patient-motherName"
                          type="text"
                          name="motherName"
                          className={`form-input ${errors.motherName ? 'error' : ''}`}
                          value={patientFormData.motherName}
                          onChange={handlePatientChange}
                          placeholder="أدخل اسم الأم الكامل"
                          maxLength={100}
                        />
                      </div>
                      {errors.motherName && (
                        <span className="error-message">
                          <AlertCircle size={14} strokeWidth={2.2} />
                          {errors.motherName}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Email */}
                  <div className="form-group">
                    <label className="form-label" htmlFor="patient-email">
                      البريد الإلكتروني <span className="required-mark">*</span>
                    </label>
                    <div className="form-input-wrapper">
                      <span className="form-input-icon" aria-hidden="true">
                        <Mail size={18} strokeWidth={2} />
                      </span>
                      <input
                        id="patient-email"
                        type="email"
                        name="email"
                        className={`form-input ${errors.email ? 'error' : ''}`}
                        value={patientFormData.email}
                        onChange={handlePatientChange}
                        placeholder="example@email.com"
                        dir="ltr"
                        autoComplete="email"
                      />
                    </div>
                    {errors.email && (
                      <span className="error-message">
                        <AlertCircle size={14} strokeWidth={2.2} />
                        {errors.email}
                      </span>
                    )}
                  </div>

                  {/* Date of birth */}
                  <div className="form-group">
                    <label className="form-label" htmlFor="patient-dateOfBirth">
                      تاريخ الميلاد <span className="required-mark">*</span>
                    </label>
                    <div className="form-input-wrapper">
                      <span className="form-input-icon" aria-hidden="true">
                        <Calendar size={18} strokeWidth={2} />
                      </span>
                      <input
                        id="patient-dateOfBirth"
                        type="date"
                        name="dateOfBirth"
                        className={`form-input ${errors.dateOfBirth ? 'error' : ''}`}
                        value={patientFormData.dateOfBirth}
                        onChange={handlePatientDateOfBirthChange}
                        max={getTodayDate()}
                        autoComplete="bday"
                      />
                    </div>
                    {errors.dateOfBirth && (
                      <span className="error-message">
                        <AlertCircle size={14} strokeWidth={2.2} />
                        {errors.dateOfBirth}
                      </span>
                    )}
                  </div>

                  {/* National ID — branches by age */}
                  <div className="form-group">
                    {isMinor ? (
                      <>
                        <label className="form-label" htmlFor="patient-parentNationalId">
                          الرقم الوطني للوالد/الوالدة <span className="required-mark">*</span>
                          <span className="label-hint">(الطفل أقل من 18 سنة)</span>
                        </label>
                        <div className="form-input-wrapper">
                          <span className="form-input-icon" aria-hidden="true">
                            <IdCard size={18} strokeWidth={2} />
                          </span>
                          <input
                            id="patient-parentNationalId"
                            type="text"
                            name="parentNationalId"
                            className={`form-input ${errors.parentNationalId ? 'error' : ''}`}
                            value={patientFormData.parentNationalId}
                            onChange={(e) => setPatientFormData({
                              ...patientFormData,
                              parentNationalId: e.target.value.replace(/\D/g, '').slice(0, 11),
                            })}
                            placeholder="11 رقم"
                            maxLength={11}
                            dir="ltr"
                            inputMode="numeric"
                          />
                        </div>
                        {errors.parentNationalId && (
                          <span className="error-message">
                            <AlertCircle size={14} strokeWidth={2.2} />
                            {errors.parentNationalId}
                          </span>
                        )}
                      </>
                    ) : (
                      <>
                        <label className="form-label" htmlFor="patient-nationalId">
                          الرقم الوطني <span className="required-mark">*</span>
                        </label>
                        <div className="form-input-wrapper">
                          <span className="form-input-icon" aria-hidden="true">
                            <IdCard size={18} strokeWidth={2} />
                          </span>
                          <input
                            id="patient-nationalId"
                            type="text"
                            name="nationalId"
                            className={`form-input ${errors.nationalId ? 'error' : ''}`}
                            value={patientFormData.nationalId}
                            onChange={(e) => setPatientFormData({
                              ...patientFormData,
                              nationalId: e.target.value.replace(/\D/g, '').slice(0, 11),
                            })}
                            placeholder="11 رقم"
                            maxLength={11}
                            dir="ltr"
                            inputMode="numeric"
                          />
                        </div>
                        {errors.nationalId && (
                          <span className="error-message">
                            <AlertCircle size={14} strokeWidth={2.2} />
                            {errors.nationalId}
                          </span>
                        )}
                      </>
                    )}
                  </div>

                  {/* Gender */}
                  <div className="form-group">
                    <label className="form-label">
                      الجنس <span className="required-mark">*</span>
                    </label>
                    <div className="radio-group">
                      <label className="radio-label">
                        <input
                          type="radio"
                          name="gender"
                          value="male"
                          checked={patientFormData.gender === 'male'}
                          onChange={handlePatientChange}
                        />
                        <span className="radio-custom" />
                        <span>ذكر</span>
                      </label>
                      <label className="radio-label">
                        <input
                          type="radio"
                          name="gender"
                          value="female"
                          checked={patientFormData.gender === 'female'}
                          onChange={handlePatientChange}
                        />
                        <span className="radio-custom" />
                        <span>أنثى</span>
                      </label>
                    </div>
                    {errors.gender && (
                      <span className="error-message">
                        <AlertCircle size={14} strokeWidth={2.2} />
                        {errors.gender}
                      </span>
                    )}
                  </div>

                  {/* Phone */}
                  <div className="form-group">
                    <label className="form-label" htmlFor="patient-phoneNumber">
                      رقم الهاتف <span className="required-mark">*</span>
                    </label>
                    <div className="form-input-wrapper">
                      <span className="form-input-icon" aria-hidden="true">
                        <Phone size={18} strokeWidth={2} />
                      </span>
                      <input
                        id="patient-phoneNumber"
                        type="tel"
                        name="phoneNumber"
                        className={`form-input ${errors.phoneNumber ? 'error' : ''}`}
                        value={patientFormData.phoneNumber}
                        onChange={handlePatientChange}
                        placeholder="+963 9X XXX XXXX"
                        dir="ltr"
                        autoComplete="tel"
                      />
                    </div>
                    {errors.phoneNumber && (
                      <span className="error-message">
                        <AlertCircle size={14} strokeWidth={2.2} />
                        {errors.phoneNumber}
                      </span>
                    )}
                  </div>

                  {/* Governorate + city */}
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label" htmlFor="patient-governorate">
                        المحافظة <span className="required-mark">*</span>
                      </label>
                      <select
                        id="patient-governorate"
                        name="governorate"
                        className={`form-input ${errors.governorate ? 'error' : ''}`}
                        value={patientFormData.governorate}
                        onChange={handlePatientChange}
                      >
                        <option value="">اختر المحافظة</option>
                        {SYRIAN_GOVERNORATES.map((gov) => (
                          <option key={gov.id} value={gov.id}>{gov.nameAr}</option>
                        ))}
                      </select>
                      {errors.governorate && (
                        <span className="error-message">
                          <AlertCircle size={14} strokeWidth={2.2} />
                          {errors.governorate}
                        </span>
                      )}
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="patient-city">
                        المدينة <span className="required-mark">*</span>
                      </label>
                      <div className="form-input-wrapper">
                        <span className="form-input-icon" aria-hidden="true">
                          <MapPin size={18} strokeWidth={2} />
                        </span>
                        <input
                          id="patient-city"
                          type="text"
                          name="city"
                          className={`form-input ${errors.city ? 'error' : ''}`}
                          value={patientFormData.city}
                          onChange={handlePatientChange}
                          placeholder="أدخل المدينة"
                          autoComplete="address-level2"
                        />
                      </div>
                      {errors.city && (
                        <span className="error-message">
                          <AlertCircle size={14} strokeWidth={2.2} />
                          {errors.city}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Address (optional) */}
                  <div className="form-group">
                    <label className="form-label" htmlFor="patient-address">
                      العنوان التفصيلي
                      <span className="label-hint">(اختياري)</span>
                    </label>
                    <div className="form-input-wrapper">
                      <span className="form-input-icon" aria-hidden="true">
                        <MapPin size={18} strokeWidth={2} />
                      </span>
                      <input
                        id="patient-address"
                        type="text"
                        name="address"
                        className="form-input"
                        value={patientFormData.address}
                        onChange={handlePatientChange}
                        placeholder="الحي، الشارع، رقم المبنى"
                        autoComplete="street-address"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ═══ STEP 2: Medical Information ═══ */}
              {currentStep === 2 && (
                <div className="form-step">
                  <div className="form-group">
                    <label className="form-label" htmlFor="patient-bloodType">
                      فصيلة الدم
                      <span className="label-hint">(اختياري)</span>
                    </label>
                    <select
                      id="patient-bloodType"
                      name="bloodType"
                      className="form-input"
                      value={patientFormData.bloodType}
                      onChange={handlePatientChange}
                    >
                      <option value="">اختر فصيلة الدم</option>
                      {BLOOD_TYPES.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label" htmlFor="patient-height">
                        الطول (سم)
                        <span className="label-hint">(اختياري)</span>
                      </label>
                      <div className="form-input-wrapper">
                        <span className="form-input-icon" aria-hidden="true">
                          <Activity size={18} strokeWidth={2} />
                        </span>
                        <input
                          id="patient-height"
                          type="number"
                          name="height"
                          className={`form-input ${errors.height ? 'error' : ''}`}
                          value={patientFormData.height}
                          onChange={handlePatientChange}
                          placeholder="مثال: 175"
                          min="50"
                          max="300"
                        />
                      </div>
                      {errors.height && (
                        <span className="error-message">
                          <AlertCircle size={14} strokeWidth={2.2} />
                          {errors.height}
                        </span>
                      )}
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="patient-weight">
                        الوزن (كجم)
                        <span className="label-hint">(اختياري)</span>
                      </label>
                      <div className="form-input-wrapper">
                        <span className="form-input-icon" aria-hidden="true">
                          <Activity size={18} strokeWidth={2} />
                        </span>
                        <input
                          id="patient-weight"
                          type="number"
                          name="weight"
                          className={`form-input ${errors.weight ? 'error' : ''}`}
                          value={patientFormData.weight}
                          onChange={handlePatientChange}
                          placeholder="مثال: 70"
                          min="2"
                          max="300"
                        />
                      </div>
                      {errors.weight && (
                        <span className="error-message">
                          <AlertCircle size={14} strokeWidth={2.2} />
                          {errors.weight}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="patient-smokingStatus">
                      حالة التدخين
                      <span className="label-hint">(اختياري)</span>
                    </label>
                    <select
                      id="patient-smokingStatus"
                      name="smokingStatus"
                      className="form-input"
                      value={patientFormData.smokingStatus}
                      onChange={handlePatientChange}
                    >
                      <option value="">اختر حالة التدخين</option>
                      {SMOKING_STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* ═══ STEP 3: Health History & Emergency ═══ */}
              {currentStep === 3 && (
                <div className="form-step">
                  <div className="form-group">
                    <label className="form-label" htmlFor="patient-allergies">
                      الحساسية
                      <span className="label-hint">(اختياري)</span>
                    </label>
                    <textarea
                      id="patient-allergies"
                      name="allergies"
                      className="form-input"
                      value={patientFormData.allergies}
                      onChange={handlePatientChange}
                      placeholder="أدخل أي حساسية، مفصولة بفواصل"
                      rows="2"
                    />
                    <span className="form-hint">
                      <Info size={12} strokeWidth={2.2} />
                      افصل بين الحساسيات بفاصلة (,)
                    </span>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="patient-chronicDiseases">
                      الأمراض المزمنة
                      <span className="label-hint">(اختياري)</span>
                    </label>
                    <textarea
                      id="patient-chronicDiseases"
                      name="chronicDiseases"
                      className="form-input"
                      value={patientFormData.chronicDiseases}
                      onChange={handlePatientChange}
                      placeholder="أدخل أي أمراض مزمنة، مفصولة بفواصل"
                      rows="2"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="patient-familyHistory">
                      التاريخ العائلي المرضي
                      <span className="label-hint">(اختياري)</span>
                    </label>
                    <textarea
                      id="patient-familyHistory"
                      name="familyHistory"
                      className="form-input"
                      value={patientFormData.familyHistory}
                      onChange={handlePatientChange}
                      placeholder="أدخل أي أمراض وراثية أو عائلية"
                      rows="2"
                    />
                  </div>

                  {/* Emergency contact section */}
                  <div className="emergency-section">
                    <h3>
                      <AlertTriangle size={18} strokeWidth={2.2} />
                      جهة الاتصال للطوارئ
                    </h3>

                    <div className="form-group">
                      <label className="form-label" htmlFor="patient-emergencyName">
                        اسم جهة الاتصال <span className="required-mark">*</span>
                      </label>
                      <div className="form-input-wrapper">
                        <span className="form-input-icon" aria-hidden="true">
                          <User size={18} strokeWidth={2} />
                        </span>
                        <input
                          id="patient-emergencyName"
                          type="text"
                          name="emergencyContactName"
                          className={`form-input ${errors.emergencyContactName ? 'error' : ''}`}
                          value={patientFormData.emergencyContactName}
                          onChange={handlePatientChange}
                          placeholder="الاسم الكامل"
                        />
                      </div>
                      {errors.emergencyContactName && (
                        <span className="error-message">
                          <AlertCircle size={14} strokeWidth={2.2} />
                          {errors.emergencyContactName}
                        </span>
                      )}
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="patient-emergencyRelationship">
                        صلة القرابة <span className="required-mark">*</span>
                      </label>
                      <div className="form-input-wrapper">
                        <span className="form-input-icon" aria-hidden="true">
                          <Users size={18} strokeWidth={2} />
                        </span>
                        <input
                          id="patient-emergencyRelationship"
                          type="text"
                          name="emergencyContactRelationship"
                          className={`form-input ${errors.emergencyContactRelationship ? 'error' : ''}`}
                          value={patientFormData.emergencyContactRelationship}
                          onChange={handlePatientChange}
                          placeholder="مثال: أب، أم، أخ، زوجة"
                        />
                      </div>
                      {errors.emergencyContactRelationship && (
                        <span className="error-message">
                          <AlertCircle size={14} strokeWidth={2.2} />
                          {errors.emergencyContactRelationship}
                        </span>
                      )}
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="patient-emergencyPhone">
                        رقم هاتف الطوارئ <span className="required-mark">*</span>
                      </label>
                      <div className="form-input-wrapper">
                        <span className="form-input-icon" aria-hidden="true">
                          <Phone size={18} strokeWidth={2} />
                        </span>
                        <input
                          id="patient-emergencyPhone"
                          type="tel"
                          name="emergencyContactPhone"
                          className={`form-input ${errors.emergencyContactPhone ? 'error' : ''}`}
                          value={patientFormData.emergencyContactPhone}
                          onChange={handlePatientChange}
                          placeholder="+963 9X XXX XXXX"
                          dir="ltr"
                        />
                      </div>
                      {errors.emergencyContactPhone && (
                        <span className="error-message">
                          <AlertCircle size={14} strokeWidth={2.2} />
                          {errors.emergencyContactPhone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ═══ STEP 4: Password ═══ */}
              {currentStep === 4 && (
                <div className="form-step">
                  <div className="form-group">
                    <label className="form-label" htmlFor="patient-password">
                      كلمة المرور <span className="required-mark">*</span>
                    </label>
                    <div className="form-input-wrapper has-toggle">
                      <span className="form-input-icon" aria-hidden="true">
                        <Lock size={18} strokeWidth={2} />
                      </span>
                      <input
                        id="patient-password"
                        type={showPatientPassword ? 'text' : 'password'}
                        name="password"
                        className={`form-input ${errors.password ? 'error' : ''}`}
                        value={patientFormData.password}
                        onChange={handlePatientChange}
                        placeholder="أدخل كلمة مرور قوية"
                        autoComplete="new-password"
                        dir="ltr"
                      />
                      <button
                        type="button"
                        className="password-toggle-btn"
                        onClick={() => setShowPatientPassword((p) => !p)}
                        aria-label={showPatientPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                      >
                        {showPatientPassword
                          ? <EyeOff size={18} strokeWidth={2} />
                          : <Eye size={18} strokeWidth={2} />}
                      </button>
                    </div>
                    {errors.password && (
                      <span className="error-message">
                        <AlertCircle size={14} strokeWidth={2.2} />
                        {errors.password}
                      </span>
                    )}
                  </div>

                  <PasswordStrengthMeter password={patientFormData.password} />

                  <div className="form-group">
                    <label className="form-label" htmlFor="patient-confirmPassword">
                      تأكيد كلمة المرور <span className="required-mark">*</span>
                    </label>
                    <div className="form-input-wrapper has-toggle">
                      <span className="form-input-icon" aria-hidden="true">
                        <Lock size={18} strokeWidth={2} />
                      </span>
                      <input
                        id="patient-confirmPassword"
                        type={showPatientConfirm ? 'text' : 'password'}
                        name="confirmPassword"
                        className={`form-input ${errors.confirmPassword ? 'error' : ''}`}
                        value={patientFormData.confirmPassword}
                        onChange={handlePatientChange}
                        placeholder="أعد إدخال كلمة المرور"
                        autoComplete="new-password"
                        dir="ltr"
                      />
                      <button
                        type="button"
                        className="password-toggle-btn"
                        onClick={() => setShowPatientConfirm((p) => !p)}
                        aria-label={showPatientConfirm ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                      >
                        {showPatientConfirm
                          ? <EyeOff size={18} strokeWidth={2} />
                          : <Eye size={18} strokeWidth={2} />}
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <span className="error-message">
                        <AlertCircle size={14} strokeWidth={2.2} />
                        {errors.confirmPassword}
                      </span>
                    )}
                  </div>

                  <div className="terms-checkbox">
                    <label className="checkbox-label">
                      <input type="checkbox" required />
                      <span className="checkbox-custom" />
                      <span>
                        أوافق على
                        <Link to="/terms" target="_blank" style={{ color: 'var(--tm-action)', fontWeight: 700, margin: '0 4px' }}>الشروط والأحكام</Link>
                        و
                        <Link to="/privacy" target="_blank" style={{ color: 'var(--tm-action)', fontWeight: 700, marginRight: 4 }}>سياسة الخصوصية</Link>
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {/* Form actions */}
              <div className="form-actions">
                {currentStep > 1 && (
                  <button type="button" className="btn-secondary" onClick={handlePrev}>
                    <ArrowRight size={18} strokeWidth={2.2} />
                    <span>السابق</span>
                  </button>
                )}

                {currentStep < PATIENT_TOTAL_STEPS ? (
                  <button type="button" className="btn-primary" onClick={handleNext}>
                    <span>التالي</span>
                    <ArrowLeft size={18} strokeWidth={2.2} />
                  </button>
                ) : (
                  <button type="submit" className="btn-primary">
                    <UserPlus size={18} strokeWidth={2.2} />
                    <span>إنشاء الحساب</span>
                  </button>
                )}
              </div>

              <div className="login-link">
                لديك حساب بالفعل؟
                <Link to="/">تسجيل الدخول</Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────
  // [Doctor form continues in PART C — same component, do not close]
  // ──────────────────────────────────────────────────────────────────
  /* ═════════════════════════════════════════════════════════════════
     RENDER — DOCTOR REGISTRATION FORM (4 steps)
     ═════════════════════════════════════════════════════════════════ */

  // Doctor flow (userType === 'doctor')
  const progressPercent = ((currentStep - 1) / (DOCTOR_TOTAL_STEPS - 1)) * 100;

  return (
    <div className="signup-page">
      <Navbar />
      <Modal
        isOpen={modal.isOpen}
        type={modal.type}
        title={modal.title}
        message={modal.message}
        onClose={closeModal}
      />

      <div className="signup-container">
        <div className="signup-wrapper">
          {/* Back button */}
          <button
            type="button"
            className="back-to-selection"
            onClick={handleBackToSelection}
          >
            <ArrowRight size={16} strokeWidth={2.2} />
            <span>العودة لاختيار نوع الحساب</span>
          </button>

          {/* Progress bar */}
          <div className="progress-bar">
            <div className="progress-track" />
            <div
              className="progress-fill"
              style={{ width: `${progressPercent}%` }}
            />
            <div className="progress-steps">
              {[1, 2, 3, 4].map((step) => (
                <div
                  key={step}
                  className={`progress-step ${
                    currentStep === step ? 'active' : ''
                  } ${currentStep > step ? 'completed' : ''}`}
                >
                  {currentStep > step ? <Check size={18} strokeWidth={3} /> : step}
                </div>
              ))}
            </div>
          </div>

          {/* Form header with ministry badge */}
          <div className="form-header doctor">
            <div className="doctor-header-badge">
              <ShieldCheck size={14} strokeWidth={2.5} />
              <span>وزارة الصحة السورية</span>
            </div>
            <h1 className="form-title">طلب تسجيل طبيب</h1>
            <p className="form-subtitle">
              {currentStep === 1 && 'الخطوة 1 من 4 — المعلومات الشخصية'}
              {currentStep === 2 && 'الخطوة 2 من 4 — المعلومات المهنية'}
              {currentStep === 3 && 'الخطوة 3 من 4 — الوثائق المطلوبة'}
              {currentStep === 4 && 'الخطوة 4 من 4 — مراجعة وتقديم الطلب'}
            </p>
          </div>

          {/* Notice banner */}
          <div className="doctor-notice">
            <Info size={20} strokeWidth={2} />
            <div>
              <strong>ملاحظة هامة</strong>
              <p>
                سيتم مراجعة طلبك من قبل وزارة الصحة. عند القبول، ستتلقى بيانات
                الدخول عبر البريد الإلكتروني.
              </p>
            </div>
          </div>

          {/* Form */}
          <form className="signup-form" onSubmit={handleDoctorSubmit} noValidate>
            {/* ═══ STEP 1: Personal Information ═══ */}
            {currentStep === 1 && (
              <div className="form-step">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="doctor-firstName">
                      الاسم الأول <span className="required-mark">*</span>
                    </label>
                    <div className="form-input-wrapper">
                      <span className="form-input-icon" aria-hidden="true">
                        <User size={18} strokeWidth={2} />
                      </span>
                      <input
                        id="doctor-firstName"
                        type="text"
                        name="firstName"
                        className={`form-input ${errors.firstName ? 'error' : ''}`}
                        value={doctorFormData.firstName}
                        onChange={handleDoctorChange}
                        placeholder="أدخل الاسم الأول"
                        autoComplete="given-name"
                      />
                    </div>
                    {errors.firstName && (
                      <span className="error-message">
                        <AlertCircle size={14} strokeWidth={2.2} />
                        {errors.firstName}
                      </span>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="doctor-fatherName">
                      اسم الأب <span className="required-mark">*</span>
                    </label>
                    <div className="form-input-wrapper">
                      <span className="form-input-icon" aria-hidden="true">
                        <User size={18} strokeWidth={2} />
                      </span>
                      <input
                        id="doctor-fatherName"
                        type="text"
                        name="fatherName"
                        className={`form-input ${errors.fatherName ? 'error' : ''}`}
                        value={doctorFormData.fatherName}
                        onChange={handleDoctorChange}
                        placeholder="أدخل اسم الأب"
                        autoComplete="additional-name"
                      />
                    </div>
                    {errors.fatherName && (
                      <span className="error-message">
                        <AlertCircle size={14} strokeWidth={2.2} />
                        {errors.fatherName}
                      </span>
                    )}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="doctor-lastName">
                      الكنية <span className="required-mark">*</span>
                    </label>
                    <div className="form-input-wrapper">
                      <span className="form-input-icon" aria-hidden="true">
                        <User size={18} strokeWidth={2} />
                      </span>
                      <input
                        id="doctor-lastName"
                        type="text"
                        name="lastName"
                        className={`form-input ${errors.lastName ? 'error' : ''}`}
                        value={doctorFormData.lastName}
                        onChange={handleDoctorChange}
                        placeholder="أدخل الكنية"
                        autoComplete="family-name"
                      />
                    </div>
                    {errors.lastName && (
                      <span className="error-message">
                        <AlertCircle size={14} strokeWidth={2.2} />
                        {errors.lastName}
                      </span>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="doctor-motherName">
                      اسم الأم الكامل <span className="required-mark">*</span>
                    </label>
                    <div className="form-input-wrapper">
                      <span className="form-input-icon" aria-hidden="true">
                        <User size={18} strokeWidth={2} />
                      </span>
                      <input
                        id="doctor-motherName"
                        type="text"
                        name="motherName"
                        className={`form-input ${errors.motherName ? 'error' : ''}`}
                        value={doctorFormData.motherName}
                        onChange={handleDoctorChange}
                        placeholder="أدخل اسم الأم الكامل"
                      />
                    </div>
                    {errors.motherName && (
                      <span className="error-message">
                        <AlertCircle size={14} strokeWidth={2.2} />
                        {errors.motherName}
                      </span>
                    )}
                  </div>
                </div>

                {/* National ID */}
                <div className="form-group">
                  <label className="form-label" htmlFor="doctor-nationalId">
                    الرقم الوطني <span className="required-mark">*</span>
                  </label>
                  <div className="form-input-wrapper">
                    <span className="form-input-icon" aria-hidden="true">
                      <IdCard size={18} strokeWidth={2} />
                    </span>
                    <input
                      id="doctor-nationalId"
                      type="text"
                      name="nationalId"
                      className={`form-input ${errors.nationalId ? 'error' : ''}`}
                      value={doctorFormData.nationalId}
                      onChange={(e) => setDoctorFormData({
                        ...doctorFormData,
                        nationalId: e.target.value.replace(/\D/g, '').slice(0, 11),
                      })}
                      placeholder="11 رقم"
                      maxLength={11}
                      dir="ltr"
                      inputMode="numeric"
                    />
                  </div>
                  {errors.nationalId && (
                    <span className="error-message">
                      <AlertCircle size={14} strokeWidth={2.2} />
                      {errors.nationalId}
                    </span>
                  )}
                </div>

                {/* DOB + Gender */}
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="doctor-dateOfBirth">
                      تاريخ الميلاد <span className="required-mark">*</span>
                    </label>
                    <div className="form-input-wrapper">
                      <span className="form-input-icon" aria-hidden="true">
                        <Calendar size={18} strokeWidth={2} />
                      </span>
                      <input
                        id="doctor-dateOfBirth"
                        type="date"
                        name="dateOfBirth"
                        className={`form-input ${errors.dateOfBirth ? 'error' : ''}`}
                        value={doctorFormData.dateOfBirth}
                        onChange={handleDoctorChange}
                        max={getTodayDate()}
                        autoComplete="bday"
                      />
                    </div>
                    {errors.dateOfBirth && (
                      <span className="error-message">
                        <AlertCircle size={14} strokeWidth={2.2} />
                        {errors.dateOfBirth}
                      </span>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="doctor-gender">
                      الجنس <span className="required-mark">*</span>
                    </label>
                    <select
                      id="doctor-gender"
                      name="gender"
                      className="form-input"
                      value={doctorFormData.gender}
                      onChange={handleDoctorChange}
                    >
                      <option value="male">ذكر</option>
                      <option value="female">أنثى</option>
                    </select>
                  </div>
                </div>

                {/* Email */}
                <div className="form-group">
                  <label className="form-label" htmlFor="doctor-email">
                    البريد الإلكتروني <span className="required-mark">*</span>
                  </label>
                  <div className="form-input-wrapper">
                    <span className="form-input-icon" aria-hidden="true">
                      <Mail size={18} strokeWidth={2} />
                    </span>
                    <input
                      id="doctor-email"
                      type="email"
                      name="email"
                      className={`form-input ${errors.email ? 'error' : ''}`}
                      value={doctorFormData.email}
                      onChange={handleDoctorChange}
                      placeholder="example@email.com"
                      dir="ltr"
                      autoComplete="email"
                    />
                  </div>
                  {errors.email && (
                    <span className="error-message">
                      <AlertCircle size={14} strokeWidth={2.2} />
                      {errors.email}
                    </span>
                  )}
                  <span className="form-hint">
                    <Info size={12} strokeWidth={2.2} />
                    سيتم إرسال بيانات الدخول إلى هذا البريد عند القبول
                  </span>
                </div>

                {/* Passwords */}
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="doctor-password">
                      كلمة المرور <span className="required-mark">*</span>
                    </label>
                    <div className="form-input-wrapper has-toggle">
                      <span className="form-input-icon" aria-hidden="true">
                        <Lock size={18} strokeWidth={2} />
                      </span>
                      <input
                        id="doctor-password"
                        type={showDoctorPassword ? 'text' : 'password'}
                        name="password"
                        className={`form-input ${errors.password ? 'error' : ''}`}
                        value={doctorFormData.password}
                        onChange={handleDoctorChange}
                        placeholder="8 أحرف على الأقل"
                        dir="ltr"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        className="password-toggle-btn"
                        onClick={() => setShowDoctorPassword((p) => !p)}
                        aria-label={showDoctorPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                      >
                        {showDoctorPassword
                          ? <EyeOff size={18} strokeWidth={2} />
                          : <Eye size={18} strokeWidth={2} />}
                      </button>
                    </div>
                    {errors.password && (
                      <span className="error-message">
                        <AlertCircle size={14} strokeWidth={2.2} />
                        {errors.password}
                      </span>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="doctor-confirmPassword">
                      تأكيد كلمة المرور <span className="required-mark">*</span>
                    </label>
                    <div className="form-input-wrapper has-toggle">
                      <span className="form-input-icon" aria-hidden="true">
                        <Lock size={18} strokeWidth={2} />
                      </span>
                      <input
                        id="doctor-confirmPassword"
                        type={showDoctorConfirm ? 'text' : 'password'}
                        name="confirmPassword"
                        className={`form-input ${errors.confirmPassword ? 'error' : ''}`}
                        value={doctorFormData.confirmPassword}
                        onChange={handleDoctorChange}
                        placeholder="أعد إدخال كلمة المرور"
                        dir="ltr"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        className="password-toggle-btn"
                        onClick={() => setShowDoctorConfirm((p) => !p)}
                        aria-label={showDoctorConfirm ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                      >
                        {showDoctorConfirm
                          ? <EyeOff size={18} strokeWidth={2} />
                          : <Eye size={18} strokeWidth={2} />}
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <span className="error-message">
                        <AlertCircle size={14} strokeWidth={2.2} />
                        {errors.confirmPassword}
                      </span>
                    )}
                  </div>
                </div>

                <PasswordStrengthMeter password={doctorFormData.password} />

                {/* Phone */}
                <div className="form-group">
                  <label className="form-label" htmlFor="doctor-phoneNumber">
                    رقم الهاتف <span className="required-mark">*</span>
                  </label>
                  <div className="form-input-wrapper">
                    <span className="form-input-icon" aria-hidden="true">
                      <Phone size={18} strokeWidth={2} />
                    </span>
                    <input
                      id="doctor-phoneNumber"
                      type="tel"
                      name="phoneNumber"
                      className={`form-input ${errors.phoneNumber ? 'error' : ''}`}
                      value={doctorFormData.phoneNumber}
                      onChange={handleDoctorChange}
                      placeholder="+963 9X XXX XXXX"
                      dir="ltr"
                      autoComplete="tel"
                    />
                  </div>
                  {errors.phoneNumber && (
                    <span className="error-message">
                      <AlertCircle size={14} strokeWidth={2.2} />
                      {errors.phoneNumber}
                    </span>
                  )}
                </div>

                {/* Governorate + city */}
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="doctor-governorate">
                      المحافظة <span className="required-mark">*</span>
                    </label>
                    <select
                      id="doctor-governorate"
                      name="governorate"
                      className={`form-input ${errors.governorate ? 'error' : ''}`}
                      value={doctorFormData.governorate}
                      onChange={handleDoctorChange}
                    >
                      <option value="">اختر المحافظة</option>
                      {SYRIAN_GOVERNORATES.map((gov) => (
                        <option key={gov.id} value={gov.id}>{gov.nameAr}</option>
                      ))}
                    </select>
                    {errors.governorate && (
                      <span className="error-message">
                        <AlertCircle size={14} strokeWidth={2.2} />
                        {errors.governorate}
                      </span>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="doctor-city">
                      المدينة <span className="required-mark">*</span>
                    </label>
                    <div className="form-input-wrapper">
                      <span className="form-input-icon" aria-hidden="true">
                        <MapPin size={18} strokeWidth={2} />
                      </span>
                      <input
                        id="doctor-city"
                        type="text"
                        name="city"
                        className={`form-input ${errors.city ? 'error' : ''}`}
                        value={doctorFormData.city}
                        onChange={handleDoctorChange}
                        placeholder="أدخل المدينة"
                        autoComplete="address-level2"
                      />
                    </div>
                    {errors.city && (
                      <span className="error-message">
                        <AlertCircle size={14} strokeWidth={2.2} />
                        {errors.city}
                      </span>
                    )}
                  </div>
                </div>

                {/* Address */}
                <div className="form-group">
                  <label className="form-label" htmlFor="doctor-address">
                    عنوان العيادة <span className="required-mark">*</span>
                  </label>
                  <div className="form-input-wrapper">
                    <span className="form-input-icon" aria-hidden="true">
                      <Building size={18} strokeWidth={2} />
                    </span>
                    <input
                      id="doctor-address"
                      type="text"
                      name="address"
                      className={`form-input ${errors.address ? 'error' : ''}`}
                      value={doctorFormData.address}
                      onChange={handleDoctorChange}
                      placeholder="العنوان التفصيلي للعيادة"
                      autoComplete="street-address"
                    />
                  </div>
                  {errors.address && (
                    <span className="error-message">
                      <AlertCircle size={14} strokeWidth={2.2} />
                      {errors.address}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* ═══ STEP 2: Professional Information ═══ */}
            {currentStep === 2 && (
              <div className="form-step">
                {/* Medical license number */}
                <div className="form-group">
                  <label className="form-label" htmlFor="doctor-licenseNumber">
                    رقم الترخيص الطبي <span className="required-mark">*</span>
                  </label>
                  <div className="form-input-wrapper">
                    <span className="form-input-icon" aria-hidden="true">
                      <Award size={18} strokeWidth={2} />
                    </span>
                    <input
                      id="doctor-licenseNumber"
                      type="text"
                      name="medicalLicenseNumber"
                      className={`form-input ${errors.medicalLicenseNumber ? 'error' : ''}`}
                      value={doctorFormData.medicalLicenseNumber}
                      onChange={handleDoctorChange}
                      placeholder="مثال: SY12345678"
                      dir="ltr"
                      style={{ textTransform: 'uppercase' }}
                    />
                  </div>
                  {errors.medicalLicenseNumber && (
                    <span className="error-message">
                      <AlertCircle size={14} strokeWidth={2.2} />
                      {errors.medicalLicenseNumber}
                    </span>
                  )}
                  <span className="form-hint">
                    <Info size={12} strokeWidth={2.2} />
                    8-20 حرف/رقم (أحرف إنجليزية كبيرة وأرقام)
                  </span>
                </div>

                {/* Specialization picker — searchable card grid (replaces <select>) */}
                <div className="form-group">
                  <label className="form-label">
                    التخصص الطبي <span className="required-mark">*</span>
                  </label>
                  <div className="spec-picker">
                    <div className="spec-search">
                      <input
                        type="text"
                        className="form-input"
                        placeholder="ابحث عن التخصص..."
                        value={specSearch}
                        onChange={(e) => setSpecSearch(e.target.value)}
                      />
                      <span className="spec-search-icon" aria-hidden="true">
                        <Search size={16} strokeWidth={2} />
                      </span>
                    </div>
                    <div className="spec-grid" role="radiogroup" aria-label="التخصصات الطبية">
                      {filteredSpecializations.map((spec) => {
                        const SpecIcon = spec.Icon;
                        const isSelected = doctorFormData.specialization === spec.id;
                        return (
                          <button
                            key={spec.id}
                            type="button"
                            className={`spec-card ${isSelected ? 'selected' : ''}`}
                            onClick={() => handleSpecializationSelect(spec.id)}
                            role="radio"
                            aria-checked={isSelected}
                          >
                            {spec.hasECG && (
                              <span className="spec-card-ecg">ECG AI</span>
                            )}
                            <div className="spec-card-icon">
                              <SpecIcon size={20} strokeWidth={2} />
                            </div>
                            <span className="spec-card-name">{spec.nameAr}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {errors.specialization && (
                    <span className="error-message">
                      <AlertCircle size={14} strokeWidth={2.2} />
                      {errors.specialization}
                    </span>
                  )}

                  {/* ECG notice for cardiologists */}
                  {doctorFormData.specialization === 'cardiology' && (
                    <div className="ecg-notice">
                      <Sparkles size={18} strokeWidth={2} />
                      <span>كطبيب قلب، ستتمكن من استخدام نظام AI لتحليل تخطيط القلب (ECG)</span>
                    </div>
                  )}
                </div>

                {/* Sub-specialization */}
                <div className="form-group">
                  <label className="form-label" htmlFor="doctor-subSpec">
                    التخصص الفرعي
                    <span className="label-hint">(اختياري)</span>
                  </label>
                  <div className="form-input-wrapper">
                    <span className="form-input-icon" aria-hidden="true">
                      <Briefcase size={18} strokeWidth={2} />
                    </span>
                    <input
                      id="doctor-subSpec"
                      type="text"
                      name="subSpecialization"
                      className="form-input"
                      value={doctorFormData.subSpecialization}
                      onChange={handleDoctorChange}
                      placeholder="مثال: جراحة القلب المفتوح"
                    />
                  </div>
                </div>

                {/* Hospital affiliation */}
                <div className="form-group">
                  <label className="form-label" htmlFor="doctor-hospital">
                    مكان العمل / المستشفى <span className="required-mark">*</span>
                  </label>
                  <div className="form-input-wrapper">
                    <span className="form-input-icon" aria-hidden="true">
                      <Hospital size={18} strokeWidth={2} />
                    </span>
                    <input
                      id="doctor-hospital"
                      type="text"
                      name="hospitalAffiliation"
                      className={`form-input ${errors.hospitalAffiliation ? 'error' : ''}`}
                      value={doctorFormData.hospitalAffiliation}
                      onChange={handleDoctorChange}
                      placeholder="اسم المستشفى أو المركز الصحي"
                    />
                  </div>
                  {errors.hospitalAffiliation && (
                    <span className="error-message">
                      <AlertCircle size={14} strokeWidth={2.2} />
                      {errors.hospitalAffiliation}
                    </span>
                  )}
                </div>

                {/* Years + fee */}
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="doctor-years">
                      سنوات الخبرة <span className="required-mark">*</span>
                    </label>
                    <div className="form-input-wrapper">
                      <span className="form-input-icon" aria-hidden="true">
                        <Clock size={18} strokeWidth={2} />
                      </span>
                      <input
                        id="doctor-years"
                        type="number"
                        name="yearsOfExperience"
                        className={`form-input ${errors.yearsOfExperience ? 'error' : ''}`}
                        value={doctorFormData.yearsOfExperience}
                        onChange={handleDoctorChange}
                        placeholder="0-60"
                        min="0"
                        max="60"
                      />
                    </div>
                    {errors.yearsOfExperience && (
                      <span className="error-message">
                        <AlertCircle size={14} strokeWidth={2.2} />
                        {errors.yearsOfExperience}
                      </span>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="doctor-fee">
                      رسوم الكشف (ل.س) <span className="required-mark">*</span>
                    </label>
                    <div className="form-input-wrapper">
                      <span className="form-input-icon" aria-hidden="true">
                        <Briefcase size={18} strokeWidth={2} />
                      </span>
                      <input
                        id="doctor-fee"
                        type="number"
                        name="consultationFee"
                        className={`form-input ${errors.consultationFee ? 'error' : ''}`}
                        value={doctorFormData.consultationFee}
                        onChange={handleDoctorChange}
                        placeholder="مثال: 50000"
                        min="0"
                      />
                    </div>
                    {errors.consultationFee && (
                      <span className="error-message">
                        <AlertCircle size={14} strokeWidth={2.2} />
                        {errors.consultationFee}
                      </span>
                    )}
                  </div>
                </div>

                {/* Available days */}
                <div className="form-group">
                  <label className="form-label">
                    أيام العمل <span className="required-mark">*</span>
                  </label>
                  <div className="weekdays-grid">
                    {WEEKDAYS.map((day) => (
                      <button
                        key={day.id}
                        type="button"
                        className={`weekday-btn ${
                          doctorFormData.availableDays.includes(day.id) ? 'selected' : ''
                        }`}
                        onClick={() => handleDayToggle(day.id)}
                        aria-pressed={doctorFormData.availableDays.includes(day.id)}
                      >
                        {day.nameAr}
                      </button>
                    ))}
                  </div>
                  {errors.availableDays && (
                    <span className="error-message">
                      <AlertCircle size={14} strokeWidth={2.2} />
                      {errors.availableDays}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* ═══ STEP 3: Documents ═══ */}
            {currentStep === 3 && (
              <div className="form-step">
                <div className="documents-intro">
                  <div className="documents-intro-icon">
                    <Paperclip size={22} strokeWidth={2} />
                  </div>
                  <div>
                    <h3>الوثائق المطلوبة</h3>
                    <p>يرجى رفع الوثائق التالية للتحقق من هويتك المهنية. الحد الأقصى لحجم الملف: 5 ميجابايت.</p>
                  </div>
                </div>

                <FileUploadField
                  id="licenseDocument"
                  label="صورة الترخيص الطبي"
                  hint="PDF, JPG, PNG حتى 5MB"
                  required
                  accept=".pdf,.jpg,.jpeg,.png"
                  Icon={FileText}
                  file={doctorFormData.licenseDocument}
                  error={errors.licenseDocument}
                  onFileChange={(file) => handleFileUpload('licenseDocument', file)}
                  onFileRemove={() => handleFileRemove('licenseDocument')}
                />

                <FileUploadField
                  id="medicalCertificate"
                  label="صورة شهادة الطب"
                  hint="PDF, JPG, PNG حتى 5MB"
                  required
                  accept=".pdf,.jpg,.jpeg,.png"
                  Icon={GraduationCap}
                  file={doctorFormData.medicalCertificate}
                  error={errors.medicalCertificate}
                  onFileChange={(file) => handleFileUpload('medicalCertificate', file)}
                  onFileRemove={() => handleFileRemove('medicalCertificate')}
                />

                <FileUploadField
                  id="profilePhoto"
                  label="صورة شخصية"
                  hint="اختياري — JPG, PNG حتى 5MB"
                  required={false}
                  accept=".jpg,.jpeg,.png"
                  Icon={Camera}
                  file={doctorFormData.profilePhoto}
                  error={errors.profilePhoto}
                  onFileChange={(file) => handleFileUpload('profilePhoto', file)}
                  onFileRemove={() => handleFileRemove('profilePhoto')}
                />

                <div className="form-group">
                  <label className="form-label" htmlFor="doctor-notes">
                    ملاحظات إضافية
                    <span className="label-hint">(اختياري)</span>
                  </label>
                  <textarea
                    id="doctor-notes"
                    name="additionalNotes"
                    className="form-input"
                    value={doctorFormData.additionalNotes}
                    onChange={handleDoctorChange}
                    placeholder="أي معلومات إضافية تريد إضافتها للطلب"
                    rows="3"
                  />
                </div>
              </div>
            )}

            {/* ═══ STEP 4: Review ═══ */}
            {currentStep === 4 && (
              <div className="form-step review-step">
                <div className="review-header">
                  <div className="review-header-icon">
                    <ClipboardCheck size={28} strokeWidth={2} />
                  </div>
                  <h3>مراجعة البيانات</h3>
                  <p>تأكد من صحة جميع البيانات قبل تقديم الطلب</p>
                </div>

                <div className="review-sections">
                  {/* Personal Info */}
                  <div className="review-section">
                    <h4>
                      <User size={16} strokeWidth={2.2} />
                      المعلومات الشخصية
                    </h4>
                    <div className="review-grid">
                      <div className="review-item full-width">
                        <span className="review-label">الاسم الكامل</span>
                        <span className="review-value">
                          {doctorFormData.firstName} {doctorFormData.fatherName} {doctorFormData.lastName}
                        </span>
                      </div>
                      <div className="review-item">
                        <span className="review-label">اسم الأم</span>
                        <span className="review-value">{doctorFormData.motherName}</span>
                      </div>
                      <div className="review-item">
                        <span className="review-label">الرقم الوطني</span>
                        <span className="review-value" dir="ltr">{doctorFormData.nationalId}</span>
                      </div>
                      <div className="review-item">
                        <span className="review-label">البريد الإلكتروني</span>
                        <span className="review-value" dir="ltr">{doctorFormData.email}</span>
                      </div>
                      <div className="review-item">
                        <span className="review-label">رقم الهاتف</span>
                        <span className="review-value" dir="ltr">{doctorFormData.phoneNumber}</span>
                      </div>
                      <div className="review-item">
                        <span className="review-label">المحافظة</span>
                        <span className="review-value">
                          {SYRIAN_GOVERNORATES.find((g) => g.id === doctorFormData.governorate)?.nameAr}
                        </span>
                      </div>
                      <div className="review-item">
                        <span className="review-label">المدينة</span>
                        <span className="review-value">{doctorFormData.city}</span>
                      </div>
                    </div>
                  </div>

                  {/* Professional Info */}
                  <div className="review-section">
                    <h4>
                      <Briefcase size={16} strokeWidth={2.2} />
                      المعلومات المهنية
                    </h4>
                    <div className="review-grid">
                      <div className="review-item">
                        <span className="review-label">رقم الترخيص</span>
                        <span className="review-value" dir="ltr">
                          {doctorFormData.medicalLicenseNumber.toUpperCase()}
                        </span>
                      </div>
                      <div className="review-item">
                        <span className="review-label">التخصص</span>
                        <span className="review-value">
                          {selectedSpecialization?.nameAr}
                          {selectedSpecialization?.hasECG && ' (ECG AI)'}
                        </span>
                      </div>
                      <div className="review-item">
                        <span className="review-label">مكان العمل</span>
                        <span className="review-value">{doctorFormData.hospitalAffiliation}</span>
                      </div>
                      <div className="review-item">
                        <span className="review-label">سنوات الخبرة</span>
                        <span className="review-value">{doctorFormData.yearsOfExperience} سنة</span>
                      </div>
                      <div className="review-item">
                        <span className="review-label">رسوم الكشف</span>
                        <span className="review-value">{doctorFormData.consultationFee} ل.س</span>
                      </div>
                      <div className="review-item full-width">
                        <span className="review-label">أيام العمل</span>
                        <span className="review-value">
                          {doctorFormData.availableDays
                            .map((d) => WEEKDAYS.find((w) => w.id === d)?.nameAr)
                            .join(' • ')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Documents */}
                  <div className="review-section">
                    <h4>
                      <Paperclip size={16} strokeWidth={2.2} />
                      الوثائق المرفقة
                    </h4>
                    <div className="review-docs">
                      <div className={`review-doc ${doctorFormData.licenseDocument ? 'attached' : 'missing'}`}>
                        {doctorFormData.licenseDocument
                          ? <Check size={16} strokeWidth={2.5} />
                          : <X size={16} strokeWidth={2.5} />}
                        <span>
                          الترخيص الطبي: {doctorFormData.licenseDocument?.name || 'غير مرفق'}
                        </span>
                      </div>
                      <div className={`review-doc ${doctorFormData.medicalCertificate ? 'attached' : 'missing'}`}>
                        {doctorFormData.medicalCertificate
                          ? <Check size={16} strokeWidth={2.5} />
                          : <X size={16} strokeWidth={2.5} />}
                        <span>
                          شهادة الطب: {doctorFormData.medicalCertificate?.name || 'غير مرفق'}
                        </span>
                      </div>
                      <div className={`review-doc ${doctorFormData.profilePhoto ? 'attached' : 'missing'}`}>
                        {doctorFormData.profilePhoto
                          ? <Check size={16} strokeWidth={2.5} />
                          : <X size={16} strokeWidth={2.5} />}
                        <span>
                          الصورة الشخصية: {doctorFormData.profilePhoto?.name || 'غير مرفقة'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="review-agreement">
                  <label className="checkbox-label">
                    <input type="checkbox" required />
                    <span className="checkbox-custom" />
                    <span>
                      أقر بأن جميع المعلومات المقدمة صحيحة وأوافق على
                      <Link to="/terms" target="_blank" style={{ color: 'var(--tm-action)', fontWeight: 700, margin: '0 4px' }}>
                        الشروط والأحكام
                      </Link>
                      وسياسة الخصوصية
                    </span>
                  </label>
                </div>
              </div>
            )}

            {/* Form actions */}
            <div className="form-actions">
              {currentStep > 1 && (
                <button type="button" className="btn-secondary" onClick={handlePrev}>
                  <ArrowRight size={18} strokeWidth={2.2} />
                  <span>السابق</span>
                </button>
              )}

              {currentStep < DOCTOR_TOTAL_STEPS ? (
                <button type="button" className="btn-primary" onClick={handleNext}>
                  <span>التالي</span>
                  <ArrowLeft size={18} strokeWidth={2.2} />
                </button>
              ) : (
                <button type="submit" className="btn-primary">
                  <Send size={18} strokeWidth={2.2} />
                  <span>تقديم الطلب</span>
                </button>
              )}
            </div>

            <div className="login-link">
              لديك حساب بالفعل؟
              <Link to="/">تسجيل الدخول</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SignUp;