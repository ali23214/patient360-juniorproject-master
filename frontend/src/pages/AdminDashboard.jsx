/**
 * ═══════════════════════════════════════════════════════════════════════
 *  Patient 360° — Admin Dashboard
 *  ─────────────────────────────────────────────────────────────────────
 *  Stack       : React 18 + React Router v6 + Lucide React
 *  Design      : Teal Medica (Light + Dark via [data-theme])
 *  Direction   : RTL (Arabic primary)
 *  Backend     : adminAPI from src/services/api.js
 *  DB enums    : All values match patient360_db_final.js
 *
 *  Architecture:
 *  - Persistent left sidebar with 11 sections grouped by domain
 *  - Government-grade home dashboard with KPIs, system health, charts
 *  - Doctor request review workflow (accept with credentials / reject with reason)
 *  - User management (doctors / patients / children with migration tracking)
 *  - Facility management (hospitals / pharmacies / labs) with add+edit modals
 *  - System monitoring (emergency reports / reviews moderation / audit log)
 *  - Notifications slide-in panel
 *  - Cmd/Ctrl+K quick search
 *
 *  DB collections this dashboard reads/writes:
 *    accounts, persons, children, patients, doctors, doctor_requests,
 *    hospitals, pharmacies, laboratories, audit_logs, notifications,
 *    reviews, emergency_reports
 * ═══════════════════════════════════════════════════════════════════════
 */

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  // Layout & navigation
  Home,
  ClipboardList,
  Stethoscope,
  Users,
  Baby,
  Hospital,
  Pill,
  Microscope,
  Siren,
  Star,
  Scroll,
  Settings,
  Bell,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
  Search,
  Filter,

  // User / identity
  User,
  UserPlus,
  UserCheck,
  UserX,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Award,
  Briefcase,
  IdCard,

  // Medical / clinical
  Heart,
  HeartPulse,
  Activity,
  Brain,
  Bone,
  Eye,
  Ear,
  Syringe,
  TestTube,
  FlaskConical,
  Droplet,
  Wind,
  Sparkles,

  // Files & uploads
  FileText,
  File,
  FileCheck,
  Upload,
  Download,
  Paperclip,

  // Status / feedback
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  XCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Loader2,
  Database,
  Server,
  Wifi,
  HardDrive,
  Zap,

  // Actions
  Save,
  Edit3,
  Trash2,
  Copy,
  RotateCcw,
  ArrowRight,
  ArrowLeft,
  Check,
  Ban,

  // Map / location
  MapPin,
  Phone,
  Mail,
  Calendar,
  Building2,
  Globe,

  // Charts
  BarChart3,
  PieChart,

  // Misc
  MoreHorizontal,
  ExternalLink,
} from 'lucide-react';

import Navbar from '../components/common/Navbar';
import { authAPI, adminAPI } from '../services/api';
import { useTheme } from '../context/ThemeProvider';
import '../styles/AdminDashboard.css';


/* ═══════════════════════════════════════════════════════════════════════
   CONSTANTS — module-scoped, stable references
   ═══════════════════════════════════════════════════════════════════════ */

/**
 * Sidebar navigation grouped into 6 sections.
 * Each item has an id (matches activeSection state), Arabic label,
 * Lucide icon component, and optional badge field name.
 */
const SIDEBAR_GROUPS = [
  {
    label: 'نظرة عامة',
    items: [
      { id: 'home', labelAr: 'الرئيسية', Icon: Home },
    ],
  },
  {
    label: 'المراجعة والموافقات',
    items: [
      { id: 'requests', labelAr: 'طلبات التسجيل', Icon: ClipboardList, badge: 'pendingRequests' },
    ],
  },
  {
    label: 'إدارة المستخدمين',
    items: [
      { id: 'doctors',  labelAr: 'الأطباء',  Icon: Stethoscope },
      { id: 'patients', labelAr: 'المرضى',   Icon: Users },
      { id: 'children', labelAr: 'الأطفال',  Icon: Baby },
    ],
  },
  {
    label: 'إدارة المرافق',
    items: [
      { id: 'hospitals',    labelAr: 'المستشفيات', Icon: Hospital },
      { id: 'pharmacies',   labelAr: 'الصيدليات',  Icon: Pill },
      { id: 'laboratories', labelAr: 'المختبرات',  Icon: Microscope },
    ],
  },
  {
    label: 'المراقبة',
    items: [
      { id: 'emergency', labelAr: 'تقارير الطوارئ', Icon: Siren, badge: 'activeEmergencies' },
      { id: 'reviews',   labelAr: 'التقييمات',       Icon: Star },
      { id: 'audit',     labelAr: 'سجل النظام',     Icon: Scroll },
    ],
  },
];

/**
 * Syrian Governorates — 14 governorates matching DB enum
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

/**
 * Medical Specializations — 24 specializations matching DB enum.
 * Icons map separately to avoid putting React components inside data arrays.
 */
const MEDICAL_SPECIALIZATIONS = [
  { id: 'cardiology',          nameAr: 'طب القلب',              hasAI: true },
  { id: 'orthopedics',         nameAr: 'جراحة العظام',          hasAI: true },
  { id: 'general_practice',    nameAr: 'طب عام',                hasAI: false },
  { id: 'pulmonology',         nameAr: 'طب الرئة',              hasAI: false },
  { id: 'rheumatology',        nameAr: 'طب الروماتيزم',         hasAI: false },
  { id: 'neurology',           nameAr: 'طب الأعصاب',            hasAI: false },
  { id: 'endocrinology',       nameAr: 'طب الغدد الصماء',       hasAI: false },
  { id: 'dermatology',         nameAr: 'طب الجلدية',            hasAI: false },
  { id: 'gastroenterology',    nameAr: 'طب الجهاز الهضمي',      hasAI: false },
  { id: 'surgery',             nameAr: 'الجراحة العامة',        hasAI: false },
  { id: 'urology',             nameAr: 'طب المسالك البولية',    hasAI: false },
  { id: 'gynecology',          nameAr: 'طب النساء والتوليد',    hasAI: false },
  { id: 'psychiatry',          nameAr: 'الطب النفسي',           hasAI: false },
  { id: 'hematology',          nameAr: 'طب الدم',               hasAI: false },
  { id: 'oncology',            nameAr: 'طب الأورام',            hasAI: false },
  { id: 'otolaryngology',      nameAr: 'أنف أذن حنجرة',         hasAI: false },
  { id: 'ophthalmology',       nameAr: 'طب العيون',             hasAI: false },
  { id: 'pediatrics',          nameAr: 'طب الأطفال',            hasAI: false },
  { id: 'nephrology',          nameAr: 'طب الكلى',              hasAI: false },
  { id: 'internal_medicine',   nameAr: 'الطب الباطني',          hasAI: false },
  { id: 'emergency_medicine',  nameAr: 'طب الطوارئ',            hasAI: false },
  { id: 'vascular_surgery',    nameAr: 'جراحة الأوعية',         hasAI: false },
  { id: 'anesthesiology',      nameAr: 'طب التخدير',            hasAI: false },
  { id: 'radiology',           nameAr: 'الأشعة التشخيصية',      hasAI: false },
];

/**
 * Specialization → Lucide icon mapping
 */
const SPEC_ICON_MAP = {
  cardiology:         Heart,
  orthopedics:        Bone,
  general_practice:   Stethoscope,
  pulmonology:        Wind,
  rheumatology:       Bone,
  neurology:          Brain,
  endocrinology:      Sparkles,
  dermatology:        Sparkles,
  gastroenterology:   Activity,
  surgery:            Activity,
  urology:            Droplet,
  gynecology:         Heart,
  psychiatry:         Brain,
  hematology:         Droplet,
  oncology:           ShieldAlert,
  otolaryngology:     Ear,
  ophthalmology:      Eye,
  pediatrics:         Baby,
  nephrology:         Droplet,
  internal_medicine:  Stethoscope,
  emergency_medicine: Siren,
  vascular_surgery:   HeartPulse,
  anesthesiology:     Syringe,
  radiology:          Activity,
};

/**
 * Get specialization info with Lucide icon component
 */
const getSpecializationInfo = (specId) => {
  const spec = MEDICAL_SPECIALIZATIONS.find((s) => s.id === specId);
  return {
    id: specId,
    nameAr: spec?.nameAr || specId,
    hasAI: spec?.hasAI || false,
    Icon: SPEC_ICON_MAP[specId] || Stethoscope,
  };
};

/**
 * Available days — matching DB enum
 */
const WEEKDAYS = [
  { id: 'Saturday',  nameAr: 'السبت' },
  { id: 'Sunday',    nameAr: 'الأحد' },
  { id: 'Monday',    nameAr: 'الإثنين' },
  { id: 'Tuesday',   nameAr: 'الثلاثاء' },
  { id: 'Wednesday', nameAr: 'الأربعاء' },
  { id: 'Thursday',  nameAr: 'الخميس' },
  { id: 'Friday',    nameAr: 'الجمعة' },
];

/**
 * Deactivation reasons — matches accounts.deactivationReason enum
 */
const DEACTIVATION_REASONS = [
  { id: 'voluntary',      nameAr: 'طلب المستخدم' },
  { id: 'administrative', nameAr: 'قرار إداري' },
  { id: 'security',       nameAr: 'أسباب أمنية' },
  { id: 'retirement',     nameAr: 'تقاعد' },
  { id: 'deceased',       nameAr: 'وفاة' },
  { id: 'duplicate',      nameAr: 'حساب مكرر' },
  { id: 'fraud',          nameAr: 'احتيال' },
];

/**
 * Doctor request rejection reasons — matches doctor_requests.rejectionReason enum
 */
const REJECTION_REASONS = [
  { id: 'invalid_license', nameAr: 'رقم ترخيص غير صالح' },
  { id: 'fake_documents',  nameAr: 'وثائق مزورة' },
  { id: 'incomplete_info', nameAr: 'معلومات غير مكتملة' },
  { id: 'duplicate',       nameAr: 'طلب مكرر' },
  { id: 'license_expired', nameAr: 'ترخيص منتهي الصلاحية' },
  { id: 'other',           nameAr: 'سبب آخر' },
];

/**
 * Hospital types — matches hospitals.hospitalType enum
 */
const HOSPITAL_TYPES = [
  { id: 'government',  nameAr: 'حكومي' },
  { id: 'private',     nameAr: 'خاص' },
  { id: 'military',    nameAr: 'عسكري' },
  { id: 'university',  nameAr: 'جامعي' },
  { id: 'specialized', nameAr: 'متخصص' },
];

/**
 * Pharmacy types — matches pharmacies.pharmacyType enum
 */
const PHARMACY_TYPES = [
  { id: 'community', nameAr: 'صيدلية حي' },
  { id: 'hospital',  nameAr: 'صيدلية مستشفى' },
  { id: 'clinic',    nameAr: 'صيدلية عيادة' },
  { id: 'online',    nameAr: 'صيدلية إلكترونية' },
];

/**
 * Laboratory types — matches laboratories.labType enum
 */
const LAB_TYPES = [
  { id: 'independent',    nameAr: 'مستقل' },
  { id: 'hospital_based', nameAr: 'مرتبط بمستشفى' },
  { id: 'clinic_based',   nameAr: 'مرتبط بعيادة' },
  { id: 'specialized',    nameAr: 'متخصص' },
];

/**
 * Emergency report risk levels — matches emergency_reports.aiRiskLevel enum
 */
const RISK_LEVELS = [
  { id: 'low',      nameAr: 'منخفض' },
  { id: 'moderate', nameAr: 'متوسط' },
  { id: 'high',     nameAr: 'مرتفع' },
  { id: 'critical', nameAr: 'حرج' },
];

/**
 * Review statuses — matches reviews.status enum
 */
const REVIEW_STATUSES = [
  { id: 'pending',  nameAr: 'بانتظار المراجعة' },
  { id: 'approved', nameAr: 'تمت الموافقة' },
  { id: 'rejected', nameAr: 'مرفوض' },
  { id: 'flagged',  nameAr: 'مُبلَّغ عنه' },
];

/**
 * Children migration statuses — matches children.migrationStatus enum
 */
const MIGRATION_STATUSES = [
  { id: 'pending',  nameAr: 'بانتظار الترحيل' },
  { id: 'ready',    nameAr: 'جاهز للترحيل' },
  { id: 'migrated', nameAr: 'تم الترحيل' },
];


/* ═══════════════════════════════════════════════════════════════════════
   PURE HELPERS
   ═══════════════════════════════════════════════════════════════════════ */

/**
 * Arabic to English transliteration for email generation
 */
const transliterateArabic = (text) => {
  const map = {
    'ا': 'a', 'أ': 'a', 'إ': 'e', 'آ': 'a', 'ب': 'b', 'ت': 't', 'ث': 'th',
    'ج': 'j', 'ح': 'h', 'خ': 'kh', 'د': 'd', 'ذ': 'th', 'ر': 'r', 'ز': 'z',
    'س': 's', 'ش': 'sh', 'ص': 's', 'ض': 'd', 'ط': 't', 'ظ': 'z', 'ع': 'a',
    'غ': 'gh', 'ف': 'f', 'ق': 'q', 'ك': 'k', 'ل': 'l', 'م': 'm', 'ن': 'n',
    'ه': 'h', 'و': 'w', 'ي': 'y', 'ى': 'a', 'ة': 'a', 'ء': '', 'ئ': 'y', 'ؤ': 'w',
  };
  return text.split('').map((c) => map[c] || c).join('').replace(/[^a-z]/gi, '').toLowerCase() || 'user';
};

/**
 * Generate doctor email: firstname.lastname.LICENSE@patient360.gov.sy
 */
const generateDoctorEmail = (firstName, lastName, licenseNumber) => {
  let firstEn = firstName.toLowerCase().replace(/[^a-z]/g, '');
  let lastEn = lastName.toLowerCase().replace(/[^a-z]/g, '');
  if (!firstEn) firstEn = transliterateArabic(firstName);
  if (!lastEn) lastEn = transliterateArabic(lastName);
  return `${firstEn}.${lastEn}.${licenseNumber.toUpperCase()}@patient360.gov.sy`;
};

/**
 * Generate secure 12-character password
 */
const generatePassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

/**
 * Format date in Arabic locale (long form)
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
 * Get a time-aware Arabic greeting
 */
const getTimeGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'صباح الخير';
  if (h < 17) return 'مساء الخير';
  return 'مساء النور';
};

/**
 * Get governorate Arabic name from id
 */
const getGovernorateName = (govId) => {
  const g = SYRIAN_GOVERNORATES.find((g) => g.id === govId);
  return g ? g.nameAr : govId || '-';
};

/**
 * Format number for display (with thousands separator)
 */
const formatNumber = (n) => {
  if (n === null || n === undefined) return '0';
  return Number(n).toLocaleString('en-US');
};

/**
 * Calculate "time ago" in Arabic
 */
const timeAgo = (date) => {
  if (!date) return '-';
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  if (seconds < 60)    return 'منذ لحظات';
  if (seconds < 3600)  return `منذ ${Math.floor(seconds / 60)} دقيقة`;
  if (seconds < 86400) return `منذ ${Math.floor(seconds / 3600)} ساعة`;
  if (seconds < 2592000) return `منذ ${Math.floor(seconds / 86400)} يوم`;
  return formatArabicDate(date);
};


/* ═══════════════════════════════════════════════════════════════════════
   REUSABLE PRESENTATIONAL COMPONENTS
   ═══════════════════════════════════════════════════════════════════════ */

/**
 * Modal — same architecture as DoctorDashboard's Modal
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
    <div className="ad-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="ad-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ad-modal-header center">
          <div className="ad-modal-icon-wrapper">
            <div className={`ad-modal-icon ${type}`}>
              <IconComponent size={36} strokeWidth={2} />
            </div>
            <div className={`ad-modal-icon-pulse ${type}`} />
          </div>
          <h2>{title}</h2>
        </div>
        <div className="ad-modal-body">
          <p>{message}</p>
        </div>
        <div className="ad-modal-footer">
          {isConfirm && (
            <button type="button" className="ad-btn ad-btn-secondary" onClick={onClose}>
              {cancelLabel || 'إلغاء'}
            </button>
          )}
          <button
            type="button"
            className={`ad-btn ${type === 'error' ? 'ad-btn-danger' : 'ad-btn-primary'}`}
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
 * StarRating — display-only stars for review cards
 */
const StarRating = ({ rating, size = 14 }) => {
  return (
    <span className="ad-review-stars">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          size={size}
          fill={i < rating ? 'currentColor' : 'none'}
          strokeWidth={2}
        />
      ))}
    </span>
  );
};


