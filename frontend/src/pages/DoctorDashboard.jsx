/**
 * ═══════════════════════════════════════════════════════════════════════
 *  Patient 360° — Doctor Dashboard
 *  ─────────────────────────────────────────────────────────────────────
 *  Stack       : React 18 + React Router v6 + Lucide React
 *  Design      : Teal Medica (Light + Dark via [data-theme])
 *  Direction   : RTL (Arabic primary)
 *  Backend     : doctorAPI from src/services/api.js
 *  DB enums    : All values match patient360_db_final.js
 *
 *  Architecture:
 *  - Persistent left sidebar (right edge in RTL) with navigation
 *  - Specialization-aware AI tools (cardiologist → ECG, orthopedist → X-Ray)
 *  - Patient lookup → patient record (4 tabs)
 *  - Appointments calendar with availability slot management
 *  - Notifications slide-in panel
 *  - WHO/AHA vital signs inline indicators (international medical standards)
 *  - Recent patients quick access (localStorage cached)
 *  - Cmd/Ctrl+K quick search
 *
 *  ─────────────────────────────────────────────────────────────────────
 *  LAB TEST ORDER WORKFLOW (updated):
 *  ─────────────────────────────────────────────────────────────────────
 *  The doctor no longer picks a specific laboratory when ordering tests.
 *  The patient is free to walk into ANY laboratory — the technician
 *  looks up the patient by national ID and sees the pending order.
 *  This removes the friction of a patient being tied to one lab they
 *  may not want (or can't reach).
 *
 *  DB collections this dashboard reads/writes:
 *    persons, children, patients, doctors, visits, prescriptions,
 *    appointments, availability_slots, lab_tests, notifications
 * ═══════════════════════════════════════════════════════════════════════
 */

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  // Layout & navigation
  Home,
  CalendarDays,
  Search,
  Sparkles,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,

  // User / identity
  User,
  Users,
  UserPlus,
  Stethoscope,
  Hospital,
  Award,
  Briefcase,
  IdCard,
  Baby,

  // Medical / clinical
  Heart,
  HeartPulse,
  Activity,
  Brain,
  Bone,
  Eye,
  Pill,
  Syringe,
  Thermometer,
  Droplet,
  Wind,
  Scale,
  Ruler,
  Microscope,

  // Files & uploads
  FileText,
  Image as ImageIcon,
  Upload,
  Paperclip,
  Camera,
  Download,

  // Status / feedback
  Check,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  XCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  CircleCheck,
  CircleAlert,

  // Actions
  Save,
  Edit3,
  Trash2,
  Copy,
  RotateCcw,
  ArrowRight,
  ArrowLeft,
  ArrowUpRight,
  Loader2,
  Filter,
  MapPin,
  Phone,
  Mail,
  Calendar,
  ClipboardList,
  ClipboardCheck,
  Flame,
  Cigarette,
  ShieldAlert,
  ShieldCheck,
  Hand,
  Footprints,
  ScanLine,
  Zap,

  // ── أيقونات قسم طلب التحاليل ─────────────────────────────────
  FlaskConical,
  TestTube,
  Beaker,
  ChevronDown,
  Building2,
} from 'lucide-react';

import Navbar from '../components/common/Navbar';
import { logout as logoutService } from '../services/authService';
import { useTheme } from '../context/ThemeProvider';
import { doctorAPI } from '../services/api';
import '../styles/DoctorDashboard.css';


/* ═══════════════════════════════════════════════════════════════════════
   CONSTANTS — module-scoped, stable references
   ═══════════════════════════════════════════════════════════════════════ */

/**
 * Sidebar navigation items.
 * AI Tools section is added conditionally based on doctor specialization.
 */
const SIDEBAR_NAV_BASE = [
  { id: 'home',         labelAr: 'الرئيسية',          Icon: Home },
  { id: 'appointments', labelAr: 'مواعيدي',            Icon: CalendarDays },
  { id: 'lookup',       labelAr: 'البحث عن مريض',     Icon: Search },
];

/**
 * Visit types — match the visits.visitType enum in patient360_db_final.js
 */
const VISIT_TYPES = [
  { value: 'regular',      labelAr: 'زيارة عادية',  Icon: Stethoscope },
  { value: 'follow_up',    labelAr: 'متابعة',        Icon: RotateCcw },
  { value: 'emergency',    labelAr: 'طوارئ',         Icon: AlertTriangle, isEmergency: true },
  { value: 'consultation', labelAr: 'استشارة',       Icon: ClipboardList },
];

/**
 * Medication routes — match the visits.prescribedMedications[].route enum
 */
const MEDICATION_ROUTES = [
  { value: 'oral',        labelAr: 'فموي' },
  { value: 'topical',     labelAr: 'موضعي' },
  { value: 'injection',   labelAr: 'حقن' },
  { value: 'inhalation',  labelAr: 'استنشاق' },
  { value: 'sublingual',  labelAr: 'تحت اللسان' },
  { value: 'rectal',      labelAr: 'شرجي' },
  { value: 'other',       labelAr: 'أخرى' },
];

/**
 * Specialization detection — used to determine which AI tools to show.
 * IDs match doctors.specialization enum in patient360_db_final.js.
 */
const CARDIOLOGY_SPECIALIZATIONS = [
  'cardiology', 'cardiologist', 'طب القلب', 'طبيب قلب',
  'أمراض القلب', 'cardiac surgery', 'interventional cardiology',
];

const ORTHOPEDIC_SPECIALIZATIONS = [
  'orthopedics', 'orthopedist', 'orthopaedics', 'جراحة العظام',
  'طبيب عظام', 'orthopedic surgery',
];

/**
 * X-Ray AI models — orthopedist tab
 */
const XRAY_MODELS = [
  {
    id: 'hand',
    labelAr: 'كسور اليد',
    descAr: 'تشخيص كسور عظام اليد والمعصم',
    Icon: Hand,
  },
  {
    id: 'leg',
    labelAr: 'كسور القدم',
    descAr: 'تشخيص كسور عظام القدم والساق',
    Icon: Footprints,
  },
];

/**
 * Vital signs definitions — drives the new visit vital signs grid.
 * `who` function returns { className, label } for the inline medical indicator
 * based on WHO / AHA international clinical thresholds.
 */
const VITAL_SIGNS_DEF = [
  {
    key: 'bloodPressure',
    isBP: true,
    labelAr: 'ضغط الدم',
    Icon: HeartPulse,
    unit: 'mmHg',
    placeholder1: '120',
    placeholder2: '80',
    /**
     * WHO Blood Pressure Categories (2023 guidelines):
     *   Normal:        < 120 / < 80
     *   Elevated:      120-129 / < 80
     *   Hypertension I: 130-139 / 80-89
     *   Hypertension II: ≥ 140 / ≥ 90
     */
    who: (sys, dia) => {
      if (!sys || !dia) return null;
      const s = parseInt(sys, 10);
      const d = parseInt(dia, 10);
      if (Number.isNaN(s) || Number.isNaN(d)) return null;
      if (s >= 180 || d >= 120) return { className: 'critical', labelAr: 'أزمة ضغط' };
      if (s >= 140 || d >= 90)  return { className: 'high',     labelAr: 'ارتفاع II' };
      if (s >= 130 || d >= 80)  return { className: 'high',     labelAr: 'ارتفاع I' };
      if (s >= 120)              return { className: 'elevated', labelAr: 'مرتفع قليلاً' };
      if (s < 90 || d < 60)      return { className: 'low',      labelAr: 'منخفض' };
      return { className: 'normal', labelAr: 'طبيعي' };
    },
  },
  {
    key: 'heartRate',
    labelAr: 'معدل النبض',
    Icon: Heart,
    unit: 'BPM',
    placeholder: '72',
    /**
     * AHA Heart Rate Categories (resting adult):
     *   Normal: 60-100 bpm
     *   Bradycardia: < 60
     *   Tachycardia: > 100
     */
    who: (val) => {
      if (!val) return null;
      const v = parseInt(val, 10);
      if (Number.isNaN(v)) return null;
      if (v < 40 || v > 130) return { className: 'critical', labelAr: 'حرج' };
      if (v > 100)            return { className: 'high',     labelAr: 'تسرع قلب' };
      if (v < 60)             return { className: 'low',      labelAr: 'بطء قلب' };
      return { className: 'normal', labelAr: 'طبيعي' };
    },
  },
  {
    key: 'oxygenSaturation',
    labelAr: 'تشبع الأكسجين',
    Icon: Wind,
    unit: 'SpO₂ %',
    placeholder: '98',
    /**
     * WHO SpO2 Categories:
     *   Normal: 95-100%
     *   Mild hypoxemia: 91-94%
     *   Moderate: 86-90%
     *   Severe: ≤ 85%
     */
    who: (val) => {
      if (!val) return null;
      const v = parseFloat(val);
      if (Number.isNaN(v)) return null;
      if (v < 86)  return { className: 'critical', labelAr: 'نقص أكسجين شديد' };
      if (v < 91)  return { className: 'high',     labelAr: 'نقص متوسط' };
      if (v < 95)  return { className: 'elevated', labelAr: 'نقص خفيف' };
      return { className: 'normal', labelAr: 'طبيعي' };
    },
  },
  {
    key: 'bloodGlucose',
    labelAr: 'سكر الدم',
    Icon: Droplet,
    unit: 'mg/dL',
    placeholder: '90',
    /**
     * ADA Blood Glucose (random):
     *   Normal: 70-140
     *   Pre-diabetes: 140-199
     *   Diabetes: ≥ 200
     */
    who: (val) => {
      if (!val) return null;
      const v = parseFloat(val);
      if (Number.isNaN(v)) return null;
      if (v < 54 || v > 400) return { className: 'critical', labelAr: 'حرج' };
      if (v >= 200)            return { className: 'high',     labelAr: 'مرتفع' };
      if (v >= 140)            return { className: 'elevated', labelAr: 'ما قبل السكري' };
      if (v < 70)              return { className: 'low',      labelAr: 'منخفض' };
      return { className: 'normal', labelAr: 'طبيعي' };
    },
  },
  {
    key: 'temperature',
    labelAr: 'الحرارة',
    Icon: Thermometer,
    unit: '°C',
    placeholder: '37',
    step: '0.1',
    /**
     * Body temperature (oral):
     *   Normal: 36.1-37.2°C
     *   Fever: 37.3-38.3
     *   High fever: 38.4-40
     *   Hyperpyrexia: > 40
     */
    who: (val) => {
      if (!val) return null;
      const v = parseFloat(val);
      if (Number.isNaN(v)) return null;
      if (v >= 40 || v < 35) return { className: 'critical', labelAr: 'حرج' };
      if (v >= 38.4)          return { className: 'high',     labelAr: 'حمى عالية' };
      if (v >= 37.3)          return { className: 'elevated', labelAr: 'حمى' };
      if (v < 36.1)           return { className: 'low',      labelAr: 'انخفاض' };
      return { className: 'normal', labelAr: 'طبيعي' };
    },
  },
  {
    key: 'respiratoryRate',
    labelAr: 'معدل التنفس',
    Icon: Wind,
    unit: 'breaths/min',
    placeholder: '16',
    /**
     * Adult resting respiratory rate:
     *   Normal: 12-20
     *   Bradypnea: < 12
     *   Tachypnea: > 20
     */
    who: (val) => {
      if (!val) return null;
      const v = parseInt(val, 10);
      if (Number.isNaN(v)) return null;
      if (v < 8 || v > 30) return { className: 'critical', labelAr: 'حرج' };
      if (v > 20)           return { className: 'high',     labelAr: 'تسرع تنفس' };
      if (v < 12)           return { className: 'low',      labelAr: 'بطء تنفس' };
      return { className: 'normal', labelAr: 'طبيعي' };
    },
  },
  {
    key: 'weight',
    labelAr: 'الوزن',
    Icon: Scale,
    unit: 'kg',
    placeholder: '70',
    step: '0.1',
    who: () => null, // No category — informational only
  },
  {
    key: 'height',
    labelAr: 'الطول',
    Icon: Ruler,
    unit: 'cm',
    placeholder: '175',
    who: () => null,
  },
];

/**
 * ECG condition map for the cardiologist AI tool.
 * Maps prediction text → severity color, Arabic description, recommendations.
 */
const ECG_CONDITION_MAP = {
  normal: {
    severity: 'normal',
    Icon: CheckCircle2,
    nameAr: 'تخطيط طبيعي',
    descAr: 'تخطيط القلب الكهربائي ضمن الحدود الطبيعية. لا توجد علامات على اضطرابات في النظم أو نقص تروية.',
    recommendations: [
      'متابعة نمط الحياة الصحي',
      'ممارسة الرياضة بانتظام',
      'فحص دوري سنوي',
    ],
  },
  mi: {
    severity: 'critical',
    Icon: AlertTriangle,
    nameAr: 'احتشاء عضلة القلب',
    descAr: 'علامات تدل على نوبة قلبية حادة أو سابقة. يتطلب تدخلاً طبياً فورياً وتقييماً سريرياً عاجلاً.',
    recommendations: [
      'تدخل طبي طارئ فوري',
      'قسطرة قلبية تشخيصية',
      'مراقبة في العناية المركزة القلبية',
      'تقييم إنزيمات القلب (Troponin)',
    ],
  },
  history_mi: {
    severity: 'warning',
    Icon: AlertCircle,
    nameAr: 'تاريخ احتشاء سابق',
    descAr: 'علامات تدل على جلطة قلبية سابقة. يتطلب متابعة دقيقة والالتزام بالأدوية.',
    recommendations: [
      'متابعة دورية مع طبيب القلب',
      'الالتزام بأدوية القلب',
      'تعديل نمط الحياة (نظام غذائي وتمارين)',
      'مراقبة الكوليسترول والضغط',
    ],
  },
  abnormal: {
    severity: 'warning',
    Icon: Activity,
    nameAr: 'نبض غير طبيعي',
    descAr: 'اضطراب في نظم القلب يتطلب تقييماً طبياً وفحوصات إضافية لتحديد السبب.',
    recommendations: [
      'فحوصات إضافية مطلوبة',
      'هولتر مراقبة 24 ساعة',
      'اختبار الجهد',
      'استشارة كهربية القلب',
    ],
  },
};

/**
 * Map raw prediction labels from backend → ECG_CONDITION_MAP keys
 */
const mapPredictionToCondition = (label) => {
  if (!label) return ECG_CONDITION_MAP.normal;
  const t = label.toLowerCase();
  if (t.includes('normal') || t.includes('طبيعي')) return ECG_CONDITION_MAP.normal;
  if (t.includes('history') || t.includes('تاريخ')) return ECG_CONDITION_MAP.history_mi;
  if (t.includes('mi') || t.includes('myocardial') || t.includes('احتشاء') || t.includes('جلطة')) return ECG_CONDITION_MAP.mi;
  if (t.includes('abnormal') || t.includes('غير طبيعي')) return ECG_CONDITION_MAP.abnormal;
  return ECG_CONDITION_MAP.normal;
};


/* ═══════════════════════════════════════════════════════════════════════
   PURE HELPER FUNCTIONS
   ═══════════════════════════════════════════════════════════════════════ */

/**
 * Calculate age from a date of birth string
 */
const calculateAge = (dateOfBirth) => {
  if (!dateOfBirth) return null;
  const today = new Date();
  const birth = new Date(dateOfBirth);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

/**
 * Format date in Arabic locale (e.g., "١٢ يناير ٢٠٢٦")
 */
const formatArabicDate = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

/**
 * Format date with time
 */
const formatArabicDateTime = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Format time only (HH:MM AM/PM)
 */
const formatTime = (timeString) => {
  if (!timeString) return '-';
  // Handle "HH:MM" format from DB
  if (typeof timeString === 'string' && timeString.includes(':')) {
    const [h, m] = timeString.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return { hour: `${hour12}:${m.toString().padStart(2, '0')}`, period };
  }
  return { hour: timeString, period: '' };
};

/**
 * Get a time-aware Arabic greeting
 */
const getTimeGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'صباح الخير';
  if (h < 17) return 'مساء الخير';
  if (h < 21) return 'مساء النور';
  return 'مساء الخير';
};

/**
 * Check if doctor is a cardiologist (by specialization string)
 */
const checkIsCardiologist = (specialization) => {
  if (!specialization) return false;
  const s = specialization.toLowerCase();
  return CARDIOLOGY_SPECIALIZATIONS.some((c) => s.includes(c.toLowerCase()));
};

/**
 * Check if doctor is an orthopedist
 */
const checkIsOrthopedist = (specialization) => {
  if (!specialization) return false;
  const s = specialization.toLowerCase();
  return ORTHOPEDIC_SPECIALIZATIONS.some((c) => s.includes(c.toLowerCase()));
};

/**
 * Get the start of the week (Sunday) for a given date
 */
const getWeekStart = (date) => {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Get array of 7 days starting from a given date
 */
const getWeekDays = (startDate) => {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    return d;
  });
};

/**
 * Format week range as "Jan 12 — Jan 18, 2026"
 */
const formatWeekRange = (startDate) => {
  const end = new Date(startDate);
  end.setDate(end.getDate() + 6);
  const opts = { month: 'long', day: 'numeric' };
  const startStr = startDate.toLocaleDateString('ar-EG', opts);
  const endStr = end.toLocaleDateString('ar-EG', { ...opts, year: 'numeric' });
  return `${startStr} — ${endStr}`;
};


/* ═══════════════════════════════════════════════════════════════════════
   REUSABLE PRESENTATIONAL COMPONENTS
   ═══════════════════════════════════════════════════════════════════════ */

/**
 * Modal — same architecture as SignUp's Modal: ESC to close, body scroll
 * lock, click-outside to close, animated icon with pulse ring.
 */
const Modal = ({ isOpen, type, title, message, onClose, onConfirm, confirmLabel, cancelLabel }) => {
  useEffect(() => {
    if (!isOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = original; };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const IconComponent = type === 'success' ? CheckCircle2
                      : type === 'error'   ? XCircle
                      : type === 'confirm' ? AlertTriangle
                      :                       Info;

  const isConfirm = type === 'confirm';

  return (
    <div className="dd-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="dd-modal" onClick={(e) => e.stopPropagation()}>
        <div className="dd-modal-header">
          <div className="dd-modal-icon-wrapper">
            <div className={`dd-modal-icon ${type}`}>
              <IconComponent size={36} strokeWidth={2} />
            </div>
            <div className={`dd-modal-icon-pulse ${type}`} />
          </div>
          <h2>{title}</h2>
        </div>
        <div className="dd-modal-body">
          <p>{message}</p>
        </div>
        <div className="dd-modal-footer">
          {isConfirm && (
            <button type="button" className="dd-btn dd-btn-secondary" onClick={onClose}>
              {cancelLabel || 'إلغاء'}
            </button>
          )}
          <button
            type="button"
            className="dd-btn dd-btn-primary"
            onClick={isConfirm ? onConfirm : (onConfirm || onClose)}
            autoFocus
          >
            {confirmLabel || (isConfirm ? 'تأكيد' : 'حسناً')}
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * VitalSign — single vital sign input with WHO/AHA inline indicator.
 * Used inside the new visit vital signs grid.
 */
const VitalSign = ({ def, value, value2, onChange, onChange2 }) => {
  const indicator = def.isBP ? def.who(value, value2) : def.who(value);
  const Icon = def.Icon;

  if (def.isBP) {
    return (
      <div className="dd-vital bp">
        <div className="dd-vital-header">
          <div className="dd-vital-icon">
            <Icon size={16} strokeWidth={2} />
          </div>
          <span className="dd-vital-label">{def.labelAr}</span>
        </div>
        <div className="dd-vital-input-row">
          <input
            type="number"
            className="dd-vital-input"
            value={value || ''}
            onChange={onChange}
            placeholder={def.placeholder1}
            min="0"
            max="300"
            inputMode="numeric"
            aria-label="ضغط الدم الانقباضي"
          />
          <span className="dd-vital-bp-divider">/</span>
          <input
            type="number"
            className="dd-vital-input"
            value={value2 || ''}
            onChange={onChange2}
            placeholder={def.placeholder2}
            min="0"
            max="200"
            inputMode="numeric"
            aria-label="ضغط الدم الانبساطي"
          />
          <span className="dd-vital-unit">{def.unit}</span>
        </div>
        {indicator && (
          <span className={`dd-vital-indicator ${indicator.className}`}>
            {indicator.className === 'normal' ? <CheckCircle2 size={11} strokeWidth={2.5} /> : <AlertCircle size={11} strokeWidth={2.5} />}
            {indicator.labelAr}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="dd-vital">
      <div className="dd-vital-header">
        <div className="dd-vital-icon">
          <Icon size={16} strokeWidth={2} />
        </div>
        <span className="dd-vital-label">{def.labelAr}</span>
      </div>
      <div className="dd-vital-input-row">
        <input
          type="number"
          className="dd-vital-input"
          value={value || ''}
          onChange={onChange}
          placeholder={def.placeholder}
          step={def.step || '1'}
          inputMode="decimal"
          aria-label={def.labelAr}
        />
        <span className="dd-vital-unit">{def.unit}</span>
      </div>
      {indicator && (
        <span className={`dd-vital-indicator ${indicator.className}`}>
          {indicator.className === 'normal' ? <CheckCircle2 size={11} strokeWidth={2.5} /> : <AlertCircle size={11} strokeWidth={2.5} />}
          {indicator.labelAr}
        </span>
      )}
    </div>
  );
};

/**
 * ConfidenceRing — animated circular SVG ring for AI confidence display
 */
const ConfidenceRing = ({ percent, label = 'الثقة' }) => {
  const safePercent = Math.max(0, Math.min(100, parseFloat(percent) || 0));
  const circumference = 2 * Math.PI * 15.9155;
  const offset = circumference - (safePercent / 100) * circumference;

  return (
    <div className="dd-ai-confidence-ring">
      <svg viewBox="0 0 36 36" width="100" height="100">
        <path
          className="dd-ai-confidence-bg"
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
        />
        <path
          className="dd-ai-confidence-fg"
          strokeDasharray={`${(safePercent / 100) * circumference} ${circumference}`}
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
        />
      </svg>
      <div className="dd-ai-confidence-text">
        <span className="dd-ai-confidence-num">{Math.round(safePercent)}%</span>
        <span className="dd-ai-confidence-label">{label}</span>
      </div>
    </div>
  );
};


/* ═══════════════════════════════════════════════════════════════════════
   MAIN COMPONENT — DoctorDashboard
   ═══════════════════════════════════════════════════════════════════════ */

const DoctorDashboard = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const ecgFileInputRef = useRef(null);
  const xrayFileInputRef = useRef(null);
  const photoInputRef = useRef(null);
  const aiResultRef = useRef(null);
  const searchInputRef = useRef(null);

  /* ─────────────────────────────────────────────────────────────────
     STATE — top level
     ───────────────────────────────────────────────────────────────── */

  // Auth & user
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sidebar navigation
  const [activeSection, setActiveSection] = useState('home');
  const [sidebarOpen, setSidebarOpen] = useState(false); // mobile drawer

  // Notifications
  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Modal
  const [modal, setModal] = useState({
    isOpen: false,
    type: '',
    title: '',
    message: '',
    onConfirm: null,
  });

  /* ─────────────────────────────────────────────────────────────────
     STATE — patient lookup & record
     ───────────────────────────────────────────────────────────────── */

  const [searchId, setSearchId] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [showFamilySelection, setShowFamilySelection] = useState(false);

  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientHistory, setPatientHistory] = useState([]);
  const [recentPatients, setRecentPatients] = useState([]);
  const [patientTab, setPatientTab] = useState('overview'); // overview | history | newVisit

  /* ─────────────────────────────────────────────────────────────────
     STATE — new visit form
     ───────────────────────────────────────────────────────────────── */

  const [saving, setSaving] = useState(false);
  const [visitType, setVisitType] = useState('regular');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [doctorNotes, setDoctorNotes] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpNotes, setFollowUpNotes] = useState('');

  // Vital signs — 9 fields matching visits.vitalSigns schema
  const [vitalSigns, setVitalSigns] = useState({
    bloodPressureSystolic: '',
    bloodPressureDiastolic: '',
    heartRate: '',
    oxygenSaturation: '',
    bloodGlucose: '',
    temperature: '',
    weight: '',
    height: '',
    respiratoryRate: '',
  });

  // Visit photo
  const [visitPhoto, setVisitPhoto] = useState(null);
  const [visitPhotoPreview, setVisitPhotoPreview] = useState(null);

  // Medications
  const [medications, setMedications] = useState([]);
  const [newMedication, setNewMedication] = useState({
    medicationName: '',
    dosage: '',
    frequency: '',
    duration: '',
    route: 'oral',
    instructions: '',
  });

  /* ─────────────────────────────────────────────────────────────────
     STATE — AI tools (cardiologist ECG + orthopedist X-Ray)
     ───────────────────────────────────────────────────────────────── */

  // ECG (cardiologist)
  const [ecgFile, setEcgFile] = useState(null);
  const [ecgPreview, setEcgPreview] = useState(null);
  const [ecgAnalyzing, setEcgAnalyzing] = useState(false);
  const [ecgResult, setEcgResult] = useState(null);

  // X-Ray (orthopedist)
  const [xrayModel, setXrayModel] = useState(null); // 'hand' | 'leg'
  const [xrayFile, setXrayFile] = useState(null);
  const [xrayPreview, setXrayPreview] = useState(null);
  const [xrayAnalyzing, setXrayAnalyzing] = useState(false);
  const [xrayResult, setXrayResult] = useState(null);

  /* ─────────────────────────────────────────────────────────────────
     STATE — طلب تحاليل مختبرية (Lab Test Order)
     ─────────────────────────────────────────────────────────────────
     UPDATED: No longer assigns a specific laboratory. The doctor just
     builds the list of tests; the patient picks any lab they want and
     the tech looks them up by national ID. See the LAB-TEST-ORDER
     section header at the top of this file for full context.
     ───────────────────────────────────────────────────────────────── */

  // التحاليل المضافة للطلب: [{ testName, notes }]
  const [labTests, setLabTests] = useState([]);

  // الإدخال الحالي قبل إضافة التحليل للقائمة
  const [newLabTest, setNewLabTest] = useState({
    testName: '',
    notes: '',
  });

  // حالة الإرسال (تتفعّل أثناء حفظ الطلب)
  // eslint-disable-next-line no-unused-vars
  const [submittingLabOrder, setSubmittingLabOrder] = useState(false);

  /* ─────────────────────────────────────────────────────────────────
     STATE — appointments
     ───────────────────────────────────────────────────────────────── */

  const [weekStart, setWeekStart] = useState(getWeekStart(new Date()));
  const [appointments, setAppointments] = useState([]);
  const [availabilitySlots, setAvailabilitySlots] = useState([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);
  const [showSlotModal, setShowSlotModal] = useState(false);
  const [newSlot, setNewSlot] = useState({
    date: '',
    startTime: '',
    endTime: '',
    slotDuration: 30,
    maxBookings: 1,
  });

  // Appointment details modal — opened when the doctor clicks a booked cell
  const [showApptDetails, setShowApptDetails] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [cancelingAppt, setCancelingAppt] = useState(false);

  // Slot details modal — opened when the doctor clicks one of their own
  // available (empty) slots. Lets them remove the slot if unbooked.
  const [showSlotDetails, setShowSlotDetails] = useState(false);
  const [selectedSlotDetails, setSelectedSlotDetails] = useState(null);
  const [deletingSlot, setDeletingSlot] = useState(false);

  // Today's metrics (KPI cards on home)
  const [kpis, setKpis] = useState({
    appointmentsToday: 0,
    patientsThisWeek: 0,
    pendingLabs: 0,
    prescriptionsIssued: 0,
  });

  /* ─────────────────────────────────────────────────────────────────
     MEMOIZED VALUES
     ───────────────────────────────────────────────────────────────── */

  const isCardiologist = useMemo(
    () => checkIsCardiologist(user?.roleData?.doctor?.specialization),
    [user]
  );

  const isOrthopedist = useMemo(
    () => checkIsOrthopedist(user?.roleData?.doctor?.specialization),
    [user]
  );

  const hasAITools = isCardiologist || isOrthopedist;

  // Sidebar nav with conditional AI Tools entry
  const sidebarNav = useMemo(() => {
    const items = [...SIDEBAR_NAV_BASE];
    if (hasAITools) {
      items.push({
        id: 'aiTools',
        labelAr: isCardiologist ? 'تحليل ECG' : 'تحليل الأشعة',
        Icon: Sparkles,
      });
    }
    return items;
  }, [hasAITools, isCardiologist]);

  // Today's appointments (filtered from all appointments)
  const todaysAppointments = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return appointments
      .filter((a) => {
        const d = new Date(a.appointmentDate);
        return d >= today && d < tomorrow;
      })
      .sort((a, b) => (a.appointmentTime || '').localeCompare(b.appointmentTime || ''));
  }, [appointments]);

  // Week days for the calendar
  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);

  // Hour rows for the week calendar (8am-8pm)
  const calendarHours = useMemo(() => {
    return Array.from({ length: 13 }, (_, i) => i + 8); // 8 to 20
  }, []);

  /* ─────────────────────────────────────────────────────────────────
     MODAL HELPERS
     ───────────────────────────────────────────────────────────────── */

  const openModal = useCallback((type, title, message, onConfirm = null) => {
    setModal({ isOpen: true, type, title, message, onConfirm });
  }, []);

  const closeModal = useCallback(() => {
    setModal({ isOpen: false, type: '', title: '', message: '', onConfirm: null });
  }, []);

  /* ─────────────────────────────────────────────────────────────────
     INITIAL LOAD — verify auth and fetch dashboard data
     ───────────────────────────────────────────────────────────────── */

  useEffect(() => {
    const loadInitial = async () => {
      setLoading(true);
      const userData = localStorage.getItem('user');
      const token = localStorage.getItem('token');

      if (!userData || !token) {
        navigate('/', { replace: true });
        return;
      }

      try {
        const parsedUser = JSON.parse(userData);
        if (!parsedUser.roles || !parsedUser.roles.includes('doctor')) {
          openModal('error', 'غير مصرح', 'هذه الصفحة متاحة للأطباء فقط', () => {
            closeModal();
            navigate('/', { replace: true });
          });
          return;
        }
        setUser(parsedUser);

        // Load recent patients from localStorage
        try {
          const recents = JSON.parse(localStorage.getItem('dd_recent_patients') || '[]');
          setRecentPatients(recents.slice(0, 8));
        } catch (e) {
          setRecentPatients([]);
        }

        // Fetch dashboard data in parallel — silently continue if backend not ready yet
        try {
          const [kpiData, apptsData, notifData, slotsData] = await Promise.allSettled([
            doctorAPI.getDashboardKPIs(),
            doctorAPI.getMyAppointments(),
            doctorAPI.getMyNotifications(),
            doctorAPI.getMyAvailabilitySlots(),
          ]);

          if (kpiData.status === 'fulfilled' && kpiData.value) {
            setKpis(kpiData.value);
          }
          if (apptsData.status === 'fulfilled' && apptsData.value?.appointments) {
            setAppointments(apptsData.value.appointments);
          }
          if (notifData.status === 'fulfilled' && notifData.value?.notifications) {
            setNotifications(notifData.value.notifications);
            setUnreadCount(notifData.value.notifications.filter((n) => n.status !== 'read').length);
          }
          if (slotsData.status === 'fulfilled' && slotsData.value?.slots) {
            setAvailabilitySlots(slotsData.value.slots);
          }
        } catch (err) {
          // Backend endpoints may not exist yet — that's fine
          console.warn('[DoctorDashboard] Some backend endpoints unavailable:', err);
        }
      } catch (error) {
        console.error('[DoctorDashboard] Init error:', error);
        navigate('/', { replace: true });
        return;
      } finally {
        setLoading(false);
      }
    };

    loadInitial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  /* ─────────────────────────────────────────────────────────────────
     AUTH GUARD — re-check on focus and visibility change
     ───────────────────────────────────────────────────────────────── */

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('token');
      const userData = localStorage.getItem('user');
      if (!token || !userData) {
        navigate('/', { replace: true });
      }
    };

    window.addEventListener('focus', checkAuth);
    window.addEventListener('visibilitychange', checkAuth);
    return () => {
      window.removeEventListener('focus', checkAuth);
      window.removeEventListener('visibilitychange', checkAuth);
    };
  }, [navigate]);

  /* ─────────────────────────────────────────────────────────────────
     KEYBOARD SHORTCUT — Cmd/Ctrl+K opens patient lookup
     ───────────────────────────────────────────────────────────────── */

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setActiveSection('lookup');
        setTimeout(() => searchInputRef.current?.focus(), 100);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  /* ─────────────────────────────────────────────────────────────────
     LOGOUT
     ───────────────────────────────────────────────────────────────── */

  const handleLogout = useCallback(() => {
    openModal('confirm', 'تأكيد تسجيل الخروج', 'هل أنت متأكد من رغبتك في تسجيل الخروج؟', async () => {
      try {
        await logoutService();
      } catch (err) {
        console.error('[DoctorDashboard] Logout error:', err);
      } finally {
        localStorage.clear();
        navigate('/', { replace: true });
        setTimeout(() => { window.location.href = '/'; }, 100);
      }
    });
  }, [openModal, navigate]);

  /* ─────────────────────────────────────────────────────────────────
     PATIENT SEARCH
     ───────────────────────────────────────────────────────────────── */

  const handleSearchPatient = useCallback(async () => {
    const id = searchId.trim();
    if (!id) {
      setSearchError('الرجاء إدخال الرقم الوطني للمريض');
      return;
    }
    if (!/^\d{11}$/.test(id)) {
      setSearchError('الرقم الوطني يجب أن يكون 11 رقم بالضبط');
      return;
    }

    setSearchLoading(true);
    setSearchError(null);
    setFamilyMembers([]);
    setShowFamilySelection(false);

    try {
      const data = await doctorAPI.searchPatient(id);
      if (data.familyMembers && data.familyMembers.length > 1) {
        setFamilyMembers(data.familyMembers);
        setShowFamilySelection(true);
      } else if (data.patient) {
        await selectPatient(data.patient);
      } else {
        setSearchError('لم يتم العثور على المريض');
      }
    } catch (error) {
      console.error('[DoctorDashboard] Search error:', error);
      setSearchError(error.message || 'لم يتم العثور على المريض');
    } finally {
      setSearchLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchId]);

  /* ─────────────────────────────────────────────────────────────────
     SELECT PATIENT — load full record + history
     ───────────────────────────────────────────────────────────────── */

  const selectPatient = useCallback(async (patient) => {
    setSelectedPatient(patient);
    setShowFamilySelection(false);
    resetVisitForm();
    setPatientTab('overview');

    // Load history
    try {
      const nationalId = patient.nationalId || patient.childRegistrationNumber || patient.childId;
      const historyData = await doctorAPI.getPatientVisits(nationalId);
      if (historyData.visits) {
        setPatientHistory(historyData.visits);
      }
    } catch (err) {
      console.error('[DoctorDashboard] History load error:', err);
      setPatientHistory([]);
    }

    // Cache to recent patients (deduped, capped at 8)
    try {
      const existing = JSON.parse(localStorage.getItem('dd_recent_patients') || '[]');
      const filtered = existing.filter(
        (p) => (p.nationalId || p.childRegistrationNumber) !== (patient.nationalId || patient.childRegistrationNumber)
      );
      const updated = [
        {
          firstName: patient.firstName,
          lastName: patient.lastName,
          nationalId: patient.nationalId,
          childRegistrationNumber: patient.childRegistrationNumber,
          gender: patient.gender,
          isChild: !!patient.childRegistrationNumber,
          cachedAt: new Date().toISOString(),
        },
        ...filtered,
      ].slice(0, 8);
      localStorage.setItem('dd_recent_patients', JSON.stringify(updated));
      setRecentPatients(updated);
    } catch (e) {
      // Silent fail
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBackToLookup = useCallback(() => {
    setSelectedPatient(null);
    setPatientHistory([]);
    setSearchId('');
    setSearchError(null);
    resetVisitForm();
    setActiveSection('lookup');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ─────────────────────────────────────────────────────────────────
     VISIT FORM HANDLERS
     ───────────────────────────────────────────────────────────────── */

  const resetVisitForm = useCallback(() => {
    setVisitType('regular');
    setChiefComplaint('');
    setDiagnosis('');
    setDoctorNotes('');
    setFollowUpDate('');
    setFollowUpNotes('');
    setVitalSigns({
      bloodPressureSystolic: '',
      bloodPressureDiastolic: '',
      heartRate: '',
      oxygenSaturation: '',
      bloodGlucose: '',
      temperature: '',
      weight: '',
      height: '',
      respiratoryRate: '',
    });
    setMedications([]);
    setNewMedication({
      medicationName: '',
      dosage: '',
      frequency: '',
      duration: '',
      route: 'oral',
      instructions: '',
    });
    setVisitPhoto(null);
    setVisitPhotoPreview(null);
    setEcgFile(null);
    setEcgPreview(null);
    setEcgResult(null);
    setXrayFile(null);
    setXrayPreview(null);
    setXrayResult(null);
    setXrayModel(null);

    // إعادة تعيين حقول طلب التحاليل
    setLabTests([]);
    setNewLabTest({ testName: '', notes: '' });
  }, []);

  const handleVitalChange = useCallback((field, value) => {
    setVitalSigns((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleAddMedication = useCallback(() => {
    if (!newMedication.medicationName.trim()) {
      openModal('error', 'حقل مطلوب', 'الرجاء إدخال اسم الدواء');
      return;
    }
    setMedications((prev) => [...prev, { ...newMedication, id: Date.now() }]);
    setNewMedication({
      medicationName: '',
      dosage: '',
      frequency: '',
      duration: '',
      route: 'oral',
      instructions: '',
    });
  }, [newMedication, openModal]);

  const handleRemoveMedication = useCallback((id) => {
    setMedications((prev) => prev.filter((m) => m.id !== id));
  }, []);

  /* ─────────────────────────────────────────────────────────────────
     PHOTO UPLOAD HANDLERS
     ───────────────────────────────────────────────────────────────── */

  const handlePhotoUpload = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      openModal('error', 'الملف كبير', 'حجم الصورة يجب أن لا يتجاوز 10 ميجابايت');
      return;
    }
    setVisitPhoto(file);
    const reader = new FileReader();
    reader.onloadend = () => setVisitPhotoPreview(reader.result);
    reader.readAsDataURL(file);
  }, [openModal]);

  const handleRemovePhoto = useCallback(() => {
    setVisitPhoto(null);
    setVisitPhotoPreview(null);
    if (photoInputRef.current) photoInputRef.current.value = '';
  }, []);

  /* ─────────────────────────────────────────────────────────────────
     ECG HANDLERS (cardiologist)
     ───────────────────────────────────────────────────────────────── */

  const handleEcgUpload = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      openModal('error', 'الملف كبير', 'حجم الملف يجب أن لا يتجاوز 10 ميجابايت');
      return;
    }
    setEcgFile(file);
    setEcgResult(null);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => setEcgPreview(reader.result);
      reader.readAsDataURL(file);
    } else {
      setEcgPreview(null);
    }
  }, [openModal]);

  const handleRemoveEcg = useCallback(() => {
    setEcgFile(null);
    setEcgPreview(null);
    setEcgResult(null);
    if (ecgFileInputRef.current) ecgFileInputRef.current.value = '';
  }, []);

  const handleAnalyzeEcg = useCallback(async () => {
    if (!ecgFile) return;
    setEcgAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append('ecg_image', ecgFile);
      const data = await doctorAPI.analyzeECG(formData);
      setEcgResult(data);
      setTimeout(() => {
        aiResultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (error) {
      console.error('[DoctorDashboard] ECG analysis error:', error);
      openModal('error', 'فشل التحليل', error.message || 'حدث خطأ في تحليل تخطيط القلب');
    } finally {
      setEcgAnalyzing(false);
    }
  }, [ecgFile, openModal]);

  /* ─────────────────────────────────────────────────────────────────
     X-RAY HANDLERS (orthopedist)
     ───────────────────────────────────────────────────────────────── */

  const handleXrayModelSelect = useCallback((modelId) => {
    setXrayModel(modelId);
    setXrayResult(null);
  }, []);

  const handleXrayUpload = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      openModal('error', 'الملف كبير', 'حجم الصورة يجب أن لا يتجاوز 10 ميجابايت');
      return;
    }
    if (!file.type.startsWith('image/')) {
      openModal('error', 'ملف غير صالح', 'يجب أن يكون الملف صورة (PNG أو JPG)');
      return;
    }
    setXrayFile(file);
    setXrayResult(null);
    const reader = new FileReader();
    reader.onloadend = () => setXrayPreview(reader.result);
    reader.readAsDataURL(file);
  }, [openModal]);

  const handleRemoveXray = useCallback(() => {
    setXrayFile(null);
    setXrayPreview(null);
    setXrayResult(null);
    if (xrayFileInputRef.current) xrayFileInputRef.current.value = '';
  }, []);

  const handleAnalyzeXray = useCallback(async () => {
    if (!xrayFile || !xrayModel) return;
    setXrayAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append('xray_image', xrayFile);
      const data = xrayModel === 'hand'
        ? await doctorAPI.analyzeXRayHand(formData)
        : await doctorAPI.analyzeXRayLeg(formData);
      setXrayResult(data);
      setTimeout(() => {
        aiResultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (error) {
      console.error('[DoctorDashboard] X-Ray analysis error:', error);
      openModal('error', 'فشل التحليل', error.message || 'حدث خطأ في تحليل صورة الأشعة');
    } finally {
      setXrayAnalyzing(false);
    }
  }, [xrayFile, xrayModel, openModal]);

  /* ─────────────────────────────────────────────────────────────────
     SAVE VISIT
     ─────────────────────────────────────────────────────────────────
     UPDATED for new lab workflow:
     - No laboratoryId is sent with the lab test payload. The backend
       now accepts lab tests without a specific lab assigned, leaving
       the test "free-floating" until any lab tech picks it up via
       patient national ID search.
     ───────────────────────────────────────────────────────────────── */

  const handleSaveVisit = useCallback(async () => {
    if (!selectedPatient) return;
    if (!chiefComplaint.trim()) {
      openModal('error', 'حقل مطلوب', 'الرجاء إدخال الشكوى الرئيسية');
      return;
    }

    setSaving(true);
    try {
      const nationalId = selectedPatient.nationalId
                      || selectedPatient.childRegistrationNumber
                      || selectedPatient.childId;

      const formData = new FormData();
      formData.append('visitType', visitType);
      formData.append('chiefComplaint', chiefComplaint);
      formData.append('diagnosis', diagnosis);
      formData.append('doctorNotes', doctorNotes);
      formData.append('vitalSigns', JSON.stringify(vitalSigns));
      formData.append('prescribedMedications', JSON.stringify(medications));

      if (followUpDate) {
        formData.append('followUpDate', followUpDate);
        formData.append('followUpNotes', followUpNotes);
      }
      if (visitPhoto) {
        formData.append('visitPhoto', visitPhoto);
      }
      if (ecgResult && isCardiologist) {
        formData.append('ecgAnalysis', JSON.stringify(ecgResult));
      }
      if (xrayResult && isOrthopedist) {
        formData.append('xrayAnalysis', JSON.stringify({ ...xrayResult, model: xrayModel }));
      }

      // Step 1: Save the visit
      const visitResponse = await doctorAPI.savePatientVisit(nationalId, formData);
      const newVisitId = visitResponse?.visit?._id || visitResponse?.visitId;

      // Step 2 (optional): Create the lab test order — no laboratory assigned
      let labOrderResult = null;
      let labOrderError = null;

      if (labTests.length > 0) {
        try {
          setSubmittingLabOrder(true);
          const labPayload = {
            // laboratoryId is intentionally omitted — patient picks the lab
            testsOrdered: labTests.map((t, idx) => ({
              testCode: `CUSTOM-${idx + 1}`,
              testName: t.testName,
              ...(t.notes && { notes: t.notes }),
            })),
            priority: 'routine',
            ...(newVisitId && { visitId: newVisitId }),
          };

          const isChild = selectedPatient.childRegistrationNumber
                       || selectedPatient.isChild
                       || selectedPatient.childId;
          if (isChild) {
            labPayload.patientChildId = selectedPatient._id || selectedPatient.childId;
          } else {
            labPayload.patientPersonId = selectedPatient._id || selectedPatient.personId;
          }

          labOrderResult = await doctorAPI.createLabTest(labPayload);
        } catch (err) {
          labOrderError = err.message || 'حدث خطأ في إرسال طلب التحاليل';
          console.error('[DoctorDashboard] Lab order failed:', err);
        } finally {
          setSubmittingLabOrder(false);
        }
      }

      let successTitle = 'تم الحفظ';
      let successMessage = 'تم حفظ بيانات الزيارة بنجاح';

      if (labOrderResult?.labTest?.testNumber) {
        successMessage += `\n\nتم إرسال طلب التحاليل برقم: ${labOrderResult.labTest.testNumber}`;
        successMessage += `\nيمكن للمريض الذهاب لأي مختبر في سوريا لإجراء التحليل.`;
      } else if (labOrderError) {
        successTitle = 'تم الحفظ مع تحذير';
        successMessage += `\n\nلكن فشل إرسال طلب التحاليل: ${labOrderError}`;
      }

      openModal('success', successTitle, successMessage, () => {
        closeModal();
        Promise.all([
          doctorAPI.getPatientVisits(nationalId).catch(() => null),
          doctorAPI.getMyAppointments().catch(() => null),
          doctorAPI.getMyAvailabilitySlots().catch(() => null)
        ]).then(([visitsData, apptsData, slotsData]) => {
          if (visitsData?.visits) setPatientHistory(visitsData.visits);
          if (apptsData?.appointments) setAppointments(apptsData.appointments);
          if (slotsData?.slots) setAvailabilitySlots(slotsData.slots);
        });
        resetVisitForm();
        setPatientTab('history');
      });
    } catch (error) {
      console.error('[DoctorDashboard] Save visit error:', error);
      openModal('error', 'فشل الحفظ', error.message || 'حدث خطأ في حفظ بيانات الزيارة');
    } finally {
      setSaving(false);
    }
  }, [
    selectedPatient, chiefComplaint, diagnosis, doctorNotes, visitType,
    vitalSigns, medications, followUpDate, followUpNotes, visitPhoto,
    ecgResult, xrayResult, xrayModel, isCardiologist, isOrthopedist,
    labTests,
    openModal, closeModal, resetVisitForm,
  ]);

  /* ─────────────────────────────────────────────────────────────────
     APPOINTMENTS HANDLERS
     ───────────────────────────────────────────────────────────────── */

  const handleWeekPrev = useCallback(() => {
    setWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      return d;
    });
  }, []);

  const handleWeekNext = useCallback(() => {
    setWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
      return d;
    });
  }, []);

  const handleWeekToday = useCallback(() => {
    setWeekStart(getWeekStart(new Date()));
  }, []);

  const openSlotModal = useCallback((date = null, hour = null) => {
    const today = date || new Date();
    const dateStr = today.toISOString().split('T')[0];
    const startTime = hour !== null ? `${String(hour).padStart(2, '0')}:00` : '09:00';
    const endTime = hour !== null ? `${String(hour + 1).padStart(2, '0')}:00` : '10:00';
    setNewSlot({ date: dateStr, startTime, endTime, slotDuration: 30, maxBookings: 1 });
    setShowSlotModal(true);
  }, []);

  const handleCreateSlot = useCallback(async () => {
    try {
      const data = await doctorAPI.createAvailabilitySlot(newSlot);
      setShowSlotModal(false);
      // Refresh
      const refreshed = await doctorAPI.getMyAvailabilitySlots();
      if (refreshed.slots) setAvailabilitySlots(refreshed.slots);
      openModal('success', 'تم الإضافة', 'تم إضافة الموعد المتاح بنجاح');
    } catch (error) {
      openModal('error', 'فشل الإضافة', error.message || 'حدث خطأ في إضافة الموعد');
    }
  }, [newSlot, openModal]);

  /**
   * openApptDetails — opens the appointment details modal for a booked cell.
   * Called from the calendar when a doctor clicks a "booked" appointment
   * chip (not an empty cell — empty cells still open the "add slot" modal).
   */
  const openApptDetails = useCallback((appt) => {
    setSelectedAppointment(appt);
    setShowApptDetails(true);
  }, []);

  const closeApptDetails = useCallback(() => {
    setShowApptDetails(false);
    setSelectedAppointment(null);
  }, []);

  /**
   * handleCancelAppt — cancel an appointment on behalf of the doctor.
   * Uses /api/doctor/appointments/:id/cancel — a doctor-scoped endpoint
   * that verifies the appointment belongs to the caller and releases
   * the slot atomically. We do NOT use doctorAPI.cancelAppointment()
   * because that helper is wired to the patient endpoint in api.js.
   */
  const handleCancelAppt = useCallback(async () => {
    if (!selectedAppointment?._id) return;

    const confirmed = window.confirm(
      'هل أنت متأكد من إلغاء هذا الموعد؟ سيتم إشعار المريض وتحرير الموعد.'
    );
    if (!confirmed) return;

    try {
      setCancelingAppt(true);

      const token = localStorage.getItem('token');
      const resp = await fetch(
        `http://localhost:5000/api/doctor/appointments/${selectedAppointment._id}/cancel`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ reason: 'doctor_unavailable' })
        }
      );

      const payload = await resp.json().catch(() => ({}));
      if (!resp.ok || payload.success === false) {
        throw new Error(payload.message || 'فشل إلغاء الموعد');
      }

      // Refresh both appointments and slots so the calendar updates
      const [apptsRefreshed, slotsRefreshed] = await Promise.all([
        doctorAPI.getMyAppointments().catch(() => null),
        doctorAPI.getMyAvailabilitySlots().catch(() => null)
      ]);
      if (apptsRefreshed?.appointments) setAppointments(apptsRefreshed.appointments);
      if (slotsRefreshed?.slots) setAvailabilitySlots(slotsRefreshed.slots);

      closeApptDetails();
      openModal('success', 'تم الإلغاء', 'تم إلغاء الموعد وإشعار المريض.');
    } catch (error) {
      openModal('error', 'فشل الإلغاء', error.message || 'تعذّر إلغاء الموعد');
    } finally {
      setCancelingAppt(false);
    }
  }, [selectedAppointment, closeApptDetails, openModal]);

  /**
   * openSlotDetails / closeSlotDetails — opens the "available slot" details
   * modal when the doctor clicks one of their empty availability slots.
   * Entry point for removing a slot the doctor no longer wants to offer.
   */
  const openSlotDetails = useCallback((slot) => {
    setSelectedSlotDetails(slot);
    setShowSlotDetails(true);
  }, []);

  const closeSlotDetails = useCallback(() => {
    setShowSlotDetails(false);
    setSelectedSlotDetails(null);
  }, []);

  /**
   * handleDeleteSlot — deletes an unbooked availability slot.
   * Calls DELETE /api/doctor/availability-slots/:id which verifies both
   * ownership and that currentBookings === 0 server-side.
   */
  const handleDeleteSlot = useCallback(async () => {
    if (!selectedSlotDetails?._id) return;

    const confirmed = window.confirm(
      'هل أنت متأكد من حذف هذا الموعد المتاح؟ لن يتمكن المرضى من حجزه بعد الحذف.'
    );
    if (!confirmed) return;

    try {
      setDeletingSlot(true);

      const token = localStorage.getItem('token');
      const resp = await fetch(
        `http://localhost:5000/api/doctor/availability-slots/${selectedSlotDetails._id}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          }
        }
      );

      const payload = await resp.json().catch(() => ({}));
      if (!resp.ok || payload.success === false) {
        throw new Error(payload.message || 'فشل حذف الموعد');
      }

      // Refresh the slot list
      const refreshed = await doctorAPI.getMyAvailabilitySlots().catch(() => null);
      if (refreshed?.slots) setAvailabilitySlots(refreshed.slots);

      closeSlotDetails();
      openModal('success', 'تم الحذف', 'تم حذف الموعد المتاح.');
    } catch (error) {
      openModal('error', 'فشل الحذف', error.message || 'تعذّر حذف الموعد');
    } finally {
      setDeletingSlot(false);
    }
  }, [selectedSlotDetails, closeSlotDetails, openModal]);

  /* ─────────────────────────────────────────────────────────────────
     NOTIFICATION HANDLERS
     ───────────────────────────────────────────────────────────────── */

  const toggleNotifPanel = useCallback(() => {
    setNotifOpen((prev) => !prev);
  }, []);

  const handleMarkNotifRead = useCallback(async (notifId) => {
    try {
      await doctorAPI.markNotificationRead(notifId);
      setNotifications((prev) =>
        prev.map((n) => (n._id === notifId ? { ...n, status: 'read' } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.error('[DoctorDashboard] Mark notif read error:', err);
    }
  }, []);

  /* ─────────────────────────────────────────────────────────────────
     COPY HELPER
     ───────────────────────────────────────────────────────────────── */

  const copyToClipboard = useCallback((text) => {
    navigator.clipboard?.writeText(text).catch(() => {});
  }, []);

  /* ─────────────────────────────────────────────────────────────────
     LOADING STATE
     ───────────────────────────────────────────────────────────────── */

  if (loading) {
    return (
      <div className="dd-page">
        <Navbar />
        <div className="dd-loading">
          <div className="dd-loading-spinner" />
          <p>جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;


  /* ═════════════════════════════════════════════════════════════════
     RENDER — main shell, sidebar, and primary sections
     ═════════════════════════════════════════════════════════════════ */

  const doctorName = `د. ${user.firstName || ''} ${user.fatherName ? user.fatherName + ' ' : ''}${user.lastName || ''}`.trim();
  const doctorSpec = user.roleData?.doctor?.specialization || 'طبيب';

  return (
    <div className="dd-page">
      <Navbar />

      {/* Modal */}
      <Modal
        isOpen={modal.isOpen}
        type={modal.type}
        title={modal.title}
        message={modal.message}
        onClose={closeModal}
        onConfirm={modal.onConfirm}
      />

      {/* Sidebar mobile backdrop */}
      <div
        className={`dd-sidebar-backdrop ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      {/* Notifications panel backdrop */}
      <div
        className={`dd-notif-backdrop ${notifOpen ? 'open' : ''}`}
        onClick={() => setNotifOpen(false)}
        aria-hidden="true"
      />

      {/* Notifications slide-in panel */}
      <aside className={`dd-notif-panel ${notifOpen ? 'open' : ''}`} aria-label="الإشعارات">
        <div className="dd-notif-panel-header">
          <h3 className="dd-notif-panel-title">
            <Bell size={18} strokeWidth={2.2} />
            الإشعارات
            {unreadCount > 0 && (
              <span className="dd-sidebar-badge" style={{ marginInlineStart: 8 }}>
                {unreadCount}
              </span>
            )}
          </h3>
          <button
            type="button"
            className="dd-notif-panel-close"
            onClick={() => setNotifOpen(false)}
            aria-label="إغلاق الإشعارات"
          >
            <X size={18} strokeWidth={2.2} />
          </button>
        </div>

        <div className="dd-notif-list">
          {notifications.length === 0 ? (
            <div className="dd-empty">
              <div className="dd-empty-icon">
                <Bell size={28} strokeWidth={1.8} />
              </div>
              <h3>لا توجد إشعارات</h3>
              <p>ستظهر هنا الإشعارات الجديدة عند وصولها</p>
            </div>
          ) : (
            notifications.map((notif) => {
              const iconType = notif.type?.includes('critical') || notif.type?.includes('emergency') ? 'error'
                            : notif.type?.includes('lab') ? 'info'
                            : notif.type?.includes('approved') || notif.type?.includes('confirmed') ? 'success'
                            : 'warning';
              const NotifIcon = iconType === 'error' ? AlertTriangle
                              : iconType === 'success' ? CheckCircle2
                              : iconType === 'info' ? Info
                              : Bell;
              return (
                <button
                  key={notif._id || notif.id}
                  type="button"
                  className={`dd-notif-item ${notif.status !== 'read' ? 'unread' : ''}`}
                  onClick={() => handleMarkNotifRead(notif._id || notif.id)}
                >
                  <div className={`dd-notif-item-icon ${iconType}`}>
                    <NotifIcon size={16} strokeWidth={2.2} />
                  </div>
                  <div className="dd-notif-item-content">
                    <h4 className="dd-notif-item-title">{notif.title}</h4>
                    <p className="dd-notif-item-text">{notif.message}</p>
                    <span className="dd-notif-item-time">
                      {formatArabicDateTime(notif.createdAt)}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* Main shell: sidebar + content */}
      <div className="dd-shell">
        {/* ═══════════════════════════════════════════════════════════
            SIDEBAR
            ═══════════════════════════════════════════════════════════ */}
        <aside className={`dd-sidebar ${sidebarOpen ? 'open' : ''}`} aria-label="القائمة الرئيسية">
          {/* Header — doctor identity */}
          <div className="dd-sidebar-header">
            <div className="dd-sidebar-avatar">
              <Stethoscope size={26} strokeWidth={2} />
              <span className="dd-sidebar-online" />
            </div>
            <div className="dd-sidebar-identity">
              <h3 className="dd-sidebar-name">{doctorName}</h3>
              <span className="dd-sidebar-role">
                {isCardiologist ? <Heart size={11} strokeWidth={2.5} />
                 : isOrthopedist ? <Bone size={11} strokeWidth={2.5} />
                 : <ShieldCheck size={11} strokeWidth={2.5} />}
                {doctorSpec}
              </span>
            </div>
          </div>

          {/* Nav */}
          <nav className="dd-sidebar-nav">
            <span className="dd-sidebar-section-label">القائمة</span>
            {sidebarNav.map((item) => {
              const ItemIcon = item.Icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`dd-sidebar-link ${activeSection === item.id ? 'active' : ''}`}
                  onClick={() => {
                    setActiveSection(item.id);
                    setSidebarOpen(false);
                  }}
                >
                  <ItemIcon size={20} strokeWidth={2} />
                  <span className="dd-sidebar-link-label">{item.labelAr}</span>
                  {item.id === 'aiTools' && (
                    <span className="dd-sidebar-badge info">AI</span>
                  )}
                </button>
              );
            })}

            {/* <span className="dd-sidebar-section-label">الإعدادات</span>
            <button
              type="button"
              className="dd-sidebar-link"
              onClick={toggleNotifPanel}
            >
              <Bell size={20} strokeWidth={2} />
              <span className="dd-sidebar-link-label">الإشعارات</span>
              {unreadCount > 0 && <span className="dd-sidebar-badge">{unreadCount}</span>}
            </button>
            <button
              type="button"
              className="dd-sidebar-link"
              onClick={() => navigate('/profile')}
            >
              <Settings size={20} strokeWidth={2} />
              <span className="dd-sidebar-link-label">الإعدادات</span>
            </button> */}
          </nav>

          {/* Footer — logout */}
          <div className="dd-sidebar-footer">
            <button type="button" className="dd-sidebar-logout" onClick={handleLogout}>
              <LogOut size={18} strokeWidth={2} />
              <span>تسجيل الخروج</span>
            </button>
          </div>
        </aside>

        {/* ═══════════════════════════════════════════════════════════
            MAIN CONTENT AREA
            ═══════════════════════════════════════════════════════════ */}
        <main className="dd-main">
          {/* ───────────────────────────────────────────────────
              HOME SECTION
              ─────────────────────────────────────────────────── */}
          {activeSection === 'home' && (
            <>
              {/* Mobile sidebar toggle + notifications bell */}
              <div className="dd-page-header">
                <div className="dd-page-title">
                  <button
                    type="button"
                    className="dd-btn dd-btn-icon dd-mobile-toggle"
                    onClick={() => setSidebarOpen(true)}
                    aria-label="فتح القائمة"
                  >
                    <Menu size={20} strokeWidth={2.2} />
                  </button>
                  <div className="dd-page-title-icon">
                    <Home size={24} strokeWidth={2} />
                  </div>
                  <div>
                    <h1>الرئيسية</h1>
                    <p>نظرة عامة على نشاطك اليوم</p>
                  </div>
                </div>
                <div className="dd-page-actions">
                  <button
                    type="button"
                    className="dd-btn dd-btn-icon"
                    onClick={toggleNotifPanel}
                    aria-label="الإشعارات"
                  >
                    <Bell size={20} strokeWidth={2} />
                    {unreadCount > 0 && (
                      <span className="dd-btn-icon-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
                    )}
                  </button>
                </div>
              </div>

              {/* Greeting hero */}
              <section className="dd-greeting-hero">
                <div className="dd-greeting-content">
                  <div className="dd-greeting-avatar">
                    <Stethoscope size={42} strokeWidth={1.8} />
                    {isCardiologist && (
                      <span className="dd-greeting-cardio-badge">
                        <Heart size={14} strokeWidth={2.5} fill="currentColor" />
                      </span>
                    )}
                    {isOrthopedist && (
                      <span className="dd-greeting-cardio-badge">
                        <Bone size={14} strokeWidth={2.5} />
                      </span>
                    )}
                  </div>
                  <div className="dd-greeting-text">
                    <span className="dd-greeting-eyebrow">
                      <Sparkles size={12} strokeWidth={2.5} />
                      {getTimeGreeting()}
                    </span>
                    <h2>{doctorName}</h2>
                    <div className="dd-greeting-meta">
                      <span className="dd-greeting-meta-item">
                        <Award size={14} strokeWidth={2} />
                        {doctorSpec}
                      </span>
                      {user.roleData?.doctor?.hospitalAffiliation && (
                        <span className="dd-greeting-meta-item">
                          <Hospital size={14} strokeWidth={2} />
                          {user.roleData.doctor.hospitalAffiliation}
                        </span>
                      )}
                      {user.roleData?.doctor?.yearsOfExperience !== undefined && (
                        <span className="dd-greeting-meta-item">
                          <Briefcase size={14} strokeWidth={2} />
                          {user.roleData.doctor.yearsOfExperience} سنة خبرة
                        </span>
                      )}
                      {user.roleData?.doctor?.medicalLicenseNumber && (
                        <span className="dd-greeting-meta-item">
                          <IdCard size={14} strokeWidth={2} />
                          ترخيص: {user.roleData.doctor.medicalLicenseNumber}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="dd-greeting-quick-actions">
                    <button
                      type="button"
                      className="dd-greeting-quick-btn"
                      onClick={() => setActiveSection('lookup')}
                    >
                      <Search size={16} strokeWidth={2.2} />
                      <span>بحث عن مريض</span>
                    </button>
                    <button
                      type="button"
                      className="dd-greeting-quick-btn"
                      onClick={() => setActiveSection('appointments')}
                    >
                      <CalendarDays size={16} strokeWidth={2.2} />
                      <span>مواعيدي</span>
                    </button>
                  </div>
                </div>
              </section>

              {/* KPI tiles */}
              <section className="dd-kpi-row">
                <div className="dd-kpi-tile">
                  <div className="dd-kpi-icon primary">
                    <CalendarDays size={22} strokeWidth={2} />
                  </div>
                  <div className="dd-kpi-value">{kpis.appointmentsToday || 0}</div>
                  <div className="dd-kpi-label">مواعيد اليوم</div>
                </div>
                <div className="dd-kpi-tile">
                  <div className="dd-kpi-icon success">
                    <Users size={22} strokeWidth={2} />
                  </div>
                  <div className="dd-kpi-value">{kpis.patientsThisWeek || 0}</div>
                  <div className="dd-kpi-label">مرضى هذا الأسبوع</div>
                </div>
                <div className="dd-kpi-tile">
                  <div className="dd-kpi-icon warning">
                    <Microscope size={22} strokeWidth={2} />
                  </div>
                  <div className="dd-kpi-value">{kpis.pendingLabs || 0}</div>
                  <div className="dd-kpi-label">نتائج مخبرية معلقة</div>
                </div>
                <div className="dd-kpi-tile">
                  <div className="dd-kpi-icon info">
                    <Pill size={22} strokeWidth={2} />
                  </div>
                  <div className="dd-kpi-value">{kpis.prescriptionsIssued || 0}</div>
                  <div className="dd-kpi-label">وصفات هذا الشهر</div>
                </div>
              </section>

              {/* Two-column home grid */}
              <section className="dd-home-grid">
                {/* Today's appointments */}
                <div className="dd-card">
                  <div className="dd-card-header">
                    <h3 className="dd-card-title">
                      <span className="dd-card-title-icon">
                        <Clock size={18} strokeWidth={2} />
                      </span>
                      مواعيد اليوم
                    </h3>
                    <button
                      type="button"
                      className="dd-btn dd-btn-ghost"
                      onClick={() => setActiveSection('appointments')}
                    >
                      عرض الكل
                      <ArrowLeft size={14} strokeWidth={2.2} />
                    </button>
                  </div>

                  {todaysAppointments.length === 0 ? (
                    <div className="dd-empty">
                      <div className="dd-empty-icon">
                        <CalendarDays size={28} strokeWidth={1.8} />
                      </div>
                      <h3>لا توجد مواعيد اليوم</h3>
                      <p>استمتع بيومك أو أضف مواعيد متاحة جديدة</p>
                    </div>
                  ) : (
                    <div className="dd-today-appts">
                      {todaysAppointments.slice(0, 5).map((appt) => {
                        const t = formatTime(appt.appointmentTime);
                        return (
                          <div key={appt._id} className="dd-today-appt-item">
                            <div className="dd-today-appt-time">
                              <span className="dd-today-appt-time-hour">{t.hour}</span>
                              <span className="dd-today-appt-time-meridiem">{t.period}</span>
                            </div>
                            <div className="dd-today-appt-info">
                              <h4 className="dd-today-appt-name">
                                {appt.patientName || 'مريض'}
                              </h4>
                              <p className="dd-today-appt-reason">
                                <ClipboardList size={12} strokeWidth={2.2} />
                                {appt.reasonForVisit || 'استشارة'}
                              </p>
                            </div>
                            <span className={`dd-today-appt-status ${appt.status || 'scheduled'}`}>
                              {appt.status === 'confirmed' && <CheckCircle2 size={11} strokeWidth={2.5} />}
                              {appt.status === 'checked_in' && <UserPlus size={11} strokeWidth={2.5} />}
                              {(!appt.status || appt.status === 'scheduled') && <Clock size={11} strokeWidth={2.5} />}
                              {appt.status === 'confirmed' ? 'مؤكد'
                               : appt.status === 'checked_in' ? 'حضر'
                               : 'مجدول'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Recent activity */}
                <div className="dd-card">
                  <div className="dd-card-header">
                    <h3 className="dd-card-title">
                      <span className="dd-card-title-icon">
                        <Activity size={18} strokeWidth={2} />
                      </span>
                      آخر النشاطات
                    </h3>
                  </div>

                  <div className="dd-activity-list">
                    {notifications.length === 0 ? (
                      <div className="dd-empty">
                        <div className="dd-empty-icon">
                          <Activity size={24} strokeWidth={1.8} />
                        </div>
                        <p>لا توجد نشاطات حديثة</p>
                      </div>
                    ) : (
                      notifications.slice(0, 5).map((notif) => {
                        const iconType = notif.type?.includes('critical') ? 'error'
                                      : notif.type?.includes('lab') ? 'info'
                                      : 'warning';
                        const ActIcon = iconType === 'error' ? AlertTriangle
                                      : iconType === 'info' ? Microscope
                                      : Bell;
                        return (
                          <div key={notif._id || notif.id} className="dd-activity-item">
                            <div className={`dd-activity-icon ${iconType}`}>
                              <ActIcon size={16} strokeWidth={2.2} />
                            </div>
                            <div className="dd-activity-text">
                              <p>{notif.title}</p>
                              <time>{formatArabicDateTime(notif.createdAt)}</time>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </section>
            </>
          )}

          {/* ───────────────────────────────────────────────────
              APPOINTMENTS SECTION
              ─────────────────────────────────────────────────── */}
          {activeSection === 'appointments' && (
            <>
              <div className="dd-page-header">
                <div className="dd-page-title">
                  <button
                    type="button"
                    className="dd-btn dd-btn-icon dd-mobile-toggle"
                    onClick={() => setSidebarOpen(true)}
                    aria-label="فتح القائمة"
                  >
                    <Menu size={20} strokeWidth={2.2} />
                  </button>
                  <div className="dd-page-title-icon">
                    <CalendarDays size={24} strokeWidth={2} />
                  </div>
                  <div>
                    <h1>مواعيدي</h1>
                    <p>إدارة جدولك الأسبوعي والمواعيد المتاحة</p>
                  </div>
                </div>
                <div className="dd-page-actions">
                  <button
                    type="button"
                    className="dd-btn dd-btn-primary"
                    onClick={() => openSlotModal()}
                  >
                    <Plus size={18} strokeWidth={2.2} />
                    <span>إضافة موعد متاح</span>
                  </button>
                </div>
              </div>

              {/* Calendar toolbar */}
              <div className="dd-cal-toolbar">
                <div className="dd-cal-nav">
                  <button
                    type="button"
                    className="dd-cal-nav-btn"
                    onClick={handleWeekPrev}
                    aria-label="الأسبوع السابق"
                  >
                    <ChevronRight size={18} strokeWidth={2.5} />
                  </button>
                  <span className="dd-cal-current-range">{formatWeekRange(weekStart)}</span>
                  <button
                    type="button"
                    className="dd-cal-nav-btn"
                    onClick={handleWeekNext}
                    aria-label="الأسبوع التالي"
                  >
                    <ChevronLeft size={18} strokeWidth={2.5} />
                  </button>
                </div>
                <button type="button" className="dd-cal-today-btn" onClick={handleWeekToday}>
                  اليوم
                </button>
              </div>

              {/* Calendar grid */}
              <div className="dd-cal-grid" role="grid" aria-label="جدول المواعيد الأسبوعي">
                {/* Empty top-left corner */}
                <div className="dd-cal-day-header first" aria-hidden="true" />

                {/* Day headers */}
                {weekDays.map((day, idx) => {
                  const isToday = day.toDateString() === new Date().toDateString();
                  const dayName = day.toLocaleDateString('ar-EG', { weekday: 'short' });
                  return (
                    <div
                      key={idx}
                      className={`dd-cal-day-header ${isToday ? 'today' : ''}`}
                    >
                      <div className="dd-cal-day-name">{dayName}</div>
                      <div className="dd-cal-day-num">{day.getDate()}</div>
                    </div>
                  );
                })}

                {/* Hour rows */}
                {calendarHours.map((hour) => (
                  <React.Fragment key={hour}>
                    <div className="dd-cal-time-label">
                      {hour > 12 ? `${hour - 12}م` : hour === 12 ? '12م' : `${hour}ص`}
                    </div>
                    {weekDays.map((day, dayIdx) => {
                      const isToday = day.toDateString() === new Date().toDateString();
                      const isPast = day < new Date(new Date().setHours(0, 0, 0, 0));

                      // Find slots/appointments for this cell
                      const cellDateStr = day.toISOString().split('T')[0];
                      const cellSlots = availabilitySlots.filter((s) => {
                        // Hide expired and booked slots — expired slots are
                        // historical records (auto-marked by the schema once
                        // their time passed) and booked slots are already
                        // represented by the appointment chip in the same
                        // cell. Show only slots the doctor can still act on.
                        if (s.status !== 'available' && s.status !== 'blocked') return false;
                        if (s.isAvailable === false && s.status !== 'blocked') return false;
                        const sDate = new Date(s.date).toISOString().split('T')[0];
                        const startHour = parseInt((s.startTime || '').split(':')[0], 10);
                        return sDate === cellDateStr && startHour === hour;
                      });
                      // Only show LIVE appointments — exclude cancelled + no-show so
                      // the doctor's calendar stays in sync with what patients see.
                      const cellAppts = appointments.filter((a) => {
                        if (a.status === 'cancelled' || a.status === 'no_show') return false;
                        const aDate = new Date(a.appointmentDate).toISOString().split('T')[0];
                        const aHour = parseInt((a.appointmentTime || '').split(':')[0], 10);
                        return aDate === cellDateStr && aHour === hour;
                      });

                      // The outer cell opens the "add slot" modal — but ONLY
                      // when the cell is truly empty (no appointments AND no
                      // availability slots). If there's already content, the
                      // chip's own onClick handles the interaction.
                      const handleCellClick = () => {
                        if (isPast) return;
                        if (cellAppts.length > 0) return; // booked chip handles it
                        if (cellSlots.length > 0) return; // available chip handles it
                        openSlotModal(day, hour);
                      };

                      return (
                        <button
                          key={`${hour}-${dayIdx}`}
                          type="button"
                          className={`dd-cal-cell ${isToday ? 'today' : ''} ${isPast ? 'past' : ''}`}
                          onClick={handleCellClick}
                          disabled={isPast}
                          aria-label={`${day.toLocaleDateString('ar-EG')} ${hour}:00`}
                        >
                          {cellAppts.map((appt) => (
                            <div
                              key={appt._id}
                              role="button"
                              tabIndex={0}
                              className={`dd-cal-slot ${appt.priority === 'emergency' ? 'emergency' : 'booked'}`}
                              style={{ top: 4, height: 'calc(100% - 8px)', cursor: 'pointer' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                openApptDetails(appt);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  openApptDetails(appt);
                                }
                              }}
                              title="انقر لعرض تفاصيل الموعد"
                            >
                              <span className="dd-cal-slot-name">
                                {appt.patientPersonId?.firstName
                                  ? `${appt.patientPersonId.firstName} ${appt.patientPersonId.lastName || ''}`.trim()
                                  : appt.patientChildId?.firstName
                                  ? `${appt.patientChildId.firstName} ${appt.patientChildId.lastName || ''}`.trim()
                                  : appt.patientName || 'مريض'}
                              </span>
                              <span className="dd-cal-slot-time">{appt.appointmentTime}</span>
                            </div>
                          ))}
                          {cellSlots.length > 0 && cellAppts.length === 0 && cellSlots.map((slot) => (
                            <div
                              key={slot._id}
                              role="button"
                              tabIndex={0}
                              className={`dd-cal-slot ${slot.status === 'blocked' ? 'blocked' : 'available'}`}
                              style={{ top: 4, height: 'calc(100% - 8px)', cursor: 'pointer' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                openSlotDetails(slot);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  openSlotDetails(slot);
                                }
                              }}
                              title="انقر لعرض تفاصيل الموعد المتاح"
                            >
                              <span className="dd-cal-slot-name">
                                {slot.status === 'blocked' ? 'محجوز' : 'متاح'}
                              </span>
                              <span className="dd-cal-slot-time">
                                {slot.startTime} - {slot.endTime}
                              </span>
                            </div>
                          ))}
                        </button>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>

              {/* Legend */}
              <div className="dd-cal-toolbar" style={{ marginTop: 8 }}>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', fontFamily: 'Cairo, sans-serif', fontSize: '0.825rem', color: 'var(--tm-text-secondary)' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 14, height: 14, borderRadius: 4, background: 'var(--tm-success-light)', border: '1px dashed rgba(0, 137, 123, 0.30)' }} />
                    متاح
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 14, height: 14, borderRadius: 4, background: 'var(--tm-gradient)' }} />
                    محجوز
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 14, height: 14, borderRadius: 4, background: 'linear-gradient(135deg, var(--tm-error) 0%, #B71C1C 100%)' }} />
                    طوارئ
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 14, height: 14, borderRadius: 4, background: 'rgba(var(--tm-primary-rgb), 0.08)' }} />
                    مغلق
                  </span>
                </div>
              </div>
            </>
          )}

          {/* ───────────────────────────────────────────────────
              PATIENT LOOKUP SECTION
              ─────────────────────────────────────────────────── */}
          {activeSection === 'lookup' && !selectedPatient && (
            <>
              <div className="dd-page-header">
                <div className="dd-page-title">
                  <button
                    type="button"
                    className="dd-btn dd-btn-icon dd-mobile-toggle"
                    onClick={() => setSidebarOpen(true)}
                    aria-label="فتح القائمة"
                  >
                    <Menu size={20} strokeWidth={2.2} />
                  </button>
                  <div className="dd-page-title-icon">
                    <Search size={24} strokeWidth={2} />
                  </div>
                  <div>
                    <h1>البحث عن مريض</h1>
                    <p>أدخل الرقم الوطني للوصول إلى الملف الطبي الكامل</p>
                  </div>
                </div>
              </div>

              {/* Search hero */}
              <section className="dd-search-hero">
                <div className="dd-search-icon-large">
                  <Search size={36} strokeWidth={1.8} />
                </div>
                <h2>ابحث عن المريض برقم الهوية</h2>
                <p>
                  أدخل الرقم الوطني المكون من 11 رقم للبحث في قاعدة البيانات الطبية المركزية.
                  للأطفال أقل من 14 سنة، استخدم رقم تسجيل الطفل الخاص.
                </p>

                <div className="dd-search-form">
                  <div className="dd-search-input-wrapper">
                    <Search size={20} strokeWidth={2} />
                    <input
                      ref={searchInputRef}
                      type="text"
                      className="dd-search-input"
                      placeholder="11 رقم"
                      value={searchId}
                      onChange={(e) => {
                        setSearchId(e.target.value.replace(/\D/g, '').slice(0, 11));
                        setSearchError(null);
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearchPatient()}
                      maxLength={11}
                      inputMode="numeric"
                      autoComplete="off"
                    />
                  </div>
                  <button
                    type="button"
                    className="dd-search-go"
                    onClick={handleSearchPatient}
                    disabled={searchLoading || !searchId}
                  >
                    {searchLoading ? (
                      <>
                        <Loader2 size={18} className="dd-spin" />
                        <span>جاري البحث...</span>
                      </>
                    ) : (
                      <>
                        <Search size={18} strokeWidth={2.2} />
                        <span>بحث</span>
                      </>
                    )}
                  </button>
                </div>

                {searchError && (
                  <div className="dd-search-error">
                    <AlertCircle size={18} strokeWidth={2.2} />
                    <span>{searchError}</span>
                  </div>
                )}

                {/* Family member selection */}
                {showFamilySelection && familyMembers.length > 0 && (
                  <div style={{ width: '100%', marginTop: 12 }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--tm-primary)', marginBottom: 8, fontFamily: 'Cairo, sans-serif' }}>
                      اختر المريض المطلوب
                    </h3>
                    <div className="dd-family-grid">
                      {familyMembers.map((member, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className="dd-family-card"
                          onClick={() => selectPatient(member)}
                        >
                          <div className="dd-family-card-avatar">
                            {member.isChild || member.childRegistrationNumber
                              ? <Baby size={26} strokeWidth={2} />
                              : <User size={26} strokeWidth={2} />}
                          </div>
                          <h4 className="dd-family-card-name">
                            {member.firstName} {member.lastName}
                          </h4>
                          {(member.isChild || member.childRegistrationNumber) && (
                            <span className="dd-family-card-badge">طفل</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              {/* Recent patients */}
              {recentPatients.length > 0 && (
                <section className="dd-card">
                  <div className="dd-card-header">
                    <h3 className="dd-card-title">
                      <span className="dd-card-title-icon">
                        <Clock size={18} strokeWidth={2} />
                      </span>
                      المرضى الذين زرتهم مؤخراً
                    </h3>
                  </div>
                  <div className="dd-recent-patients">
                    {recentPatients.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className="dd-recent-patient-card"
                        onClick={async () => {
                          const id = p.nationalId || p.childRegistrationNumber || '';
                          setSearchId(id);
                          if (!id) return;
                          // Re-fetch the full patient record from /search so
                          // medical fields (bloodType, allergies, etc.) are
                          // included. The localStorage cache only stores a
                          // lightweight copy (name + nationalId) so clicking
                          // a recent card must not reuse that stale object.
                          try {
                            const data = await doctorAPI.searchPatient(id);
                            if (data?.patient) {
                              await selectPatient(data.patient);
                            } else {
                              // Fall back to the cached lite object if the
                              // backend didn't return anything useful.
                              await selectPatient(p);
                            }
                          } catch (err) {
                            console.error('[DoctorDashboard] Recent patient reload error:', err);
                            await selectPatient(p);
                          }
                        }}
                      >
                        <div className="dd-recent-patient-avatar">
                          {p.isChild
                            ? <Baby size={20} strokeWidth={2} />
                            : <User size={20} strokeWidth={2} />}
                        </div>
                        <div className="dd-recent-patient-info">
                          <h4 className="dd-recent-patient-name">
                            {p.firstName} {p.lastName}
                          </h4>
                          <span className="dd-recent-patient-id">
                            {p.nationalId || p.childRegistrationNumber}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {/* Tip card */}
              <section className="dd-card" style={{ background: 'rgba(var(--tm-action-rgb), 0.04)' }}>
                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--tm-action)', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Sparkles size={20} strokeWidth={2} />
                  </div>
                  <div style={{ flex: 1, fontFamily: 'Cairo, sans-serif' }}>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--tm-primary)', margin: '0 0 6px' }}>
                      نصيحة سريعة
                    </h4>
                    <p style={{ fontSize: '0.825rem', color: 'var(--tm-text-secondary)', margin: 0, lineHeight: 1.7 }}>
                      اضغط <kbd style={{ padding: '2px 8px', background: 'var(--tm-card-bg)', border: '1px solid var(--tm-card-border)', borderRadius: 6, fontFamily: 'Inter, sans-serif', fontSize: '0.78rem', fontWeight: 700, color: 'var(--tm-action)' }}>Ctrl + K</kbd> أو <kbd style={{ padding: '2px 8px', background: 'var(--tm-card-bg)', border: '1px solid var(--tm-card-border)', borderRadius: 6, fontFamily: 'Inter, sans-serif', fontSize: '0.78rem', fontWeight: 700, color: 'var(--tm-action)' }}>⌘ + K</kbd> من أي مكان للوصول السريع إلى البحث عن مريض.
                    </p>
                  </div>
                </div>
              </section>
            </>
          )}

          {/* ───────────────────────────────────────────────────
              PATIENT RECORD (when a patient is selected)
              ─────────────────────────────────────────────────── */}
          {activeSection === 'lookup' && selectedPatient && (
            <>
              {/* Patient bar */}
              <div className="dd-page-header">
                <div className="dd-page-title">
                  <button
                    type="button"
                    className="dd-btn dd-btn-icon dd-mobile-toggle"
                    onClick={() => setSidebarOpen(true)}
                    aria-label="فتح القائمة"
                  >
                    <Menu size={20} strokeWidth={2.2} />
                  </button>
                  <div className="dd-page-title-icon">
                    <User size={24} strokeWidth={2} />
                  </div>
                  <div>
                    <h1>الملف الطبي للمريض</h1>
                    <p>السجل الكامل والإجراءات السريرية</p>
                  </div>
                </div>
                <div className="dd-page-actions">
                  <button
                    type="button"
                    className="dd-btn dd-btn-secondary"
                    onClick={handleBackToLookup}
                  >
                    <ArrowRight size={18} strokeWidth={2.2} />
                    <span>بحث جديد</span>
                  </button>
                </div>
              </div>

              <div className="dd-patient-bar">
                <div className="dd-patient-bar-info">
                  <div className="dd-patient-bar-avatar">
                    {selectedPatient.childRegistrationNumber || selectedPatient.isChild
                      ? <Baby size={26} strokeWidth={2} />
                      : <User size={26} strokeWidth={2} />}
                  </div>
                  <div>
                    <h3 className="dd-patient-bar-name">
                      {selectedPatient.firstName}{' '}
                      {selectedPatient.fatherName && `${selectedPatient.fatherName} `}
                      {selectedPatient.lastName}
                    </h3>
                    <div className="dd-patient-bar-meta">
                      <span className="dd-patient-bar-id">
                        {selectedPatient.nationalId || selectedPatient.childRegistrationNumber || selectedPatient.childId}
                      </span>
                      {calculateAge(selectedPatient.dateOfBirth) !== null && (
                        <span className="dd-patient-bar-meta-item">
                          <Calendar size={12} strokeWidth={2.2} />
                          {calculateAge(selectedPatient.dateOfBirth)} سنة
                        </span>
                      )}
                      <span className="dd-patient-bar-meta-item">
                        {selectedPatient.gender === 'male' ? 'ذكر' : 'أنثى'}
                      </span>
                      {selectedPatient.governorate && (
                        <span className="dd-patient-bar-meta-item">
                          <MapPin size={12} strokeWidth={2.2} />
                          {selectedPatient.governorate}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="dd-tabs" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={patientTab === 'overview'}
                  className={`dd-tab ${patientTab === 'overview' ? 'active' : ''}`}
                  onClick={() => setPatientTab('overview')}
                >
                  <ClipboardList size={16} strokeWidth={2.2} />
                  <span>الملف الطبي</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={patientTab === 'history'}
                  className={`dd-tab ${patientTab === 'history' ? 'active' : ''}`}
                  onClick={() => setPatientTab('history')}
                >
                  <Clock size={16} strokeWidth={2.2} />
                  <span>سجل الزيارات</span>
                  {patientHistory.length > 0 && (
                    <span style={{ marginInlineStart: 4, fontSize: '0.7rem', opacity: 0.8 }}>
                      ({patientHistory.length})
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={patientTab === 'newVisit'}
                  className={`dd-tab ${patientTab === 'newVisit' ? 'active' : ''}`}
                  onClick={() => setPatientTab('newVisit')}
                >
                  <Plus size={16} strokeWidth={2.2} />
                  <span>زيارة جديدة</span>
                </button>
                {hasAITools && (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={patientTab === 'ai'}
                    className={`dd-tab ai-special ${patientTab === 'ai' ? 'active' : ''}`}
                    onClick={() => setPatientTab('ai')}
                  >
                    <Sparkles size={16} strokeWidth={2.2} />
                    <span>{isCardiologist ? 'تحليل ECG' : 'تحليل الأشعة'}</span>
                  </button>
                )}
              </div>

              {/* ═══ TAB: Overview ═══ */}
              {patientTab === 'overview' && (
                <>
                  {/* Patient profile */}
                  <section className="dd-patient-profile">
                    <div className="dd-patient-profile-avatar">
                      {selectedPatient.childRegistrationNumber || selectedPatient.isChild
                        ? <Baby size={48} strokeWidth={1.8} />
                        : <User size={48} strokeWidth={1.8} />}
                    </div>
                    <div className="dd-patient-profile-info">
                      <h2>
                        {selectedPatient.firstName}{' '}
                        {selectedPatient.fatherName && `${selectedPatient.fatherName} `}
                        {selectedPatient.lastName}
                      </h2>
                      <div className="dd-patient-profile-meta">
                        <span>
                          <strong>الرقم الوطني:</strong>
                          {selectedPatient.nationalId || selectedPatient.childRegistrationNumber || '-'}
                        </span>
                        {calculateAge(selectedPatient.dateOfBirth) !== null && (
                          <span>
                            <strong>العمر:</strong>
                            {calculateAge(selectedPatient.dateOfBirth)} سنة
                          </span>
                        )}
                        <span>
                          <strong>الجنس:</strong>
                          {selectedPatient.gender === 'male' ? 'ذكر' : 'أنثى'}
                        </span>
                        {selectedPatient.governorate && (
                          <span>
                            <strong>المحافظة:</strong>
                            {selectedPatient.governorate}
                          </span>
                        )}
                        {selectedPatient.city && (
                          <span>
                            <strong>المدينة:</strong>
                            {selectedPatient.city}
                          </span>
                        )}
                        {selectedPatient.phoneNumber && (
                          <span>
                            <strong>الهاتف:</strong>
                            <span dir="ltr" style={{ fontFamily: 'Inter, sans-serif' }}>{selectedPatient.phoneNumber}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </section>

                  {/* Medical info tiles */}
                  <section className="dd-info-grid">
                    <div className="dd-info-tile">
                      <div className="dd-info-tile-icon">
                        <Droplet size={18} strokeWidth={2} />
                      </div>
                      <span className="dd-info-tile-label">فصيلة الدم</span>
                      <span className="dd-info-tile-value">
                        {selectedPatient.bloodType || '-'}
                      </span>
                    </div>
                    <div className="dd-info-tile">
                      <div className="dd-info-tile-icon">
                        <Ruler size={18} strokeWidth={2} />
                      </div>
                      <span className="dd-info-tile-label">الطول</span>
                      <span className="dd-info-tile-value">
                        {selectedPatient.height ? `${selectedPatient.height} سم` : '-'}
                      </span>
                    </div>
                    <div className="dd-info-tile">
                      <div className="dd-info-tile-icon">
                        <Scale size={18} strokeWidth={2} />
                      </div>
                      <span className="dd-info-tile-label">الوزن</span>
                      <span className="dd-info-tile-value">
                        {selectedPatient.weight ? `${selectedPatient.weight} كغ` : '-'}
                      </span>
                    </div>
                    <div className="dd-info-tile">
                      <div className="dd-info-tile-icon">
                        <Cigarette size={18} strokeWidth={2} />
                      </div>
                      <span className="dd-info-tile-label">حالة التدخين</span>
                      <span className="dd-info-tile-value">
                        {selectedPatient.smokingStatus === 'non-smoker' ? 'غير مدخن'
                         : selectedPatient.smokingStatus === 'former_smoker' ? 'مدخن سابق'
                         : selectedPatient.smokingStatus === 'current_smoker' ? 'مدخن حالي'
                         : '-'}
                      </span>
                    </div>
                  </section>

                  {/* Medical alerts grid */}
                  <section className="dd-alert-grid">
                    {/* Allergies */}
                    <div className="dd-alert danger">
                      <div className="dd-alert-header">
                        <div className="dd-alert-icon">
                          <ShieldAlert size={18} strokeWidth={2.2} />
                        </div>
                        <h3 className="dd-alert-title">الحساسية</h3>
                        <span className="dd-alert-count">
                          {selectedPatient.allergies?.length || 0}
                        </span>
                      </div>
                      {selectedPatient.allergies?.length > 0 ? (
                        <ul className="dd-alert-list">
                          {selectedPatient.allergies.map((a, i) => (
                            <li key={i}>{a}</li>
                          ))}
                        </ul>
                      ) : (
                        <div className="dd-alert-empty">
                          <CheckCircle2 size={14} strokeWidth={2.5} />
                          <span>لا توجد حساسية مسجلة</span>
                        </div>
                      )}
                    </div>

                    {/* Chronic diseases */}
                    <div className="dd-alert warning">
                      <div className="dd-alert-header">
                        <div className="dd-alert-icon">
                          <Heart size={18} strokeWidth={2.2} />
                        </div>
                        <h3 className="dd-alert-title">الأمراض المزمنة</h3>
                        <span className="dd-alert-count">
                          {selectedPatient.chronicDiseases?.length || 0}
                        </span>
                      </div>
                      {selectedPatient.chronicDiseases?.length > 0 ? (
                        <ul className="dd-alert-list">
                          {selectedPatient.chronicDiseases.map((d, i) => (
                            <li key={i}>{d}</li>
                          ))}
                        </ul>
                      ) : (
                        <div className="dd-alert-empty">
                          <CheckCircle2 size={14} strokeWidth={2.5} />
                          <span>لا توجد أمراض مزمنة</span>
                        </div>
                      )}
                    </div>

                    {/* Family history */}
                    <div className="dd-alert info">
                      <div className="dd-alert-header">
                        <div className="dd-alert-icon">
                          <Users size={18} strokeWidth={2.2} />
                        </div>
                        <h3 className="dd-alert-title">التاريخ العائلي</h3>
                        <span className="dd-alert-count">
                          {selectedPatient.familyHistory?.length || 0}
                        </span>
                      </div>
                      {selectedPatient.familyHistory?.length > 0 ? (
                        <ul className="dd-alert-list">
                          {selectedPatient.familyHistory.map((f, i) => (
                            <li key={i}>{f}</li>
                          ))}
                        </ul>
                      ) : (
                        <div className="dd-alert-empty">
                          <CheckCircle2 size={14} strokeWidth={2.5} />
                          <span>لا يوجد تاريخ عائلي</span>
                        </div>
                      )}
                    </div>
                  </section>

                  {/* Emergency contact */}
                  {selectedPatient.emergencyContact && (
                    <section className="dd-emergency">
                      <div className="dd-emergency-header">
                        <div className="dd-emergency-icon">
                          <AlertTriangle size={20} strokeWidth={2.2} />
                        </div>
                        <h3>جهة اتصال الطوارئ</h3>
                      </div>
                      <div className="dd-emergency-grid">
                        <div className="dd-emergency-field">
                          <span className="dd-emergency-field-label">الاسم</span>
                          <span className="dd-emergency-field-value">
                            {selectedPatient.emergencyContact.name}
                          </span>
                        </div>
                        <div className="dd-emergency-field">
                          <span className="dd-emergency-field-label">صلة القرابة</span>
                          <span className="dd-emergency-field-value">
                            {selectedPatient.emergencyContact.relationship}
                          </span>
                        </div>
                        <div className="dd-emergency-field">
                          <span className="dd-emergency-field-label">الهاتف</span>
                          <span className="dd-emergency-field-value" dir="ltr" style={{ fontFamily: 'Inter, sans-serif' }}>
                            {selectedPatient.emergencyContact.phoneNumber}
                          </span>
                        </div>
                      </div>
                    </section>
                  )}
                </>
              )}

              {/* ═══ TAB: History ═══ */}
              {patientTab === 'history' && (
                <section className="dd-card">
                  <div className="dd-card-header">
                    <h3 className="dd-card-title">
                      <span className="dd-card-title-icon">
                        <Clock size={18} strokeWidth={2} />
                      </span>
                      سجل الزيارات الطبية
                    </h3>
                    <span style={{ fontSize: '0.78rem', color: 'var(--tm-text-muted)', fontFamily: 'Cairo, sans-serif' }}>
                      {patientHistory.length} زيارة
                    </span>
                  </div>

                  {patientHistory.length === 0 ? (
                    <div className="dd-empty">
                      <div className="dd-empty-icon">
                        <ClipboardList size={28} strokeWidth={1.8} />
                      </div>
                      <h3>لا توجد زيارات سابقة</h3>
                      <p>لم يتم تسجيل أي زيارات طبية لهذا المريض بعد</p>
                    </div>
                  ) : (
                    <div className="dd-visits-list">
                      {patientHistory.map((visit, idx) => {
                        const visitTypeMap = {
                          regular: 'عادية',
                          follow_up: 'متابعة',
                          emergency: 'طوارئ',
                          consultation: 'استشارة',
                        };
                        return (
                          <article key={visit._id || idx} className="dd-visit-card">
                            <div className="dd-visit-card-header">
                              <span className="dd-visit-date">
                                <Calendar size={12} strokeWidth={2.5} />
                                {formatArabicDateTime(visit.visitDate || visit.createdAt)}
                              </span>
                              <span className="dd-visit-doctor">
                                <Stethoscope size={12} strokeWidth={2.2} />
                                {visit.doctorName || 'طبيب'}
                                {visit.doctorSpecialization && (
                                  <span style={{ opacity: 0.7 }}> • {visit.doctorSpecialization}</span>
                                )}
                              </span>
                              {visit.visitType && (
                                <span className={`dd-visit-type-pill ${visit.visitType}`}>
                                  {visitTypeMap[visit.visitType] || visit.visitType}
                                </span>
                              )}
                            </div>

                            {visit.chiefComplaint && (
                              <div className="dd-visit-section">
                                <span className="dd-visit-label">الشكوى الرئيسية</span>
                                <p className="dd-visit-text">{visit.chiefComplaint}</p>
                              </div>
                            )}

                            {visit.diagnosis && (
                              <div className="dd-visit-section">
                                <span className="dd-visit-label">التشخيص</span>
                                <p className="dd-visit-text">{visit.diagnosis}</p>
                              </div>
                            )}

                            {visit.vitalSigns && Object.values(visit.vitalSigns).some((v) => v) && (
                              <div className="dd-visit-section">
                                <span className="dd-visit-label">العلامات الحيوية</span>
                                <div className="dd-visit-vitals-mini">
                                  {visit.vitalSigns.bloodPressureSystolic && visit.vitalSigns.bloodPressureDiastolic && (
                                    <span className="dd-visit-vital-chip">
                                      <HeartPulse size={12} strokeWidth={2.2} />
                                      {visit.vitalSigns.bloodPressureSystolic}/{visit.vitalSigns.bloodPressureDiastolic} mmHg
                                    </span>
                                  )}
                                  {visit.vitalSigns.heartRate && (
                                    <span className="dd-visit-vital-chip">
                                      <Heart size={12} strokeWidth={2.2} />
                                      {visit.vitalSigns.heartRate} BPM
                                    </span>
                                  )}
                                  {visit.vitalSigns.temperature && (
                                    <span className="dd-visit-vital-chip">
                                      <Thermometer size={12} strokeWidth={2.2} />
                                      {visit.vitalSigns.temperature}°C
                                    </span>
                                  )}
                                  {visit.vitalSigns.oxygenSaturation && (
                                    <span className="dd-visit-vital-chip">
                                      <Wind size={12} strokeWidth={2.2} />
                                      SpO₂ {visit.vitalSigns.oxygenSaturation}%
                                    </span>
                                  )}
                                  {visit.vitalSigns.bloodGlucose && (
                                    <span className="dd-visit-vital-chip">
                                      <Droplet size={12} strokeWidth={2.2} />
                                      {visit.vitalSigns.bloodGlucose} mg/dL
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}

                            {visit.prescribedMedications?.length > 0 && (
                              <div className="dd-visit-section">
                                <span className="dd-visit-label">الأدوية الموصوفة</span>
                                <div className="dd-visit-meds">
                                  {visit.prescribedMedications.map((med, i) => (
                                    <div key={i} className="dd-visit-med">
                                      <Pill size={16} strokeWidth={2.2} />
                                      <strong>{med.medicationName}</strong>
                                      <span>{med.dosage} • {med.frequency}</span>
                                      {med.duration && (
                                        <span className="dd-visit-med-dosage">{med.duration}</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {visit.labTests && visit.labTests.length > 0 && (
                              <div className="dd-visit-section">
                                <span className="dd-visit-label">التحاليل المختبرية ({visit.labTests.length})</span>
                                <div className="dd-visit-labs">
                                  {visit.labTests.map((lab) => (
                                    <div key={lab._id} className="dd-visit-lab-item">
                                      <div className="dd-visit-lab-icon">
                                        <FlaskConical size={18} />
                                      </div>
                                      <div className="dd-visit-lab-info">
                                        <div className="dd-visit-lab-header">
                                          <span className="dd-visit-lab-number">{lab.testNumber}</span>
                                          <span className={`dd-visit-lab-status ${lab.status}`}>
                                            {lab.status === 'completed' && 'مكتمل'}
                                            {lab.status === 'ordered' && 'معلّق'}
                                            {lab.status === 'scheduled' && 'مجدول'}
                                            {lab.status === 'sample_collected' && 'تم جمع العينة'}
                                            {lab.status === 'in_progress' && 'قيد المعالجة'}
                                            {lab.status === 'rejected' && 'مرفوض'}
                                            {lab.status === 'cancelled' && 'ملغى'}
                                          </span>
                                        </div>
                                        {lab.testsOrdered?.length > 0 && (
                                          <div className="dd-visit-lab-tests">
                                            {lab.testsOrdered.map((t, i) => (
                                              <span key={i} className="dd-visit-lab-test-chip">
                                                {t.testName}{t.testCode ? ` (${t.testCode})` : ''}
                                              </span>
                                            ))}
                                          </div>
                                        )}
                                        {lab.laboratoryId && (
                                          <div className="dd-visit-lab-lab">
                                            <Building2 size={12} />
                                            <span>{lab.laboratoryId.arabicName || lab.laboratoryId.name}</span>
                                          </div>
                                        )}
                                      </div>
                                      {lab.resultPdfUrl && (
                                        <a
                                          href={`http://localhost:5000${lab.resultPdfUrl}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="dd-visit-lab-pdf-btn"
                                          title="عرض تقرير النتائج"
                                        >
                                          <FileText size={16} />
                                          <span>عرض التقرير</span>
                                        </a>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {visit.doctorNotes && (
                              <div className="dd-visit-section">
                                <span className="dd-visit-label">ملاحظات الطبيب</span>
                                <p className="dd-visit-text">{visit.doctorNotes}</p>
                              </div>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  )}
                </section>
              )}

              {/* ═══ TAB: New Visit ═══ */}
              {patientTab === 'newVisit' && (
                <>
                  {/* Visit type selector */}
                  <section className="dd-form-section">
                    <div className="dd-form-section-header">
                      <div className="dd-form-section-icon">
                        <ClipboardList size={20} strokeWidth={2} />
                      </div>
                      <h3 className="dd-form-section-title">
                        نوع الزيارة <span className="dd-required">*</span>
                      </h3>
                    </div>
                    <div className="dd-visit-type-grid">
                      {VISIT_TYPES.map((type) => {
                        const TypeIcon = type.Icon;
                        return (
                          <button
                            key={type.value}
                            type="button"
                            className={`dd-visit-type-card ${visitType === type.value ? 'active' : ''} ${type.isEmergency ? 'emergency' : ''}`}
                            onClick={() => setVisitType(type.value)}
                          >
                            <div className="dd-visit-type-card-icon">
                              <TypeIcon size={20} strokeWidth={2} />
                            </div>
                            <span className="dd-visit-type-card-label">{type.labelAr}</span>
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  {/* Chief complaint */}
                  <section className="dd-form-section">
                    <div className="dd-form-section-header">
                      <div className="dd-form-section-icon">
                        <Edit3 size={20} strokeWidth={2} />
                      </div>
                      <h3 className="dd-form-section-title">
                        الشكوى الرئيسية <span className="dd-required">*</span>
                      </h3>
                    </div>
                    <textarea
                      className="dd-textarea"
                      value={chiefComplaint}
                      onChange={(e) => setChiefComplaint(e.target.value)}
                      placeholder="اكتب الشكوى الرئيسية للمريض كما ذكرها..."
                      rows={3}
                    />
                  </section>

                  {/* Vital signs grid */}
                  <section className="dd-form-section">
                    <div className="dd-form-section-header">
                      <div className="dd-form-section-icon">
                        <Activity size={20} strokeWidth={2} />
                      </div>
                      <h3 className="dd-form-section-title">العلامات الحيوية</h3>
                    </div>
                    <div className="dd-vitals-grid">
                      {VITAL_SIGNS_DEF.map((def) => {
                        if (def.isBP) {
                          return (
                            <VitalSign
                              key={def.key}
                              def={def}
                              value={vitalSigns.bloodPressureSystolic}
                              value2={vitalSigns.bloodPressureDiastolic}
                              onChange={(e) => handleVitalChange('bloodPressureSystolic', e.target.value)}
                              onChange2={(e) => handleVitalChange('bloodPressureDiastolic', e.target.value)}
                            />
                          );
                        }
                        return (
                          <VitalSign
                            key={def.key}
                            def={def}
                            value={vitalSigns[def.key]}
                            onChange={(e) => handleVitalChange(def.key, e.target.value)}
                          />
                        );
                      })}
                    </div>
                  </section>

                  {/* Diagnosis */}
                  <section className="dd-form-section">
                    <div className="dd-form-section-header">
                      <div className="dd-form-section-icon">
                        <Microscope size={20} strokeWidth={2} />
                      </div>
                      <h3 className="dd-form-section-title">التشخيص</h3>
                    </div>
                    <textarea
                      className="dd-textarea"
                      value={diagnosis}
                      onChange={(e) => setDiagnosis(e.target.value)}
                      placeholder="اكتب التشخيص السريري..."
                      rows={3}
                    />
                  </section>

                  {/* Medications */}
                  <section className="dd-form-section">
                    <div className="dd-form-section-header">
                      <div className="dd-form-section-icon">
                        <Pill size={20} strokeWidth={2} />
                      </div>
                      <h3 className="dd-form-section-title">الأدوية الموصوفة</h3>
                    </div>

                    <div className="dd-meds-builder">
                      <div className="dd-meds-form">
                        <input
                          type="text"
                          placeholder="اسم الدواء"
                          value={newMedication.medicationName}
                          onChange={(e) => setNewMedication({ ...newMedication, medicationName: e.target.value })}
                        />
                        <input
                          type="text"
                          placeholder="الجرعة"
                          value={newMedication.dosage}
                          onChange={(e) => setNewMedication({ ...newMedication, dosage: e.target.value })}
                        />
                        <input
                          type="text"
                          placeholder="التكرار"
                          value={newMedication.frequency}
                          onChange={(e) => setNewMedication({ ...newMedication, frequency: e.target.value })}
                        />
                        <input
                          type="text"
                          placeholder="المدة"
                          value={newMedication.duration}
                          onChange={(e) => setNewMedication({ ...newMedication, duration: e.target.value })}
                        />
                        <select
                          className="dd-meds-form-full"
                          value={newMedication.route}
                          onChange={(e) => setNewMedication({ ...newMedication, route: e.target.value })}
                        >
                          {MEDICATION_ROUTES.map((r) => (
                            <option key={r.value} value={r.value}>{r.labelAr}</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          className="dd-meds-form-full"
                          placeholder="تعليمات خاصة (اختياري)"
                          value={newMedication.instructions}
                          onChange={(e) => setNewMedication({ ...newMedication, instructions: e.target.value })}
                        />
                        <button
                          type="button"
                          className="dd-meds-add-btn"
                          onClick={handleAddMedication}
                        >
                          <Plus size={16} strokeWidth={2.5} />
                          <span>إضافة الدواء</span>
                        </button>
                      </div>

                      {medications.length > 0 && (
                        <div className="dd-meds-list">
                          {medications.map((med) => (
                            <div key={med.id} className="dd-med-item">
                              <div className="dd-med-icon-chip">
                                <Pill size={18} strokeWidth={2} />
                              </div>
                              <div className="dd-med-details">
                                <span className="dd-med-name">{med.medicationName}</span>
                                <span className="dd-med-meta">
                                  {med.dosage}{med.dosage && med.frequency && ' • '}
                                  {med.frequency}{med.frequency && med.duration && ' • '}
                                  {med.duration}
                                  {med.route && (
                                    <span style={{ marginInlineStart: 8, color: 'var(--tm-action)' }}>
                                      ({MEDICATION_ROUTES.find((r) => r.value === med.route)?.labelAr})
                                    </span>
                                  )}
                                </span>
                                {med.instructions && (
                                  <span className="dd-med-instructions">{med.instructions}</span>
                                )}
                              </div>
                              <button
                                type="button"
                                className="dd-med-remove"
                                onClick={() => handleRemoveMedication(med.id)}
                                aria-label="إزالة الدواء"
                              >
                                <X size={16} strokeWidth={2.5} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </section>

                  {/* ═══════════════════════════════════════════════
                       LAB TEST ORDER SECTION — طلب تحاليل مختبرية
                       ─────────────────────────────────────────────
                       UPDATED WORKFLOW: No lab selection dropdown.
                       Doctor just builds the list of tests; patient
                       chooses ANY lab and the tech looks them up by
                       national ID.
                      ═══════════════════════════════════════════════ */}
                  <section className="dd-form-section dd-lab-order-section">
                    <div className="dd-form-section-header">
                      <div className="dd-form-section-icon">
                        <FlaskConical size={20} strokeWidth={2} />
                      </div>
                      <h3 className="dd-form-section-title">طلب تحاليل مختبرية (اختياري)</h3>
                    </div>

                    {/* Info banner — replaces the old lab dropdown */}
                    <div
                      className="dd-lab-info-banner"
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 12,
                        padding: '14px 16px',
                        background: 'rgba(var(--tm-action-rgb), 0.08)',
                        border: '1px solid rgba(var(--tm-action-rgb), 0.22)',
                        borderRadius: 12,
                        marginBottom: 16,
                        fontFamily: 'Cairo, sans-serif'
                      }}
                    >
                      <div
                        style={{
                          flexShrink: 0,
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          background: 'var(--tm-action)',
                          color: '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <Info size={18} strokeWidth={2.2} />
                      </div>
                      <div style={{ flex: 1, lineHeight: 1.7 }}>
                        <h4
                          style={{
                            margin: 0,
                            marginBottom: 4,
                            fontSize: '0.95rem',
                            fontWeight: 700,
                            color: 'var(--tm-primary)'
                          }}
                        >
                          المريض حر باختيار المختبر
                        </h4>
                        <p
                          style={{
                            margin: 0,
                            fontSize: '0.825rem',
                            color: 'var(--tm-text-secondary)'
                          }}
                        >
                          يذهب المريض بالرقم الوطني لأي مختبر في سوريا ويجد طلب التحاليل جاهزاً عند فني المختبر.
                          لا حاجة لاختيار مختبر محدد.
                        </p>
                      </div>
                    </div>

                    {/* إضافة تحليل جديد */}
                    <div className="dd-field-row">
                      <div className="dd-field" style={{ flex: 2 }}>
                        <label className="dd-field-label">اسم التحليل</label>
                        <input
                          type="text"
                          className="dd-input"
                          value={newLabTest.testName}
                          onChange={(e) => setNewLabTest({ ...newLabTest, testName: e.target.value })}
                          placeholder="مثال: تعداد دم كامل (CBC)"
                        />
                      </div>
                      <div className="dd-field" style={{ flex: 3 }}>
                        <label className="dd-field-label">ملاحظات (اختياري)</label>
                        <input
                          type="text"
                          className="dd-input"
                          value={newLabTest.notes}
                          onChange={(e) => setNewLabTest({ ...newLabTest, notes: e.target.value })}
                          placeholder="مثال: على معدة فارغة"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      className="dd-add-med-btn"
                      onClick={() => {
                        if (!newLabTest.testName.trim()) {
                          openModal('error', 'حقل مطلوب', 'الرجاء إدخال اسم التحليل');
                          return;
                        }
                        setLabTests((prev) => [
                          ...prev,
                          { ...newLabTest, id: Date.now() }
                        ]);
                        setNewLabTest({ testName: '', notes: '' });
                      }}
                      disabled={!newLabTest.testName.trim()}
                    >
                      <Plus size={18} strokeWidth={2.2} />
                      <span>إضافة التحليل</span>
                    </button>

                    {/* قائمة التحاليل المضافة */}
                    {labTests.length > 0 && (
                      <div className="dd-lab-tests-list">
                        <div className="dd-lab-tests-header">
                          <TestTube size={16} strokeWidth={2.2} />
                          <span>التحاليل المضافة ({labTests.length})</span>
                        </div>
                        {labTests.map((test) => (
                          <div key={test.id} className="dd-lab-test-item">
                            <div className="dd-lab-test-info">
                              <strong className="dd-lab-test-name">
                                <FlaskConical size={14} strokeWidth={2.2} />
                                {test.testName}
                              </strong>
                              {test.notes && (
                                <span className="dd-lab-test-notes">{test.notes}</span>
                              )}
                            </div>
                            <button
                              type="button"
                              className="dd-lab-test-remove"
                              onClick={() => setLabTests((prev) => prev.filter((t) => t.id !== test.id))}
                              aria-label="إزالة التحليل"
                            >
                              <X size={16} strokeWidth={2.5} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  {/* Doctor notes */}
                  <section className="dd-form-section">
                    <div className="dd-form-section-header">
                      <div className="dd-form-section-icon">
                        <Edit3 size={20} strokeWidth={2} />
                      </div>
                      <h3 className="dd-form-section-title">ملاحظات وتوصيات الطبيب</h3>
                    </div>
                    <textarea
                      className="dd-textarea"
                      value={doctorNotes}
                      onChange={(e) => setDoctorNotes(e.target.value)}
                      placeholder="اكتب ملاحظاتك وتوصياتك للمريض..."
                      rows={4}
                    />
                  </section>

                  {/* Photo upload */}
                  <section className="dd-form-section">
                    <div className="dd-form-section-header">
                      <div className="dd-form-section-icon">
                        <Camera size={20} strokeWidth={2} />
                      </div>
                      <h3 className="dd-form-section-title">إرفاق صورة طبية (اختياري)</h3>
                    </div>

                    {!visitPhoto ? (
                      <div className="dd-file-upload">
                        <input
                          ref={photoInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          className="dd-file-input-hidden"
                          aria-label="رفع صورة"
                        />
                        <label className="dd-file-dropzone">
                          <div className="dd-file-dropzone-icon">
                            <Upload size={24} strokeWidth={2} />
                          </div>
                          <div className="dd-file-dropzone-text">
                            <h4 className="dd-file-dropzone-title">اضغط لرفع صورة</h4>
                            <p className="dd-file-dropzone-subtitle">أشعة، تحاليل، أو أي صورة طبية — حتى 10MB</p>
                          </div>
                        </label>
                      </div>
                    ) : (
                      <div className="dd-file-preview">
                        {visitPhotoPreview && (
                          <img
                            src={visitPhotoPreview}
                            alt="معاينة الصورة"
                            className="dd-file-preview-img"
                          />
                        )}
                        <div className="dd-file-preview-info">
                          <h4 className="dd-file-preview-name">{visitPhoto.name}</h4>
                          <span className="dd-file-preview-size">
                            {(visitPhoto.size / 1024 / 1024).toFixed(2)} MB
                          </span>
                        </div>
                        <button
                          type="button"
                          className="dd-file-remove-btn"
                          onClick={handleRemovePhoto}
                          aria-label="إزالة الصورة"
                        >
                          <X size={16} strokeWidth={2.5} />
                        </button>
                      </div>
                    )}
                  </section>

                  {/* Follow-up scheduling */}
                  <section className="dd-form-section">
                    <div className="dd-form-section-header">
                      <div className="dd-form-section-icon">
                        <Calendar size={20} strokeWidth={2} />
                      </div>
                      <h3 className="dd-form-section-title">جدولة المتابعة (اختياري)</h3>
                    </div>
                    <div className="dd-field-row">
                      <div className="dd-field">
                        <label className="dd-field-label">تاريخ المتابعة القادمة</label>
                        <input
                          type="date"
                          className="dd-input"
                          value={followUpDate}
                          onChange={(e) => setFollowUpDate(e.target.value)}
                          min={new Date().toISOString().split('T')[0]}
                        />
                      </div>
                      <div className="dd-field">
                        <label className="dd-field-label">ملاحظات المتابعة</label>
                        <input
                          type="text"
                          className="dd-input"
                          value={followUpNotes}
                          onChange={(e) => setFollowUpNotes(e.target.value)}
                          placeholder="مثال: مراجعة نتائج التحاليل"
                        />
                      </div>
                    </div>
                  </section>

                  {/* Save button */}
                  <div className="dd-save-section">
                    <button
                      type="button"
                      className="dd-save-btn"
                      onClick={handleSaveVisit}
                      disabled={saving || !chiefComplaint.trim()}
                    >
                      {saving ? (
                        <>
                          <Loader2 size={20} className="dd-spin" />
                          <span>جاري الحفظ...</span>
                        </>
                      ) : (
                        <>
                          <Save size={20} strokeWidth={2.2} />
                          <span>حفظ الزيارة</span>
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}

              {/* ═══ TAB: AI Tools (cardiologist or orthopedist) ═══ */}
              {patientTab === 'ai' && hasAITools && (
                <>
                  {isCardiologist && renderECGTool()}
                  {isOrthopedist && renderXRayTool()}
                </>
              )}
            </>
          )}

          {/* ───────────────────────────────────────────────────
              STANDALONE AI TOOLS SECTION (sidebar nav)
              ─────────────────────────────────────────────────── */}
          {activeSection === 'aiTools' && (
            <>
              <div className="dd-page-header">
                <div className="dd-page-title">
                  <button
                    type="button"
                    className="dd-btn dd-btn-icon dd-mobile-toggle"
                    onClick={() => setSidebarOpen(true)}
                    aria-label="فتح القائمة"
                  >
                    <Menu size={20} strokeWidth={2.2} />
                  </button>
                  <div className="dd-page-title-icon">
                    <Sparkles size={24} strokeWidth={2} />
                  </div>
                  <div>
                    <h1>{isCardiologist ? 'تحليل تخطيط القلب' : 'تحليل صور الأشعة'}</h1>
                    <p>
                      {isCardiologist
                        ? 'نظام ذكاء اصطناعي لتشخيص حالات القلب من تخطيط ECG'
                        : 'نظام ذكاء اصطناعي لكشف كسور العظام من صور الأشعة'}
                    </p>
                  </div>
                </div>
              </div>

              {isCardiologist && renderECGTool()}
              {isOrthopedist && renderXRayTool()}
            </>
          )}
        </main>
      </div>


      {/* ═══════════════════════════════════════════════════════════════
          AVAILABILITY SLOT CREATION MODAL
          ═══════════════════════════════════════════════════════════════ */}
      {showSlotModal && (
        <div className="dd-modal-overlay" onClick={() => setShowSlotModal(false)} role="dialog" aria-modal="true">
          <div className="dd-modal" onClick={(e) => e.stopPropagation()}>
            <div className="dd-modal-header">
              <div className="dd-modal-icon-wrapper">
                <div className="dd-modal-icon success">
                  <CalendarDays size={36} strokeWidth={2} />
                </div>
                <div className="dd-modal-icon-pulse success" />
              </div>
              <h2>إضافة موعد متاح</h2>
            </div>
            <div className="dd-modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="dd-field">
                  <label className="dd-field-label">التاريخ</label>
                  <input
                    type="date"
                    className="dd-input"
                    value={newSlot.date}
                    onChange={(e) => setNewSlot({ ...newSlot, date: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div className="dd-field-row">
                  <div className="dd-field">
                    <label className="dd-field-label">من الساعة</label>
                    <input
                      type="time"
                      className="dd-input"
                      value={newSlot.startTime}
                      onChange={(e) => setNewSlot({ ...newSlot, startTime: e.target.value })}
                    />
                  </div>
                  <div className="dd-field">
                    <label className="dd-field-label">إلى الساعة</label>
                    <input
                      type="time"
                      className="dd-input"
                      value={newSlot.endTime}
                      onChange={(e) => setNewSlot({ ...newSlot, endTime: e.target.value })}
                    />
                  </div>
                </div>
                <div className="dd-field-row">
                  <div className="dd-field">
                    <label className="dd-field-label">مدة الموعد (دقيقة)</label>
                    <input
                      type="number"
                      className="dd-input"
                      value={newSlot.slotDuration}
                      onChange={(e) => setNewSlot({ ...newSlot, slotDuration: parseInt(e.target.value, 10) || 30 })}
                      min="5"
                      max="180"
                    />
                  </div>
                  <div className="dd-field">
                    <label className="dd-field-label">عدد الحجوزات</label>
                    <input
                      type="number"
                      className="dd-input"
                      value={newSlot.maxBookings}
                      onChange={(e) => setNewSlot({ ...newSlot, maxBookings: parseInt(e.target.value, 10) || 1 })}
                      min="1"
                      max="10"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="dd-modal-footer">
              <button
                type="button"
                className="dd-btn dd-btn-secondary"
                onClick={() => setShowSlotModal(false)}
              >
                إلغاء
              </button>
              <button
                type="button"
                className="dd-btn dd-btn-primary"
                onClick={handleCreateSlot}
                disabled={!newSlot.date || !newSlot.startTime || !newSlot.endTime}
              >
                <Plus size={16} strokeWidth={2.2} />
                إضافة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          APPOINTMENT DETAILS MODAL
          ═══════════════════════════════════════════════════════════════ */}
      {showApptDetails && selectedAppointment && (
        <div
          className="dd-modal-overlay"
          onClick={closeApptDetails}
          role="dialog"
          aria-modal="true"
        >
          <div className="dd-modal" onClick={(e) => e.stopPropagation()}>
            <div className="dd-modal-header">
              <div className="dd-modal-icon-wrapper">
                <div className="dd-modal-icon success">
                  <User size={36} strokeWidth={2} />
                </div>
                <div className="dd-modal-icon-pulse success" />
              </div>
              <h2>تفاصيل الموعد</h2>
            </div>

            <div className="dd-modal-body">
              {(() => {
                const appt = selectedAppointment;
                const patient = appt.patientPersonId || appt.patientChildId || {};
                const fullName = [
                  patient.firstName,
                  patient.fatherName,
                  patient.lastName
                ].filter(Boolean).join(' ') || 'غير محدد';
                const idDisplay =
                  patient.nationalId
                  || patient.childRegistrationNumber
                  || 'غير محدد';
                const phone = patient.phoneNumber || 'غير محدد';

                const STATUS_LABELS = {
                  scheduled:   { label: 'مجدول',   cls: 'info'    },
                  confirmed:   { label: 'مؤكد',    cls: 'success' },
                  checked_in:  { label: 'وصل',     cls: 'success' },
                  in_progress: { label: 'جارٍ',    cls: 'warn'    },
                  completed:   { label: 'منتهٍ',   cls: 'muted'   },
                  cancelled:   { label: 'ملغى',    cls: 'danger'  },
                  no_show:     { label: 'لم يحضر', cls: 'danger'  },
                  rescheduled: { label: 'مُعاد',   cls: 'warn'    }
                };
                const statusMeta = STATUS_LABELS[appt.status] || { label: appt.status, cls: 'muted' };

                const dateStr = appt.appointmentDate
                  ? new Date(appt.appointmentDate).toLocaleDateString('ar-EG', {
                      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                    })
                  : 'غير محدد';

                const Row = ({ icon: Icon, label, value, dir = 'auto' }) => (
                  <div
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0',
                      borderBottom: '1px solid var(--tm-surface, #E0F2F1)'
                    }}
                  >
                    <Icon size={18} strokeWidth={2} style={{ color: 'var(--tm-action, #00897B)', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 2 }}>{label}</div>
                      <div dir={dir} style={{ fontSize: 14, fontWeight: 600, color: 'var(--tm-primary, #0D3B3E)' }}>
                        {value}
                      </div>
                    </div>
                  </div>
                );

                const canCancel = ['scheduled', 'confirmed', 'checked_in'].includes(appt.status);

                return (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <Row icon={User}        label="اسم المريض"     value={fullName} />
                    <Row icon={IdCard}      label="الرقم الوطني"    value={idDisplay} dir="ltr" />
                    <Row icon={Phone}       label="رقم الهاتف"     value={phone} dir="ltr" />
                    <Row icon={Calendar}    label="التاريخ"        value={dateStr} />
                    <Row icon={Clock}       label="الوقت"          value={appt.appointmentTime || 'غير محدد'} dir="ltr" />
                    <Row
                      icon={FileText}
                      label="سبب الزيارة"
                      value={appt.reasonForVisit || 'لم يُحدَّد'}
                    />
                    <div style={{ padding: '10px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Info size={18} strokeWidth={2} style={{ color: 'var(--tm-action, #00897B)' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>الحالة</div>
                        <span
                          style={{
                            display: 'inline-block', padding: '4px 12px', borderRadius: 999,
                            fontSize: 12, fontWeight: 700,
                            background:
                              statusMeta.cls === 'success' ? 'rgba(0,137,123,0.12)'
                              : statusMeta.cls === 'warn'  ? 'rgba(245,158,11,0.12)'
                              : statusMeta.cls === 'danger'? 'rgba(220,38,38,0.12)'
                              : statusMeta.cls === 'info'  ? 'rgba(13,59,62,0.08)'
                              : 'rgba(107,114,128,0.12)',
                            color:
                              statusMeta.cls === 'success' ? '#00897B'
                              : statusMeta.cls === 'warn'  ? '#b45309'
                              : statusMeta.cls === 'danger'? '#991b1b'
                              : statusMeta.cls === 'info'  ? '#0D3B3E'
                              : '#4b5563'
                          }}
                        >
                          {statusMeta.label}
                        </span>
                      </div>
                    </div>

                    {!canCancel && (
                      <div
                        style={{
                          marginTop: 12, padding: 10, borderRadius: 8,
                          background: 'rgba(107,114,128,0.08)', color: '#6b7280',
                          fontSize: 13
                        }}
                      >
                        لا يمكن إلغاء هذا الموعد لأنه في حالة "{statusMeta.label}".
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            <div className="dd-modal-footer">
              <button
                type="button"
                className="dd-btn dd-btn-secondary"
                onClick={closeApptDetails}
                disabled={cancelingAppt}
              >
                إغلاق
              </button>
              {['scheduled', 'confirmed', 'checked_in'].includes(selectedAppointment.status) && (
                <button
                  type="button"
                  className="dd-btn dd-btn-primary"
                  style={{ background: '#dc2626', borderColor: '#dc2626' }}
                  onClick={handleCancelAppt}
                  disabled={cancelingAppt}
                >
                  {cancelingAppt ? (
                    <>
                      <Loader2 size={16} className="dd-spin" />
                      جاري الإلغاء…
                    </>
                  ) : (
                    <>
                      <XCircle size={16} strokeWidth={2.2} />
                      إلغاء الموعد
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          AVAILABLE-SLOT DETAILS MODAL
          ═══════════════════════════════════════════════════════════════ */}
      {showSlotDetails && selectedSlotDetails && (
        <div
          className="dd-modal-overlay"
          onClick={closeSlotDetails}
          role="dialog"
          aria-modal="true"
        >
          <div className="dd-modal" onClick={(e) => e.stopPropagation()}>
            <div className="dd-modal-header">
              <div className="dd-modal-icon-wrapper">
                <div className="dd-modal-icon success">
                  <CalendarDays size={36} strokeWidth={2} />
                </div>
                <div className="dd-modal-icon-pulse success" />
              </div>
              <h2>تفاصيل الموعد المتاح</h2>
            </div>

            <div className="dd-modal-body">
              {(() => {
                const slot = selectedSlotDetails;
                const dateStr = slot.date
                  ? new Date(slot.date).toLocaleDateString('ar-EG', {
                      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                    })
                  : 'غير محدد';
                const isBlocked = slot.status === 'blocked';
                const hasBookings = typeof slot.currentBookings === 'number' && slot.currentBookings > 0;

                const Row = ({ icon: Icon, label, value, dir = 'auto' }) => (
                  <div
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0',
                      borderBottom: '1px solid var(--tm-surface, #E0F2F1)'
                    }}
                  >
                    <Icon size={18} strokeWidth={2} style={{ color: 'var(--tm-action, #00897B)', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 2 }}>{label}</div>
                      <div dir={dir} style={{ fontSize: 14, fontWeight: 600, color: 'var(--tm-primary, #0D3B3E)' }}>
                        {value}
                      </div>
                    </div>
                  </div>
                );

                return (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <Row icon={Calendar} label="التاريخ" value={dateStr} />
                    <Row
                      icon={Clock}
                      label="الوقت"
                      value={`${slot.startTime || '—'} — ${slot.endTime || '—'}`}
                      dir="ltr"
                    />
                    <Row
                      icon={Info}
                      label="مدة الموعد"
                      value={`${slot.slotDuration || 30} دقيقة`}
                    />
                    <Row
                      icon={Users}
                      label="الحجوزات"
                      value={`${slot.currentBookings || 0} / ${slot.maxBookings || 1}`}
                      dir="ltr"
                    />
                    <div style={{ padding: '10px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <ShieldCheck size={18} strokeWidth={2} style={{ color: 'var(--tm-action, #00897B)' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>الحالة</div>
                        <span
                          style={{
                            display: 'inline-block', padding: '4px 12px', borderRadius: 999,
                            fontSize: 12, fontWeight: 700,
                            background: isBlocked
                              ? 'rgba(107,114,128,0.12)'
                              : 'rgba(0,137,123,0.12)',
                            color: isBlocked ? '#4b5563' : '#00897B'
                          }}
                        >
                          {isBlocked ? 'محظور' : 'متاح للحجز'}
                        </span>
                      </div>
                    </div>

                    {hasBookings && (
                      <div
                        style={{
                          marginTop: 12, padding: 10, borderRadius: 8,
                          background: 'rgba(245,158,11,0.12)', color: '#b45309',
                          fontSize: 13, display: 'flex', alignItems: 'flex-start', gap: 8
                        }}
                      >
                        <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                        <span>
                          هذا الموعد مرتبط بحجز حالي. لحذفه، يرجى إلغاء الحجز أولاً.
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            <div className="dd-modal-footer">
              <button
                type="button"
                className="dd-btn dd-btn-secondary"
                onClick={closeSlotDetails}
                disabled={deletingSlot}
              >
                إغلاق
              </button>
              {!(typeof selectedSlotDetails.currentBookings === 'number' && selectedSlotDetails.currentBookings > 0) && (
                <button
                  type="button"
                  className="dd-btn dd-btn-primary"
                  style={{ background: '#dc2626', borderColor: '#dc2626' }}
                  onClick={handleDeleteSlot}
                  disabled={deletingSlot}
                >
                  {deletingSlot ? (
                    <>
                      <Loader2 size={16} className="dd-spin" />
                      جاري الحذف…
                    </>
                  ) : (
                    <>
                      <Trash2 size={16} strokeWidth={2.2} />
                      حذف الموعد
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  /* ═════════════════════════════════════════════════════════════════
     INNER RENDER HELPERS — defined inside the component for closure
     access to state and handlers
     ═════════════════════════════════════════════════════════════════ */

  /**
   * renderECGTool — cardiologist ECG analysis tool
   */
  function renderECGTool() {
    const condition = ecgResult ? mapPredictionToCondition(
      ecgResult.prediction || ecgResult.topPrediction || ecgResult.predictions?.[0]?.class
    ) : null;
    const ConditionIcon = condition?.Icon || Heart;

    const allPredictions = ecgResult?.all_predictions
                        || ecgResult?.predictions
                        || ecgResult?.top_predictions
                        || [];

    return (
      <>
        <section className="dd-ai-hero">
          <div className="dd-ai-hero-icon">
            <Heart size={42} strokeWidth={2} fill="currentColor" />
            <div className="dd-ai-hero-pulse" />
          </div>
          <div className="dd-ai-hero-text">
            <h2>تحليل تخطيط القلب</h2>
            <p>نظام ذكاء اصطناعي لتشخيص أربع حالات قلبية شائعة من صور أو ملفات ECG</p>
          </div>
          <span className="dd-ai-hero-badge">
            <Sparkles size={14} strokeWidth={2.5} />
            مدعوم بالذكاء الاصطناعي
          </span>
        </section>

        <section className="dd-ai-upload">
          {!ecgFile ? (
            <div className="dd-file-upload">
              <input
                ref={ecgFileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleEcgUpload}
                className="dd-file-input-hidden"
                aria-label="رفع ملف تخطيط القلب"
              />
              <label className="dd-ai-dropzone">
                <div className="dd-ai-dropzone-icon">
                  <Upload size={36} strokeWidth={2} />
                </div>
                <h4>اضغط لاختيار ملف تخطيط القلب</h4>
                <p>أو اسحب الملف هنا</p>
                <div className="dd-ai-dropzone-formats">
                  <span className="dd-ai-dropzone-format">PDF</span>
                  <span className="dd-ai-dropzone-format">PNG</span>
                  <span className="dd-ai-dropzone-format">JPG</span>
                </div>
              </label>
            </div>
          ) : (
            <div className="dd-ai-preview">
              {ecgPreview ? (
                <img src={ecgPreview} alt="معاينة ECG" className="dd-ai-preview-img" />
              ) : (
                <div className="dd-ai-preview-img" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--tm-card-bg)' }}>
                  <FileText size={40} strokeWidth={1.8} color="var(--tm-action)" />
                </div>
              )}
              <div className="dd-ai-preview-info">
                <h4 className="dd-ai-preview-name">{ecgFile.name}</h4>
                <span className="dd-ai-preview-size">
                  {(ecgFile.size / 1024 / 1024).toFixed(2)} MB
                </span>
              </div>
              <button
                type="button"
                className="dd-file-remove-btn"
                onClick={handleRemoveEcg}
                aria-label="إزالة الملف"
              >
                <X size={16} strokeWidth={2.5} />
              </button>
            </div>
          )}

          <button
            type="button"
            className="dd-ai-analyze-btn"
            onClick={handleAnalyzeEcg}
            disabled={!ecgFile || ecgAnalyzing}
          >
            {ecgAnalyzing ? (
              <>
                <Loader2 size={20} className="dd-spin" />
                <span>جاري التحليل بالذكاء الاصطناعي...</span>
              </>
            ) : (
              <>
                <Sparkles size={20} strokeWidth={2.2} />
                <span>تحليل بالذكاء الاصطناعي</span>
              </>
            )}
          </button>
        </section>

        {/* AI Result */}
        {ecgResult && condition && (
          <section className="dd-ai-result" ref={aiResultRef}>
            <div className={`dd-ai-result-header ${condition.severity}`}>
              <div className="dd-ai-result-icon">
                <ConditionIcon size={36} strokeWidth={2} />
              </div>
              <div>
                <div className="dd-ai-result-eyebrow">التشخيص الرئيسي</div>
                <h2 className="dd-ai-result-title">{condition.nameAr}</h2>
                <p className="dd-ai-result-subtitle">
                  {ecgResult.prediction || ecgResult.topPrediction || 'AI Analysis Result'}
                </p>
              </div>
              <ConfidenceRing
                percent={parseFloat(ecgResult.confidence_percentage || ecgResult.confidence || 0)}
              />
            </div>

            <div className="dd-ai-result-body">
              <div>
                <h3 className="dd-ai-section-title">
                  <ClipboardList size={18} strokeWidth={2} />
                  شرح التشخيص
                </h3>
                <p className="dd-ai-description">{condition.descAr}</p>
              </div>

              {allPredictions.length > 0 && (
                <div>
                  <h3 className="dd-ai-section-title">
                    <Activity size={18} strokeWidth={2} />
                    جميع الاحتمالات ({allPredictions.length})
                  </h3>
                  <div className="dd-ai-predictions">
                    {allPredictions.map((pred, idx) => {
                      const arabicName = pred.class_name_arabic || pred.nameAr || pred.class || pred.label;
                      const englishName = pred.class_name_short || pred.class || pred.label;
                      const percentage = pred.percentage || `${((pred.probability || pred.confidence || 0) * 100).toFixed(1)}%`;
                      const probability = pred.probability || (pred.confidence || 0) / 100;
                      const confLevel = probability > 0.7 ? 'high' : probability > 0.4 ? 'medium' : 'low';
                      const confLabel = confLevel === 'high' ? 'عالية' : confLevel === 'medium' ? 'متوسطة' : 'منخفضة';
                      return (
                        <div key={idx} className={`dd-ai-pred ${idx === 0 ? 'primary' : ''}`}>
                          <span className="dd-ai-pred-rank">{idx + 1}</span>
                          <h4 className="dd-ai-pred-name-ar">{arabicName}</h4>
                          <span className="dd-ai-pred-name-en">{englishName}</span>
                          <div className="dd-ai-pred-bar-track">
                            <div
                              className="dd-ai-pred-bar-fill"
                              style={{ width: percentage }}
                            />
                          </div>
                          <div className="dd-ai-pred-stats">
                            <span className="dd-ai-pred-pct">{percentage}</span>
                            <span className={`dd-ai-pred-conf-badge ${confLevel}`}>
                              {confLabel}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <h3 className="dd-ai-section-title">
                  <Sparkles size={18} strokeWidth={2} />
                  التوصيات الطبية
                </h3>
                <div className="dd-ai-recs">
                  {condition.recommendations.map((rec, i) => (
                    <div key={i} className="dd-ai-rec">
                      <span className="dd-ai-rec-num">{i + 1}</span>
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="dd-ai-disclaimer">
                <AlertTriangle size={18} strokeWidth={2.2} />
                <span>
                  <strong>ملاحظة:</strong> هذه النتائج استرشادية من الذكاء الاصطناعي
                  ولا تغني عن التقييم السريري الشامل والخبرة الطبية المباشرة.
                </span>
              </div>
            </div>
          </section>
        )}
      </>
    );
  }

  /**
   * renderXRayTool — orthopedist X-Ray fracture detection tool
   */
  function renderXRayTool() {
    const fractureDetected = xrayResult?.fractureDetected || xrayResult?.fracture_detected;
    const confidence = parseFloat(
      xrayResult?.confidence_percentage
      || xrayResult?.confidence
      || (xrayResult?.confidence ? xrayResult.confidence * 100 : 0)
      || 0
    );
    const severity = fractureDetected ? 'critical' : 'normal';

    return (
      <>
        <section className="dd-ai-hero">
          <div className="dd-ai-hero-icon">
            <Bone size={42} strokeWidth={2} />
            <div className="dd-ai-hero-pulse" />
          </div>
          <div className="dd-ai-hero-text">
            <h2>تحليل صور الأشعة السينية</h2>
            <p>كشف كسور العظام في اليد والقدم باستخدام الذكاء الاصطناعي</p>
          </div>
          <span className="dd-ai-hero-badge">
            <Sparkles size={14} strokeWidth={2.5} />
            نموذجين متخصصين
          </span>
        </section>

        {/* Step 1: Model picker */}
        <section className="dd-ai-upload">
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--tm-primary)', margin: '0 0 14px', fontFamily: 'Cairo, sans-serif' }}>
            الخطوة 1: اختر نوع التحليل
          </h3>
          <div className="dd-xray-model-picker">
            {XRAY_MODELS.map((model) => {
              const ModelIcon = model.Icon;
              return (
                <button
                  key={model.id}
                  type="button"
                  className={`dd-xray-model-card ${xrayModel === model.id ? 'selected' : ''}`}
                  onClick={() => handleXrayModelSelect(model.id)}
                >
                  <div className="dd-xray-model-check">
                    <Check size={14} strokeWidth={3} />
                  </div>
                  <div className="dd-xray-model-icon">
                    <ModelIcon size={36} strokeWidth={1.8} />
                  </div>
                  <h4 className="dd-xray-model-name">{model.labelAr}</h4>
                  <p className="dd-xray-model-desc">{model.descAr}</p>
                </button>
              );
            })}
          </div>

          {/* Step 2: Upload — only enabled after model is picked */}
          {xrayModel && (
            <>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--tm-primary)', margin: '24px 0 14px', fontFamily: 'Cairo, sans-serif' }}>
                الخطوة 2: ارفع صورة الأشعة
              </h3>
              {!xrayFile ? (
                <div className="dd-file-upload">
                  <input
                    ref={xrayFileInputRef}
                    type="file"
                    accept=".png,.jpg,.jpeg"
                    onChange={handleXrayUpload}
                    className="dd-file-input-hidden"
                    aria-label="رفع صورة أشعة"
                  />
                  <label className="dd-ai-dropzone">
                    <div className="dd-ai-dropzone-icon">
                      <ScanLine size={36} strokeWidth={2} />
                    </div>
                    <h4>اضغط لاختيار صورة الأشعة</h4>
                    <p>صورة واضحة عالية الدقة لأفضل دقة في التشخيص</p>
                    <div className="dd-ai-dropzone-formats">
                      <span className="dd-ai-dropzone-format">PNG</span>
                      <span className="dd-ai-dropzone-format">JPG</span>
                    </div>
                  </label>
                </div>
              ) : (
                <div className="dd-ai-preview">
                  {xrayPreview && (
                    <img src={xrayPreview} alt="معاينة الأشعة" className="dd-ai-preview-img" />
                  )}
                  <div className="dd-ai-preview-info">
                    <h4 className="dd-ai-preview-name">{xrayFile.name}</h4>
                    <span className="dd-ai-preview-size">
                      {(xrayFile.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                  <button
                    type="button"
                    className="dd-file-remove-btn"
                    onClick={handleRemoveXray}
                    aria-label="إزالة الصورة"
                  >
                    <X size={16} strokeWidth={2.5} />
                  </button>
                </div>
              )}

              <button
                type="button"
                className="dd-ai-analyze-btn"
                onClick={handleAnalyzeXray}
                disabled={!xrayFile || xrayAnalyzing}
              >
                {xrayAnalyzing ? (
                  <>
                    <Loader2 size={20} className="dd-spin" />
                    <span>جاري التحليل...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={20} strokeWidth={2.2} />
                    <span>تحليل الصورة بالذكاء الاصطناعي</span>
                  </>
                )}
              </button>
            </>
          )}
        </section>

        {/* X-Ray Result */}
        {xrayResult && (
          <section className="dd-ai-result" ref={aiResultRef}>
            <div className={`dd-ai-result-header ${severity}`}>
              <div className="dd-ai-result-icon">
                {fractureDetected
                  ? <AlertTriangle size={36} strokeWidth={2} />
                  : <CheckCircle2 size={36} strokeWidth={2} />}
              </div>
              <div>
                <div className="dd-ai-result-eyebrow">نتيجة التحليل</div>
                <h2 className="dd-ai-result-title">
                  {fractureDetected ? 'تم اكتشاف كسر' : 'لم يتم اكتشاف كسر'}
                </h2>
                <p className="dd-ai-result-subtitle">
                  {xrayModel === 'hand' ? 'تحليل عظام اليد' : 'تحليل عظام القدم'}
                </p>
              </div>
              <ConfidenceRing percent={confidence} />
            </div>

            <div className="dd-ai-result-body">
              <div className="dd-xray-result-summary">
                <div className="dd-xray-stat">
                  <div className={`dd-xray-stat-icon ${fractureDetected ? 'fracture' : 'normal'}`}>
                    {fractureDetected
                      ? <AlertTriangle size={20} strokeWidth={2.2} />
                      : <CheckCircle2 size={20} strokeWidth={2.2} />}
                  </div>
                  <div>
                    <span className="dd-xray-stat-label">الحالة</span>
                    <div className="dd-xray-stat-value">
                      {fractureDetected ? 'كسر مكتشف' : 'سليم'}
                    </div>
                  </div>
                </div>
                <div className="dd-xray-stat">
                  <div className="dd-xray-stat-icon">
                    <Activity size={20} strokeWidth={2.2} />
                  </div>
                  <div>
                    <span className="dd-xray-stat-label">دقة التشخيص</span>
                    <div className="dd-xray-stat-value">{confidence.toFixed(1)}%</div>
                  </div>
                </div>
              </div>

              {xrayResult.region && (
                <div>
                  <h3 className="dd-ai-section-title">
                    <MapPin size={18} strokeWidth={2} />
                    المنطقة المتأثرة
                  </h3>
                  <p className="dd-ai-description">{xrayResult.region}</p>
                </div>
              )}

              {xrayResult.severity && (
                <div>
                  <h3 className="dd-ai-section-title">
                    <AlertCircle size={18} strokeWidth={2} />
                    شدة الإصابة
                  </h3>
                  <p className="dd-ai-description">{xrayResult.severity}</p>
                </div>
              )}

              {(xrayResult.recommendations || []).length > 0 && (
                <div>
                  <h3 className="dd-ai-section-title">
                    <Sparkles size={18} strokeWidth={2} />
                    التوصيات الطبية
                  </h3>
                  <div className="dd-ai-recs">
                    {xrayResult.recommendations.map((rec, i) => (
                      <div key={i} className="dd-ai-rec">
                        <span className="dd-ai-rec-num">{i + 1}</span>
                        <span>{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Default recommendations if backend doesn't provide them */}
              {(!xrayResult.recommendations || xrayResult.recommendations.length === 0) && (
                <div>
                  <h3 className="dd-ai-section-title">
                    <Sparkles size={18} strokeWidth={2} />
                    التوصيات الطبية
                  </h3>
                  <div className="dd-ai-recs">
                    {fractureDetected ? (
                      <>
                        <div className="dd-ai-rec">
                          <span className="dd-ai-rec-num">1</span>
                          <span>تثبيت المنطقة المصابة فوراً وتجنب الحركة</span>
                        </div>
                        <div className="dd-ai-rec">
                          <span className="dd-ai-rec-num">2</span>
                          <span>إجراء تقييم سريري شامل من طبيب العظام</span>
                        </div>
                        <div className="dd-ai-rec">
                          <span className="dd-ai-rec-num">3</span>
                          <span>قد تحتاج إلى صور أشعة إضافية أو CT scan للتأكيد</span>
                        </div>
                        <div className="dd-ai-rec">
                          <span className="dd-ai-rec-num">4</span>
                          <span>تقييم الحاجة إلى الجبيرة أو التدخل الجراحي</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="dd-ai-rec">
                          <span className="dd-ai-rec-num">1</span>
                          <span>التقييم السريري ضروري لاستبعاد إصابات الأنسجة الرخوة</span>
                        </div>
                        <div className="dd-ai-rec">
                          <span className="dd-ai-rec-num">2</span>
                          <span>متابعة الأعراض لمدة أسبوع</span>
                        </div>
                        <div className="dd-ai-rec">
                          <span className="dd-ai-rec-num">3</span>
                          <span>إعادة التقييم في حال استمرار الألم أو ظهور أعراض جديدة</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              <div className="dd-ai-disclaimer">
                <AlertTriangle size={18} strokeWidth={2.2} />
                <span>
                  <strong>ملاحظة:</strong> هذه النتائج استرشادية من الذكاء الاصطناعي
                  ولا تغني عن التقييم السريري الشامل والخبرة الطبية المباشرة.
                  يُنصح دائماً بالتأكد من التشخيص قبل اتخاذ القرارات الطبية.
                </span>
              </div>
            </div>
          </section>
        )}
      </>
    );
  }
};

export default DoctorDashboard;