/* ═══════════════════════════════════════════════════════════════════════
   MAIN COMPONENT — AdminDashboard
   ═══════════════════════════════════════════════════════════════════════ */

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const searchInputRef = useRef(null);

  /* ─────────────────────────────────────────────────────────────────
     STATE — top level
     ───────────────────────────────────────────────────────────────── */

  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('home');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Modal
  const [modal, setModal] = useState({
    isOpen: false,
    type: '',
    title: '',
    message: '',
    onConfirm: null,
  });

  // Notifications
  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  /* ─────────────────────────────────────────────────────────────────
     STATE — statistics & system health
     ───────────────────────────────────────────────────────────────── */

  const [statistics, setStatistics] = useState({
    totalDoctors: 0,
    activeDoctors: 0,
    inactiveDoctors: 0,
    totalPatients: 0,
    activePatients: 0,
    inactivePatients: 0,
    totalChildren: 0,
    totalHospitals: 0,
    totalPharmacies: 0,
    totalLaboratories: 0,
    totalVisits: 0,
    visitsThisMonth: 0,
    pendingRequests: 0,
    activeEmergencies: 0,
    criticalAlerts: 0,
    pendingReviews: 0,
    doctorsBySpecialization: [],
    recentRequests: [],
    recentActivity: [],
  });

  const [systemHealth, setSystemHealth] = useState({
    apiStatus: 'online',
    dbStatus: 'connected',
    activeSessions: 0,
    lastBackup: null,
  });

  /* ─────────────────────────────────────────────────────────────────
     STATE — doctor requests (the priority feature)
     ───────────────────────────────────────────────────────────────── */

  const [doctorRequests, setDoctorRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestSearch, setRequestSearch] = useState('');
  const [requestFilter, setRequestFilter] = useState('pending');
  const [requestTypeFilter, setRequestTypeFilter] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showRequestDetails, setShowRequestDetails] = useState(false);
  const [showAcceptConfirm, setShowAcceptConfirm] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectNotes, setRejectNotes] = useState('');
  const [processingRequest, setProcessingRequest] = useState(false);
  const [generatedCredentials, setGeneratedCredentials] = useState(null);

  /* ─────────────────────────────────────────────────────────────────
     STATE — doctors / patients / children
     ───────────────────────────────────────────────────────────────── */

  const [doctors, setDoctors] = useState([]);
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [doctorSearch, setDoctorSearch] = useState('');
  const [doctorFilter, setDoctorFilter] = useState('all');
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [showDoctorDetails, setShowDoctorDetails] = useState(false);

  const [patients, setPatients] = useState([]);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');
  const [patientFilter, setPatientFilter] = useState('all');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showPatientDetails, setShowPatientDetails] = useState(false);

  const [children, setChildren] = useState([]);
  const [childrenLoading, setChildrenLoading] = useState(false);
  const [childSearch, setChildSearch] = useState('');
  const [childFilter, setChildFilter] = useState('all');
  const [selectedChild, setSelectedChild] = useState(null);
  const [showChildDetails, setShowChildDetails] = useState(false);

  /* ─────────────────────────────────────────────────────────────────
     STATE — facilities (hospitals / pharmacies / laboratories)
     ───────────────────────────────────────────────────────────────── */

  const [hospitals, setHospitals] = useState([]);
  const [hospitalsLoading, setHospitalsLoading] = useState(false);
  const [hospitalSearch, setHospitalSearch] = useState('');
  const [showHospitalForm, setShowHospitalForm] = useState(false);
  const [editingHospital, setEditingHospital] = useState(null);

  const [pharmacies, setPharmacies] = useState([]);
  const [pharmaciesLoading, setPharmaciesLoading] = useState(false);
  const [pharmacySearch, setPharmacySearch] = useState('');
  const [showPharmacyForm, setShowPharmacyForm] = useState(false);
  const [editingPharmacy, setEditingPharmacy] = useState(null);

  const [laboratories, setLaboratories] = useState([]);
  const [labsLoading, setLabsLoading] = useState(false);
  const [labSearch, setLabSearch] = useState('');
  const [showLabForm, setShowLabForm] = useState(false);
  const [editingLab, setEditingLab] = useState(null);

  /* ─────────────────────────────────────────────────────────────────
     STATE — monitoring (emergencies / reviews / audit)
     ───────────────────────────────────────────────────────────────── */

  const [emergencyReports, setEmergencyReports] = useState([]);
  const [emergencyLoading, setEmergencyLoading] = useState(false);
  const [emergencyFilter, setEmergencyFilter] = useState('all');

  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewFilter, setReviewFilter] = useState('pending');

  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditSearch, setAuditSearch] = useState('');

  /* ─────────────────────────────────────────────────────────────────
     STATE — Add Doctor form
     ───────────────────────────────────────────────────────────────── */

  const [showAddDoctorForm, setShowAddDoctorForm] = useState(false);
  const [addDoctorLoading, setAddDoctorLoading] = useState(false);
  const [newDoctor, setNewDoctor] = useState({
    firstName: '', fatherName: '', lastName: '', motherName: '',
    nationalId: '', phoneNumber: '', gender: 'male', dateOfBirth: '',
    address: '', governorate: '', city: '',
    medicalLicenseNumber: '', specialization: '', subSpecialization: '',
    yearsOfExperience: '', hospitalAffiliation: '', availableDays: [],
    consultationFee: '', currency: 'SYP',
  });
  const [newDoctorCredentials, setNewDoctorCredentials] = useState(null);

  /* ─────────────────────────────────────────────────────────────────
     STATE — Add/Edit Hospital form
     ───────────────────────────────────────────────────────────────── */

  const [hospitalForm, setHospitalForm] = useState({
    name: '', arabicName: '', registrationNumber: '', hospitalType: 'government',
    phoneNumber: '', emergencyPhoneNumber: '', email: '', website: '',
    governorate: '', city: '', district: '', address: '',
    numberOfBeds: '', hasEmergency: false, hasICU: false,
    hasLaboratory: false, hasPharmacy: false, hasRadiology: false,
  });
  const [hospitalSaving, setHospitalSaving] = useState(false);

  /* ─────────────────────────────────────────────────────────────────
     STATE — Add/Edit Pharmacy form (with GeoJSON location)
     ───────────────────────────────────────────────────────────────── */

  const [pharmacyForm, setPharmacyForm] = useState({
    name: '', arabicName: '', registrationNumber: '', pharmacyLicense: '',
    pharmacyType: 'community', phoneNumber: '', email: '',
    governorate: '', city: '', district: '', address: '',
    longitude: '', latitude: '',
  });
  const [pharmacySaving, setPharmacySaving] = useState(false);

  /* ─────────────────────────────────────────────────────────────────
     STATE — Add/Edit Laboratory form
     ───────────────────────────────────────────────────────────────── */

  const [labForm, setLabForm] = useState({
    name: '', arabicName: '', registrationNumber: '', labLicense: '',
    labType: 'independent', phoneNumber: '', email: '',
    governorate: '', city: '', district: '', address: '',
    longitude: '', latitude: '',
  });
  const [labSaving, setLabSaving] = useState(false);

  /* ─────────────────────────────────────────────────────────────────
     STATE — Deactivation
     ───────────────────────────────────────────────────────────────── */

  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [deactivateType, setDeactivateType] = useState('');
  const [deactivateReason, setDeactivateReason] = useState('');
  const [deactivateNotes, setDeactivateNotes] = useState('');

  /* ─────────────────────────────────────────────────────────────────
     MEMOIZED VALUES
     ───────────────────────────────────────────────────────────────── */

  const adminName = useMemo(() => {
    if (!admin) return '';
    return `${admin.firstName || ''} ${admin.lastName || ''}`.trim() || 'المسؤول';
  }, [admin]);

  // Filtered lists for each section
  const filteredRequests = useMemo(() => {
    return doctorRequests.filter((r) => {
      const search = requestSearch.toLowerCase();
      const matchesSearch = !search
        || r.firstName?.toLowerCase().includes(search)
        || r.lastName?.toLowerCase().includes(search)
        || r.medicalLicenseNumber?.toLowerCase().includes(search)
        || r.pharmacyLicenseNumber?.toLowerCase().includes(search)
        || r.licenseNumber?.toLowerCase().includes(search)
        || r.nationalId?.includes(search)
        || r.requestId?.toLowerCase().includes(search)
        || r._id?.includes(search);
      const matchesFilter = requestFilter === 'all' || r.status === requestFilter;
      const type = r.requestType || 'doctor';
      const matchesType = requestTypeFilter === 'all' || type === requestTypeFilter;
      return matchesSearch && matchesFilter && matchesType;
    });
  }, [doctorRequests, requestSearch, requestFilter, requestTypeFilter]);

  const filteredDoctors = useMemo(() => {
    return doctors.filter((d) => {
      const search = doctorSearch.toLowerCase();
      const matchesSearch = !search
        || d.firstName?.toLowerCase().includes(search)
        || d.lastName?.toLowerCase().includes(search)
        || d.medicalLicenseNumber?.toLowerCase().includes(search)
        || d.nationalId?.includes(search);
      const isActive = d.isActive !== false;
      const matchesFilter = doctorFilter === 'all'
        || (doctorFilter === 'active' && isActive)
        || (doctorFilter === 'inactive' && !isActive);
      return matchesSearch && matchesFilter;
    });
  }, [doctors, doctorSearch, doctorFilter]);

  const filteredPatients = useMemo(() => {
    return patients.filter((p) => {
      const search = patientSearch.toLowerCase();
      const matchesSearch = !search
        || p.firstName?.toLowerCase().includes(search)
        || p.lastName?.toLowerCase().includes(search)
        || p.nationalId?.includes(search);
      const isActive = p.isActive !== false;
      const matchesFilter = patientFilter === 'all'
        || (patientFilter === 'active' && isActive)
        || (patientFilter === 'inactive' && !isActive);
      return matchesSearch && matchesFilter;
    });
  }, [patients, patientSearch, patientFilter]);

  const filteredChildren = useMemo(() => {
    return children.filter((c) => {
      const search = childSearch.toLowerCase();
      const matchesSearch = !search
        || c.firstName?.toLowerCase().includes(search)
        || c.lastName?.toLowerCase().includes(search)
        || c.childRegistrationNumber?.toLowerCase().includes(search)
        || c.parentNationalId?.includes(search);
      const matchesFilter = childFilter === 'all' || c.migrationStatus === childFilter;
      return matchesSearch && matchesFilter;
    });
  }, [children, childSearch, childFilter]);

  const filteredHospitals = useMemo(() => {
    return hospitals.filter((h) => {
      const search = hospitalSearch.toLowerCase();
      return !search
        || h.name?.toLowerCase().includes(search)
        || h.arabicName?.includes(hospitalSearch)
        || h.registrationNumber?.toLowerCase().includes(search)
        || h.governorate?.toLowerCase().includes(search);
    });
  }, [hospitals, hospitalSearch]);

  const filteredPharmacies = useMemo(() => {
    return pharmacies.filter((p) => {
      const search = pharmacySearch.toLowerCase();
      return !search
        || p.name?.toLowerCase().includes(search)
        || p.arabicName?.includes(pharmacySearch)
        || p.registrationNumber?.toLowerCase().includes(search);
    });
  }, [pharmacies, pharmacySearch]);

  const filteredLabs = useMemo(() => {
    return laboratories.filter((l) => {
      const search = labSearch.toLowerCase();
      return !search
        || l.name?.toLowerCase().includes(search)
        || l.arabicName?.includes(labSearch)
        || l.registrationNumber?.toLowerCase().includes(search);
    });
  }, [laboratories, labSearch]);

  const filteredEmergencies = useMemo(() => {
    return emergencyReports.filter((e) => {
      return emergencyFilter === 'all' || e.aiRiskLevel === emergencyFilter;
    });
  }, [emergencyReports, emergencyFilter]);

  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => reviewFilter === 'all' || r.status === reviewFilter);
  }, [reviews, reviewFilter]);

  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      const search = auditSearch.toLowerCase();
      return !search
        || log.action?.toLowerCase().includes(search)
        || log.userEmail?.toLowerCase().includes(search)
        || log.description?.toLowerCase().includes(search);
    });
  }, [auditLogs, auditSearch]);

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
     INITIAL LOAD
     ───────────────────────────────────────────────────────────────── */

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const userData = localStorage.getItem('user');
      const token = localStorage.getItem('token');

      if (!userData || !token) {
        navigate('/', { replace: true });
        return;
      }

      try {
        const parsedUser = JSON.parse(userData);
        if (!parsedUser.roles || !parsedUser.roles.includes('admin')) {
          openModal('error', 'غير مصرح', 'هذه الصفحة متاحة للمسؤولين فقط', () => {
            closeModal();
            navigate('/', { replace: true });
          });
          return;
        }
        setAdmin(parsedUser);

        // Fetch dashboard data in parallel — graceful failure
        try {
          const [statsRes, healthRes, notifRes] = await Promise.allSettled([
            adminAPI.getDashboardStatistics(),
            adminAPI.getSystemHealth(),
            adminAPI.getMyNotifications(),
          ]);

          if (statsRes.status === 'fulfilled' && statsRes.value) {
            setStatistics((prev) => ({ ...prev, ...statsRes.value }));
          }
          if (healthRes.status === 'fulfilled' && healthRes.value) {
            setSystemHealth((prev) => ({ ...prev, ...healthRes.value }));
          }
          if (notifRes.status === 'fulfilled' && notifRes.value?.notifications) {
            setNotifications(notifRes.value.notifications);
            setUnreadCount(notifRes.value.notifications.filter((n) => n.status !== 'read').length);
          }
        } catch (err) {
          console.warn('[AdminDashboard] Some endpoints unavailable:', err);
        }
      } catch (error) {
        console.error('[AdminDashboard] Init error:', error);
        navigate('/', { replace: true });
        return;
      } finally {
        setLoading(false);
      }
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  /* ─────────────────────────────────────────────────────────────────
     KEYBOARD SHORTCUT — Cmd/Ctrl+K
     ───────────────────────────────────────────────────────────────── */

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setActiveSection('doctors');
        setTimeout(() => searchInputRef.current?.focus(), 100);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  /* ─────────────────────────────────────────────────────────────────
     SECTION CHANGE — lazy load data
     ───────────────────────────────────────────────────────────────── */

  const handleSectionChange = useCallback((sectionId) => {
    setActiveSection(sectionId);
    setSidebarOpen(false);

    // Lazy load section data
    if (sectionId === 'requests' && doctorRequests.length === 0) loadDoctorRequests();
    else if (sectionId === 'doctors' && doctors.length === 0) loadDoctors();
    else if (sectionId === 'patients' && patients.length === 0) loadPatients();
    else if (sectionId === 'children' && children.length === 0) loadChildren();
    else if (sectionId === 'hospitals' && hospitals.length === 0) loadHospitals();
    else if (sectionId === 'pharmacies' && pharmacies.length === 0) loadPharmacies();
    else if (sectionId === 'laboratories' && laboratories.length === 0) loadLaboratories();
    else if (sectionId === 'emergency' && emergencyReports.length === 0) loadEmergencyReports();
    else if (sectionId === 'reviews' && reviews.length === 0) loadReviews();
    else if (sectionId === 'audit' && auditLogs.length === 0) loadAuditLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctorRequests.length, doctors.length, patients.length, children.length,
      hospitals.length, pharmacies.length, laboratories.length,
      emergencyReports.length, reviews.length, auditLogs.length]);

  /* ─────────────────────────────────────────────────────────────────
     DATA LOADERS
     ───────────────────────────────────────────────────────────────── */

  const loadStatistics = useCallback(async () => {
    try {
      const data = await adminAPI.getDashboardStatistics();
      if (data) setStatistics((prev) => ({ ...prev, ...data }));
    } catch (err) {
      console.error('[AdminDashboard] Stats load error:', err);
    }
  }, []);

  const loadDoctorRequests = useCallback(async () => {
    setRequestsLoading(true);
    try {
      const data = await adminAPI.getDoctorRequests();
      if (data?.requests) setDoctorRequests(data.requests);
    } catch (err) {
      console.error('[AdminDashboard] Requests load error:', err);
    } finally {
      setRequestsLoading(false);
    }
  }, []);

  const loadDoctors = useCallback(async () => {
    setDoctorsLoading(true);
    try {
      const data = await adminAPI.getDoctors();
      if (data?.doctors) setDoctors(data.doctors);
    } catch (err) {
      console.error('[AdminDashboard] Doctors load error:', err);
    } finally {
      setDoctorsLoading(false);
    }
  }, []);

  const loadPatients = useCallback(async () => {
    setPatientsLoading(true);
    try {
      const data = await adminAPI.getPatients();
      if (data?.patients) setPatients(data.patients);
    } catch (err) {
      console.error('[AdminDashboard] Patients load error:', err);
    } finally {
      setPatientsLoading(false);
    }
  }, []);

  const loadChildren = useCallback(async () => {
    setChildrenLoading(true);
    try {
      const data = await adminAPI.getChildren();
      if (data?.children) setChildren(data.children);
    } catch (err) {
      console.error('[AdminDashboard] Children load error:', err);
    } finally {
      setChildrenLoading(false);
    }
  }, []);

  const loadHospitals = useCallback(async () => {
    setHospitalsLoading(true);
    try {
      const data = await adminAPI.getHospitals();
      if (data?.hospitals) setHospitals(data.hospitals);
    } catch (err) {
      console.error('[AdminDashboard] Hospitals load error:', err);
    } finally {
      setHospitalsLoading(false);
    }
  }, []);

  const loadPharmacies = useCallback(async () => {
    setPharmaciesLoading(true);
    try {
      const data = await adminAPI.getPharmacies();
      if (data?.pharmacies) setPharmacies(data.pharmacies);
    } catch (err) {
      console.error('[AdminDashboard] Pharmacies load error:', err);
    } finally {
      setPharmaciesLoading(false);
    }
  }, []);

  const loadLaboratories = useCallback(async () => {
    setLabsLoading(true);
    try {
      const data = await adminAPI.getLaboratories();
      if (data?.laboratories) setLaboratories(data.laboratories);
    } catch (err) {
      console.error('[AdminDashboard] Labs load error:', err);
    } finally {
      setLabsLoading(false);
    }
  }, []);

  const loadEmergencyReports = useCallback(async () => {
    setEmergencyLoading(true);
    try {
      const data = await adminAPI.getEmergencyReports();
      if (data?.reports) setEmergencyReports(data.reports);
    } catch (err) {
      console.error('[AdminDashboard] Emergency load error:', err);
    } finally {
      setEmergencyLoading(false);
    }
  }, []);

  const loadReviews = useCallback(async () => {
    setReviewsLoading(true);
    try {
      const data = await adminAPI.getReviews();
      if (data?.reviews) setReviews(data.reviews);
    } catch (err) {
      console.error('[AdminDashboard] Reviews load error:', err);
    } finally {
      setReviewsLoading(false);
    }
  }, []);

  const loadAuditLogs = useCallback(async () => {
    setAuditLoading(true);
    try {
      const data = await adminAPI.getAuditLogs();
      if (data?.logs) setAuditLogs(data.logs);
    } catch (err) {
      console.error('[AdminDashboard] Audit load error:', err);
    } finally {
      setAuditLoading(false);
    }
  }, []);

  /* ─────────────────────────────────────────────────────────────────
     LOGOUT
     ───────────────────────────────────────────────────────────────── */

  const handleLogout = useCallback(() => {
    openModal('confirm', 'تأكيد تسجيل الخروج', 'هل أنت متأكد من رغبتك في تسجيل الخروج؟', () => {
      authAPI.logout();
      navigate('/', { replace: true });
    });
  }, [openModal, navigate]);

  /* ─────────────────────────────────────────────────────────────────
     DOCTOR REQUEST HANDLERS
     ───────────────────────────────────────────────────────────────── */

  const handleViewRequest = useCallback((request) => {
    setSelectedRequest(request);
    setShowRequestDetails(true);
  }, []);

  const handleAcceptRequest = useCallback(async () => {
    if (!selectedRequest) return;
    setProcessingRequest(true);
    try {
      const data = await adminAPI.acceptDoctorRequest(selectedRequest._id, { adminNotes: '' });
      if (data?.success) {
        setGeneratedCredentials({
          email: data.data?.email,
          password: data.data?.password,
          doctorName: data.data?.doctorName || `${selectedRequest.firstName} ${selectedRequest.lastName}`,
        });
        setShowAcceptConfirm(false);
        setShowRequestDetails(false);
        loadDoctorRequests();
        loadStatistics();
      } else {
        openModal('error', 'فشل القبول', data?.message || 'حدث خطأ أثناء قبول الطلب');
      }
    } catch (err) {
      openModal('error', 'فشل القبول', err.message || 'حدث خطأ في الاتصال بالخادم');
    } finally {
      setProcessingRequest(false);
    }
  }, [selectedRequest, openModal, loadDoctorRequests, loadStatistics]);

  const handleRejectRequest = useCallback(async () => {
    if (!selectedRequest || !rejectReason) {
      openModal('error', 'حقل مطلوب', 'الرجاء اختيار سبب الرفض');
      return;
    }
    setProcessingRequest(true);
    try {
      const data = await adminAPI.rejectDoctorRequest(selectedRequest._id, {
        rejectionReason: rejectReason,
        adminNotes: rejectNotes,
      });
      if (data?.success) {
        openModal('success', 'تم الرفض', 'تم رفض طلب التسجيل بنجاح');
        setShowRejectModal(false);
        setShowRequestDetails(false);
        setRejectReason('');
        setRejectNotes('');
        loadDoctorRequests();
        loadStatistics();
      } else {
        openModal('error', 'فشل الرفض', data?.message || 'حدث خطأ أثناء رفض الطلب');
      }
    } catch (err) {
      openModal('error', 'فشل الرفض', err.message || 'حدث خطأ في الاتصال بالخادم');
    } finally {
      setProcessingRequest(false);
    }
  }, [selectedRequest, rejectReason, rejectNotes, openModal, loadDoctorRequests, loadStatistics]);

  /* ─────────────────────────────────────────────────────────────────
     ADD DOCTOR (manual)
     ───────────────────────────────────────────────────────────────── */

  const validateNewDoctor = useCallback(() => {
    if (!newDoctor.firstName.trim()) { openModal('error', 'حقل مطلوب', 'الرجاء إدخال الاسم الأول'); return false; }
    if (!newDoctor.lastName.trim())  { openModal('error', 'حقل مطلوب', 'الرجاء إدخال اسم العائلة'); return false; }
    if (!/^\d{11}$/.test(newDoctor.nationalId)) { openModal('error', 'خطأ', 'الرقم الوطني يجب أن يكون 11 رقم'); return false; }
    if (!newDoctor.phoneNumber.trim()) { openModal('error', 'حقل مطلوب', 'الرجاء إدخال رقم الهاتف'); return false; }
    if (!newDoctor.governorate)        { openModal('error', 'حقل مطلوب', 'الرجاء اختيار المحافظة'); return false; }
    const license = newDoctor.medicalLicenseNumber.toUpperCase().trim();
    if (!/^[A-Z0-9]{8,20}$/.test(license)) { openModal('error', 'خطأ', 'رقم الترخيص يجب أن يكون 8-20 حرف/رقم بأحرف إنجليزية كبيرة'); return false; }
    if (!newDoctor.specialization)      { openModal('error', 'حقل مطلوب', 'الرجاء اختيار التخصص'); return false; }
    if (!newDoctor.hospitalAffiliation.trim()) { openModal('error', 'حقل مطلوب', 'الرجاء إدخال اسم المستشفى'); return false; }
    if (newDoctor.availableDays.length === 0)  { openModal('error', 'حقل مطلوب', 'الرجاء اختيار يوم عمل واحد على الأقل'); return false; }
    const years = parseInt(newDoctor.yearsOfExperience, 10) || 0;
    if (years < 0 || years > 60) { openModal('error', 'خطأ', 'سنوات الخبرة يجب أن تكون بين 0-60'); return false; }
    return true;
  }, [newDoctor, openModal]);

  const handleAddDoctor = useCallback(async () => {
    if (!validateNewDoctor()) return;
    setAddDoctorLoading(true);
    try {
      const email = generateDoctorEmail(newDoctor.firstName, newDoctor.lastName, newDoctor.medicalLicenseNumber);
      const password = generatePassword();
      const payload = {
        person: {
          firstName: newDoctor.firstName.trim(),
          fatherName: newDoctor.fatherName.trim() || null,
          lastName: newDoctor.lastName.trim(),
          motherName: newDoctor.motherName.trim() || null,
          nationalId: newDoctor.nationalId.trim(),
          phoneNumber: newDoctor.phoneNumber.trim(),
          gender: newDoctor.gender,
          dateOfBirth: newDoctor.dateOfBirth || null,
          address: newDoctor.address.trim(),
          governorate: newDoctor.governorate,
          city: newDoctor.city.trim() || null,
        },
        account: {
          email,
          password,
          roles: ['doctor'],
          isActive: true,
        },
        doctor: {
          medicalLicenseNumber: newDoctor.medicalLicenseNumber.toUpperCase().trim(),
          specialization: newDoctor.specialization,
          subSpecialization: newDoctor.subSpecialization.trim() || null,
          yearsOfExperience: parseInt(newDoctor.yearsOfExperience, 10) || 0,
          hospitalAffiliation: newDoctor.hospitalAffiliation.trim(),
          availableDays: newDoctor.availableDays,
          consultationFee: parseFloat(newDoctor.consultationFee) || 0,
          currency: newDoctor.currency,
        },
      };

      const data = await adminAPI.createDoctor(payload);
      if (data?.success) {
        setNewDoctorCredentials({
          email,
          password,
          doctorName: `${newDoctor.firstName} ${newDoctor.lastName}`,
        });
        setNewDoctor({
          firstName: '', fatherName: '', lastName: '', motherName: '',
          nationalId: '', phoneNumber: '', gender: 'male', dateOfBirth: '',
          address: '', governorate: '', city: '',
          medicalLicenseNumber: '', specialization: '', subSpecialization: '',
          yearsOfExperience: '', hospitalAffiliation: '', availableDays: [],
          consultationFee: '', currency: 'SYP',
        });
        loadDoctors();
        loadStatistics();
      } else {
        openModal('error', 'فشل الإضافة', data?.message || 'حدث خطأ أثناء إضافة الطبيب');
      }
    } catch (err) {
      openModal('error', 'فشل الإضافة', err.message || 'حدث خطأ في الاتصال بالخادم');
    } finally {
      setAddDoctorLoading(false);
    }
  }, [newDoctor, validateNewDoctor, openModal, loadDoctors, loadStatistics]);

  const handleDayToggle = useCallback((day) => {
    setNewDoctor((prev) => ({
      ...prev,
      availableDays: prev.availableDays.includes(day)
        ? prev.availableDays.filter((d) => d !== day)
        : [...prev.availableDays, day],
    }));
  }, []);

  /* ─────────────────────────────────────────────────────────────────
     DEACTIVATION / REACTIVATION
     ───────────────────────────────────────────────────────────────── */

  const openDeactivateModal = useCallback((target, type) => {
    setDeactivateTarget(target);
    setDeactivateType(type);
    setDeactivateReason('');
    setDeactivateNotes('');
    setShowDeactivateModal(true);
  }, []);

  const handleDeactivate = useCallback(async () => {
    if (!deactivateReason) {
      openModal('error', 'حقل مطلوب', 'الرجاء اختيار سبب إلغاء التفعيل');
      return;
    }
    try {
      const id = deactivateTarget._id || deactivateTarget.id;
      const data = deactivateType === 'doctor'
        ? await adminAPI.deactivateDoctor(id, { reason: deactivateReason, notes: deactivateNotes })
        : await adminAPI.deactivatePatient(id, { reason: deactivateReason, notes: deactivateNotes });
      if (data?.success) {
        openModal('success', 'تم التنفيذ', `تم إلغاء تفعيل ${deactivateType === 'doctor' ? 'الطبيب' : 'المريض'} بنجاح`);
        setShowDeactivateModal(false);
        setShowDoctorDetails(false);
        setShowPatientDetails(false);
        if (deactivateType === 'doctor') loadDoctors();
        else loadPatients();
        loadStatistics();
      } else {
        openModal('error', 'فشل التنفيذ', data?.message || 'حدث خطأ');
      }
    } catch (err) {
      openModal('error', 'فشل التنفيذ', err.message || 'حدث خطأ في الاتصال بالخادم');
    }
  }, [deactivateTarget, deactivateType, deactivateReason, deactivateNotes, openModal, loadDoctors, loadPatients, loadStatistics]);

  const handleReactivate = useCallback(async (target, type) => {
    try {
      const id = target._id || target.id;
      const data = type === 'doctor'
        ? await adminAPI.reactivateDoctor(id)
        : await adminAPI.reactivatePatient(id);
      if (data?.success) {
        openModal('success', 'تم التنفيذ', `تم إعادة تفعيل ${type === 'doctor' ? 'الطبيب' : 'المريض'} بنجاح`);
        if (type === 'doctor') loadDoctors();
        else loadPatients();
        loadStatistics();
      } else {
        openModal('error', 'فشل التنفيذ', data?.message || 'حدث خطأ');
      }
    } catch (err) {
      openModal('error', 'فشل التنفيذ', err.message || 'حدث خطأ في الاتصال بالخادم');
    }
  }, [openModal, loadDoctors, loadPatients, loadStatistics]);

  /* ─────────────────────────────────────────────────────────────────
     FACILITY (Hospital / Pharmacy / Lab) HANDLERS
     ───────────────────────────────────────────────────────────────── */

  const openHospitalForm = useCallback((hospital = null) => {
    if (hospital) {
      setEditingHospital(hospital);
      setHospitalForm({
        name: hospital.name || '',
        arabicName: hospital.arabicName || '',
        registrationNumber: hospital.registrationNumber || '',
        hospitalType: hospital.hospitalType || 'government',
        phoneNumber: hospital.phoneNumber || '',
        emergencyPhoneNumber: hospital.emergencyPhoneNumber || '',
        email: hospital.email || '',
        website: hospital.website || '',
        governorate: hospital.governorate || '',
        city: hospital.city || '',
        district: hospital.district || '',
        address: hospital.address || '',
        numberOfBeds: hospital.numberOfBeds || '',
        hasEmergency: hospital.hasEmergency || false,
        hasICU: hospital.hasICU || false,
        hasLaboratory: hospital.hasLaboratory || false,
        hasPharmacy: hospital.hasPharmacy || false,
        hasRadiology: hospital.hasRadiology || false,
      });
    } else {
      setEditingHospital(null);
      setHospitalForm({
        name: '', arabicName: '', registrationNumber: '', hospitalType: 'government',
        phoneNumber: '', emergencyPhoneNumber: '', email: '', website: '',
        governorate: '', city: '', district: '', address: '',
        numberOfBeds: '', hasEmergency: false, hasICU: false,
        hasLaboratory: false, hasPharmacy: false, hasRadiology: false,
      });
    }
    setShowHospitalForm(true);
  }, []);

  const handleSaveHospital = useCallback(async () => {
    if (!hospitalForm.name.trim() || !hospitalForm.registrationNumber.trim() || !hospitalForm.governorate || !hospitalForm.city || !hospitalForm.address.trim() || !hospitalForm.phoneNumber.trim()) {
      openModal('error', 'حقول مطلوبة', 'الرجاء إكمال جميع الحقول الإلزامية');
      return;
    }
    setHospitalSaving(true);
    try {
      const payload = {
        ...hospitalForm,
        numberOfBeds: parseInt(hospitalForm.numberOfBeds, 10) || 0,
      };
      const data = editingHospital
        ? await adminAPI.updateHospital(editingHospital._id, payload)
        : await adminAPI.createHospital(payload);
      if (data?.success) {
        openModal('success', 'تم الحفظ', editingHospital ? 'تم تحديث المستشفى بنجاح' : 'تم إضافة المستشفى بنجاح');
        setShowHospitalForm(false);
        loadHospitals();
        loadStatistics();
      } else {
        openModal('error', 'فشل الحفظ', data?.message || 'حدث خطأ');
      }
    } catch (err) {
      openModal('error', 'فشل الحفظ', err.message || 'حدث خطأ في الاتصال بالخادم');
    } finally {
      setHospitalSaving(false);
    }
  }, [hospitalForm, editingHospital, openModal, loadHospitals, loadStatistics]);

  const openPharmacyForm = useCallback((pharmacy = null) => {
    if (pharmacy) {
      setEditingPharmacy(pharmacy);
      setPharmacyForm({
        name: pharmacy.name || '',
        arabicName: pharmacy.arabicName || '',
        registrationNumber: pharmacy.registrationNumber || '',
        pharmacyLicense: pharmacy.pharmacyLicense || '',
        pharmacyType: pharmacy.pharmacyType || 'community',
        phoneNumber: pharmacy.phoneNumber || '',
        email: pharmacy.email || '',
        governorate: pharmacy.governorate || '',
        city: pharmacy.city || '',
        district: pharmacy.district || '',
        address: pharmacy.address || '',
        longitude: pharmacy.location?.coordinates?.[0] || '',
        latitude: pharmacy.location?.coordinates?.[1] || '',
      });
    } else {
      setEditingPharmacy(null);
      setPharmacyForm({
        name: '', arabicName: '', registrationNumber: '', pharmacyLicense: '',
        pharmacyType: 'community', phoneNumber: '', email: '',
        governorate: '', city: '', district: '', address: '',
        longitude: '', latitude: '',
      });
    }
    setShowPharmacyForm(true);
  }, []);

  const handleSavePharmacy = useCallback(async () => {
    if (!pharmacyForm.name.trim() || !pharmacyForm.registrationNumber.trim() || !pharmacyForm.pharmacyLicense.trim() || !pharmacyForm.governorate || !pharmacyForm.city || !pharmacyForm.address.trim() || !pharmacyForm.phoneNumber.trim() || !pharmacyForm.longitude || !pharmacyForm.latitude) {
      openModal('error', 'حقول مطلوبة', 'الرجاء إكمال جميع الحقول الإلزامية بما في ذلك الموقع الجغرافي (خطوط الطول والعرض)');
      return;
    }
    setPharmacySaving(true);
    try {
      const payload = {
        ...pharmacyForm,
        location: {
          type: 'Point',
          coordinates: [parseFloat(pharmacyForm.longitude), parseFloat(pharmacyForm.latitude)],
        },
      };
      delete payload.longitude;
      delete payload.latitude;

      const data = editingPharmacy
        ? await adminAPI.updatePharmacy(editingPharmacy._id, payload)
        : await adminAPI.createPharmacy(payload);
      if (data?.success) {
        openModal('success', 'تم الحفظ', editingPharmacy ? 'تم تحديث الصيدلية بنجاح' : 'تم إضافة الصيدلية بنجاح');
        setShowPharmacyForm(false);
        loadPharmacies();
        loadStatistics();
      } else {
        openModal('error', 'فشل الحفظ', data?.message || 'حدث خطأ');
      }
    } catch (err) {
      openModal('error', 'فشل الحفظ', err.message || 'حدث خطأ في الاتصال بالخادم');
    } finally {
      setPharmacySaving(false);
    }
  }, [pharmacyForm, editingPharmacy, openModal, loadPharmacies, loadStatistics]);

  const openLabForm = useCallback((lab = null) => {
    if (lab) {
      setEditingLab(lab);
      setLabForm({
        name: lab.name || '',
        arabicName: lab.arabicName || '',
        registrationNumber: lab.registrationNumber || '',
        labLicense: lab.labLicense || '',
        labType: lab.labType || 'independent',
        phoneNumber: lab.phoneNumber || '',
        email: lab.email || '',
        governorate: lab.governorate || '',
        city: lab.city || '',
        district: lab.district || '',
        address: lab.address || '',
        longitude: lab.location?.coordinates?.[0] || '',
        latitude: lab.location?.coordinates?.[1] || '',
      });
    } else {
      setEditingLab(null);
      setLabForm({
        name: '', arabicName: '', registrationNumber: '', labLicense: '',
        labType: 'independent', phoneNumber: '', email: '',
        governorate: '', city: '', district: '', address: '',
        longitude: '', latitude: '',
      });
    }
    setShowLabForm(true);
  }, []);

  const handleSaveLab = useCallback(async () => {
    if (!labForm.name.trim() || !labForm.registrationNumber.trim() || !labForm.governorate || !labForm.city || !labForm.address.trim() || !labForm.phoneNumber.trim() || !labForm.longitude || !labForm.latitude) {
      openModal('error', 'حقول مطلوبة', 'الرجاء إكمال جميع الحقول الإلزامية بما في ذلك الموقع الجغرافي');
      return;
    }
    setLabSaving(true);
    try {
      const payload = {
        ...labForm,
        location: {
          type: 'Point',
          coordinates: [parseFloat(labForm.longitude), parseFloat(labForm.latitude)],
        },
      };
      delete payload.longitude;
      delete payload.latitude;

      const data = editingLab
        ? await adminAPI.updateLaboratory(editingLab._id, payload)
        : await adminAPI.createLaboratory(payload);
      if (data?.success) {
        openModal('success', 'تم الحفظ', editingLab ? 'تم تحديث المختبر بنجاح' : 'تم إضافة المختبر بنجاح');
        setShowLabForm(false);
        loadLaboratories();
        loadStatistics();
      } else {
        openModal('error', 'فشل الحفظ', data?.message || 'حدث خطأ');
      }
    } catch (err) {
      openModal('error', 'فشل الحفظ', err.message || 'حدث خطأ في الاتصال بالخادم');
    } finally {
      setLabSaving(false);
    }
  }, [labForm, editingLab, openModal, loadLaboratories, loadStatistics]);

  /* ─────────────────────────────────────────────────────────────────
     REVIEWS MODERATION
     ───────────────────────────────────────────────────────────────── */

  const handleReviewAction = useCallback(async (reviewId, action) => {
    try {
      const data = await adminAPI.moderateReview(reviewId, { action });
      if (data?.success) {
        openModal('success', 'تم التنفيذ', 'تم تحديث حالة التقييم بنجاح');
        loadReviews();
      } else {
        openModal('error', 'فشل التنفيذ', data?.message || 'حدث خطأ');
      }
    } catch (err) {
      openModal('error', 'فشل التنفيذ', err.message || 'حدث خطأ في الاتصال بالخادم');
    }
  }, [openModal, loadReviews]);

  /* ─────────────────────────────────────────────────────────────────
     CHILDREN MIGRATION
     ───────────────────────────────────────────────────────────────── */

  const handleMigrateChild = useCallback(async (childId) => {
    openModal('confirm', 'تأكيد الترحيل', 'هل تريد ترحيل هذا الطفل إلى سجل البالغين؟ هذا الإجراء لا يمكن التراجع عنه.', async () => {
      try {
        const data = await adminAPI.migrateChild(childId);
        if (data?.success) {
          closeModal();
          openModal('success', 'تم الترحيل', 'تم ترحيل الطفل إلى سجل البالغين بنجاح');
          loadChildren();
        } else {
          openModal('error', 'فشل الترحيل', data?.message || 'حدث خطأ');
        }
      } catch (err) {
        openModal('error', 'فشل الترحيل', err.message || 'حدث خطأ في الاتصال بالخادم');
      }
    });
  }, [openModal, closeModal, loadChildren]);

  /* ─────────────────────────────────────────────────────────────────
     NOTIFICATIONS
     ───────────────────────────────────────────────────────────────── */

  const toggleNotifPanel = useCallback(() => {
    setNotifOpen((p) => !p);
  }, []);

  const handleMarkNotifRead = useCallback(async (notifId) => {
    try {
      await adminAPI.markNotificationRead(notifId);
      setNotifications((prev) =>
        prev.map((n) => ((n._id || n.id) === notifId ? { ...n, status: 'read' } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.error('[AdminDashboard] Mark notif read error:', err);
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
      <div className="ad-page">
        <Navbar />
        <div className="ad-loading">
          <div className="ad-loading-spinner" />
          <p>جاري تحميل لوحة التحكم...</p>
        </div>
      </div>
    );
  }

  if (!admin) return null;

  // ──────────────────────────────────────────────────────────────────
  // RENDER CONTINUES IN PARTS B, C, D
  // ──────────────────────────────────────────────────────────────────
  /* ═════════════════════════════════════════════════════════════════
     RENDER — main shell
     ═════════════════════════════════════════════════════════════════ */

  return (
    <div className="ad-page">
      <Navbar />

      {/* General Modal */}
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
        className={`ad-sidebar-backdrop ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      {/* Notifications panel backdrop */}
      <div
        className={`ad-notif-backdrop ${notifOpen ? 'open' : ''}`}
        onClick={() => setNotifOpen(false)}
        aria-hidden="true"
      />

      {/* ═══════════════════════════════════════════════════════════
          NOTIFICATIONS SLIDE-IN PANEL
          ═══════════════════════════════════════════════════════════ */}
      <aside className={`ad-notif-panel ${notifOpen ? 'open' : ''}`} aria-label="الإشعارات">
        <div className="ad-notif-panel-header">
          <h3 className="ad-notif-panel-title">
            <Bell size={18} strokeWidth={2.2} />
            الإشعارات
            {unreadCount > 0 && (
              <span className="ad-sidebar-badge" style={{ marginInlineStart: 8 }}>
                {unreadCount}
              </span>
            )}
          </h3>
          <button
            type="button"
            className="ad-notif-panel-close"
            onClick={() => setNotifOpen(false)}
            aria-label="إغلاق الإشعارات"
          >
            <X size={18} strokeWidth={2.2} />
          </button>
        </div>

        <div className="ad-notif-list">
          {notifications.length === 0 ? (
            <div className="ad-empty">
              <div className="ad-empty-icon">
                <Bell size={28} strokeWidth={1.8} />
              </div>
              <h3>لا توجد إشعارات</h3>
              <p>ستظهر هنا الإشعارات الجديدة عند وصولها</p>
            </div>
          ) : (
            notifications.map((notif) => {
              const iconType =
                notif.type?.includes('critical') || notif.type?.includes('emergency') ? 'error'
                : notif.type?.includes('approved') || notif.type?.includes('success') ? 'success'
                : notif.type?.includes('request') || notif.type?.includes('pending') ? 'warning'
                : 'info';
              const NotifIcon =
                iconType === 'error' ? AlertTriangle
                : iconType === 'success' ? CheckCircle2
                : iconType === 'warning' ? AlertCircle
                : Info;
              return (
                <button
                  key={notif._id || notif.id}
                  type="button"
                  className={`ad-notif-item ${notif.status !== 'read' ? 'unread' : ''}`}
                  onClick={() => handleMarkNotifRead(notif._id || notif.id)}
                >
                  <div className={`ad-notif-item-icon ${iconType}`}>
                    <NotifIcon size={16} strokeWidth={2.2} />
                  </div>
                  <div className="ad-notif-item-content">
                    <h4 className="ad-notif-item-title">{notif.title}</h4>
                    <p className="ad-notif-item-text">{notif.message}</p>
                    <span className="ad-notif-item-time">
                      {timeAgo(notif.createdAt)}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* ═══════════════════════════════════════════════════════════
          MAIN SHELL
          ═══════════════════════════════════════════════════════════ */}
      <div className="ad-shell">
        {/* ─────────────────────────────────────────────────────────
            SIDEBAR
            ───────────────────────────────────────────────────────── */}
        <aside className={`ad-sidebar ${sidebarOpen ? 'open' : ''}`} aria-label="القائمة الرئيسية">
          {/* Header — Ministry emblem + admin identity */}
          <div className="ad-sidebar-header">
            <div className="ad-sidebar-emblem">
              <div className="ad-sidebar-emblem-icon">
                <Shield size={22} strokeWidth={2} />
              </div>
              <div className="ad-sidebar-ministry">
                <h3 className="ad-sidebar-ministry-name">وزارة الصحة</h3>
                <p className="ad-sidebar-ministry-sub">الجمهورية العربية السورية</p>
              </div>
            </div>
            <div className="ad-sidebar-admin">
              <div className="ad-sidebar-admin-avatar">
                <UserCheck size={18} strokeWidth={2.2} />
                <span className="ad-sidebar-admin-online" />
              </div>
              <div className="ad-sidebar-admin-info">
                <h4 className="ad-sidebar-admin-name">{adminName}</h4>
                <span className="ad-sidebar-admin-role">مسؤول النظام</span>
              </div>
            </div>
          </div>

          {/* Nav — grouped sections */}
          <nav className="ad-sidebar-nav">
            {SIDEBAR_GROUPS.map((group, groupIdx) => (
              <React.Fragment key={groupIdx}>
                <span className="ad-sidebar-section-label">{group.label}</span>
                {group.items.map((item) => {
                  const ItemIcon = item.Icon;
                  const badgeValue = item.badge ? statistics[item.badge] : null;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`ad-sidebar-link ${activeSection === item.id ? 'active' : ''}`}
                      onClick={() => handleSectionChange(item.id)}
                    >
                      <ItemIcon size={20} strokeWidth={2} />
                      <span className="ad-sidebar-link-label">{item.labelAr}</span>
                      {badgeValue > 0 && (
                        <span className={`ad-sidebar-badge ${item.id === 'requests' ? 'warning' : ''}`}>
                          {badgeValue}
                        </span>
                      )}
                    </button>
                  );
                })}
              </React.Fragment>
            ))}

            <span className="ad-sidebar-section-label">الإعدادات</span>
            <button type="button" className="ad-sidebar-link" onClick={toggleNotifPanel}>
              <Bell size={20} strokeWidth={2} />
              <span className="ad-sidebar-link-label">الإشعارات</span>
              {unreadCount > 0 && <span className="ad-sidebar-badge">{unreadCount}</span>}
            </button>
            <button type="button" className="ad-sidebar-link" onClick={() => navigate('/profile')}>
              <Settings size={20} strokeWidth={2} />
              <span className="ad-sidebar-link-label">الإعدادات</span>
            </button>
          </nav>

          {/* Footer — logout */}
          <div className="ad-sidebar-footer">
            <button type="button" className="ad-sidebar-logout" onClick={handleLogout}>
              <LogOut size={18} strokeWidth={2} />
              <span>تسجيل الخروج</span>
            </button>
          </div>
        </aside>

        {/* ─────────────────────────────────────────────────────────
            MAIN CONTENT AREA
            ───────────────────────────────────────────────────────── */}
        <main className="ad-main">

          {/* ═══════════════════════════════════════════════════════
              SECTION: HOME
              ═══════════════════════════════════════════════════════ */}
          {activeSection === 'home' && (
            <>
              <div className="ad-page-header">
                <div className="ad-page-title">
                  <button
                    type="button"
                    className="ad-btn ad-btn-icon ad-mobile-toggle"
                    onClick={() => setSidebarOpen(true)}
                    aria-label="فتح القائمة"
                  >
                    <Menu size={20} strokeWidth={2.2} />
                  </button>
                  <div className="ad-page-title-icon">
                    <Home size={24} strokeWidth={2} />
                  </div>
                  <div>
                    <h1>الرئيسية</h1>
                    <p>نظرة شاملة على النظام الصحي الوطني</p>
                  </div>
                </div>
                <div className="ad-page-actions">
                  <button
                    type="button"
                    className="ad-btn ad-btn-icon"
                    onClick={toggleNotifPanel}
                    aria-label="الإشعارات"
                  >
                    <Bell size={20} strokeWidth={2} />
                    {unreadCount > 0 && (
                      <span className="ad-btn-icon-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
                    )}
                  </button>
                </div>
              </div>

              {/* Greeting hero */}
              <section className="ad-greeting-hero">
                <div className="ad-greeting-content">
                  <div className="ad-greeting-emblem">
                    <Shield size={42} strokeWidth={1.8} />
                  </div>
                  <div className="ad-greeting-text">
                    <span className="ad-greeting-eyebrow">
                      <Sparkles size={12} strokeWidth={2.5} />
                      {getTimeGreeting()} سعادة
                    </span>
                    <h2>{adminName}</h2>
                    <div className="ad-greeting-meta">
                      <span className="ad-greeting-meta-item">
                        <Shield size={14} strokeWidth={2} />
                        وزارة الصحة - الجمهورية العربية السورية
                      </span>
                      <span className="ad-greeting-meta-item">
                        <Calendar size={14} strokeWidth={2} />
                        {formatArabicDate(new Date())}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="ad-greeting-quick-btn"
                    onClick={() => handleSectionChange('requests')}
                  >
                    <ClipboardList size={16} strokeWidth={2.2} />
                    <span>مراجعة الطلبات</span>
                  </button>
                </div>
              </section>

              {/* System health strip */}
              <section className="ad-health-strip">
                <div className="ad-health-tile">
                  <div className={`ad-health-icon ${systemHealth.apiStatus === 'online' ? '' : 'error'}`}>
                    <Server size={18} strokeWidth={2.2} />
                  </div>
                  <div>
                    <div className="ad-health-label">حالة الـ API</div>
                    <div className="ad-health-value">
                      {systemHealth.apiStatus === 'online' ? 'متصل' : 'غير متصل'}
                    </div>
                  </div>
                </div>
                <div className="ad-health-tile">
                  <div className={`ad-health-icon ${systemHealth.dbStatus === 'connected' ? '' : 'error'}`}>
                    <Database size={18} strokeWidth={2.2} />
                  </div>
                  <div>
                    <div className="ad-health-label">قاعدة البيانات</div>
                    <div className="ad-health-value">
                      {systemHealth.dbStatus === 'connected' ? 'متصلة' : 'غير متصلة'}
                    </div>
                  </div>
                </div>
                <div className="ad-health-tile">
                  <div className="ad-health-icon info">
                    <Wifi size={18} strokeWidth={2.2} />
                  </div>
                  <div>
                    <div className="ad-health-label">الجلسات النشطة</div>
                    <div className="ad-health-value">{formatNumber(systemHealth.activeSessions)}</div>
                  </div>
                </div>
                <div className="ad-health-tile">
                  <div className="ad-health-icon">
                    <HardDrive size={18} strokeWidth={2.2} />
                  </div>
                  <div>
                    <div className="ad-health-label">آخر نسخة احتياطية</div>
                    <div className="ad-health-value">
                      {systemHealth.lastBackup ? timeAgo(systemHealth.lastBackup) : '-'}
                    </div>
                  </div>
                </div>
              </section>

              {/* KPI tiles — 6 in 3-col grid */}
              <section className="ad-kpi-grid">
                <div className="ad-kpi-tile" onClick={() => handleSectionChange('doctors')}>
                  <div className="ad-kpi-icon primary">
                    <Stethoscope size={22} strokeWidth={2} />
                  </div>
                  <div className="ad-kpi-value">{formatNumber(statistics.totalDoctors)}</div>
                  <div className="ad-kpi-label">إجمالي الأطباء</div>
                  <div className="ad-kpi-sublabel">
                    <CheckCircle2 size={11} strokeWidth={2.5} />
                    {formatNumber(statistics.activeDoctors)} نشط
                    <span style={{ color: 'var(--tm-divider)' }}>•</span>
                    {formatNumber(statistics.inactiveDoctors)} غير نشط
                  </div>
                </div>

                <div className="ad-kpi-tile" onClick={() => handleSectionChange('patients')}>
                  <div className="ad-kpi-icon success">
                    <Users size={22} strokeWidth={2} />
                  </div>
                  <div className="ad-kpi-value">{formatNumber(statistics.totalPatients)}</div>
                  <div className="ad-kpi-label">إجمالي المرضى</div>
                  <div className="ad-kpi-sublabel">
                    <CheckCircle2 size={11} strokeWidth={2.5} />
                    {formatNumber(statistics.activePatients)} نشط
                    <span style={{ color: 'var(--tm-divider)' }}>•</span>
                    {formatNumber(statistics.totalChildren)} طفل
                  </div>
                </div>

                <div className="ad-kpi-tile" onClick={() => handleSectionChange('requests')}>
                  <div className="ad-kpi-icon warning">
                    <ClipboardList size={22} strokeWidth={2} />
                  </div>
                  <div className="ad-kpi-value">{formatNumber(statistics.pendingRequests)}</div>
                  <div className="ad-kpi-label">طلبات تسجيل أطباء</div>
                  <div className="ad-kpi-sublabel">
                    <Clock size={11} strokeWidth={2.5} />
                    بانتظار المراجعة
                  </div>
                  {statistics.pendingRequests > 0 && (
                    <span className="ad-kpi-pulse-badge">جديد</span>
                  )}
                </div>

                <div className="ad-kpi-tile" onClick={() => handleSectionChange('hospitals')}>
                  <div className="ad-kpi-icon info">
                    <Hospital size={22} strokeWidth={2} />
                  </div>
                  <div className="ad-kpi-value">
                    {formatNumber(
                      (statistics.totalHospitals || 0) +
                      (statistics.totalPharmacies || 0) +
                      (statistics.totalLaboratories || 0)
                    )}
                  </div>
                  <div className="ad-kpi-label">المرافق الصحية</div>
                  <div className="ad-kpi-sublabel">
                    <Building2 size={11} strokeWidth={2.5} />
                    {formatNumber(statistics.totalHospitals)} مستشفى
                    <span style={{ color: 'var(--tm-divider)' }}>•</span>
                    {formatNumber(statistics.totalPharmacies)} صيدلية
                    <span style={{ color: 'var(--tm-divider)' }}>•</span>
                    {formatNumber(statistics.totalLaboratories)} مختبر
                  </div>
                </div>

                <div className="ad-kpi-tile">
                  <div className="ad-kpi-icon purple">
                    <Activity size={22} strokeWidth={2} />
                  </div>
                  <div className="ad-kpi-value">{formatNumber(statistics.visitsThisMonth)}</div>
                  <div className="ad-kpi-label">زيارات هذا الشهر</div>
                  <div className="ad-kpi-sublabel">
                    <TrendingUp size={11} strokeWidth={2.5} />
                    إجمالي: {formatNumber(statistics.totalVisits)}
                  </div>
                </div>

                <div className="ad-kpi-tile" onClick={() => handleSectionChange('emergency')}>
                  <div className="ad-kpi-icon error">
                    <Siren size={22} strokeWidth={2} />
                  </div>
                  <div className="ad-kpi-value">{formatNumber(statistics.criticalAlerts)}</div>
                  <div className="ad-kpi-label">تنبيهات حرجة</div>
                  <div className="ad-kpi-sublabel">
                    <AlertTriangle size={11} strokeWidth={2.5} />
                    {formatNumber(statistics.activeEmergencies)} طوارئ نشطة
                  </div>
                  {statistics.criticalAlerts > 0 && (
                    <span className="ad-kpi-pulse-badge">عاجل</span>
                  )}
                </div>
              </section>

              {/* Two-column home grid: chart + activity */}
              <section className="ad-home-grid">
                {/* Doctors by specialization chart */}
                <div className="ad-card">
                  <div className="ad-card-header">
                    <h3 className="ad-card-title">
                      <span className="ad-card-title-icon">
                        <BarChart3 size={18} strokeWidth={2} />
                      </span>
                      توزيع الأطباء حسب التخصص
                    </h3>
                    <button
                      type="button"
                      className="ad-btn ad-btn-ghost"
                      onClick={() => handleSectionChange('doctors')}
                    >
                      عرض الكل
                      <ArrowLeft size={14} strokeWidth={2.2} />
                    </button>
                  </div>

                  {(!statistics.doctorsBySpecialization || statistics.doctorsBySpecialization.length === 0) ? (
                    <div className="ad-empty">
                      <div className="ad-empty-icon">
                        <BarChart3 size={28} strokeWidth={1.8} />
                      </div>
                      <p>لا توجد بيانات حالياً</p>
                    </div>
                  ) : (
                    <div className="ad-chart-list">
                      {(() => {
                        // Calculate max for percentage
                        const max = Math.max(
                          ...statistics.doctorsBySpecialization.map((s) => s.count || 0),
                          1
                        );
                        return statistics.doctorsBySpecialization
                          .slice(0, 8)
                          .map((spec, idx) => {
                            const info = getSpecializationInfo(spec.specialization || spec.id);
                            const SpecIcon = info.Icon;
                            const pct = ((spec.count || 0) / max) * 100;
                            return (
                              <div key={idx} className="ad-chart-row">
                                <div className="ad-chart-row-icon">
                                  <SpecIcon size={16} strokeWidth={2} />
                                </div>
                                <div className="ad-chart-row-content">
                                  <div className="ad-chart-row-header">
                                    <span className="ad-chart-row-name">{info.nameAr}</span>
                                    <span className="ad-chart-row-pct">{pct.toFixed(0)}%</span>
                                  </div>
                                  <div className="ad-chart-bar-track">
                                    <div
                                      className="ad-chart-bar-fill"
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                </div>
                                <span className="ad-chart-row-count">{spec.count || 0}</span>
                              </div>
                            );
                          });
                      })()}
                    </div>
                  )}
                </div>

                {/* Recent activity */}
                <div className="ad-card">
                  <div className="ad-card-header">
                    <h3 className="ad-card-title">
                      <span className="ad-card-title-icon">
                        <Activity size={18} strokeWidth={2} />
                      </span>
                      آخر النشاطات
                    </h3>
                  </div>

                  <div className="ad-activity-list">
                    {(!statistics.recentActivity || statistics.recentActivity.length === 0) ? (
                      <div className="ad-empty">
                        <div className="ad-empty-icon">
                          <Activity size={24} strokeWidth={1.8} />
                        </div>
                        <p>لا توجد نشاطات حديثة</p>
                      </div>
                    ) : (
                      statistics.recentActivity.slice(0, 6).map((activity, idx) => {
                        const iconType =
                          activity.action?.includes('REJECT') || activity.action?.includes('DEACTIVATE') ? 'error'
                          : activity.action?.includes('ACCEPT') || activity.action?.includes('APPROVE') ? 'success'
                          : activity.action?.includes('ADD') || activity.action?.includes('CREATE') ? 'info'
                          : 'warning';
                        const ActIcon =
                          iconType === 'error' ? XCircle
                          : iconType === 'success' ? CheckCircle2
                          : iconType === 'info' ? Plus
                          : Bell;
                        return (
                          <div key={idx} className="ad-activity-item">
                            <div className={`ad-activity-icon ${iconType}`}>
                              <ActIcon size={16} strokeWidth={2.2} />
                            </div>
                            <div className="ad-activity-text">
                              <p>{activity.description || activity.details}</p>
                              <time>{timeAgo(activity.timestamp || activity.createdAt)}</time>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </section>

              {/* Quick actions */}
              <section>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--tm-primary)', margin: '0 0 14px', fontFamily: 'Cairo, sans-serif' }}>
                  الإجراءات السريعة
                </h3>
                <div className="ad-quick-actions">
                  <button
                    type="button"
                    className="ad-quick-action"
                    onClick={() => { setShowAddDoctorForm(true); }}
                  >
                    <div className="ad-quick-action-icon">
                      <UserPlus size={22} strokeWidth={2} />
                    </div>
                    <div className="ad-quick-action-text">
                      <h4 className="ad-quick-action-title">إضافة طبيب جديد</h4>
                      <p className="ad-quick-action-sub">إنشاء حساب طبيب يدوياً</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    className="ad-quick-action"
                    onClick={() => handleSectionChange('requests')}
                  >
                    <div className="ad-quick-action-icon warning">
                      <ClipboardList size={22} strokeWidth={2} />
                    </div>
                    <div className="ad-quick-action-text">
                      <h4 className="ad-quick-action-title">مراجعة الطلبات</h4>
                      <p className="ad-quick-action-sub">
                        {statistics.pendingRequests > 0
                          ? `${statistics.pendingRequests} طلب بانتظار المراجعة`
                          : 'لا توجد طلبات معلقة'}
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    className="ad-quick-action"
                    onClick={() => { openHospitalForm(); handleSectionChange('hospitals'); }}
                  >
                    <div className="ad-quick-action-icon info">
                      <Hospital size={22} strokeWidth={2} />
                    </div>
                    <div className="ad-quick-action-text">
                      <h4 className="ad-quick-action-title">إضافة مرفق صحي</h4>
                      <p className="ad-quick-action-sub">مستشفى، صيدلية، أو مختبر</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    className="ad-quick-action"
                    onClick={() => handleSectionChange('audit')}
                  >
                    <div className="ad-quick-action-icon">
                      <Scroll size={22} strokeWidth={2} />
                    </div>
                    <div className="ad-quick-action-text">
                      <h4 className="ad-quick-action-title">سجل النظام</h4>
                      <p className="ad-quick-action-sub">عرض جميع العمليات</p>
                    </div>
                  </button>
                </div>
              </section>
            </>
          )}

          {/* ═══════════════════════════════════════════════════════
              SECTION: PROFESSIONAL REQUESTS (doctor + pharmacist + lab tech)
              ═══════════════════════════════════════════════════════ */}
          {activeSection === 'requests' && (
            <>
              <div className="ad-page-header">
                <div className="ad-page-title">
                  <button
                    type="button"
                    className="ad-btn ad-btn-icon ad-mobile-toggle"
                    onClick={() => setSidebarOpen(true)}
                    aria-label="فتح القائمة"
                  >
                    <Menu size={20} strokeWidth={2.2} />
                  </button>
                  <div className="ad-page-title-icon">
                    <ClipboardList size={24} strokeWidth={2} />
                  </div>
                  <div>
                    <h1>طلبات التسجيل المهني</h1>
                    <p>مراجعة وإدارة طلبات تسجيل الأطباء والصيادلة وفنيي المختبر</p>
                  </div>
                </div>
                <div className="ad-page-actions">
                  <button
                    type="button"
                    className="ad-btn ad-btn-secondary"
                    onClick={loadDoctorRequests}
                  >
                    <RotateCcw size={16} strokeWidth={2.2} />
                    تحديث
                  </button>
                </div>
              </div>

              {/* Toolbar — type tabs + search + filter chips */}
              <div className="ad-type-tabs">
                <button
                  type="button"
                  className={`ad-type-tab ${requestTypeFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setRequestTypeFilter('all')}
                >
                  <ClipboardList size={16} strokeWidth={2} />
                  الكل
                  <span className="ad-type-tab-count">{doctorRequests.length}</span>
                </button>
                <button
                  type="button"
                  className={`ad-type-tab ${requestTypeFilter === 'doctor' ? 'active' : ''}`}
                  onClick={() => setRequestTypeFilter('doctor')}
                >
                  <Stethoscope size={16} strokeWidth={2} />
                  أطباء
                  <span className="ad-type-tab-count">
                    {doctorRequests.filter((r) => (r.requestType || 'doctor') === 'doctor').length}
                  </span>
                </button>
                <button
                  type="button"
                  className={`ad-type-tab ${requestTypeFilter === 'pharmacist' ? 'active' : ''}`}
                  onClick={() => setRequestTypeFilter('pharmacist')}
                >
                  <Pill size={16} strokeWidth={2} />
                  صيادلة
                  <span className="ad-type-tab-count">
                    {doctorRequests.filter((r) => r.requestType === 'pharmacist').length}
                  </span>
                </button>
                <button
                  type="button"
                  className={`ad-type-tab ${requestTypeFilter === 'lab_technician' ? 'active' : ''}`}
                  onClick={() => setRequestTypeFilter('lab_technician')}
                >
                  <Microscope size={16} strokeWidth={2} />
                  فنيي مختبر
                  <span className="ad-type-tab-count">
                    {doctorRequests.filter((r) => r.requestType === 'lab_technician').length}
                  </span>
                </button>
              </div>

              <div className="ad-toolbar">
                <div className="ad-search-box">
                  <Search size={18} strokeWidth={2} />
                  <input
                    type="text"
                    className="ad-search-input"
                    placeholder="البحث بالاسم، رقم الترخيص، أو الرقم الوطني..."
                    value={requestSearch}
                    onChange={(e) => setRequestSearch(e.target.value)}
                  />
                </div>
                <div className="ad-filter-chips">
                  <button
                    type="button"
                    className={`ad-chip ${requestFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setRequestFilter('all')}
                  >
                    الكل
                    <span className="ad-chip-count">{doctorRequests.length}</span>
                  </button>
                  <button
                    type="button"
                    className={`ad-chip pending ${requestFilter === 'pending' ? 'active' : ''}`}
                    onClick={() => setRequestFilter('pending')}
                  >
                    <Clock size={13} strokeWidth={2.5} />
                    معلق
                    <span className="ad-chip-count">
                      {doctorRequests.filter((r) => r.status === 'pending').length}
                    </span>
                  </button>
                  <button
                    type="button"
                    className={`ad-chip approved ${requestFilter === 'approved' ? 'active' : ''}`}
                    onClick={() => setRequestFilter('approved')}
                  >
                    <CheckCircle2 size={13} strokeWidth={2.5} />
                    تمت الموافقة
                    <span className="ad-chip-count">
                      {doctorRequests.filter((r) => r.status === 'approved').length}
                    </span>
                  </button>
                  <button
                    type="button"
                    className={`ad-chip rejected ${requestFilter === 'rejected' ? 'active' : ''}`}
                    onClick={() => setRequestFilter('rejected')}
                  >
                    <XCircle size={13} strokeWidth={2.5} />
                    مرفوض
                    <span className="ad-chip-count">
                      {doctorRequests.filter((r) => r.status === 'rejected').length}
                    </span>
                  </button>
                </div>
              </div>

              {/* Requests table */}
              {requestsLoading ? (
                <div className="ad-section-loading">
                  <Loader2 size={36} className="ad-spin" color="var(--tm-action)" />
                  <p>جاري تحميل الطلبات...</p>
                </div>
              ) : filteredRequests.length === 0 ? (
                <div className="ad-card">
                  <div className="ad-empty">
                    <div className="ad-empty-icon">
                      <ClipboardList size={32} strokeWidth={1.8} />
                    </div>
                    <h3>لا توجد طلبات</h3>
                    <p>لا توجد طلبات تسجيل مطابقة للمعايير المحددة</p>
                  </div>
                </div>
              ) : (
                <div className="ad-table-wrap">
                  <table className="ad-table">
                    <thead>
                      <tr>
                        <th>رقم الطلب</th>
                        <th>الاسم</th>
                        <th>النوع</th>
                        <th>التخصص / الدرجة</th>
                        <th>رقم الترخيص</th>
                        <th>تاريخ الطلب</th>
                        <th>الحالة</th>
                        <th>الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRequests.map((req) => {
                        const reqType = req.requestType || 'doctor';
                        const specInfo = reqType === 'doctor' ? getSpecializationInfo(req.specialization) : null;
                        const SpecIcon = specInfo?.Icon || ClipboardList;

                        // Type badge config
                        const typeConfig = {
                          doctor:         { label: 'طبيب',       color: 'info',    Icon: Stethoscope },
                          pharmacist:     { label: 'صيدلي',      color: 'success', Icon: Pill },
                          lab_technician: { label: 'فني مختبر',  color: 'warning', Icon: Microscope }
                        };
                        const typeInfo = typeConfig[reqType] || typeConfig.doctor;
                        const TypeIcon = typeInfo.Icon;

                        // License number (differs per type)
                        const licenseNum = req.medicalLicenseNumber
                          || req.pharmacyLicenseNumber
                          || req.licenseNumber
                          || '-';

                        // Specialization / degree label
                        const specLabel = reqType === 'doctor'
                          ? (specInfo?.nameAr || req.specialization || '-')
                          : (req.degree || req.specialization || '-');

                        return (
                          <tr key={req._id}>
                            <td>
                              <span className="ad-cell-id">
                                {req.requestId || req._id?.slice(-8)?.toUpperCase()}
                              </span>
                            </td>
                            <td>
                              <div className="ad-cell-name">
                                <strong>
                                  {req.firstName} {req.fatherName ? req.fatherName + ' ' : ''}{req.lastName}
                                </strong>
                                <small>{req.nationalId}</small>
                              </div>
                            </td>
                            <td>
                              <span className={`ad-pill ${typeInfo.color}`}>
                                <TypeIcon size={11} strokeWidth={2.5} />
                                {typeInfo.label}
                              </span>
                            </td>
                            <td>
                              {reqType === 'doctor' ? (
                                <div className="ad-cell-spec">
                                  <div className="ad-cell-spec-icon">
                                    <SpecIcon size={14} strokeWidth={2.2} />
                                  </div>
                                  <span>{specLabel}</span>
                                  {specInfo?.hasAI && (
                                    <span className="ad-pill info" style={{ marginInlineStart: 4 }}>AI</span>
                                  )}
                                </div>
                              ) : (
                                <span>{specLabel}</span>
                              )}
                            </td>
                            <td>
                              <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, direction: 'ltr', display: 'inline-block' }}>
                                {licenseNum}
                              </span>
                            </td>
                            <td>
                              <span style={{ fontSize: '0.78rem', color: 'var(--tm-text-muted)' }}>
                                {formatArabicDate(req.createdAt)}
                              </span>
                            </td>
                            <td>
                              {req.status === 'pending' && (
                                <span className="ad-pill warning">
                                  <Clock size={11} strokeWidth={2.5} />
                                  قيد المراجعة
                                </span>
                              )}
                              {req.status === 'approved' && (
                                <span className="ad-pill success">
                                  <CheckCircle2 size={11} strokeWidth={2.5} />
                                  تمت الموافقة
                                </span>
                              )}
                              {req.status === 'rejected' && (
                                <span className="ad-pill error">
                                  <XCircle size={11} strokeWidth={2.5} />
                                  مرفوض
                                </span>
                              )}
                            </td>
                            <td>
                              <div className="ad-cell-actions">
                                <button
                                  type="button"
                                  className="ad-action-btn view"
                                  onClick={() => handleViewRequest(req)}
                                  title="عرض التفاصيل"
                                  aria-label="عرض التفاصيل"
                                >
                                  <Eye size={16} strokeWidth={2.2} />
                                </button>
                                {req.status === 'pending' && (
                                  <>
                                    <button
                                      type="button"
                                      className="ad-action-btn accept"
                                      onClick={() => {
                                        setSelectedRequest(req);
                                        setShowAcceptConfirm(true);
                                      }}
                                      title="قبول الطلب"
                                      aria-label="قبول الطلب"
                                    >
                                      <Check size={16} strokeWidth={2.5} />
                                    </button>
                                    <button
                                      type="button"
                                      className="ad-action-btn reject"
                                      onClick={() => {
                                        setSelectedRequest(req);
                                        setShowRejectModal(true);
                                      }}
                                      title="رفض الطلب"
                                      aria-label="رفض الطلب"
                                    >
                                      <X size={16} strokeWidth={2.5} />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* ───────────────────────────────────────────────────────
              SECTIONS CONTINUE IN PART C & PART D
              ─────────────────────────────────────────────────────── */}
          {/* ═══════════════════════════════════════════════════════
              SECTION: DOCTORS
              ═══════════════════════════════════════════════════════ */}
          {activeSection === 'doctors' && (
            <>
              <div className="ad-page-header">
                <div className="ad-page-title">
                  <button
                    type="button"
                    className="ad-btn ad-btn-icon ad-mobile-toggle"
                    onClick={() => setSidebarOpen(true)}
                    aria-label="فتح القائمة"
                  >
                    <Menu size={20} strokeWidth={2.2} />
                  </button>
                  <div className="ad-page-title-icon">
                    <Stethoscope size={24} strokeWidth={2} />
                  </div>
                  <div>
                    <h1>إدارة الأطباء</h1>
                    <p>عرض وإدارة جميع حسابات الأطباء المسجلين</p>
                  </div>
                </div>
                <div className="ad-page-actions">
                  <button
                    type="button"
                    className="ad-btn ad-btn-secondary"
                    onClick={loadDoctors}
                  >
                    <RotateCcw size={16} strokeWidth={2.2} />
                    تحديث
                  </button>
                  <button
                    type="button"
                    className="ad-btn ad-btn-primary"
                    onClick={() => setShowAddDoctorForm(true)}
                  >
                    <UserPlus size={18} strokeWidth={2.2} />
                    إضافة طبيب
                  </button>
                </div>
              </div>

              {/* Toolbar */}
              <div className="ad-toolbar">
                <div className="ad-search-box">
                  <Search size={18} strokeWidth={2} />
                  <input
                    ref={searchInputRef}
                    type="text"
                    className="ad-search-input"
                    placeholder="البحث بالاسم، رقم الترخيص، أو الرقم الوطني..."
                    value={doctorSearch}
                    onChange={(e) => setDoctorSearch(e.target.value)}
                  />
                </div>
                <div className="ad-filter-chips">
                  <button
                    type="button"
                    className={`ad-chip ${doctorFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setDoctorFilter('all')}
                  >
                    الكل
                    <span className="ad-chip-count">{doctors.length}</span>
                  </button>
                  <button
                    type="button"
                    className={`ad-chip approved ${doctorFilter === 'active' ? 'active' : ''}`}
                    onClick={() => setDoctorFilter('active')}
                  >
                    <CheckCircle2 size={13} strokeWidth={2.5} />
                    نشط
                    <span className="ad-chip-count">
                      {doctors.filter((d) => d.isActive !== false).length}
                    </span>
                  </button>
                  <button
                    type="button"
                    className={`ad-chip rejected ${doctorFilter === 'inactive' ? 'active' : ''}`}
                    onClick={() => setDoctorFilter('inactive')}
                  >
                    <Ban size={13} strokeWidth={2.5} />
                    غير نشط
                    <span className="ad-chip-count">
                      {doctors.filter((d) => d.isActive === false).length}
                    </span>
                  </button>
                </div>
              </div>

              {/* Doctors table */}
              {doctorsLoading ? (
                <div className="ad-section-loading">
                  <Loader2 size={36} className="ad-spin" color="var(--tm-action)" />
                  <p>جاري تحميل الأطباء...</p>
                </div>
              ) : filteredDoctors.length === 0 ? (
                <div className="ad-card">
                  <div className="ad-empty">
                    <div className="ad-empty-icon">
                      <Stethoscope size={32} strokeWidth={1.8} />
                    </div>
                    <h3>لا يوجد أطباء</h3>
                    <p>لا يوجد أطباء مطابقين للمعايير المحددة</p>
                  </div>
                </div>
              ) : (
                <div className="ad-table-wrap">
                  <table className="ad-table">
                    <thead>
                      <tr>
                        <th>الاسم</th>
                        <th>التخصص</th>
                        <th>رقم الترخيص</th>
                        <th>المستشفى</th>
                        <th>سنوات الخبرة</th>
                        <th>الحالة</th>
                        <th>الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDoctors.map((doctor) => {
                        const specInfo = getSpecializationInfo(doctor.specialization);
                        const SpecIcon = specInfo.Icon;
                        const isActive = doctor.isActive !== false;
                        return (
                          <tr key={doctor._id || doctor.id} className={!isActive ? 'inactive' : ''}>
                            <td>
                              <div className="ad-cell-name">
                                <strong>د. {doctor.firstName} {doctor.lastName}</strong>
                                <small>{doctor.nationalId}</small>
                              </div>
                            </td>
                            <td>
                              <div className="ad-cell-spec">
                                <div className="ad-cell-spec-icon">
                                  <SpecIcon size={14} strokeWidth={2.2} />
                                </div>
                                <span>{specInfo.nameAr}</span>
                              </div>
                            </td>
                            <td>
                              <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, direction: 'ltr', display: 'inline-block' }}>
                                {doctor.medicalLicenseNumber}
                              </span>
                            </td>
                            <td>
                              <span style={{ fontSize: '0.825rem' }}>
                                {doctor.hospitalAffiliation || '-'}
                              </span>
                            </td>
                            <td>
                              <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700 }}>
                                {doctor.yearsOfExperience || 0} سنة
                              </span>
                            </td>
                            <td>
                              {isActive ? (
                                <span className="ad-pill success">
                                  <CheckCircle2 size={11} strokeWidth={2.5} />
                                  نشط
                                </span>
                              ) : (
                                <span className="ad-pill error">
                                  <Ban size={11} strokeWidth={2.5} />
                                  غير نشط
                                </span>
                              )}
                            </td>
                            <td>
                              <div className="ad-cell-actions">
                                <button
                                  type="button"
                                  className="ad-action-btn view"
                                  onClick={() => { setSelectedDoctor(doctor); setShowDoctorDetails(true); }}
                                  title="عرض التفاصيل"
                                  aria-label="عرض التفاصيل"
                                >
                                  <Eye size={16} strokeWidth={2.2} />
                                </button>
                                {isActive ? (
                                  <button
                                    type="button"
                                    className="ad-action-btn deactivate"
                                    onClick={() => openDeactivateModal(doctor, 'doctor')}
                                    title="إلغاء التفعيل"
                                    aria-label="إلغاء التفعيل"
                                  >
                                    <Ban size={16} strokeWidth={2.2} />
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    className="ad-action-btn reactivate"
                                    onClick={() => handleReactivate(doctor, 'doctor')}
                                    title="إعادة التفعيل"
                                    aria-label="إعادة التفعيل"
                                  >
                                    <UserCheck size={16} strokeWidth={2.2} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* ═══════════════════════════════════════════════════════
              SECTION: PATIENTS
              ═══════════════════════════════════════════════════════ */}
          {activeSection === 'patients' && (
            <>
              <div className="ad-page-header">
                <div className="ad-page-title">
                  <button
                    type="button"
                    className="ad-btn ad-btn-icon ad-mobile-toggle"
                    onClick={() => setSidebarOpen(true)}
                    aria-label="فتح القائمة"
                  >
                    <Menu size={20} strokeWidth={2.2} />
                  </button>
                  <div className="ad-page-title-icon">
                    <Users size={24} strokeWidth={2} />
                  </div>
                  <div>
                    <h1>إدارة المرضى</h1>
                    <p>عرض وإدارة جميع حسابات المرضى المسجلين</p>
                  </div>
                </div>
                <div className="ad-page-actions">
                  <button
                    type="button"
                    className="ad-btn ad-btn-secondary"
                    onClick={loadPatients}
                  >
                    <RotateCcw size={16} strokeWidth={2.2} />
                    تحديث
                  </button>
                </div>
              </div>

              {/* Toolbar */}
              <div className="ad-toolbar">
                <div className="ad-search-box">
                  <Search size={18} strokeWidth={2} />
                  <input
                    type="text"
                    className="ad-search-input"
                    placeholder="البحث بالاسم أو الرقم الوطني..."
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                  />
                </div>
                <div className="ad-filter-chips">
                  <button
                    type="button"
                    className={`ad-chip ${patientFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setPatientFilter('all')}
                  >
                    الكل
                    <span className="ad-chip-count">{patients.length}</span>
                  </button>
                  <button
                    type="button"
                    className={`ad-chip approved ${patientFilter === 'active' ? 'active' : ''}`}
                    onClick={() => setPatientFilter('active')}
                  >
                    <CheckCircle2 size={13} strokeWidth={2.5} />
                    نشط
                    <span className="ad-chip-count">
                      {patients.filter((p) => p.isActive !== false).length}
                    </span>
                  </button>
                  <button
                    type="button"
                    className={`ad-chip rejected ${patientFilter === 'inactive' ? 'active' : ''}`}
                    onClick={() => setPatientFilter('inactive')}
                  >
                    <Ban size={13} strokeWidth={2.5} />
                    غير نشط
                    <span className="ad-chip-count">
                      {patients.filter((p) => p.isActive === false).length}
                    </span>
                  </button>
                </div>
              </div>

              {/* Patients table */}
              {patientsLoading ? (
                <div className="ad-section-loading">
                  <Loader2 size={36} className="ad-spin" color="var(--tm-action)" />
                  <p>جاري تحميل المرضى...</p>
                </div>
              ) : filteredPatients.length === 0 ? (
                <div className="ad-card">
                  <div className="ad-empty">
                    <div className="ad-empty-icon">
                      <Users size={32} strokeWidth={1.8} />
                    </div>
                    <h3>لا يوجد مرضى</h3>
                    <p>لا يوجد مرضى مطابقين للمعايير المحددة</p>
                  </div>
                </div>
              ) : (
                <div className="ad-table-wrap">
                  <table className="ad-table">
                    <thead>
                      <tr>
                        <th>الاسم</th>
                        <th>الرقم الوطني</th>
                        <th>الجنس</th>
                        <th>المحافظة</th>
                        <th>الهاتف</th>
                        <th>الحالة</th>
                        <th>الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPatients.map((patient) => {
                        const isActive = patient.isActive !== false;
                        return (
                          <tr key={patient._id || patient.id} className={!isActive ? 'inactive' : ''}>
                            <td>
                              <div className="ad-cell-name">
                                <strong>{patient.firstName} {patient.lastName}</strong>
                              </div>
                            </td>
                            <td>
                              <span className="ad-cell-id">
                                {patient.nationalId || '-'}
                              </span>
                            </td>
                            <td>
                              <span className="ad-pill muted">
                                {patient.gender === 'male' ? 'ذكر' : 'أنثى'}
                              </span>
                            </td>
                            <td>
                              <span style={{ fontSize: '0.825rem' }}>
                                {getGovernorateName(patient.governorate)}
                              </span>
                            </td>
                            <td>
                              <span style={{ fontFamily: 'Inter, sans-serif', direction: 'ltr', display: 'inline-block' }}>
                                {patient.phoneNumber || '-'}
                              </span>
                            </td>
                            <td>
                              {isActive ? (
                                <span className="ad-pill success">
                                  <CheckCircle2 size={11} strokeWidth={2.5} />
                                  نشط
                                </span>
                              ) : (
                                <span className="ad-pill error">
                                  <Ban size={11} strokeWidth={2.5} />
                                  غير نشط
                                </span>
                              )}
                            </td>
                            <td>
                              <div className="ad-cell-actions">
                                <button
                                  type="button"
                                  className="ad-action-btn view"
                                  onClick={() => { setSelectedPatient(patient); setShowPatientDetails(true); }}
                                  title="عرض التفاصيل"
                                  aria-label="عرض التفاصيل"
                                >
                                  <Eye size={16} strokeWidth={2.2} />
                                </button>
                                {isActive ? (
                                  <button
                                    type="button"
                                    className="ad-action-btn deactivate"
                                    onClick={() => openDeactivateModal(patient, 'patient')}
                                    title="إلغاء التفعيل"
                                    aria-label="إلغاء التفعيل"
                                  >
                                    <Ban size={16} strokeWidth={2.2} />
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    className="ad-action-btn reactivate"
                                    onClick={() => handleReactivate(patient, 'patient')}
                                    title="إعادة التفعيل"
                                    aria-label="إعادة التفعيل"
                                  >
                                    <UserCheck size={16} strokeWidth={2.2} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* ═══════════════════════════════════════════════════════
              SECTION: CHILDREN (with migration tracking)
              ═══════════════════════════════════════════════════════ */}
          {activeSection === 'children' && (
            <>
              <div className="ad-page-header">
                <div className="ad-page-title">
                  <button
                    type="button"
                    className="ad-btn ad-btn-icon ad-mobile-toggle"
                    onClick={() => setSidebarOpen(true)}
                    aria-label="فتح القائمة"
                  >
                    <Menu size={20} strokeWidth={2.2} />
                  </button>
                  <div className="ad-page-title-icon">
                    <Baby size={24} strokeWidth={2} />
                  </div>
                  <div>
                    <h1>سجل الأطفال</h1>
                    <p>إدارة الأطفال أقل من 14 سنة وترحيلهم إلى سجل البالغين</p>
                  </div>
                </div>
                <div className="ad-page-actions">
                  <button
                    type="button"
                    className="ad-btn ad-btn-secondary"
                    onClick={loadChildren}
                  >
                    <RotateCcw size={16} strokeWidth={2.2} />
                    تحديث
                  </button>
                </div>
              </div>

              {/* Toolbar with migration filter */}
              <div className="ad-toolbar">
                <div className="ad-search-box">
                  <Search size={18} strokeWidth={2} />
                  <input
                    type="text"
                    className="ad-search-input"
                    placeholder="البحث بالاسم أو رقم تسجيل الطفل أو الرقم الوطني للوالد..."
                    value={childSearch}
                    onChange={(e) => setChildSearch(e.target.value)}
                  />
                </div>
                <div className="ad-filter-chips">
                  <button
                    type="button"
                    className={`ad-chip ${childFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setChildFilter('all')}
                  >
                    الكل
                    <span className="ad-chip-count">{children.length}</span>
                  </button>
                  {MIGRATION_STATUSES.map((status) => (
                    <button
                      key={status.id}
                      type="button"
                      className={`ad-chip ${
                        status.id === 'pending'  ? 'pending'  :
                        status.id === 'ready'    ? 'approved' :
                        status.id === 'migrated' ? 'approved' : ''
                      } ${childFilter === status.id ? 'active' : ''}`}
                      onClick={() => setChildFilter(status.id)}
                    >
                      {status.id === 'pending'  && <Clock size={13} strokeWidth={2.5} />}
                      {status.id === 'ready'    && <AlertCircle size={13} strokeWidth={2.5} />}
                      {status.id === 'migrated' && <CheckCircle2 size={13} strokeWidth={2.5} />}
                      {status.nameAr}
                      <span className="ad-chip-count">
                        {children.filter((c) => c.migrationStatus === status.id).length}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Children table */}
              {childrenLoading ? (
                <div className="ad-section-loading">
                  <Loader2 size={36} className="ad-spin" color="var(--tm-action)" />
                  <p>جاري تحميل الأطفال...</p>
                </div>
              ) : filteredChildren.length === 0 ? (
                <div className="ad-card">
                  <div className="ad-empty">
                    <div className="ad-empty-icon">
                      <Baby size={32} strokeWidth={1.8} />
                    </div>
                    <h3>لا يوجد أطفال</h3>
                    <p>لا يوجد أطفال مطابقين للمعايير المحددة</p>
                  </div>
                </div>
              ) : (
                <div className="ad-table-wrap">
                  <table className="ad-table">
                    <thead>
                      <tr>
                        <th>اسم الطفل</th>
                        <th>رقم التسجيل</th>
                        <th>الرقم الوطني للوالد</th>
                        <th>تاريخ الميلاد</th>
                        <th>حالة الترحيل</th>
                        <th>الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredChildren.map((child) => {
                        const status = child.migrationStatus || 'pending';
                        return (
                          <tr key={child._id || child.id}>
                            <td>
                              <div className="ad-cell-name">
                                <strong>{child.firstName} {child.lastName}</strong>
                                <small>{child.gender === 'male' ? 'ذكر' : 'أنثى'}</small>
                              </div>
                            </td>
                            <td>
                              <span className="ad-cell-id">
                                {child.childRegistrationNumber || '-'}
                              </span>
                            </td>
                            <td>
                              <span style={{ fontFamily: 'Inter, sans-serif', direction: 'ltr', display: 'inline-block' }}>
                                {child.parentNationalId || '-'}
                              </span>
                            </td>
                            <td>
                              <span style={{ fontSize: '0.825rem', color: 'var(--tm-text-muted)' }}>
                                {formatArabicDate(child.dateOfBirth)}
                              </span>
                            </td>
                            <td>
                              {status === 'pending' && (
                                <span className="ad-pill muted">
                                  <Clock size={11} strokeWidth={2.5} />
                                  بانتظار الترحيل
                                </span>
                              )}
                              {status === 'ready' && (
                                <span className="ad-pill warning">
                                  <AlertCircle size={11} strokeWidth={2.5} />
                                  جاهز للترحيل
                                </span>
                              )}
                              {status === 'migrated' && (
                                <span className="ad-pill success">
                                  <CheckCircle2 size={11} strokeWidth={2.5} />
                                  تم الترحيل
                                </span>
                              )}
                            </td>
                            <td>
                              <div className="ad-cell-actions">
                                <button
                                  type="button"
                                  className="ad-action-btn view"
                                  onClick={() => { setSelectedChild(child); setShowChildDetails(true); }}
                                  title="عرض التفاصيل"
                                  aria-label="عرض التفاصيل"
                                >
                                  <Eye size={16} strokeWidth={2.2} />
                                </button>
                                {status === 'ready' && (
                                  <button
                                    type="button"
                                    className="ad-action-btn accept"
                                    onClick={() => handleMigrateChild(child._id || child.id)}
                                    title="ترحيل إلى سجل البالغين"
                                    aria-label="ترحيل"
                                  >
                                    <ArrowLeft size={16} strokeWidth={2.5} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* ═══════════════════════════════════════════════════════
              SECTION: HOSPITALS
              ═══════════════════════════════════════════════════════ */}
          {activeSection === 'hospitals' && (
            <>
              <div className="ad-page-header">
                <div className="ad-page-title">
                  <button
                    type="button"
                    className="ad-btn ad-btn-icon ad-mobile-toggle"
                    onClick={() => setSidebarOpen(true)}
                    aria-label="فتح القائمة"
                  >
                    <Menu size={20} strokeWidth={2.2} />
                  </button>
                  <div className="ad-page-title-icon">
                    <Hospital size={24} strokeWidth={2} />
                  </div>
                  <div>
                    <h1>المستشفيات</h1>
                    <p>إدارة جميع المستشفيات الحكومية والخاصة في النظام</p>
                  </div>
                </div>
                <div className="ad-page-actions">
                  <button
                    type="button"
                    className="ad-btn ad-btn-secondary"
                    onClick={loadHospitals}
                  >
                    <RotateCcw size={16} strokeWidth={2.2} />
                    تحديث
                  </button>
                  <button
                    type="button"
                    className="ad-btn ad-btn-primary"
                    onClick={() => openHospitalForm()}
                  >
                    <Plus size={18} strokeWidth={2.2} />
                    إضافة مستشفى
                  </button>
                </div>
              </div>

              <div className="ad-toolbar">
                <div className="ad-search-box">
                  <Search size={18} strokeWidth={2} />
                  <input
                    type="text"
                    className="ad-search-input"
                    placeholder="البحث باسم المستشفى أو رقم التسجيل أو المحافظة..."
                    value={hospitalSearch}
                    onChange={(e) => setHospitalSearch(e.target.value)}
                  />
                </div>
              </div>

              {hospitalsLoading ? (
                <div className="ad-section-loading">
                  <Loader2 size={36} className="ad-spin" color="var(--tm-action)" />
                  <p>جاري تحميل المستشفيات...</p>
                </div>
              ) : filteredHospitals.length === 0 ? (
                <div className="ad-card">
                  <div className="ad-empty">
                    <div className="ad-empty-icon">
                      <Hospital size={32} strokeWidth={1.8} />
                    </div>
                    <h3>لا توجد مستشفيات</h3>
                    <p>ابدأ بإضافة أول مستشفى للنظام</p>
                  </div>
                </div>
              ) : (
                <div className="ad-table-wrap">
                  <table className="ad-table">
                    <thead>
                      <tr>
                        <th>اسم المستشفى</th>
                        <th>النوع</th>
                        <th>المحافظة</th>
                        <th>عدد الأسرّة</th>
                        <th>الخدمات</th>
                        <th>الهاتف</th>
                        <th>الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredHospitals.map((hospital) => {
                        const typeInfo = HOSPITAL_TYPES.find((t) => t.id === hospital.hospitalType);
                        return (
                          <tr key={hospital._id || hospital.id}>
                            <td>
                              <div className="ad-cell-name">
                                <strong>{hospital.arabicName || hospital.name}</strong>
                                {hospital.arabicName && <small>{hospital.name}</small>}
                              </div>
                            </td>
                            <td>
                              <span className="ad-pill info">
                                {typeInfo?.nameAr || hospital.hospitalType}
                              </span>
                            </td>
                            <td>
                              <span style={{ fontSize: '0.825rem' }}>
                                {getGovernorateName(hospital.governorate)}
                                {hospital.city && ` - ${hospital.city}`}
                              </span>
                            </td>
                            <td>
                              <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700 }}>
                                {hospital.numberOfBeds || 0}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                {hospital.hasEmergency  && <span className="ad-pill error" title="طوارئ">طوارئ</span>}
                                {hospital.hasICU        && <span className="ad-pill warning" title="عناية مشددة">ICU</span>}
                                {hospital.hasLaboratory && <span className="ad-pill info" title="مختبر">مختبر</span>}
                                {hospital.hasPharmacy   && <span className="ad-pill success" title="صيدلية">صيدلية</span>}
                                {hospital.hasRadiology  && <span className="ad-pill muted" title="أشعة">أشعة</span>}
                              </div>
                            </td>
                            <td>
                              <span style={{ fontFamily: 'Inter, sans-serif', direction: 'ltr', display: 'inline-block', fontSize: '0.78rem' }}>
                                {hospital.phoneNumber || '-'}
                              </span>
                            </td>
                            <td>
                              <div className="ad-cell-actions">
                                <button
                                  type="button"
                                  className="ad-action-btn edit"
                                  onClick={() => openHospitalForm(hospital)}
                                  title="تعديل"
                                  aria-label="تعديل"
                                >
                                  <Edit3 size={16} strokeWidth={2.2} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* ───────────────────────────────────────────────────────
              SECTIONS CONTINUE IN PART D:
              - Pharmacies
              - Laboratories
              - Emergency reports
              - Reviews moderation
              - Audit log
              + ALL modals (add doctor, add hospital, add pharmacy, add lab,
                request details, accept confirm, reject, credentials,
                deactivate, doctor details, patient details, child details)
              + closing tags + export
              ─────────────────────────────────────────────────────── */}
          {/* ═══════════════════════════════════════════════════════
              SECTION: PHARMACIES
              ═══════════════════════════════════════════════════════ */}
          {activeSection === 'pharmacies' && (
            <>
              <div className="ad-page-header">
                <div className="ad-page-title">
                  <button
                    type="button"
                    className="ad-btn ad-btn-icon ad-mobile-toggle"
                    onClick={() => setSidebarOpen(true)}
                    aria-label="فتح القائمة"
                  >
                    <Menu size={20} strokeWidth={2.2} />
                  </button>
                  <div className="ad-page-title-icon">
                    <Pill size={24} strokeWidth={2} />
                  </div>
                  <div>
                    <h1>الصيدليات</h1>
                    <p>إدارة جميع الصيدليات المعتمدة في النظام مع مواقعها الجغرافية</p>
                  </div>
                </div>
                <div className="ad-page-actions">
                  <button type="button" className="ad-btn ad-btn-secondary" onClick={loadPharmacies}>
                    <RotateCcw size={16} strokeWidth={2.2} />
                    تحديث
                  </button>
                  <button type="button" className="ad-btn ad-btn-primary" onClick={() => openPharmacyForm()}>
                    <Plus size={18} strokeWidth={2.2} />
                    إضافة صيدلية
                  </button>
                </div>
              </div>

              <div className="ad-toolbar">
                <div className="ad-search-box">
                  <Search size={18} strokeWidth={2} />
                  <input
                    type="text"
                    className="ad-search-input"
                    placeholder="البحث باسم الصيدلية أو رقم التسجيل..."
                    value={pharmacySearch}
                    onChange={(e) => setPharmacySearch(e.target.value)}
                  />
                </div>
              </div>

              {pharmaciesLoading ? (
                <div className="ad-section-loading">
                  <Loader2 size={36} className="ad-spin" color="var(--tm-action)" />
                  <p>جاري تحميل الصيدليات...</p>
                </div>
              ) : filteredPharmacies.length === 0 ? (
                <div className="ad-card">
                  <div className="ad-empty">
                    <div className="ad-empty-icon"><Pill size={32} strokeWidth={1.8} /></div>
                    <h3>لا توجد صيدليات</h3>
                    <p>ابدأ بإضافة أول صيدلية للنظام</p>
                  </div>
                </div>
              ) : (
                <div className="ad-table-wrap">
                  <table className="ad-table">
                    <thead>
                      <tr>
                        <th>اسم الصيدلية</th>
                        <th>النوع</th>
                        <th>المحافظة</th>
                        <th>رقم الترخيص</th>
                        <th>الهاتف</th>
                        <th>الموقع الجغرافي</th>
                        <th>الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPharmacies.map((pharmacy) => {
                        const typeInfo = PHARMACY_TYPES.find((t) => t.id === pharmacy.pharmacyType);
                        const hasLocation = pharmacy.location?.coordinates?.length === 2;
                        return (
                          <tr key={pharmacy._id || pharmacy.id}>
                            <td>
                              <div className="ad-cell-name">
                                <strong>{pharmacy.arabicName || pharmacy.name}</strong>
                                {pharmacy.arabicName && <small>{pharmacy.name}</small>}
                              </div>
                            </td>
                            <td><span className="ad-pill info">{typeInfo?.nameAr || pharmacy.pharmacyType}</span></td>
                            <td>
                              <span style={{ fontSize: '0.825rem' }}>
                                {getGovernorateName(pharmacy.governorate)}
                                {pharmacy.city && ` - ${pharmacy.city}`}
                              </span>
                            </td>
                            <td>
                              <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, direction: 'ltr', display: 'inline-block' }}>
                                {pharmacy.pharmacyLicense || '-'}
                              </span>
                            </td>
                            <td>
                              <span style={{ fontFamily: 'Inter, sans-serif', direction: 'ltr', display: 'inline-block', fontSize: '0.78rem' }}>
                                {pharmacy.phoneNumber || '-'}
                              </span>
                            </td>
                            <td>
                              {hasLocation ? (
                                <span className="ad-pill success">
                                  <MapPin size={11} strokeWidth={2.5} />
                                  محدد
                                </span>
                              ) : (
                                <span className="ad-pill muted">غير محدد</span>
                              )}
                            </td>
                            <td>
                              <div className="ad-cell-actions">
                                <button
                                  type="button"
                                  className="ad-action-btn edit"
                                  onClick={() => openPharmacyForm(pharmacy)}
                                  title="تعديل"
                                  aria-label="تعديل"
                                >
                                  <Edit3 size={16} strokeWidth={2.2} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* ═══════════════════════════════════════════════════════
              SECTION: LABORATORIES
              ═══════════════════════════════════════════════════════ */}
          {activeSection === 'laboratories' && (
            <>
              <div className="ad-page-header">
                <div className="ad-page-title">
                  <button
                    type="button"
                    className="ad-btn ad-btn-icon ad-mobile-toggle"
                    onClick={() => setSidebarOpen(true)}
                    aria-label="فتح القائمة"
                  >
                    <Menu size={20} strokeWidth={2.2} />
                  </button>
                  <div className="ad-page-title-icon">
                    <Microscope size={24} strokeWidth={2} />
                  </div>
                  <div>
                    <h1>المختبرات</h1>
                    <p>إدارة جميع المختبرات الطبية المعتمدة في النظام</p>
                  </div>
                </div>
                <div className="ad-page-actions">
                  <button type="button" className="ad-btn ad-btn-secondary" onClick={loadLaboratories}>
                    <RotateCcw size={16} strokeWidth={2.2} />
                    تحديث
                  </button>
                  <button type="button" className="ad-btn ad-btn-primary" onClick={() => openLabForm()}>
                    <Plus size={18} strokeWidth={2.2} />
                    إضافة مختبر
                  </button>
                </div>
              </div>

              <div className="ad-toolbar">
                <div className="ad-search-box">
                  <Search size={18} strokeWidth={2} />
                  <input
                    type="text"
                    className="ad-search-input"
                    placeholder="البحث باسم المختبر أو رقم التسجيل..."
                    value={labSearch}
                    onChange={(e) => setLabSearch(e.target.value)}
                  />
                </div>
              </div>

              {labsLoading ? (
                <div className="ad-section-loading">
                  <Loader2 size={36} className="ad-spin" color="var(--tm-action)" />
                  <p>جاري تحميل المختبرات...</p>
                </div>
              ) : filteredLabs.length === 0 ? (
                <div className="ad-card">
                  <div className="ad-empty">
                    <div className="ad-empty-icon"><Microscope size={32} strokeWidth={1.8} /></div>
                    <h3>لا توجد مختبرات</h3>
                    <p>ابدأ بإضافة أول مختبر للنظام</p>
                  </div>
                </div>
              ) : (
                <div className="ad-table-wrap">
                  <table className="ad-table">
                    <thead>
                      <tr>
                        <th>اسم المختبر</th>
                        <th>النوع</th>
                        <th>المحافظة</th>
                        <th>رقم الترخيص</th>
                        <th>الهاتف</th>
                        <th>الموقع الجغرافي</th>
                        <th>الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLabs.map((lab) => {
                        const typeInfo = LAB_TYPES.find((t) => t.id === lab.labType);
                        const hasLocation = lab.location?.coordinates?.length === 2;
                        return (
                          <tr key={lab._id || lab.id}>
                            <td>
                              <div className="ad-cell-name">
                                <strong>{lab.arabicName || lab.name}</strong>
                                {lab.arabicName && <small>{lab.name}</small>}
                              </div>
                            </td>
                            <td><span className="ad-pill info">{typeInfo?.nameAr || lab.labType}</span></td>
                            <td>
                              <span style={{ fontSize: '0.825rem' }}>
                                {getGovernorateName(lab.governorate)}
                                {lab.city && ` - ${lab.city}`}
                              </span>
                            </td>
                            <td>
                              <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, direction: 'ltr', display: 'inline-block' }}>
                                {lab.labLicense || '-'}
                              </span>
                            </td>
                            <td>
                              <span style={{ fontFamily: 'Inter, sans-serif', direction: 'ltr', display: 'inline-block', fontSize: '0.78rem' }}>
                                {lab.phoneNumber || '-'}
                              </span>
                            </td>
                            <td>
                              {hasLocation ? (
                                <span className="ad-pill success">
                                  <MapPin size={11} strokeWidth={2.5} />
                                  محدد
                                </span>
                              ) : (
                                <span className="ad-pill muted">غير محدد</span>
                              )}
                            </td>
                            <td>
                              <div className="ad-cell-actions">
                                <button
                                  type="button"
                                  className="ad-action-btn edit"
                                  onClick={() => openLabForm(lab)}
                                  title="تعديل"
                                  aria-label="تعديل"
                                >
                                  <Edit3 size={16} strokeWidth={2.2} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* ═══════════════════════════════════════════════════════
              SECTION: EMERGENCY REPORTS
              ═══════════════════════════════════════════════════════ */}
          {activeSection === 'emergency' && (
            <>
              <div className="ad-page-header">
                <div className="ad-page-title">
                  <button
                    type="button"
                    className="ad-btn ad-btn-icon ad-mobile-toggle"
                    onClick={() => setSidebarOpen(true)}
                    aria-label="فتح القائمة"
                  >
                    <Menu size={20} strokeWidth={2.2} />
                  </button>
                  <div className="ad-page-title-icon">
                    <Siren size={24} strokeWidth={2} />
                  </div>
                  <div>
                    <h1>تقارير الطوارئ</h1>
                    <p>تقارير الطوارئ القادمة من تطبيق الموبايل مع تصنيف الذكاء الاصطناعي</p>
                  </div>
                </div>
                <div className="ad-page-actions">
                  <button type="button" className="ad-btn ad-btn-secondary" onClick={loadEmergencyReports}>
                    <RotateCcw size={16} strokeWidth={2.2} />
                    تحديث
                  </button>
                </div>
              </div>

              <div className="ad-toolbar">
                <div className="ad-filter-chips">
                  <button
                    type="button"
                    className={`ad-chip ${emergencyFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setEmergencyFilter('all')}
                  >
                    الكل
                    <span className="ad-chip-count">{emergencyReports.length}</span>
                  </button>
                  {RISK_LEVELS.map((risk) => (
                    <button
                      key={risk.id}
                      type="button"
                      className={`ad-chip ${
                        risk.id === 'critical' ? 'critical' :
                        risk.id === 'high'     ? 'rejected' :
                        risk.id === 'moderate' ? 'pending'  :
                        'approved'
                      } ${emergencyFilter === risk.id ? 'active' : ''}`}
                      onClick={() => setEmergencyFilter(risk.id)}
                    >
                      {risk.id === 'critical' && <AlertTriangle size={13} strokeWidth={2.5} />}
                      {risk.id === 'high'     && <AlertCircle size={13} strokeWidth={2.5} />}
                      {risk.id === 'moderate' && <Info size={13} strokeWidth={2.5} />}
                      {risk.id === 'low'      && <CheckCircle2 size={13} strokeWidth={2.5} />}
                      {risk.nameAr}
                      <span className="ad-chip-count">
                        {emergencyReports.filter((e) => e.aiRiskLevel === risk.id).length}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {emergencyLoading ? (
                <div className="ad-section-loading">
                  <Loader2 size={36} className="ad-spin" color="var(--tm-action)" />
                  <p>جاري تحميل التقارير...</p>
                </div>
              ) : filteredEmergencies.length === 0 ? (
                <div className="ad-card">
                  <div className="ad-empty">
                    <div className="ad-empty-icon"><Siren size={32} strokeWidth={1.8} /></div>
                    <h3>لا توجد تقارير طوارئ</h3>
                    <p>لا توجد تقارير طوارئ مطابقة للمعايير المحددة</p>
                  </div>
                </div>
              ) : (
                <div className="ad-emergency-grid">
                  {filteredEmergencies.map((report) => {
                    const risk = report.aiRiskLevel || 'low';
                    const RiskIcon =
                      risk === 'critical' ? AlertTriangle :
                      risk === 'high'     ? AlertCircle :
                      risk === 'moderate' ? Info :
                      CheckCircle2;
                    const riskInfo = RISK_LEVELS.find((r) => r.id === risk);
                    return (
                      <div key={report._id || report.id} className={`ad-emergency-card ${risk}`}>
                        <div className="ad-emergency-header">
                          <div className="ad-emergency-risk-icon">
                            <RiskIcon size={22} strokeWidth={2.2} />
                          </div>
                          <div className="ad-emergency-info">
                            <h3 className="ad-emergency-name">
                              {report.patientName || `${report.firstName || ''} ${report.lastName || ''}`.trim() || 'مريض'}
                            </h3>
                            <span className="ad-emergency-time">
                              <Clock size={11} strokeWidth={2.5} />
                              {timeAgo(report.createdAt)}
                            </span>
                          </div>
                          <span className={`ad-pill ${
                            risk === 'critical' || risk === 'high' ? 'error' :
                            risk === 'moderate' ? 'warning' :
                            'success'
                          }`}>
                            {riskInfo?.nameAr || risk}
                          </span>
                        </div>

                        {report.symptoms && (
                          <p className="ad-emergency-desc">{report.symptoms}</p>
                        )}

                        <div className="ad-emergency-meta">
                          {report.location?.governorate && (
                            <span className="ad-emergency-meta-item">
                              <MapPin size={12} strokeWidth={2.2} />
                              {getGovernorateName(report.location.governorate)}
                            </span>
                          )}
                          {report.contactNumber && (
                            <span className="ad-emergency-meta-item">
                              <Phone size={12} strokeWidth={2.2} />
                              <span style={{ fontFamily: 'Inter, sans-serif', direction: 'ltr' }}>
                                {report.contactNumber}
                              </span>
                            </span>
                          )}
                          {report.aiConfidence !== undefined && (
                            <span className="ad-emergency-meta-item">
                              <Sparkles size={12} strokeWidth={2.2} />
                              ثقة الذكاء الاصطناعي: {(report.aiConfidence * 100).toFixed(0)}%
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* ═══════════════════════════════════════════════════════
              SECTION: REVIEWS MODERATION
              ═══════════════════════════════════════════════════════ */}
          {activeSection === 'reviews' && (
            <>
              <div className="ad-page-header">
                <div className="ad-page-title">
                  <button
                    type="button"
                    className="ad-btn ad-btn-icon ad-mobile-toggle"
                    onClick={() => setSidebarOpen(true)}
                    aria-label="فتح القائمة"
                  >
                    <Menu size={20} strokeWidth={2.2} />
                  </button>
                  <div className="ad-page-title-icon">
                    <Star size={24} strokeWidth={2} />
                  </div>
                  <div>
                    <h1>إدارة التقييمات</h1>
                    <p>مراجعة والإشراف على تقييمات المرضى للأطباء والمرافق الصحية</p>
                  </div>
                </div>
                <div className="ad-page-actions">
                  <button type="button" className="ad-btn ad-btn-secondary" onClick={loadReviews}>
                    <RotateCcw size={16} strokeWidth={2.2} />
                    تحديث
                  </button>
                </div>
              </div>

              <div className="ad-toolbar">
                <div className="ad-filter-chips">
                  <button
                    type="button"
                    className={`ad-chip ${reviewFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setReviewFilter('all')}
                  >
                    الكل
                    <span className="ad-chip-count">{reviews.length}</span>
                  </button>
                  {REVIEW_STATUSES.map((status) => (
                    <button
                      key={status.id}
                      type="button"
                      className={`ad-chip ${
                        status.id === 'pending'  ? 'pending'  :
                        status.id === 'approved' ? 'approved' :
                        status.id === 'rejected' ? 'rejected' :
                        'pending'
                      } ${reviewFilter === status.id ? 'active' : ''}`}
                      onClick={() => setReviewFilter(status.id)}
                    >
                      {status.nameAr}
                      <span className="ad-chip-count">
                        {reviews.filter((r) => r.status === status.id).length}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {reviewsLoading ? (
                <div className="ad-section-loading">
                  <Loader2 size={36} className="ad-spin" color="var(--tm-action)" />
                  <p>جاري تحميل التقييمات...</p>
                </div>
              ) : filteredReviews.length === 0 ? (
                <div className="ad-card">
                  <div className="ad-empty">
                    <div className="ad-empty-icon"><Star size={32} strokeWidth={1.8} /></div>
                    <h3>لا توجد تقييمات</h3>
                    <p>لا توجد تقييمات مطابقة للمعايير المحددة</p>
                  </div>
                </div>
              ) : (
                <div>
                  {filteredReviews.map((review) => (
                    <div key={review._id || review.id} className="ad-review-card">
                      <div className="ad-review-avatar">
                        <User size={20} strokeWidth={2.2} />
                      </div>
                      <div className="ad-review-content">
                        <div className="ad-review-header">
                          <span className="ad-review-author">
                            {review.patientName || review.authorName || 'مريض'}
                          </span>
                          <StarRating rating={review.rating || 0} />
                          {review.targetType && (
                            <span className="ad-pill muted">
                              {review.targetType === 'doctor'    ? 'تقييم طبيب' :
                               review.targetType === 'hospital'  ? 'تقييم مستشفى' :
                               review.targetType === 'pharmacy'  ? 'تقييم صيدلية' :
                               review.targetType === 'lab'       ? 'تقييم مختبر' :
                               review.targetType}
                            </span>
                          )}
                        </div>
                        <p className="ad-review-text">{review.comment || review.text || '-'}</p>
                        <div className="ad-review-meta">
                          {timeAgo(review.createdAt)}
                          {review.targetName && ` • ${review.targetName}`}
                        </div>
                      </div>
                      {review.status === 'pending' && (
                        <div className="ad-review-actions">
                          <button
                            type="button"
                            className="ad-action-btn accept"
                            onClick={() => handleReviewAction(review._id || review.id, 'approve')}
                            title="موافقة"
                          >
                            <Check size={16} strokeWidth={2.5} />
                          </button>
                          <button
                            type="button"
                            className="ad-action-btn reject"
                            onClick={() => handleReviewAction(review._id || review.id, 'reject')}
                            title="رفض"
                          >
                            <X size={16} strokeWidth={2.5} />
                          </button>
                          <button
                            type="button"
                            className="ad-action-btn deactivate"
                            onClick={() => handleReviewAction(review._id || review.id, 'flag')}
                            title="تبليغ"
                          >
                            <ShieldAlert size={16} strokeWidth={2.2} />
                          </button>
                        </div>
                      )}
                      {review.status !== 'pending' && (
                        <div className="ad-review-actions">
                          <span className={`ad-pill ${
                            review.status === 'approved' ? 'success' :
                            review.status === 'rejected' ? 'error' :
                            'warning'
                          }`}>
                            {REVIEW_STATUSES.find((s) => s.id === review.status)?.nameAr || review.status}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ═══════════════════════════════════════════════════════
              SECTION: AUDIT LOG
              ═══════════════════════════════════════════════════════ */}
          {activeSection === 'audit' && (
            <>
              <div className="ad-page-header">
                <div className="ad-page-title">
                  <button
                    type="button"
                    className="ad-btn ad-btn-icon ad-mobile-toggle"
                    onClick={() => setSidebarOpen(true)}
                    aria-label="فتح القائمة"
                  >
                    <Menu size={20} strokeWidth={2.2} />
                  </button>
                  <div className="ad-page-title-icon">
                    <Scroll size={24} strokeWidth={2} />
                  </div>
                  <div>
                    <h1>سجل النظام</h1>
                    <p>سجل شامل لجميع العمليات والإجراءات الإدارية في النظام</p>
                  </div>
                </div>
                <div className="ad-page-actions">
                  <button type="button" className="ad-btn ad-btn-secondary" onClick={loadAuditLogs}>
                    <RotateCcw size={16} strokeWidth={2.2} />
                    تحديث
                  </button>
                </div>
              </div>

              <div className="ad-toolbar">
                <div className="ad-search-box">
                  <Search size={18} strokeWidth={2} />
                  <input
                    type="text"
                    className="ad-search-input"
                    placeholder="البحث في السجلات بالإجراء، البريد الإلكتروني، أو الوصف..."
                    value={auditSearch}
                    onChange={(e) => setAuditSearch(e.target.value)}
                  />
                </div>
              </div>

              {auditLoading ? (
                <div className="ad-section-loading">
                  <Loader2 size={36} className="ad-spin" color="var(--tm-action)" />
                  <p>جاري تحميل السجلات...</p>
                </div>
              ) : filteredAuditLogs.length === 0 ? (
                <div className="ad-card">
                  <div className="ad-empty">
                    <div className="ad-empty-icon"><Scroll size={32} strokeWidth={1.8} /></div>
                    <h3>لا توجد سجلات</h3>
                    <p>لم يتم تسجيل أي عمليات بعد</p>
                  </div>
                </div>
              ) : (
                <div className="ad-audit-list">
                  {filteredAuditLogs.map((log, idx) => {
                    const action = log.action || '';
                    const isFailed = log.success === false;
                    const iconType =
                      isFailed ? 'error' :
                      action.includes('REJECT') || action.includes('DEACTIVATE') || action.includes('DELETE') ? 'error' :
                      action.includes('ACCEPT') || action.includes('APPROVE') || action.includes('REACTIVATE') ? 'success' :
                      action.includes('ADD') || action.includes('CREATE') ? 'info' :
                      action.includes('UPDATE') || action.includes('EDIT') ? 'warning' :
                      'info';
                    const ActIcon =
                      iconType === 'error'   ? XCircle :
                      iconType === 'success' ? CheckCircle2 :
                      iconType === 'warning' ? Edit3 :
                      Info;
                    return (
                      <div key={log._id || idx} className={`ad-audit-item ${isFailed ? 'failed' : ''}`}>
                        <div className={`ad-audit-icon ${iconType}`}>
                          <ActIcon size={18} strokeWidth={2.2} />
                        </div>
                        <div className="ad-audit-content">
                          <h4 className="ad-audit-action">
                            {log.description || log.details || log.action}
                          </h4>
                          <div className="ad-audit-meta">
                            {log.userEmail && (
                              <span className="ad-audit-meta-item">
                                <User size={11} strokeWidth={2.2} />
                                {log.userEmail}
                              </span>
                            )}
                            {log.userRole && (
                              <span className="ad-audit-meta-item">
                                <Shield size={11} strokeWidth={2.2} />
                                {log.userRole}
                              </span>
                            )}
                            {log.resourceType && (
                              <span className="ad-audit-meta-item">
                                <Database size={11} strokeWidth={2.2} />
                                {log.resourceType}
                              </span>
                            )}
                            {log.ipAddress && (
                              <span className="ad-audit-meta-item">
                                <Wifi size={11} strokeWidth={2.2} />
                                {log.ipAddress}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="ad-audit-time">
                          {formatArabicDateTime(log.timestamp || log.createdAt)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

        </main>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          ALL SECONDARY MODALS
          ═══════════════════════════════════════════════════════════ */}

      {/* ───────────────────────────────────────────────────────────
          DOCTOR REQUEST DETAILS MODAL
          ─────────────────────────────────────────────────────────── */}
      {showRequestDetails && selectedRequest && (
        <div className="ad-modal-overlay" onClick={() => setShowRequestDetails(false)} role="dialog" aria-modal="true">
          <div className="ad-modal large" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="ad-modal-close"
              onClick={() => setShowRequestDetails(false)}
              aria-label="إغلاق"
            >
              <X size={18} strokeWidth={2.5} />
            </button>

            <div className="ad-modal-header">
              <h2 style={{ textAlign: 'center' }}>تفاصيل طلب التسجيل</h2>
              <p className="ad-modal-subtitle">
                رقم الطلب: <span style={{ fontFamily: 'Inter, sans-serif', direction: 'ltr', display: 'inline-block' }}>
                  {selectedRequest.requestId || selectedRequest._id}
                </span>
              </p>
            </div>

            <div className="ad-request-details">
              {/* Personal Info */}
              <div className="ad-detail-section">
                <div className="ad-detail-section-header">
                  <div className="ad-detail-section-icon">
                    <User size={16} strokeWidth={2.2} />
                  </div>
                  <h4 className="ad-detail-section-title">المعلومات الشخصية</h4>
                </div>
                <div className="ad-detail-row">
                  <span className="ad-detail-label">الاسم الكامل</span>
                  <span className="ad-detail-value">
                    {selectedRequest.firstName} {selectedRequest.fatherName ? selectedRequest.fatherName + ' ' : ''}{selectedRequest.lastName}
                  </span>
                </div>
                <div className="ad-detail-row">
                  <span className="ad-detail-label">الرقم الوطني</span>
                  <span className="ad-detail-value ltr">{selectedRequest.nationalId}</span>
                </div>
                <div className="ad-detail-row">
                  <span className="ad-detail-label">تاريخ الميلاد</span>
                  <span className="ad-detail-value">{formatArabicDate(selectedRequest.dateOfBirth)}</span>
                </div>
                <div className="ad-detail-row">
                  <span className="ad-detail-label">الجنس</span>
                  <span className="ad-detail-value">
                    {selectedRequest.gender === 'male' ? 'ذكر' : 'أنثى'}
                  </span>
                </div>
                <div className="ad-detail-row">
                  <span className="ad-detail-label">الهاتف</span>
                  <span className="ad-detail-value ltr">{selectedRequest.phoneNumber}</span>
                </div>
                <div className="ad-detail-row">
                  <span className="ad-detail-label">البريد الإلكتروني</span>
                  <span className="ad-detail-value ltr">{selectedRequest.email}</span>
                </div>
                <div className="ad-detail-row">
                  <span className="ad-detail-label">المحافظة</span>
                  <span className="ad-detail-value">{getGovernorateName(selectedRequest.governorate)}</span>
                </div>
              </div>

              {/* Professional Info */}
              <div className="ad-detail-section">
                <div className="ad-detail-section-header">
                  <div className="ad-detail-section-icon">
                    <Briefcase size={16} strokeWidth={2.2} />
                  </div>
                  <h4 className="ad-detail-section-title">المعلومات المهنية</h4>
                </div>
                <div className="ad-detail-row">
                  <span className="ad-detail-label">رقم الترخيص</span>
                  <span className="ad-detail-value ltr">{selectedRequest.medicalLicenseNumber}</span>
                </div>
                <div className="ad-detail-row">
                  <span className="ad-detail-label">التخصص</span>
                  <span className="ad-detail-value">
                    {getSpecializationInfo(selectedRequest.specialization).nameAr}
                    {getSpecializationInfo(selectedRequest.specialization).hasAI && (
                      <span className="ad-pill info" style={{ marginInlineStart: 6 }}>AI</span>
                    )}
                  </span>
                </div>
                {selectedRequest.subSpecialization && (
                  <div className="ad-detail-row">
                    <span className="ad-detail-label">التخصص الفرعي</span>
                    <span className="ad-detail-value">{selectedRequest.subSpecialization}</span>
                  </div>
                )}
                <div className="ad-detail-row">
                  <span className="ad-detail-label">المستشفى</span>
                  <span className="ad-detail-value">{selectedRequest.hospitalAffiliation || '-'}</span>
                </div>
                <div className="ad-detail-row">
                  <span className="ad-detail-label">سنوات الخبرة</span>
                  <span className="ad-detail-value">{selectedRequest.yearsOfExperience || 0} سنة</span>
                </div>
                {selectedRequest.consultationFee !== undefined && (
                  <div className="ad-detail-row">
                    <span className="ad-detail-label">رسوم الكشف</span>
                    <span className="ad-detail-value">
                      {formatNumber(selectedRequest.consultationFee)} {selectedRequest.currency || 'SYP'}
                    </span>
                  </div>
                )}
                <div className="ad-detail-row">
                  <span className="ad-detail-label">تاريخ التقديم</span>
                  <span className="ad-detail-value">{formatArabicDateTime(selectedRequest.createdAt)}</span>
                </div>
              </div>
            </div>

            {/* Documents row */}
            {(selectedRequest.licenseDocumentUrl || selectedRequest.medicalCertificateUrl || selectedRequest.profilePhotoUrl) && (
              <div style={{ padding: '0 32px 20px' }}>
                <div className="ad-detail-section">
                  <div className="ad-detail-section-header">
                    <div className="ad-detail-section-icon">
                      <Paperclip size={16} strokeWidth={2.2} />
                    </div>
                    <h4 className="ad-detail-section-title">المستندات المرفقة</h4>
                  </div>
                  <div className="ad-docs-row">
                    {selectedRequest.licenseDocumentUrl && (
                      <a href={selectedRequest.licenseDocumentUrl} target="_blank" rel="noopener noreferrer" className="ad-doc-chip">
                        <FileText size={14} strokeWidth={2.2} />
                        وثيقة الترخيص
                        <ExternalLink size={12} strokeWidth={2.2} />
                      </a>
                    )}
                    {selectedRequest.medicalCertificateUrl && (
                      <a href={selectedRequest.medicalCertificateUrl} target="_blank" rel="noopener noreferrer" className="ad-doc-chip">
                        <Award size={14} strokeWidth={2.2} />
                        الشهادة الطبية
                        <ExternalLink size={12} strokeWidth={2.2} />
                      </a>
                    )}
                    {selectedRequest.profilePhotoUrl && (
                      <a href={selectedRequest.profilePhotoUrl} target="_blank" rel="noopener noreferrer" className="ad-doc-chip">
                        <User size={14} strokeWidth={2.2} />
                        الصورة الشخصية
                        <ExternalLink size={12} strokeWidth={2.2} />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Action footer for pending requests */}
            {selectedRequest.status === 'pending' && (
              <div className="ad-request-footer">
                <button
                  type="button"
                  className="ad-btn ad-btn-secondary"
                  onClick={() => setShowRequestDetails(false)}
                >
                  إغلاق
                </button>
                <button
                  type="button"
                  className="ad-btn ad-btn-danger"
                  onClick={() => setShowRejectModal(true)}
                >
                  <X size={16} strokeWidth={2.5} />
                  رفض الطلب
                </button>
                <button
                  type="button"
                  className="ad-btn ad-btn-success"
                  onClick={() => setShowAcceptConfirm(true)}
                >
                  <Check size={16} strokeWidth={2.5} />
                  قبول الطلب
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────
          ACCEPT CONFIRMATION MODAL
          ─────────────────────────────────────────────────────────── */}
      {showAcceptConfirm && selectedRequest && (
        <div className="ad-modal-overlay" onClick={() => !processingRequest && setShowAcceptConfirm(false)} role="dialog" aria-modal="true">
          <div className="ad-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ad-modal-header center">
              <div className="ad-modal-icon-wrapper">
                <div className="ad-modal-icon success">
                  <CheckCircle2 size={36} strokeWidth={2} />
                </div>
                <div className="ad-modal-icon-pulse success" />
              </div>
              <h2>تأكيد قبول الطلب</h2>
            </div>
            <div className="ad-modal-body">
              <p>
                سيتم إنشاء حساب للطبيب{'\n'}
                <strong>{selectedRequest.firstName} {selectedRequest.lastName}</strong>{'\n'}
                وستظهر بيانات الدخول بعد القبول
              </p>
            </div>
            <div className="ad-modal-footer">
              <button
                type="button"
                className="ad-btn ad-btn-secondary"
                onClick={() => setShowAcceptConfirm(false)}
                disabled={processingRequest}
              >
                إلغاء
              </button>
              <button
                type="button"
                className="ad-btn ad-btn-success"
                onClick={handleAcceptRequest}
                disabled={processingRequest}
              >
                {processingRequest ? (
                  <>
                    <Loader2 size={16} className="ad-spin" />
                    جاري المعالجة...
                  </>
                ) : (
                  <>
                    <Check size={16} strokeWidth={2.5} />
                    تأكيد القبول
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────
          REJECT REQUEST MODAL
          ─────────────────────────────────────────────────────────── */}
      {showRejectModal && selectedRequest && (
        <div className="ad-modal-overlay" onClick={() => !processingRequest && setShowRejectModal(false)} role="dialog" aria-modal="true">
          <div className="ad-modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="ad-modal-close" onClick={() => setShowRejectModal(false)}>
              <X size={18} strokeWidth={2.5} />
            </button>
            <div className="ad-modal-header center">
              <div className="ad-modal-icon-wrapper">
                <div className="ad-modal-icon error">
                  <XCircle size={36} strokeWidth={2} />
                </div>
                <div className="ad-modal-icon-pulse error" />
              </div>
              <h2>رفض طلب التسجيل</h2>
            </div>
            <div className="ad-modal-body left-text">
              <p style={{ textAlign: 'center', marginBottom: 16 }}>
                سيتم رفض طلب الطبيب: <strong>{selectedRequest.firstName} {selectedRequest.lastName}</strong>
              </p>
              <div className="ad-form-group" style={{ marginBottom: 14 }}>
                <label className="ad-form-label">
                  سبب الرفض <span className="ad-form-label-required">*</span>
                </label>
                <select
                  className="ad-select"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                >
                  <option value="">اختر السبب...</option>
                  {REJECTION_REASONS.map((r) => (
                    <option key={r.id} value={r.id}>{r.nameAr}</option>
                  ))}
                </select>
              </div>
              <div className="ad-form-group">
                <label className="ad-form-label">ملاحظات إضافية</label>
                <textarea
                  className="ad-textarea"
                  rows={3}
                  placeholder="أدخل أي ملاحظات إضافية..."
                  value={rejectNotes}
                  onChange={(e) => setRejectNotes(e.target.value)}
                />
              </div>
            </div>
            <div className="ad-modal-footer">
              <button
                type="button"
                className="ad-btn ad-btn-secondary"
                onClick={() => setShowRejectModal(false)}
                disabled={processingRequest}
              >
                إلغاء
              </button>
              <button
                type="button"
                className="ad-btn ad-btn-danger"
                onClick={handleRejectRequest}
                disabled={!rejectReason || processingRequest}
              >
                {processingRequest ? (
                  <>
                    <Loader2 size={16} className="ad-spin" />
                    جاري المعالجة...
                  </>
                ) : (
                  <>
                    <X size={16} strokeWidth={2.5} />
                    تأكيد الرفض
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────
          GENERATED CREDENTIALS MODAL (after accepting a request)
          ─────────────────────────────────────────────────────────── */}
      {generatedCredentials && (
        <div className="ad-modal-overlay" role="dialog" aria-modal="true">
          <div className="ad-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ad-modal-header center">
              <div className="ad-modal-icon-wrapper">
                <div className="ad-modal-icon success">
                  <Sparkles size={36} strokeWidth={2} />
                </div>
                <div className="ad-modal-icon-pulse success" />
              </div>
              <h2>تم قبول الطلب بنجاح</h2>
              <p className="ad-modal-subtitle">
                بيانات دخول الطبيب {generatedCredentials.doctorName}
              </p>
            </div>
            <div className="ad-modal-body">
              <div className="ad-credentials-box">
                <div className="ad-credential-row">
                  <span className="ad-credential-label">البريد الإلكتروني</span>
                  <span className="ad-credential-value">{generatedCredentials.email}</span>
                  <button
                    type="button"
                    className="ad-credential-copy"
                    onClick={() => copyToClipboard(generatedCredentials.email)}
                    aria-label="نسخ البريد الإلكتروني"
                  >
                    <Copy size={16} strokeWidth={2.2} />
                  </button>
                </div>
                <div className="ad-credential-row">
                  <span className="ad-credential-label">كلمة المرور</span>
                  <span className="ad-credential-value">{generatedCredentials.password}</span>
                  <button
                    type="button"
                    className="ad-credential-copy"
                    onClick={() => copyToClipboard(generatedCredentials.password)}
                    aria-label="نسخ كلمة المرور"
                  >
                    <Copy size={16} strokeWidth={2.2} />
                  </button>
                </div>
              </div>
              <div className="ad-credentials-warning">
                <AlertTriangle size={18} strokeWidth={2.2} />
                <span>يرجى نسخ هذه البيانات وإرسالها للطبيب فوراً. لن تظهر مرة أخرى لأسباب أمنية.</span>
              </div>
            </div>
            <div className="ad-modal-footer">
              <button
                type="button"
                className="ad-btn ad-btn-primary"
                onClick={() => setGeneratedCredentials(null)}
                style={{ flex: 1 }}
              >
                <Check size={16} strokeWidth={2.5} />
                تم، إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────
          DEACTIVATE MODAL (doctors / patients)
          ─────────────────────────────────────────────────────────── */}
      {showDeactivateModal && deactivateTarget && (
        <div className="ad-modal-overlay" onClick={() => setShowDeactivateModal(false)} role="dialog" aria-modal="true">
          <div className="ad-modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="ad-modal-close" onClick={() => setShowDeactivateModal(false)}>
              <X size={18} strokeWidth={2.5} />
            </button>
            <div className="ad-modal-header center">
              <div className="ad-modal-icon-wrapper">
                <div className="ad-modal-icon warning">
                  <Ban size={36} strokeWidth={2} />
                </div>
                <div className="ad-modal-icon-pulse warning" />
              </div>
              <h2>إلغاء تفعيل الحساب</h2>
            </div>
            <div className="ad-modal-body left-text">
              <p style={{ textAlign: 'center', marginBottom: 16 }}>
                سيتم إلغاء تفعيل حساب {deactivateType === 'doctor' ? 'الطبيب' : 'المريض'}:{'\n'}
                <strong>{deactivateTarget.firstName} {deactivateTarget.lastName}</strong>
              </p>
              <div className="ad-form-group" style={{ marginBottom: 14 }}>
                <label className="ad-form-label">
                  سبب إلغاء التفعيل <span className="ad-form-label-required">*</span>
                </label>
                <select
                  className="ad-select"
                  value={deactivateReason}
                  onChange={(e) => setDeactivateReason(e.target.value)}
                >
                  <option value="">اختر السبب...</option>
                  {DEACTIVATION_REASONS.map((r) => (
                    <option key={r.id} value={r.id}>{r.nameAr}</option>
                  ))}
                </select>
              </div>
              <div className="ad-form-group">
                <label className="ad-form-label">ملاحظات إضافية</label>
                <textarea
                  className="ad-textarea"
                  rows={3}
                  placeholder="أدخل أي ملاحظات إضافية..."
                  value={deactivateNotes}
                  onChange={(e) => setDeactivateNotes(e.target.value)}
                />
              </div>
            </div>
            <div className="ad-modal-footer">
              <button
                type="button"
                className="ad-btn ad-btn-secondary"
                onClick={() => setShowDeactivateModal(false)}
              >
                إلغاء
              </button>
              <button
                type="button"
                className="ad-btn ad-btn-danger"
                onClick={handleDeactivate}
                disabled={!deactivateReason}
              >
                <Ban size={16} strokeWidth={2.2} />
                تأكيد إلغاء التفعيل
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────
          ADD DOCTOR FORM MODAL
          ─────────────────────────────────────────────────────────── */}
      {showAddDoctorForm && (
        <div className="ad-modal-overlay" onClick={() => !addDoctorLoading && setShowAddDoctorForm(false)} role="dialog" aria-modal="true">
          <div className="ad-modal large" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="ad-modal-close" onClick={() => setShowAddDoctorForm(false)}>
              <X size={18} strokeWidth={2.5} />
            </button>
            <div className="ad-modal-header center">
              <div className="ad-modal-icon-wrapper">
                <div className="ad-modal-icon success">
                  <UserPlus size={36} strokeWidth={2} />
                </div>
              </div>
              <h2>إضافة طبيب جديد</h2>
              <p className="ad-modal-subtitle">سيتم إنشاء بريد إلكتروني وكلمة مرور تلقائياً</p>
            </div>

            <div className="ad-modal-body left-text">
              {/* Personal Information */}
              <div className="ad-form-section">
                <h4 className="ad-form-section-title">
                  <User size={18} strokeWidth={2.2} />
                  المعلومات الشخصية
                </h4>
                <div className="ad-form-grid">
                  <div className="ad-form-group">
                    <label className="ad-form-label">الاسم الأول <span className="ad-form-label-required">*</span></label>
                    <input
                      type="text"
                      className="ad-input"
                      value={newDoctor.firstName}
                      onChange={(e) => setNewDoctor((p) => ({ ...p, firstName: e.target.value }))}
                      placeholder="مثال: أحمد"
                    />
                  </div>
                  <div className="ad-form-group">
                    <label className="ad-form-label">اسم العائلة <span className="ad-form-label-required">*</span></label>
                    <input
                      type="text"
                      className="ad-input"
                      value={newDoctor.lastName}
                      onChange={(e) => setNewDoctor((p) => ({ ...p, lastName: e.target.value }))}
                      placeholder="مثال: العلي"
                    />
                  </div>
                  <div className="ad-form-group">
                    <label className="ad-form-label">اسم الأب</label>
                    <input
                      type="text"
                      className="ad-input"
                      value={newDoctor.fatherName}
                      onChange={(e) => setNewDoctor((p) => ({ ...p, fatherName: e.target.value }))}
                    />
                  </div>
                  <div className="ad-form-group">
                    <label className="ad-form-label">اسم الأم</label>
                    <input
                      type="text"
                      className="ad-input"
                      value={newDoctor.motherName}
                      onChange={(e) => setNewDoctor((p) => ({ ...p, motherName: e.target.value }))}
                    />
                  </div>
                  <div className="ad-form-group">
                    <label className="ad-form-label">الرقم الوطني <span className="ad-form-label-required">*</span></label>
                    <input
                      type="text"
                      className="ad-input"
                      value={newDoctor.nationalId}
                      onChange={(e) => setNewDoctor((p) => ({ ...p, nationalId: e.target.value.replace(/\D/g, '').slice(0, 11) }))}
                      placeholder="11 رقم"
                      maxLength={11}
                      style={{ direction: 'ltr', textAlign: 'right', fontFamily: 'Inter, sans-serif' }}
                    />
                  </div>
                  <div className="ad-form-group">
                    <label className="ad-form-label">رقم الهاتف <span className="ad-form-label-required">*</span></label>
                    <input
                      type="text"
                      className="ad-input"
                      value={newDoctor.phoneNumber}
                      onChange={(e) => setNewDoctor((p) => ({ ...p, phoneNumber: e.target.value }))}
                      placeholder="+963 9XX XXX XXX"
                      style={{ direction: 'ltr', textAlign: 'right', fontFamily: 'Inter, sans-serif' }}
                    />
                  </div>
                  <div className="ad-form-group">
                    <label className="ad-form-label">الجنس <span className="ad-form-label-required">*</span></label>
                    <select
                      className="ad-select"
                      value={newDoctor.gender}
                      onChange={(e) => setNewDoctor((p) => ({ ...p, gender: e.target.value }))}
                    >
                      <option value="male">ذكر</option>
                      <option value="female">أنثى</option>
                    </select>
                  </div>
                  <div className="ad-form-group">
                    <label className="ad-form-label">تاريخ الميلاد</label>
                    <input
                      type="date"
                      className="ad-input"
                      value={newDoctor.dateOfBirth}
                      onChange={(e) => setNewDoctor((p) => ({ ...p, dateOfBirth: e.target.value }))}
                    />
                  </div>
                  <div className="ad-form-group">
                    <label className="ad-form-label">المحافظة <span className="ad-form-label-required">*</span></label>
                    <select
                      className="ad-select"
                      value={newDoctor.governorate}
                      onChange={(e) => setNewDoctor((p) => ({ ...p, governorate: e.target.value }))}
                    >
                      <option value="">اختر المحافظة...</option>
                      {SYRIAN_GOVERNORATES.map((g) => (
                        <option key={g.id} value={g.id}>{g.nameAr}</option>
                      ))}
                    </select>
                  </div>
                  <div className="ad-form-group">
                    <label className="ad-form-label">المدينة</label>
                    <input
                      type="text"
                      className="ad-input"
                      value={newDoctor.city}
                      onChange={(e) => setNewDoctor((p) => ({ ...p, city: e.target.value }))}
                    />
                  </div>
                  <div className="ad-form-group full">
                    <label className="ad-form-label">العنوان <span className="ad-form-label-required">*</span></label>
                    <input
                      type="text"
                      className="ad-input"
                      value={newDoctor.address}
                      onChange={(e) => setNewDoctor((p) => ({ ...p, address: e.target.value }))}
                      placeholder="عنوان العيادة أو محل العمل"
                    />
                  </div>
                </div>
              </div>

              {/* Professional Information */}
              <div className="ad-form-section">
                <h4 className="ad-form-section-title">
                  <Briefcase size={18} strokeWidth={2.2} />
                  المعلومات المهنية
                </h4>
                <div className="ad-form-grid">
                  <div className="ad-form-group">
                    <label className="ad-form-label">رقم الترخيص الطبي <span className="ad-form-label-required">*</span></label>
                    <input
                      type="text"
                      className="ad-input"
                      value={newDoctor.medicalLicenseNumber}
                      onChange={(e) => setNewDoctor((p) => ({ ...p, medicalLicenseNumber: e.target.value.toUpperCase() }))}
                      placeholder="مثال: SY12345678"
                      style={{ direction: 'ltr', textAlign: 'right', fontFamily: 'Inter, sans-serif' }}
                      maxLength={20}
                    />
                  </div>
                  <div className="ad-form-group">
                    <label className="ad-form-label">التخصص <span className="ad-form-label-required">*</span></label>
                    <select
                      className="ad-select"
                      value={newDoctor.specialization}
                      onChange={(e) => setNewDoctor((p) => ({ ...p, specialization: e.target.value }))}
                    >
                      <option value="">اختر التخصص...</option>
                      {MEDICAL_SPECIALIZATIONS.map((s) => (
                        <option key={s.id} value={s.id}>{s.nameAr}</option>
                      ))}
                    </select>
                  </div>
                  <div className="ad-form-group">
                    <label className="ad-form-label">التخصص الفرعي</label>
                    <input
                      type="text"
                      className="ad-input"
                      value={newDoctor.subSpecialization}
                      onChange={(e) => setNewDoctor((p) => ({ ...p, subSpecialization: e.target.value }))}
                      placeholder="اختياري"
                    />
                  </div>
                  <div className="ad-form-group">
                    <label className="ad-form-label">سنوات الخبرة</label>
                    <input
                      type="number"
                      min="0"
                      max="60"
                      className="ad-input"
                      value={newDoctor.yearsOfExperience}
                      onChange={(e) => setNewDoctor((p) => ({ ...p, yearsOfExperience: e.target.value }))}
                    />
                  </div>
                  <div className="ad-form-group full">
                    <label className="ad-form-label">المستشفى أو المركز الصحي <span className="ad-form-label-required">*</span></label>
                    <input
                      type="text"
                      className="ad-input"
                      value={newDoctor.hospitalAffiliation}
                      onChange={(e) => setNewDoctor((p) => ({ ...p, hospitalAffiliation: e.target.value }))}
                      placeholder="مثال: مشفى المواساة الجامعي"
                    />
                  </div>
                  <div className="ad-form-group">
                    <label className="ad-form-label">رسوم الكشف</label>
                    <input
                      type="number"
                      min="0"
                      className="ad-input"
                      value={newDoctor.consultationFee}
                      onChange={(e) => setNewDoctor((p) => ({ ...p, consultationFee: e.target.value }))}
                    />
                  </div>
                  <div className="ad-form-group">
                    <label className="ad-form-label">العملة</label>
                    <select
                      className="ad-select"
                      value={newDoctor.currency}
                      onChange={(e) => setNewDoctor((p) => ({ ...p, currency: e.target.value }))}
                    >
                      <option value="SYP">ليرة سورية (SYP)</option>
                      <option value="USD">دولار أمريكي (USD)</option>
                    </select>
                  </div>
                  <div className="ad-form-group full">
                    <label className="ad-form-label">أيام العمل <span className="ad-form-label-required">*</span></label>
                    <div className="ad-days-picker">
                      {WEEKDAYS.map((day) => (
                        <button
                          key={day.id}
                          type="button"
                          className={`ad-day-chip ${newDoctor.availableDays.includes(day.id) ? 'active' : ''}`}
                          onClick={() => handleDayToggle(day.id)}
                        >
                          {day.nameAr}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="ad-modal-footer">
              <button
                type="button"
                className="ad-btn ad-btn-secondary"
                onClick={() => setShowAddDoctorForm(false)}
                disabled={addDoctorLoading}
              >
                إلغاء
              </button>
              <button
                type="button"
                className="ad-btn ad-btn-primary"
                onClick={handleAddDoctor}
                disabled={addDoctorLoading}
              >
                {addDoctorLoading ? (
                  <>
                    <Loader2 size={16} className="ad-spin" />
                    جاري الإضافة...
                  </>
                ) : (
                  <>
                    <UserPlus size={16} strokeWidth={2.2} />
                    إضافة الطبيب
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────
          NEW DOCTOR CREDENTIALS MODAL (after manual add)
          ─────────────────────────────────────────────────────────── */}
      {newDoctorCredentials && (
        <div className="ad-modal-overlay" role="dialog" aria-modal="true">
          <div className="ad-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ad-modal-header center">
              <div className="ad-modal-icon-wrapper">
                <div className="ad-modal-icon success">
                  <Sparkles size={36} strokeWidth={2} />
                </div>
                <div className="ad-modal-icon-pulse success" />
              </div>
              <h2>تم إضافة الطبيب بنجاح</h2>
              <p className="ad-modal-subtitle">
                بيانات دخول الطبيب {newDoctorCredentials.doctorName}
              </p>
            </div>
            <div className="ad-modal-body">
              <div className="ad-credentials-box">
                <div className="ad-credential-row">
                  <span className="ad-credential-label">البريد الإلكتروني</span>
                  <span className="ad-credential-value">{newDoctorCredentials.email}</span>
                  <button
                    type="button"
                    className="ad-credential-copy"
                    onClick={() => copyToClipboard(newDoctorCredentials.email)}
                    aria-label="نسخ"
                  >
                    <Copy size={16} strokeWidth={2.2} />
                  </button>
                </div>
                <div className="ad-credential-row">
                  <span className="ad-credential-label">كلمة المرور</span>
                  <span className="ad-credential-value">{newDoctorCredentials.password}</span>
                  <button
                    type="button"
                    className="ad-credential-copy"
                    onClick={() => copyToClipboard(newDoctorCredentials.password)}
                    aria-label="نسخ"
                  >
                    <Copy size={16} strokeWidth={2.2} />
                  </button>
                </div>
              </div>
              <div className="ad-credentials-warning">
                <AlertTriangle size={18} strokeWidth={2.2} />
                <span>يرجى نسخ هذه البيانات وإرسالها للطبيب فوراً. لن تظهر مرة أخرى لأسباب أمنية.</span>
              </div>
            </div>
            <div className="ad-modal-footer">
              <button
                type="button"
                className="ad-btn ad-btn-primary"
                onClick={() => {
                  setNewDoctorCredentials(null);
                  setShowAddDoctorForm(false);
                }}
                style={{ flex: 1 }}
              >
                <Check size={16} strokeWidth={2.5} />
                تم، إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────
          ADD/EDIT HOSPITAL FORM MODAL
          ─────────────────────────────────────────────────────────── */}
      {showHospitalForm && (
        <div className="ad-modal-overlay" onClick={() => !hospitalSaving && setShowHospitalForm(false)} role="dialog" aria-modal="true">
          <div className="ad-modal large" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="ad-modal-close" onClick={() => setShowHospitalForm(false)}>
              <X size={18} strokeWidth={2.5} />
            </button>
            <div className="ad-modal-header center">
              <div className="ad-modal-icon-wrapper">
                <div className="ad-modal-icon info">
                  <Hospital size={36} strokeWidth={2} />
                </div>
              </div>
              <h2>{editingHospital ? 'تعديل المستشفى' : 'إضافة مستشفى جديد'}</h2>
            </div>
            <div className="ad-modal-body left-text">
              <div className="ad-form-section">
                <h4 className="ad-form-section-title">
                  <Building2 size={18} strokeWidth={2.2} />
                  المعلومات الأساسية
                </h4>
                <div className="ad-form-grid">
                  <div className="ad-form-group">
                    <label className="ad-form-label">الاسم بالإنجليزية <span className="ad-form-label-required">*</span></label>
                    <input type="text" className="ad-input" value={hospitalForm.name}
                      onChange={(e) => setHospitalForm((p) => ({ ...p, name: e.target.value }))}
                      placeholder="Al-Mouwasat University Hospital" />
                  </div>
                  <div className="ad-form-group">
                    <label className="ad-form-label">الاسم بالعربية</label>
                    <input type="text" className="ad-input" value={hospitalForm.arabicName}
                      onChange={(e) => setHospitalForm((p) => ({ ...p, arabicName: e.target.value }))}
                      placeholder="مشفى المواساة الجامعي" />
                  </div>
                  <div className="ad-form-group">
                    <label className="ad-form-label">رقم التسجيل <span className="ad-form-label-required">*</span></label>
                    <input type="text" className="ad-input" value={hospitalForm.registrationNumber}
                      onChange={(e) => setHospitalForm((p) => ({ ...p, registrationNumber: e.target.value }))}
                      style={{ direction: 'ltr', textAlign: 'right', fontFamily: 'Inter, sans-serif' }} />
                  </div>
                  <div className="ad-form-group">
                    <label className="ad-form-label">نوع المستشفى <span className="ad-form-label-required">*</span></label>
                    <select className="ad-select" value={hospitalForm.hospitalType}
                      onChange={(e) => setHospitalForm((p) => ({ ...p, hospitalType: e.target.value }))}>
                      {HOSPITAL_TYPES.map((t) => (
                        <option key={t.id} value={t.id}>{t.nameAr}</option>
                      ))}
                    </select>
                  </div>
                  <div className="ad-form-group">
                    <label className="ad-form-label">عدد الأسرّة</label>
                    <input type="number" min="0" className="ad-input" value={hospitalForm.numberOfBeds}
                      onChange={(e) => setHospitalForm((p) => ({ ...p, numberOfBeds: e.target.value }))} />
                  </div>
                  <div className="ad-form-group">
                    <label className="ad-form-label">الموقع الإلكتروني</label>
                    <input type="text" className="ad-input" value={hospitalForm.website}
                      onChange={(e) => setHospitalForm((p) => ({ ...p, website: e.target.value }))}
                      style={{ direction: 'ltr', textAlign: 'right', fontFamily: 'Inter, sans-serif' }} />
                  </div>
                </div>
              </div>

              <div className="ad-form-section">
                <h4 className="ad-form-section-title">
                  <Phone size={18} strokeWidth={2.2} />
                  معلومات التواصل
                </h4>
                <div className="ad-form-grid">
                  <div className="ad-form-group">
                    <label className="ad-form-label">رقم الهاتف <span className="ad-form-label-required">*</span></label>
                    <input type="text" className="ad-input" value={hospitalForm.phoneNumber}
                      onChange={(e) => setHospitalForm((p) => ({ ...p, phoneNumber: e.target.value }))}
                      style={{ direction: 'ltr', textAlign: 'right', fontFamily: 'Inter, sans-serif' }} />
                  </div>
                  <div className="ad-form-group">
                    <label className="ad-form-label">رقم الطوارئ</label>
                    <input type="text" className="ad-input" value={hospitalForm.emergencyPhoneNumber}
                      onChange={(e) => setHospitalForm((p) => ({ ...p, emergencyPhoneNumber: e.target.value }))}
                      style={{ direction: 'ltr', textAlign: 'right', fontFamily: 'Inter, sans-serif' }} />
                  </div>
                  <div className="ad-form-group full">
                    <label className="ad-form-label">البريد الإلكتروني</label>
                    <input type="email" className="ad-input" value={hospitalForm.email}
                      onChange={(e) => setHospitalForm((p) => ({ ...p, email: e.target.value }))}
                      style={{ direction: 'ltr', textAlign: 'right', fontFamily: 'Inter, sans-serif' }} />
                  </div>
                </div>
              </div>

              <div className="ad-form-section">
                <h4 className="ad-form-section-title">
                  <MapPin size={18} strokeWidth={2.2} />
                  العنوان
                </h4>
                <div className="ad-form-grid three-col">
                  <div className="ad-form-group">
                    <label className="ad-form-label">المحافظة <span className="ad-form-label-required">*</span></label>
                    <select className="ad-select" value={hospitalForm.governorate}
                      onChange={(e) => setHospitalForm((p) => ({ ...p, governorate: e.target.value }))}>
                      <option value="">اختر...</option>
                      {SYRIAN_GOVERNORATES.map((g) => (
                        <option key={g.id} value={g.id}>{g.nameAr}</option>
                      ))}
                    </select>
                  </div>
                  <div className="ad-form-group">
                    <label className="ad-form-label">المدينة <span className="ad-form-label-required">*</span></label>
                    <input type="text" className="ad-input" value={hospitalForm.city}
                      onChange={(e) => setHospitalForm((p) => ({ ...p, city: e.target.value }))} />
                  </div>
                  <div className="ad-form-group">
                    <label className="ad-form-label">المنطقة</label>
                    <input type="text" className="ad-input" value={hospitalForm.district}
                      onChange={(e) => setHospitalForm((p) => ({ ...p, district: e.target.value }))} />
                  </div>
                  <div className="ad-form-group full">
                    <label className="ad-form-label">العنوان التفصيلي <span className="ad-form-label-required">*</span></label>
                    <input type="text" className="ad-input" value={hospitalForm.address}
                      onChange={(e) => setHospitalForm((p) => ({ ...p, address: e.target.value }))} />
                  </div>
                </div>
              </div>

              <div className="ad-form-section">
                <h4 className="ad-form-section-title">
                  <Activity size={18} strokeWidth={2.2} />
                  الخدمات المتاحة
                </h4>
                <div className="ad-days-picker">
                  {[
                    { key: 'hasEmergency', label: 'طوارئ' },
                    { key: 'hasICU', label: 'عناية مشددة' },
                    { key: 'hasLaboratory', label: 'مختبر' },
                    { key: 'hasPharmacy', label: 'صيدلية' },
                    { key: 'hasRadiology', label: 'أشعة' },
                  ].map((s) => (
                    <button
                      key={s.key}
                      type="button"
                      className={`ad-day-chip ${hospitalForm[s.key] ? 'active' : ''}`}
                      onClick={() => setHospitalForm((p) => ({ ...p, [s.key]: !p[s.key] }))}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="ad-modal-footer">
              <button type="button" className="ad-btn ad-btn-secondary" onClick={() => setShowHospitalForm(false)} disabled={hospitalSaving}>
                إلغاء
              </button>
              <button type="button" className="ad-btn ad-btn-primary" onClick={handleSaveHospital} disabled={hospitalSaving}>
                {hospitalSaving ? (
                  <><Loader2 size={16} className="ad-spin" />جاري الحفظ...</>
                ) : (
                  <><Save size={16} strokeWidth={2.2} />{editingHospital ? 'حفظ التعديلات' : 'إضافة المستشفى'}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────
          ADD/EDIT PHARMACY FORM MODAL
          ─────────────────────────────────────────────────────────── */}
      {showPharmacyForm && (
        <div className="ad-modal-overlay" onClick={() => !pharmacySaving && setShowPharmacyForm(false)} role="dialog" aria-modal="true">
          <div className="ad-modal large" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="ad-modal-close" onClick={() => setShowPharmacyForm(false)}>
              <X size={18} strokeWidth={2.5} />
            </button>
            <div className="ad-modal-header center">
              <div className="ad-modal-icon-wrapper">
                <div className="ad-modal-icon info">
                  <Pill size={36} strokeWidth={2} />
                </div>
              </div>
              <h2>{editingPharmacy ? 'تعديل الصيدلية' : 'إضافة صيدلية جديدة'}</h2>
            </div>
            <div className="ad-modal-body left-text">
              <div className="ad-form-section">
                <h4 className="ad-form-section-title"><Building2 size={18} strokeWidth={2.2} />المعلومات الأساسية</h4>
                <div className="ad-form-grid">
                  <div className="ad-form-group">
                    <label className="ad-form-label">الاسم بالإنجليزية <span className="ad-form-label-required">*</span></label>
                    <input type="text" className="ad-input" value={pharmacyForm.name}
                      onChange={(e) => setPharmacyForm((p) => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div className="ad-form-group">
                    <label className="ad-form-label">الاسم بالعربية</label>
                    <input type="text" className="ad-input" value={pharmacyForm.arabicName}
                      onChange={(e) => setPharmacyForm((p) => ({ ...p, arabicName: e.target.value }))} />
                  </div>
                  <div className="ad-form-group">
                    <label className="ad-form-label">رقم التسجيل <span className="ad-form-label-required">*</span></label>
                    <input type="text" className="ad-input" value={pharmacyForm.registrationNumber}
                      onChange={(e) => setPharmacyForm((p) => ({ ...p, registrationNumber: e.target.value }))}
                      style={{ direction: 'ltr', textAlign: 'right', fontFamily: 'Inter, sans-serif' }} />
                  </div>
                  <div className="ad-form-group">
                    <label className="ad-form-label">رقم ترخيص الصيدلية <span className="ad-form-label-required">*</span></label>
                    <input type="text" className="ad-input" value={pharmacyForm.pharmacyLicense}
                      onChange={(e) => setPharmacyForm((p) => ({ ...p, pharmacyLicense: e.target.value }))}
                      style={{ direction: 'ltr', textAlign: 'right', fontFamily: 'Inter, sans-serif' }} />
                  </div>
                  <div className="ad-form-group">
                    <label className="ad-form-label">نوع الصيدلية</label>
                    <select className="ad-select" value={pharmacyForm.pharmacyType}
                      onChange={(e) => setPharmacyForm((p) => ({ ...p, pharmacyType: e.target.value }))}>
                      {PHARMACY_TYPES.map((t) => (
                        <option key={t.id} value={t.id}>{t.nameAr}</option>
                      ))}
                    </select>
                  </div>
                  <div className="ad-form-group">
                    <label className="ad-form-label">رقم الهاتف <span className="ad-form-label-required">*</span></label>
                    <input type="text" className="ad-input" value={pharmacyForm.phoneNumber}
                      onChange={(e) => setPharmacyForm((p) => ({ ...p, phoneNumber: e.target.value }))}
                      style={{ direction: 'ltr', textAlign: 'right', fontFamily: 'Inter, sans-serif' }} />
                  </div>
                  <div className="ad-form-group full">
                    <label className="ad-form-label">البريد الإلكتروني</label>
                    <input type="email" className="ad-input" value={pharmacyForm.email}
                      onChange={(e) => setPharmacyForm((p) => ({ ...p, email: e.target.value }))}
                      style={{ direction: 'ltr', textAlign: 'right', fontFamily: 'Inter, sans-serif' }} />
                  </div>
                </div>
              </div>

              <div className="ad-form-section">
                <h4 className="ad-form-section-title"><MapPin size={18} strokeWidth={2.2} />العنوان والموقع الجغرافي</h4>
                <div className="ad-form-grid three-col">
                  <div className="ad-form-group">
                    <label className="ad-form-label">المحافظة <span className="ad-form-label-required">*</span></label>
                    <select className="ad-select" value={pharmacyForm.governorate}
                      onChange={(e) => setPharmacyForm((p) => ({ ...p, governorate: e.target.value }))}>
                      <option value="">اختر...</option>
                      {SYRIAN_GOVERNORATES.map((g) => (
                        <option key={g.id} value={g.id}>{g.nameAr}</option>
                      ))}
                    </select>
                  </div>
                  <div className="ad-form-group">
                    <label className="ad-form-label">المدينة <span className="ad-form-label-required">*</span></label>
                    <input type="text" className="ad-input" value={pharmacyForm.city}
                      onChange={(e) => setPharmacyForm((p) => ({ ...p, city: e.target.value }))} />
                  </div>
                  <div className="ad-form-group">
                    <label className="ad-form-label">المنطقة</label>
                    <input type="text" className="ad-input" value={pharmacyForm.district}
                      onChange={(e) => setPharmacyForm((p) => ({ ...p, district: e.target.value }))} />
                  </div>
                  <div className="ad-form-group full">
                    <label className="ad-form-label">العنوان التفصيلي <span className="ad-form-label-required">*</span></label>
                    <input type="text" className="ad-input" value={pharmacyForm.address}
                      onChange={(e) => setPharmacyForm((p) => ({ ...p, address: e.target.value }))} />
                  </div>
                  <div className="ad-form-group">
                    <label className="ad-form-label">خط العرض (Latitude) <span className="ad-form-label-required">*</span></label>
                    <input type="number" step="any" className="ad-input" value={pharmacyForm.latitude}
                      onChange={(e) => setPharmacyForm((p) => ({ ...p, latitude: e.target.value }))}
                      placeholder="33.5138"
                      style={{ direction: 'ltr', textAlign: 'right', fontFamily: 'Inter, sans-serif' }} />
                  </div>
                  <div className="ad-form-group">
                    <label className="ad-form-label">خط الطول (Longitude) <span className="ad-form-label-required">*</span></label>
                    <input type="number" step="any" className="ad-input" value={pharmacyForm.longitude}
                      onChange={(e) => setPharmacyForm((p) => ({ ...p, longitude: e.target.value }))}
                      placeholder="36.2765"
                      style={{ direction: 'ltr', textAlign: 'right', fontFamily: 'Inter, sans-serif' }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="ad-modal-footer">
              <button type="button" className="ad-btn ad-btn-secondary" onClick={() => setShowPharmacyForm(false)} disabled={pharmacySaving}>
                إلغاء
              </button>
              <button type="button" className="ad-btn ad-btn-primary" onClick={handleSavePharmacy} disabled={pharmacySaving}>
                {pharmacySaving ? (
                  <><Loader2 size={16} className="ad-spin" />جاري الحفظ...</>
                ) : (
                  <><Save size={16} strokeWidth={2.2} />{editingPharmacy ? 'حفظ التعديلات' : 'إضافة الصيدلية'}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────
          ADD/EDIT LABORATORY FORM MODAL
          ─────────────────────────────────────────────────────────── */}
      {showLabForm && (
        <div className="ad-modal-overlay" onClick={() => !labSaving && setShowLabForm(false)} role="dialog" aria-modal="true">
          <div className="ad-modal large" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="ad-modal-close" onClick={() => setShowLabForm(false)}>
              <X size={18} strokeWidth={2.5} />
            </button>
            <div className="ad-modal-header center">
              <div className="ad-modal-icon-wrapper">
                <div className="ad-modal-icon info">
                  <Microscope size={36} strokeWidth={2} />
                </div>
              </div>
              <h2>{editingLab ? 'تعديل المختبر' : 'إضافة مختبر جديد'}</h2>
            </div>
            <div className="ad-modal-body left-text">
              <div className="ad-form-section">
                <h4 className="ad-form-section-title"><Building2 size={18} strokeWidth={2.2} />المعلومات الأساسية</h4>
                <div className="ad-form-grid">
                  <div className="ad-form-group">
                    <label className="ad-form-label">الاسم بالإنجليزية <span className="ad-form-label-required">*</span></label>
                    <input type="text" className="ad-input" value={labForm.name}
                      onChange={(e) => setLabForm((p) => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div className="ad-form-group">
                    <label className="ad-form-label">الاسم بالعربية</label>
                    <input type="text" className="ad-input" value={labForm.arabicName}
                      onChange={(e) => setLabForm((p) => ({ ...p, arabicName: e.target.value }))} />
                  </div>
                  <div className="ad-form-group">
                    <label className="ad-form-label">رقم التسجيل <span className="ad-form-label-required">*</span></label>
                    <input type="text" className="ad-input" value={labForm.registrationNumber}
                      onChange={(e) => setLabForm((p) => ({ ...p, registrationNumber: e.target.value }))}
                      style={{ direction: 'ltr', textAlign: 'right', fontFamily: 'Inter, sans-serif' }} />
                  </div>
                  <div className="ad-form-group">
                    <label className="ad-form-label">رقم ترخيص المختبر</label>
                    <input type="text" className="ad-input" value={labForm.labLicense}
                      onChange={(e) => setLabForm((p) => ({ ...p, labLicense: e.target.value }))}
                      style={{ direction: 'ltr', textAlign: 'right', fontFamily: 'Inter, sans-serif' }} />
                  </div>
                  <div className="ad-form-group">
                    <label className="ad-form-label">نوع المختبر</label>
                    <select className="ad-select" value={labForm.labType}
                      onChange={(e) => setLabForm((p) => ({ ...p, labType: e.target.value }))}>
                      {LAB_TYPES.map((t) => (
                        <option key={t.id} value={t.id}>{t.nameAr}</option>
                      ))}
                    </select>
                  </div>
                  <div className="ad-form-group">
                    <label className="ad-form-label">رقم الهاتف <span className="ad-form-label-required">*</span></label>
                    <input type="text" className="ad-input" value={labForm.phoneNumber}
                      onChange={(e) => setLabForm((p) => ({ ...p, phoneNumber: e.target.value }))}
                      style={{ direction: 'ltr', textAlign: 'right', fontFamily: 'Inter, sans-serif' }} />
                  </div>
                  <div className="ad-form-group full">
                    <label className="ad-form-label">البريد الإلكتروني</label>
                    <input type="email" className="ad-input" value={labForm.email}
                      onChange={(e) => setLabForm((p) => ({ ...p, email: e.target.value }))}
                      style={{ direction: 'ltr', textAlign: 'right', fontFamily: 'Inter, sans-serif' }} />
                  </div>
                </div>
              </div>

              <div className="ad-form-section">
                <h4 className="ad-form-section-title"><MapPin size={18} strokeWidth={2.2} />العنوان والموقع الجغرافي</h4>
                <div className="ad-form-grid three-col">
                  <div className="ad-form-group">
                    <label className="ad-form-label">المحافظة <span className="ad-form-label-required">*</span></label>
                    <select className="ad-select" value={labForm.governorate}
                      onChange={(e) => setLabForm((p) => ({ ...p, governorate: e.target.value }))}>
                      <option value="">اختر...</option>
                      {SYRIAN_GOVERNORATES.map((g) => (
                        <option key={g.id} value={g.id}>{g.nameAr}</option>
                      ))}
                    </select>
                  </div>
                  <div className="ad-form-group">
                    <label className="ad-form-label">المدينة <span className="ad-form-label-required">*</span></label>
                    <input type="text" className="ad-input" value={labForm.city}
                      onChange={(e) => setLabForm((p) => ({ ...p, city: e.target.value }))} />
                  </div>
                  <div className="ad-form-group">
                    <label className="ad-form-label">المنطقة</label>
                    <input type="text" className="ad-input" value={labForm.district}
                      onChange={(e) => setLabForm((p) => ({ ...p, district: e.target.value }))} />
                  </div>
                  <div className="ad-form-group full">
                    <label className="ad-form-label">العنوان التفصيلي <span className="ad-form-label-required">*</span></label>
                    <input type="text" className="ad-input" value={labForm.address}
                      onChange={(e) => setLabForm((p) => ({ ...p, address: e.target.value }))} />
                  </div>
                  <div className="ad-form-group">
                    <label className="ad-form-label">خط العرض (Latitude) <span className="ad-form-label-required">*</span></label>
                    <input type="number" step="any" className="ad-input" value={labForm.latitude}
                      onChange={(e) => setLabForm((p) => ({ ...p, latitude: e.target.value }))}
                      placeholder="33.5138"
                      style={{ direction: 'ltr', textAlign: 'right', fontFamily: 'Inter, sans-serif' }} />
                  </div>
                  <div className="ad-form-group">
                    <label className="ad-form-label">خط الطول (Longitude) <span className="ad-form-label-required">*</span></label>
                    <input type="number" step="any" className="ad-input" value={labForm.longitude}
                      onChange={(e) => setLabForm((p) => ({ ...p, longitude: e.target.value }))}
                      placeholder="36.2765"
                      style={{ direction: 'ltr', textAlign: 'right', fontFamily: 'Inter, sans-serif' }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="ad-modal-footer">
              <button type="button" className="ad-btn ad-btn-secondary" onClick={() => setShowLabForm(false)} disabled={labSaving}>
                إلغاء
              </button>
              <button type="button" className="ad-btn ad-btn-primary" onClick={handleSaveLab} disabled={labSaving}>
                {labSaving ? (
                  <><Loader2 size={16} className="ad-spin" />جاري الحفظ...</>
                ) : (
                  <><Save size={16} strokeWidth={2.2} />{editingLab ? 'حفظ التعديلات' : 'إضافة المختبر'}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────
          DOCTOR DETAILS MODAL
          ─────────────────────────────────────────────────────────── */}
      {showDoctorDetails && selectedDoctor && (
        <div className="ad-modal-overlay" onClick={() => setShowDoctorDetails(false)} role="dialog" aria-modal="true">
          <div className="ad-modal large" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="ad-modal-close" onClick={() => setShowDoctorDetails(false)}>
              <X size={18} strokeWidth={2.5} />
            </button>
            <div className="ad-modal-header center">
              <h2>تفاصيل الطبيب</h2>
            </div>
            <div className="ad-request-details">
              <div className="ad-detail-section">
                <div className="ad-detail-section-header">
                  <div className="ad-detail-section-icon"><User size={16} strokeWidth={2.2} /></div>
                  <h4 className="ad-detail-section-title">المعلومات الشخصية</h4>
                </div>
                <div className="ad-detail-row">
                  <span className="ad-detail-label">الاسم</span>
                  <span className="ad-detail-value">د. {selectedDoctor.firstName} {selectedDoctor.lastName}</span>
                </div>
                <div className="ad-detail-row">
                  <span className="ad-detail-label">الرقم الوطني</span>
                  <span className="ad-detail-value ltr">{selectedDoctor.nationalId}</span>
                </div>
                <div className="ad-detail-row">
                  <span className="ad-detail-label">الجنس</span>
                  <span className="ad-detail-value">{selectedDoctor.gender === 'male' ? 'ذكر' : 'أنثى'}</span>
                </div>
                <div className="ad-detail-row">
                  <span className="ad-detail-label">الهاتف</span>
                  <span className="ad-detail-value ltr">{selectedDoctor.phoneNumber || '-'}</span>
                </div>
                <div className="ad-detail-row">
                  <span className="ad-detail-label">البريد الإلكتروني</span>
                  <span className="ad-detail-value ltr">{selectedDoctor.email || '-'}</span>
                </div>
                <div className="ad-detail-row">
                  <span className="ad-detail-label">المحافظة</span>
                  <span className="ad-detail-value">{getGovernorateName(selectedDoctor.governorate)}</span>
                </div>
              </div>
              <div className="ad-detail-section">
                <div className="ad-detail-section-header">
                  <div className="ad-detail-section-icon"><Briefcase size={16} strokeWidth={2.2} /></div>
                  <h4 className="ad-detail-section-title">المعلومات المهنية</h4>
                </div>
                <div className="ad-detail-row">
                  <span className="ad-detail-label">رقم الترخيص</span>
                  <span className="ad-detail-value ltr">{selectedDoctor.medicalLicenseNumber}</span>
                </div>
                <div className="ad-detail-row">
                  <span className="ad-detail-label">التخصص</span>
                  <span className="ad-detail-value">{getSpecializationInfo(selectedDoctor.specialization).nameAr}</span>
                </div>
                <div className="ad-detail-row">
                  <span className="ad-detail-label">المستشفى</span>
                  <span className="ad-detail-value">{selectedDoctor.hospitalAffiliation || '-'}</span>
                </div>
                <div className="ad-detail-row">
                  <span className="ad-detail-label">سنوات الخبرة</span>
                  <span className="ad-detail-value">{selectedDoctor.yearsOfExperience || 0} سنة</span>
                </div>
                <div className="ad-detail-row">
                  <span className="ad-detail-label">رسوم الكشف</span>
                  <span className="ad-detail-value">
                    {formatNumber(selectedDoctor.consultationFee || 0)} {selectedDoctor.currency || 'SYP'}
                  </span>
                </div>
                <div className="ad-detail-row">
                  <span className="ad-detail-label">الحالة</span>
                  <span className="ad-detail-value">
                    {selectedDoctor.isActive !== false ? (
                      <span className="ad-pill success"><CheckCircle2 size={11} strokeWidth={2.5} />نشط</span>
                    ) : (
                      <span className="ad-pill error"><Ban size={11} strokeWidth={2.5} />غير نشط</span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────
          PATIENT DETAILS MODAL
          ─────────────────────────────────────────────────────────── */}
      {showPatientDetails && selectedPatient && (
        <div className="ad-modal-overlay" onClick={() => setShowPatientDetails(false)} role="dialog" aria-modal="true">
          <div className="ad-modal large" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="ad-modal-close" onClick={() => setShowPatientDetails(false)}>
              <X size={18} strokeWidth={2.5} />
            </button>
            <div className="ad-modal-header center">
              <h2>تفاصيل المريض</h2>
            </div>
            <div className="ad-request-details">
              <div className="ad-detail-section">
                <div className="ad-detail-section-header">
                  <div className="ad-detail-section-icon"><User size={16} strokeWidth={2.2} /></div>
                  <h4 className="ad-detail-section-title">المعلومات الشخصية</h4>
                </div>
                <div className="ad-detail-row">
                  <span className="ad-detail-label">الاسم</span>
                  <span className="ad-detail-value">{selectedPatient.firstName} {selectedPatient.lastName}</span>
                </div>
                <div className="ad-detail-row">
                  <span className="ad-detail-label">الرقم الوطني</span>
                  <span className="ad-detail-value ltr">{selectedPatient.nationalId || '-'}</span>
                </div>
                <div className="ad-detail-row">
                  <span className="ad-detail-label">الجنس</span>
                  <span className="ad-detail-value">{selectedPatient.gender === 'male' ? 'ذكر' : 'أنثى'}</span>
                </div>
                <div className="ad-detail-row">
                  <span className="ad-detail-label">تاريخ الميلاد</span>
                  <span className="ad-detail-value">{formatArabicDate(selectedPatient.dateOfBirth)}</span>
                </div>
                <div className="ad-detail-row">
                  <span className="ad-detail-label">الهاتف</span>
                  <span className="ad-detail-value ltr">{selectedPatient.phoneNumber || '-'}</span>
                </div>
                <div className="ad-detail-row">
                  <span className="ad-detail-label">المحافظة</span>
                  <span className="ad-detail-value">{getGovernorateName(selectedPatient.governorate)}</span>
                </div>
              </div>
              <div className="ad-detail-section">
                <div className="ad-detail-section-header">
                  <div className="ad-detail-section-icon"><HeartPulse size={16} strokeWidth={2.2} /></div>
                  <h4 className="ad-detail-section-title">المعلومات الطبية</h4>
                </div>
                <div className="ad-detail-row">
                  <span className="ad-detail-label">فصيلة الدم</span>
                  <span className="ad-detail-value">{selectedPatient.bloodType || '-'}</span>
                </div>
                <div className="ad-detail-row">
                  <span className="ad-detail-label">الطول</span>
                  <span className="ad-detail-value">
                    {selectedPatient.height ? `${selectedPatient.height} سم` : '-'}
                  </span>
                </div>
                <div className="ad-detail-row">
                  <span className="ad-detail-label">الوزن</span>
                  <span className="ad-detail-value">
                    {selectedPatient.weight ? `${selectedPatient.weight} كغ` : '-'}
                  </span>
                </div>
                <div className="ad-detail-row">
                  <span className="ad-detail-label">التدخين</span>
                  <span className="ad-detail-value">
                    {selectedPatient.smokingStatus === 'never' ? 'لا يدخن' :
                     selectedPatient.smokingStatus === 'former' ? 'مدخن سابق' :
                     selectedPatient.smokingStatus === 'current' ? 'مدخن' : '-'}
                  </span>
                </div>
                <div className="ad-detail-row">
                  <span className="ad-detail-label">الحالة</span>
                  <span className="ad-detail-value">
                    {selectedPatient.isActive !== false ? (
                      <span className="ad-pill success"><CheckCircle2 size={11} strokeWidth={2.5} />نشط</span>
                    ) : (
                      <span className="ad-pill error"><Ban size={11} strokeWidth={2.5} />غير نشط</span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────
          CHILD DETAILS MODAL
          ─────────────────────────────────────────────────────────── */}
      {showChildDetails && selectedChild && (
        <div className="ad-modal-overlay" onClick={() => setShowChildDetails(false)} role="dialog" aria-modal="true">
          <div className="ad-modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="ad-modal-close" onClick={() => setShowChildDetails(false)}>
              <X size={18} strokeWidth={2.5} />
            </button>
            <div className="ad-modal-header center">
              <div className="ad-modal-icon-wrapper">
                <div className="ad-modal-icon info">
                  <Baby size={36} strokeWidth={2} />
                </div>
              </div>
              <h2>تفاصيل الطفل</h2>
            </div>
            <div className="ad-modal-body left-text">
              <div className="ad-detail-section">
                <div className="ad-detail-row">
                  <span className="ad-detail-label">اسم الطفل</span>
                  <span className="ad-detail-value">{selectedChild.firstName} {selectedChild.lastName}</span>
                </div>
                <div className="ad-detail-row">
                  <span className="ad-detail-label">رقم التسجيل</span>
                  <span className="ad-detail-value ltr">{selectedChild.childRegistrationNumber || '-'}</span>
                </div>
                <div className="ad-detail-row">
                  <span className="ad-detail-label">الجنس</span>
                  <span className="ad-detail-value">{selectedChild.gender === 'male' ? 'ذكر' : 'أنثى'}</span>
                </div>
                <div className="ad-detail-row">
                  <span className="ad-detail-label">تاريخ الميلاد</span>
                  <span className="ad-detail-value">{formatArabicDate(selectedChild.dateOfBirth)}</span>
                </div>
                <div className="ad-detail-row">
                  <span className="ad-detail-label">الرقم الوطني للوالد</span>
                  <span className="ad-detail-value ltr">{selectedChild.parentNationalId || '-'}</span>
                </div>
                <div className="ad-detail-row">
                  <span className="ad-detail-label">حالة الترحيل</span>
                  <span className="ad-detail-value">
                    {selectedChild.migrationStatus === 'pending' && (
                      <span className="ad-pill muted"><Clock size={11} strokeWidth={2.5} />بانتظار الترحيل</span>
                    )}
                    {selectedChild.migrationStatus === 'ready' && (
                      <span className="ad-pill warning"><AlertCircle size={11} strokeWidth={2.5} />جاهز للترحيل</span>
                    )}
                    {selectedChild.migrationStatus === 'migrated' && (
                      <span className="ad-pill success"><CheckCircle2 size={11} strokeWidth={2.5} />تم الترحيل</span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminDashboard;