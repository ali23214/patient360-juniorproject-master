// src/pages/AdminDashboard.jsx
// 🏛️ Health Ministry Admin Dashboard - Government Healthcare Platform
// Patient 360° - وزارة الصحة - الجمهورية العربية السورية
// Database Schema Compliant Version with Doctor Requests Management
// REDESIGNED VERSION - Professional Government-Grade UI

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import { authAPI } from '../services/api';
import '../styles/AdminDashboard.css';

// ============================================
// RESPONSIVE HELPER COMPONENTS
// ============================================

/**
 * ResponsiveTable - Displays as table on desktop, cards on mobile
 */
const ResponsiveTable = ({ columns, data, loading, emptyMessage, emptyIcon, renderActions }) => {
  if (loading) {
    return (
      <div className="loading-state">
        <div className="loading-spinner"></div>
        <p>جاري التحميل...</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="empty-state">
        <span className="empty-icon">{emptyIcon || '📋'}</span>
        <h4>{emptyMessage || 'لا توجد بيانات'}</h4>
      </div>
    );
  }

  return (
    <div className="responsive-table-wrapper">
      {/* Desktop Table View */}
      <table className="admin-table desktop-table">
        <thead>
          <tr>
            {columns.map((col, i) => (
              <th key={i} className={col.className || ''}>{col.header}</th>
            ))}
            {renderActions && <th className="actions-col">الإجراءات</th>}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => (
            <tr key={row._id || rowIndex}>
              {columns.map((col, colIndex) => (
                <td key={colIndex} className={col.cellClassName || ''} data-label={col.header}>
                  {col.render ? col.render(row) : row[col.field]}
                </td>
              ))}
              {renderActions && (
                <td className="actions-cell">{renderActions(row)}</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mobile Cards View */}
      <div className="mobile-cards">
        {data.map((row, rowIndex) => (
          <div key={row._id || rowIndex} className="mobile-card">
            <div className="mobile-card-header">
              {columns[0]?.render ? columns[0].render(row) : row[columns[0]?.field]}
            </div>
            <div className="mobile-card-body">
              {columns.slice(1).map((col, colIndex) => (
                <div key={colIndex} className="mobile-card-row">
                  <span className="mobile-label">{col.header}:</span>
                  <span className="mobile-value">
                    {col.render ? col.render(row) : row[col.field]}
                  </span>
                </div>
              ))}
            </div>
            {renderActions && (
              <div className="mobile-card-actions">{renderActions(row)}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * SearchFilterBar - Responsive search and filter controls
 */
const SearchFilterBar = ({ 
  searchValue, 
  onSearchChange, 
  searchPlaceholder, 
  filters,
  activeFilter,
  onFilterChange 
}) => (
  <div className="search-filter-bar responsive">
    <div className="search-input-wrapper">
      <span className="search-icon">🔍</span>
      <input
        type="text"
        placeholder={searchPlaceholder || 'بحث...'}
        value={searchValue}
        onChange={(e) => onSearchChange(e.target.value)}
        className="search-input"
      />
      {searchValue && (
        <button className="clear-search-btn" onClick={() => onSearchChange('')}>✕</button>
      )}
    </div>
    {filters && (
      <div className="filter-buttons responsive">
        {filters.map((filter) => (
          <button
            key={filter.value}
            className={`filter-btn ${filter.colorClass || ''} ${activeFilter === filter.value ? 'active' : ''}`}
            onClick={() => onFilterChange(filter.value)}
          >
            {filter.icon && <span className="filter-icon">{filter.icon}</span>}
            {filter.label}
            {filter.count !== undefined && <span className="filter-count">({filter.count})</span>}
          </button>
        ))}
      </div>
    )}
  </div>
);

/**
 * ResponsiveModal - Modal with responsive sizing
 */
const ResponsiveModal = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  size = 'medium',
  footer 
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className={`modal-content responsive-modal ${size}`} 
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose}>✕</button>
        {title && <h3 className="modal-title">{title}</h3>}
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
};

/**
 * ============================================
 * DATABASE SCHEMA REFERENCE (from metadata)
 * ============================================
 * 
 * DOCTORS COLLECTION:
 * - personId: objectId (required)
 * - medicalLicenseNumber: string, pattern ^[A-Z0-9]{8,20}$ (required)
 * - specialization: string, 3-100 chars, pattern ^[a-zA-Z\s-]+$ (required)
 * - subSpecialization: string|null, 3-100 chars
 * - yearsOfExperience: int, 0-60
 * - hospitalAffiliation: string, 3-150 chars
 * - availableDays: array[1-7], enum ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"]
 * - consultationFee: int|double, 0-1000000
 * - createdAt: date (required)
 * - updatedAt: date
 * 
 * ACCOUNTS COLLECTION:
 * - email: unique
 * - password: hashed
 * - personId: objectId, unique
 * - roles: array
 * - isActive: boolean
 * 
 * PERSONS COLLECTION:
 * - nationalId: unique
 * - firstName, lastName
 * - Other personal info
 * 
 * DOCTOR_REQUESTS COLLECTION (NEW):
 * - All doctor fields + personal fields
 * - status: 'pending' | 'accepted' | 'rejected'
 * - rejectionReason: string | null
 * - requestId: unique string
 * - createdAt, reviewedAt, reviewedBy
 */

// ============================================
// CONSTANTS - MATCHING DATABASE ENUMS
// ============================================

/**
 * Syrian Governorates
 */
const SYRIAN_GOVERNORATES = [
  { id: 'damascus', nameAr: 'دمشق', nameEn: 'Damascus' },
  { id: 'rif_dimashq', nameAr: 'ريف دمشق', nameEn: 'Rif Dimashq' },
  { id: 'aleppo', nameAr: 'حلب', nameEn: 'Aleppo' },
  { id: 'homs', nameAr: 'حمص', nameEn: 'Homs' },
  { id: 'hama', nameAr: 'حماة', nameEn: 'Hama' },
  { id: 'latakia', nameAr: 'اللاذقية', nameEn: 'Latakia' },
  { id: 'tartus', nameAr: 'طرطوس', nameEn: 'Tartus' },
  { id: 'idlib', nameAr: 'إدلب', nameEn: 'Idlib' },
  { id: 'deir_ez_zor', nameAr: 'دير الزور', nameEn: 'Deir ez-Zor' },
  { id: 'hasakah', nameAr: 'الحسكة', nameEn: 'Al-Hasakah' },
  { id: 'raqqa', nameAr: 'الرقة', nameEn: 'Raqqa' },
  { id: 'daraa', nameAr: 'درعا', nameEn: 'Daraa' },
  { id: 'suwayda', nameAr: 'السويداء', nameEn: 'As-Suwayda' },
  { id: 'quneitra', nameAr: 'القنيطرة', nameEn: 'Quneitra' }
];

/**
 * Medical Specializations
 * IMPORTANT: id must match pattern ^[a-zA-Z\s-]+$ (English only, letters/spaces/hyphens)
 */
const MEDICAL_SPECIALIZATIONS = [
  { id: 'Cardiologist', nameAr: 'طبيب قلب', icon: '❤️', hasECG: true },
  { id: 'Pulmonologist', nameAr: 'طبيب أمراض الرئة', icon: '🫁', hasECG: false },
  { id: 'General Practitioner', nameAr: 'طبيب عام', icon: '🩺', hasECG: false },
  { id: 'Infectious Disease Specialist', nameAr: 'طبيب أمراض معدية', icon: '🦠', hasECG: false },
  { id: 'Intensive Care Specialist', nameAr: 'طبيب عناية مركزة', icon: '🏥', hasECG: false },
  { id: 'Rheumatologist', nameAr: 'طبيب روماتيزم', icon: '🦴', hasECG: false },
  { id: 'Orthopedic Surgeon', nameAr: 'جراح عظام', icon: '🦿', hasECG: false },
  { id: 'Neurologist', nameAr: 'طبيب أعصاب', icon: '🧠', hasECG: false },
  { id: 'Endocrinologist', nameAr: 'طبيب غدد صماء', icon: '⚗️', hasECG: false },
  { id: 'Dermatologist', nameAr: 'طبيب جلدية', icon: '🧴', hasECG: false },
  { id: 'Gastroenterologist', nameAr: 'طبيب جهاز هضمي', icon: '🫃', hasECG: false },
  { id: 'General Surgeon', nameAr: 'جراح عام', icon: '🔪', hasECG: false },
  { id: 'Hepatologist', nameAr: 'طبيب كبد', icon: '🫀', hasECG: false },
  { id: 'Urologist', nameAr: 'طبيب مسالك بولية', icon: '💧', hasECG: false },
  { id: 'Gynecologist', nameAr: 'طبيب نساء وتوليد', icon: '🤰', hasECG: false },
  { id: 'Psychiatrist', nameAr: 'طبيب نفسي', icon: '🧘', hasECG: false },
  { id: 'Hematologist', nameAr: 'طبيب دم', icon: '🩸', hasECG: false },
  { id: 'Oncologist', nameAr: 'طبيب أورام', icon: '🎗️', hasECG: false },
  { id: 'ENT Specialist', nameAr: 'طبيب أنف أذن حنجرة', icon: '👂', hasECG: false },
  { id: 'Ophthalmologist', nameAr: 'طبيب عيون', icon: '👁️', hasECG: false },
  { id: 'Pediatrician', nameAr: 'طبيب أطفال', icon: '👶', hasECG: false },
  { id: 'Nephrologist', nameAr: 'طبيب كلى', icon: '🫘', hasECG: false },
  { id: 'Internal Medicine', nameAr: 'طبيب باطنية', icon: '🏨', hasECG: false },
  { id: 'Emergency Medicine', nameAr: 'طبيب طوارئ', icon: '🚑', hasECG: false }
];

/**
 * Available Days - MUST match database enum exactly
 * Database: ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"]
 */
const WEEKDAYS = [
  { id: 'Sunday', nameAr: 'الأحد' },
  { id: 'Monday', nameAr: 'الإثنين' },
  { id: 'Tuesday', nameAr: 'الثلاثاء' },
  { id: 'Wednesday', nameAr: 'الأربعاء' },
  { id: 'Thursday', nameAr: 'الخميس' },
  { id: 'Friday', nameAr: 'الجمعة' },
  { id: 'Saturday', nameAr: 'السبت' }
];

/**
 * Deactivation Reasons
 */
const DEACTIVATION_REASONS = [
  { id: 'death', nameAr: 'وفاة', icon: '🕊️' },
  { id: 'license_revoked', nameAr: 'إلغاء الترخيص', icon: '🚫' },
  { id: 'user_request', nameAr: 'طلب المستخدم', icon: '📝' },
  { id: 'fraud', nameAr: 'احتيال', icon: '⚠️' },
  { id: 'retirement', nameAr: 'تقاعد', icon: '🏖️' },
  { id: 'transfer', nameAr: 'نقل', icon: '🔄' },
  { id: 'other', nameAr: 'سبب آخر', icon: '📋' }
];

/**
 * Rejection Reasons for Doctor Requests
 */
const REJECTION_REASONS = [
  { id: 'invalid_license', nameAr: 'رقم ترخيص غير صالح', icon: '🚫' },
  { id: 'incomplete_documents', nameAr: 'وثائق غير مكتملة', icon: '📄' },
  { id: 'unverifiable_info', nameAr: 'معلومات غير قابلة للتحقق', icon: '❓' },
  { id: 'duplicate_request', nameAr: 'طلب مكرر', icon: '🔄' },
  { id: 'suspended_license', nameAr: 'ترخيص موقوف', icon: '⏸️' },
  { id: 'other', nameAr: 'سبب آخر', icon: '📋' }
];

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Arabic to English transliteration for email generation
 */
const transliterateArabic = (text) => {
  const map = {
    'ا': 'a', 'أ': 'a', 'إ': 'e', 'آ': 'a', 'ب': 'b', 'ت': 't', 'ث': 'th',
    'ج': 'j', 'ح': 'h', 'خ': 'kh', 'د': 'd', 'ذ': 'th', 'ر': 'r', 'ز': 'z',
    'س': 's', 'ش': 'sh', 'ص': 's', 'ض': 'd', 'ط': 't', 'ظ': 'z', 'ع': 'a',
    'غ': 'gh', 'ف': 'f', 'ق': 'q', 'ك': 'k', 'ل': 'l', 'م': 'm', 'ن': 'n',
    'ه': 'h', 'و': 'w', 'ي': 'y', 'ى': 'a', 'ة': 'a', 'ء': '', 'ئ': 'y', 'ؤ': 'w'
  };
  return text.split('').map(char => map[char] || char).join('').replace(/[^a-z]/g, '').toLowerCase() || 'user';
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
 * Format date for display
 */
const formatDate = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
};

const formatDateTime = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

/**
 * Get specialization display info
 */
const getSpecializationInfo = (specId) => {
  const spec = MEDICAL_SPECIALIZATIONS.find(s => s.id === specId);
  return spec || { id: specId, nameAr: specId, icon: '🩺', hasECG: false };
};

/**
 * Get governorate display name
 */
const getGovernorateName = (govId) => {
  const gov = SYRIAN_GOVERNORATES.find(g => g.id === govId);
  return gov ? gov.nameAr : govId;
};

// ============================================
// COMPONENTS
// ============================================

/**
 * StatCard - Responsive statistics card with touch-friendly design
 */
const StatCard = ({ icon, value, label, sublabel, color, onClick, badge }) => (
  <div 
    className={`stat-card responsive ${color}`} 
    onClick={onClick} 
    style={{ cursor: onClick ? 'pointer' : 'default' }}
    role={onClick ? 'button' : undefined}
    tabIndex={onClick ? 0 : undefined}
    onKeyDown={(e) => {
      if (onClick && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        onClick();
      }
    }}
  >
    <div className="stat-card-icon"><span>{icon}</span></div>
    <div className="stat-card-content">
      <h3 className="stat-value">{value}</h3>
      <p className="stat-label">{label}</p>
      {sublabel && <span className="stat-sublabel">{sublabel}</span>}
    </div>
    {badge && <span className="stat-badge pulse">{badge}</span>}
  </div>
);

// ============================================
// MAIN COMPONENT
// ============================================

const AdminDashboard = () => {
  const navigate = useNavigate();
  
  // Core State
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('statistics');
  
  // Modal
  const [modal, setModal] = useState({ isOpen: false, type: '', title: '', message: '', onConfirm: null });
  
  // Statistics
  const [statistics, setStatistics] = useState({
    totalDoctors: 0, activeDoctors: 0, inactiveDoctors: 0,
    totalPatients: 0, activePatients: 0, inactivePatients: 0,
    totalVisits: 0, todayVisits: 0,
    pendingRequests: 0
  });
  
  // Doctors
  const [doctors, setDoctors] = useState([]);
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [doctorSearchTerm, setDoctorSearchTerm] = useState('');
  const [doctorFilter, setDoctorFilter] = useState('all');
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [showDoctorDetails, setShowDoctorDetails] = useState(false);
  
  // Patients
  const [patients, setPatients] = useState([]);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [patientFilter, setPatientFilter] = useState('all');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showPatientDetails, setShowPatientDetails] = useState(false);
  
  // ═══════════════════════════════════════════════════════════════
  // NEW: DOCTOR REQUESTS STATE
  // ═══════════════════════════════════════════════════════════════
  const [doctorRequests, setDoctorRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestSearchTerm, setRequestSearchTerm] = useState('');
  const [requestFilter, setRequestFilter] = useState('pending');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showRequestDetails, setShowRequestDetails] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectNotes, setRejectNotes] = useState('');
  const [processingRequest, setProcessingRequest] = useState(false);
  const [showAcceptConfirm, setShowAcceptConfirm] = useState(false);
  const [generatedCredentials, setGeneratedCredentials] = useState(null);
  
  // Add Doctor Form - Fields matching database schema
  const [showAddDoctorForm, setShowAddDoctorForm] = useState(false);
  const [addDoctorLoading, setAddDoctorLoading] = useState(false);
  const [newDoctor, setNewDoctor] = useState({
    // === PERSONS COLLECTION FIELDS ===
    firstName: '',
    lastName: '',
    nationalId: '',           // unique in persons
    phoneNumber: '',
    gender: 'male',
    dateOfBirth: '',
    address: '',
    governorate: '',
    city: '',
    
    // === DOCTORS COLLECTION FIELDS (strict schema) ===
    medicalLicenseNumber: '', // required, pattern: ^[A-Z0-9]{8,20}$
    specialization: '',       // required, pattern: ^[a-zA-Z\s-]+$, 3-100 chars
    subSpecialization: '',    // optional, 3-100 chars or null
    yearsOfExperience: '',    // int, 0-60
    hospitalAffiliation: '',  // string, 3-150 chars
    availableDays: [],        // array[1-7], enum weekdays
    consultationFee: ''       // int|double, 0-1000000
  });
  const [newDoctorCredentials, setNewDoctorCredentials] = useState(null);
  
  // Deactivation
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [deactivateType, setDeactivateType] = useState('');
  const [deactivateReason, setDeactivateReason] = useState('');
  const [deactivateNotes, setDeactivateNotes] = useState('');
  
  // Audit Logs
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);

  // ============================================
  // MODAL FUNCTIONS
  // ============================================

  const openModal = (type, title, message, onConfirm = null) => {
    setModal({ isOpen: true, type, title, message, onConfirm });
  };

  const closeModal = () => {
    if (modal.onConfirm) modal.onConfirm();
    setModal({ isOpen: false, type: '', title: '', message: '', onConfirm: null });
  };

  // ============================================
  // INITIALIZATION
  // ============================================
  
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const currentUser = authAPI.getCurrentUser();
      
      if (!currentUser) {
        openModal('error', 'غير مصرح', 'يجب عليك تسجيل الدخول أولاً', () => navigate('/'));
        return;
      }
      
      if (currentUser.roles?.[0] !== 'admin') {
        openModal('error', 'غير مصرح', 'هذه الصفحة متاحة للمسؤولين فقط', () => navigate('/'));
        return;
      }
      
      setAdmin(currentUser);
      await loadStatistics();
      setLoading(false);
    };
    init();
  }, [navigate]);

  // ============================================
  // API CALLS
  // ============================================

  const loadStatistics = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };
      
      const [doctorsRes, patientsRes, statsRes, requestsRes] = await Promise.all([
        fetch('http://localhost:5000/api/admin/doctors', { headers }),
        fetch('http://localhost:5000/api/admin/patients', { headers }),
        fetch('http://localhost:5000/api/admin/statistics', { headers }),
        fetch('http://localhost:5000/api/admin/doctor-requests', { headers })
      ]);
      
      const [doctorsData, patientsData, statsData, requestsData] = await Promise.all([
        doctorsRes.json(), patientsRes.json(), statsRes.json(), requestsRes.json()
      ]);
      
      const allDoctors = doctorsData.success ? (doctorsData.doctors || []) : [];
      const allPatients = patientsData.success ? (patientsData.patients || []) : [];
      const allRequests = requestsData.success ? (requestsData.requests || []) : [];
      const pendingRequests = allRequests.filter(r => r.status === 'pending');
      setDoctorRequests(allRequests);
      
      setStatistics({
        totalDoctors: allDoctors.length,
        activeDoctors: allDoctors.filter(d => d.isActive !== false).length,
        inactiveDoctors: allDoctors.filter(d => d.isActive === false).length,
        totalPatients: allPatients.length,
        activePatients: allPatients.filter(p => p.isActive !== false).length,
        inactivePatients: allPatients.filter(p => p.isActive === false).length,
        totalVisits: statsData.totalVisits || 0,
        todayVisits: statsData.todayVisits || 0,
        pendingRequests: pendingRequests.length
      });
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  };

  const loadDoctors = async () => {
    setDoctorsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/admin/doctors', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setDoctors(data.doctors || []);
    } catch (error) {
      console.error('Error loading doctors:', error);
    } finally {
      setDoctorsLoading(false);
    }
  };

  const loadPatients = async () => {
    setPatientsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/admin/patients', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setPatients(data.patients || []);
    } catch (error) {
      console.error('Error loading patients:', error);
    } finally {
      setPatientsLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // NEW: LOAD DOCTOR REQUESTS
  // ═══════════════════════════════════════════════════════════════
  const loadDoctorRequests = async () => {
    setRequestsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/admin/doctor-requests', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setDoctorRequests(data.requests || []);
    } catch (error) {
      console.error('Error loading doctor requests:', error);
    } finally {
      setRequestsLoading(false);
    }
  };

  const loadAuditLogs = async () => {
    setAuditLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/admin/audit-logs', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setAuditLogs(data.logs || []);
    } catch (error) {
      console.error('Error loading audit logs:', error);
    } finally {
      setAuditLoading(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'doctors' && doctors.length === 0) loadDoctors();
    else if (tab === 'patients' && patients.length === 0) loadPatients();
    else if (tab === 'doctor_requests' && doctorRequests.length === 0) loadDoctorRequests();
    else if (tab === 'audit' && auditLogs.length === 0) loadAuditLogs();
  };

  // ============================================
  // AUDIT LOGGING
  // ============================================

  const logAuditAction = async (action, details) => {
    try {
      const token = localStorage.getItem('token');
      await fetch('http://localhost:5000/api/admin/audit-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action,
          details,
          adminId: admin?._id,
          timestamp: new Date().toISOString()
        })
      });
    } catch (error) {
      console.error('Error logging audit action:', error);
    }
  };

  // ============================================
  // FORM VALIDATION - Matching Database Schema
  // ============================================

  const validateDoctorForm = () => {
    // === PERSON VALIDATION ===
    if (!newDoctor.firstName.trim()) {
      openModal('error', 'خطأ', 'الرجاء إدخال الاسم الأول');
      return false;
    }
    if (!newDoctor.lastName.trim()) {
      openModal('error', 'خطأ', 'الرجاء إدخال الكنية');
      return false;
    }
    if (!newDoctor.nationalId.trim() || newDoctor.nationalId.length !== 11) {
      openModal('error', 'خطأ', 'الرجاء إدخال الرقم الوطني (11 رقم)');
      return false;
    }
    if (!newDoctor.phoneNumber.trim()) {
      openModal('error', 'خطأ', 'الرجاء إدخال رقم الهاتف');
      return false;
    }
    if (!newDoctor.governorate) {
      openModal('error', 'خطأ', 'الرجاء اختيار المحافظة');
      return false;
    }

    // === DOCTOR VALIDATION (matching database schema) ===
    
    // medicalLicenseNumber: pattern ^[A-Z0-9]{8,20}$
    const license = newDoctor.medicalLicenseNumber.toUpperCase().trim();
    if (!license) {
      openModal('error', 'خطأ', 'الرجاء إدخال رقم الترخيص الطبي');
      return false;
    }
    if (!/^[A-Z0-9]{8,20}$/.test(license)) {
      openModal('error', 'خطأ في رقم الترخيص', 
        'رقم الترخيص يجب أن يكون:\n• 8-20 حرف/رقم\n• أحرف إنجليزية كبيرة (A-Z) وأرقام (0-9) فقط\n• مثال: SY12345678');
      return false;
    }

    // specialization: pattern ^[a-zA-Z\s-]+$, 3-100 chars
    if (!newDoctor.specialization) {
      openModal('error', 'خطأ', 'الرجاء اختيار التخصص');
      return false;
    }
    if (newDoctor.specialization.length < 3 || newDoctor.specialization.length > 100) {
      openModal('error', 'خطأ', 'التخصص يجب أن يكون بين 3-100 حرف');
      return false;
    }

    // hospitalAffiliation: 3-150 chars (required in our form)
    if (!newDoctor.hospitalAffiliation.trim()) {
      openModal('error', 'خطأ', 'الرجاء إدخال اسم المستشفى أو المركز الصحي');
      return false;
    }
    if (newDoctor.hospitalAffiliation.length < 3 || newDoctor.hospitalAffiliation.length > 150) {
      openModal('error', 'خطأ', 'اسم المستشفى يجب أن يكون بين 3-150 حرف');
      return false;
    }

    // availableDays: array 1-7 items
    if (newDoctor.availableDays.length === 0) {
      openModal('error', 'خطأ', 'الرجاء اختيار أيام العمل (يوم واحد على الأقل)');
      return false;
    }
    if (newDoctor.availableDays.length > 7) {
      openModal('error', 'خطأ', 'لا يمكن اختيار أكثر من 7 أيام');
      return false;
    }

    // subSpecialization: if provided, must be 3-100 chars
    if (newDoctor.subSpecialization.trim() && 
        (newDoctor.subSpecialization.length < 3 || newDoctor.subSpecialization.length > 100)) {
      openModal('error', 'خطأ', 'التخصص الفرعي يجب أن يكون بين 3-100 حرف');
      return false;
    }

    // yearsOfExperience: 0-60
    const years = parseInt(newDoctor.yearsOfExperience) || 0;
    if (years < 0 || years > 60) {
      openModal('error', 'خطأ', 'سنوات الخبرة يجب أن تكون بين 0-60');
      return false;
    }

    // consultationFee: 0-1000000
    const fee = parseFloat(newDoctor.consultationFee) || 0;
    if (fee < 0 || fee > 1000000) {
      openModal('error', 'خطأ', 'رسوم الكشف يجب أن تكون بين 0-1,000,000');
      return false;
    }

    // Clinic address
    if (!newDoctor.address.trim()) {
      openModal('error', 'خطأ', 'الرجاء إدخال عنوان العيادة');
      return false;
    }

    return true;
  };

  // ============================================
  // ADD DOCTOR
  // ============================================

  const handleAddDoctor = async () => {
    if (!validateDoctorForm()) return;

    setAddDoctorLoading(true);

    try {
      const email = generateDoctorEmail(newDoctor.firstName, newDoctor.lastName, newDoctor.medicalLicenseNumber);
      const password = generatePassword();

      // Structure matching database collections
      const payload = {
        // For PERSONS collection
        person: {
          firstName: newDoctor.firstName.trim(),
          lastName: newDoctor.lastName.trim(),
          nationalId: newDoctor.nationalId.trim(),
          phoneNumber: newDoctor.phoneNumber.trim(),
          gender: newDoctor.gender,
          dateOfBirth: newDoctor.dateOfBirth || null,
          address: newDoctor.address.trim(),
          governorate: newDoctor.governorate,
          city: newDoctor.city.trim() || null
        },
        
        // For ACCOUNTS collection
        account: {
          email: email,
          password: password, // Backend will hash this
          roles: ['doctor'],
          isActive: true
        },
        
        // For DOCTORS collection (matching exact schema)
        doctor: {
          medicalLicenseNumber: newDoctor.medicalLicenseNumber.toUpperCase().trim(),
          specialization: newDoctor.specialization,
          subSpecialization: newDoctor.subSpecialization.trim() || null,
          yearsOfExperience: parseInt(newDoctor.yearsOfExperience) || 0,
          hospitalAffiliation: newDoctor.hospitalAffiliation.trim(),
          availableDays: newDoctor.availableDays,
          consultationFee: parseFloat(newDoctor.consultationFee) || 0
        }
      };

      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/admin/doctors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (data.success) {
        setNewDoctorCredentials({
          email,
          password,
          doctorName: `${newDoctor.firstName} ${newDoctor.lastName}`
        });
        
        // Reset form
        setNewDoctor({
          firstName: '', lastName: '', nationalId: '', phoneNumber: '',
          gender: 'male', dateOfBirth: '', address: '', governorate: '', city: '',
          medicalLicenseNumber: '', specialization: '', subSpecialization: '',
          yearsOfExperience: '', hospitalAffiliation: '', availableDays: [], consultationFee: ''
        });
        
        loadDoctors();
        loadStatistics();
        logAuditAction('ADD_DOCTOR', `تم إضافة طبيب جديد: ${payload.person.firstName} ${payload.person.lastName}`);
      } else {
        openModal('error', 'خطأ', data.message || 'حدث خطأ أثناء إضافة الطبيب');
      }
    } catch (error) {
      console.error('Error adding doctor:', error);
      openModal('error', 'خطأ', 'حدث خطأ في الاتصال بالخادم');
    } finally {
      setAddDoctorLoading(false);
    }
  };

  const handleDayToggle = (day) => {
    setNewDoctor(prev => ({
      ...prev,
      availableDays: prev.availableDays.includes(day)
        ? prev.availableDays.filter(d => d !== day)
        : [...prev.availableDays, day]
    }));
  };

  // ═══════════════════════════════════════════════════════════════
  // NEW: DOCTOR REQUEST ACTIONS
  // ═══════════════════════════════════════════════════════════════

  const handleViewRequest = (request) => {
    setSelectedRequest(request);
    setShowRequestDetails(true);
  };

const handleAcceptRequest = async () => {
  if (!selectedRequest) return;

  setProcessingRequest(true);

  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`http://localhost:5000/api/admin/doctor-requests/${selectedRequest._id}/accept`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        adminNotes: ''  // ← فقط adminNotes!
      })
    });

    const data = await res.json();
    console.log('📥 Backend response:', data);

    if (data.success) {
      // ✅ عرض بيانات الدخول من Backend
      setGeneratedCredentials({
        email: data.data.email,      // ← من Backend (signup email)
        password: data.data.password, // ← من Backend (signup password plaintext)
        doctorName: data.data.doctorName
      });
      
      setShowAcceptConfirm(false);
      setShowRequestDetails(false);
      
      loadDoctorRequests();
      loadStatistics();
      logAuditAction('ACCEPT_DOCTOR_REQUEST', `تم قبول طلب تسجيل الطبيب: ${selectedRequest.personalInfo?.firstName} ${selectedRequest.personalInfo?.lastName}`);
    } else {
      openModal('error', 'خطأ', data.message || 'حدث خطأ أثناء قبول الطلب');
    }
  } catch (error) {
    console.error('❌ Error accepting request:', error);
    openModal('error', 'خطأ', 'حدث خطأ في الاتصال بالخادم');
  } finally {
    setProcessingRequest(false);
  }
};


const handleRejectRequest = async () => {
  if (!selectedRequest || !rejectReason) {
    openModal('error', 'خطأ', 'الرجاء اختيار سبب الرفض');
    return;
  }

  setProcessingRequest(true);

  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`http://localhost:5000/api/admin/doctor-requests/${selectedRequest._id}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        rejectionReason: rejectReason,  // ← ✅ غيّرنا من reason
        adminNotes: rejectNotes         // ← ✅ غيّرنا من notes
      })
    });

    const data = await res.json();

    if (data.success) {
      openModal('success', 'تم الرفض', 'تم رفض طلب التسجيل بنجاح');
      setShowRejectModal(false);
      setShowRequestDetails(false);
      setRejectReason('');
      setRejectNotes('');
      
      loadDoctorRequests();
      loadStatistics();
      logAuditAction('REJECT_DOCTOR_REQUEST', `تم رفض طلب تسجيل الطبيب: ${selectedRequest.personalInfo?.firstName} ${selectedRequest.personalInfo?.lastName} - السبب: ${rejectReason}`);
    } else {
      openModal('error', 'خطأ', data.message || 'حدث خطأ أثناء رفض الطلب');
    }
  } catch (error) {
    console.error('Error rejecting request:', error);
    openModal('error', 'خطأ', 'حدث خطأ في الاتصال بالخادم');
  } finally {
    setProcessingRequest(false);
  }
};

  // ============================================
  // DEACTIVATION
  // ============================================

  const handleDeactivate = (target, type) => {
    setDeactivateTarget(target);
    setDeactivateType(type);
    setDeactivateReason('');
    setDeactivateNotes('');
    setShowDeactivateModal(true);
  };

  const confirmDeactivation = async () => {
    if (!deactivateReason) {
      openModal('error', 'خطأ', 'الرجاء اختيار سبب إلغاء التفعيل');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const endpoint = deactivateType === 'doctor' 
        ? `http://localhost:5000/api/admin/doctors/${deactivateTarget.id}/deactivate`
        : `http://localhost:5000/api/admin/patients/${deactivateTarget.id}/deactivate`;
      
      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          reason: deactivateReason,
          notes: deactivateNotes
        })
      });

      const data = await res.json();

      if (data.success) {
        openModal('success', 'تم إلغاء التفعيل', `تم إلغاء تفعيل ${deactivateType === 'doctor' ? 'الطبيب' : 'المريض'} بنجاح`);
        setShowDeactivateModal(false);
        setShowDoctorDetails(false);
        setShowPatientDetails(false);
        
        if (deactivateType === 'doctor') {
          loadDoctors();
        } else {
          loadPatients();
        }
        loadStatistics();
        
        const targetName = `${deactivateTarget.firstName} ${deactivateTarget.lastName}`;
        logAuditAction('DEACTIVATE_ACCOUNT', `تم إلغاء تفعيل ${deactivateType === 'doctor' ? 'طبيب' : 'مريض'}: ${targetName} - السبب: ${deactivateReason}`);
      } else {
        openModal('error', 'خطأ', data.message || 'حدث خطأ أثناء إلغاء التفعيل');
      }
    } catch (error) {
      console.error('Error deactivating account:', error);
      openModal('error', 'خطأ', 'حدث خطأ في الاتصال بالخادم');
    }
  };

  const handleReactivate = async (target, type) => {
    try {
      const token = localStorage.getItem('token');
      const endpoint = type === 'doctor' 
        ? `http://localhost:5000/api/admin/doctors/${target.id}/reactivate`
        : `http://localhost:5000/api/admin/patients/${target.id}/reactivate`;
      
      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await res.json();

      if (data.success) {
        openModal('success', 'تم إعادة التفعيل', `تم إعادة تفعيل ${type === 'doctor' ? 'الطبيب' : 'المريض'} بنجاح`);
        
        if (type === 'doctor') {
          loadDoctors();
        } else {
          loadPatients();
        }
        loadStatistics();
        
        const targetName = `${target.firstName} ${target.lastName}`;
        logAuditAction('REACTIVATE_ACCOUNT', `تم إعادة تفعيل ${type === 'doctor' ? 'طبيب' : 'مريض'}: ${targetName}`);
      } else {
        openModal('error', 'خطأ', data.message || 'حدث خطأ أثناء إعادة التفعيل');
      }
    } catch (error) {
      console.error('Error reactivating account:', error);
      openModal('error', 'خطأ', 'حدث خطأ في الاتصال بالخادم');
    }
  };

  // ============================================
  // LOGOUT
  // ============================================

  const handleLogout = () => {
    logAuditAction('LOGOUT', 'تسجيل خروج المسؤول');
    authAPI.logout();
    navigate('/');
  };

  // ============================================
  // FILTER FUNCTIONS
  // ============================================

  const filteredDoctors = doctors.filter(doctor => {
    const matchesSearch = 
      doctor.firstName?.toLowerCase().includes(doctorSearchTerm.toLowerCase()) ||
      doctor.lastName?.toLowerCase().includes(doctorSearchTerm.toLowerCase()) ||
      doctor.medicalLicenseNumber?.toLowerCase().includes(doctorSearchTerm.toLowerCase()) ||
      doctor.nationalId?.includes(doctorSearchTerm);
    
    const matchesFilter = 
      doctorFilter === 'all' ||
      (doctorFilter === 'active' && doctor.isActive !== false) ||
      (doctorFilter === 'inactive' && doctor.isActive === false);
    
    return matchesSearch && matchesFilter;
  });

  const filteredPatients = patients.filter(patient => {
    const matchesSearch = 
      patient.firstName?.toLowerCase().includes(patientSearchTerm.toLowerCase()) ||
      patient.lastName?.toLowerCase().includes(patientSearchTerm.toLowerCase()) ||
      patient.nationalId?.includes(patientSearchTerm);
    
    const matchesFilter = 
      patientFilter === 'all' ||
      (patientFilter === 'active' && patient.isActive !== false) ||
      (patientFilter === 'inactive' && patient.isActive === false);
    
    return matchesSearch && matchesFilter;
  });

  // ═══════════════════════════════════════════════════════════════
  // NEW: FILTER DOCTOR REQUESTS
  // ═══════════════════════════════════════════════════════════════
  const filteredRequests = doctorRequests.filter(request => {
    const matchesSearch = 
      request.personalInfo?.firstName?.toLowerCase().includes(requestSearchTerm.toLowerCase()) ||
      request.personalInfo?.lastName?.toLowerCase().includes(requestSearchTerm.toLowerCase()) ||
      request.doctorInfo?.medicalLicenseNumber?.toLowerCase().includes(requestSearchTerm.toLowerCase()) ||
      request.personalInfo?.nationalId?.includes(requestSearchTerm) ||
      request._id?.includes(requestSearchTerm);
    
    const matchesFilter = 
      requestFilter === 'all' ||
      request.requestInfo?.status === requestFilter;
    
    return matchesSearch && matchesFilter;
  });

  // ============================================
  // LOADING STATE
  // ============================================

  if (loading) {
    return (
      <div className="admin-loading-container">
        <div className="admin-loading-content">
          <div className="ministry-emblem">🏛️</div>
          <div className="loading-spinner-admin"></div>
          <h2>Patient 360°</h2>
          <p>جاري تحميل لوحة التحكم...</p>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="admin-dashboard">
      <Navbar />
      
      <div className="admin-container">
        {/* Header */}
        <header className="admin-header">
          <div className="admin-header-content">
            <div className="ministry-badge">
              <span className="ministry-icon">🏛️</span>
              <div className="ministry-info">
                <h1>وزارة الصحة</h1>
                <p>الجمهورية العربية السورية</p>
              </div>
            </div>
            <div className="admin-title">
              <h2>لوحة تحكم المسؤول</h2>
              <p>Patient 360° - إدارة النظام الصحي</p>
            </div>
          </div>
          <div className="admin-user-section">
            <div className="admin-user-info">
              <span className="admin-avatar">👤</span>
              <div className="admin-user-details">
                <span className="admin-name">{admin?.firstName} {admin?.lastName}</span>
                <span className="admin-role">مسؤول النظام</span>
              </div>
            </div>
            <button className="logout-btn-admin" onClick={handleLogout}>
              <span>🚪</span> تسجيل الخروج
            </button>
          </div>
        </header>

        {/* Tabs Navigation */}
        <nav className="admin-tabs">
          <button 
            className={`admin-tab ${activeTab === 'statistics' ? 'active' : ''}`}
            onClick={() => handleTabChange('statistics')}
          >
            <span>📊</span> الإحصائيات
          </button>
          <button 
            className={`admin-tab ${activeTab === 'doctor_requests' ? 'active' : ''}`}
            onClick={() => handleTabChange('doctor_requests')}
          >
            <span>📋</span> طلبات الأطباء
            {statistics.pendingRequests > 0 && (
              <span className="tab-badge">{statistics.pendingRequests}</span>
            )}
          </button>
          <button 
            className={`admin-tab ${activeTab === 'doctors' ? 'active' : ''}`}
            onClick={() => handleTabChange('doctors')}
          >
            <span>👨‍⚕️</span> إدارة الأطباء
          </button>
          <button 
            className={`admin-tab ${activeTab === 'patients' ? 'active' : ''}`}
            onClick={() => handleTabChange('patients')}
          >
            <span>👥</span> إدارة المرضى
          </button>
          <button 
            className={`admin-tab ${activeTab === 'audit' ? 'active' : ''}`}
            onClick={() => handleTabChange('audit')}
          >
            <span>📜</span> سجل النظام
          </button>
        </nav>

        {/* Tab Content */}
        <div className="admin-content">
          {/* Statistics Tab */}
          {activeTab === 'statistics' && (
            <div className="statistics-section">
              <div className="stats-grid">
                <StatCard 
                  icon="👨‍⚕️" 
                  value={statistics.totalDoctors} 
                  label="إجمالي الأطباء"
                  sublabel={`${statistics.activeDoctors} نشط - ${statistics.inactiveDoctors} غير نشط`}
                  color="teal"
                  onClick={() => handleTabChange('doctors')}
                />
                <StatCard 
                  icon="👥" 
                  value={statistics.totalPatients} 
                  label="إجمالي المرضى"
                  sublabel={`${statistics.activePatients} نشط - ${statistics.inactivePatients} غير نشط`}
                  color="purple"
                  onClick={() => handleTabChange('patients')}
                />
                <StatCard 
                  icon="📋" 
                  value={statistics.pendingRequests} 
                  label="طلبات معلقة"
                  sublabel="طلبات تسجيل أطباء جديدة"
                  color="orange"
                  onClick={() => handleTabChange('doctor_requests')}
                  badge={statistics.pendingRequests > 0 ? 'جديد' : null}
                />
                <StatCard 
                  icon="🏥" 
                  value={statistics.totalVisits} 
                  label="إجمالي الزيارات"
                  sublabel={`${statistics.todayVisits} زيارة اليوم`}
                  color="green"
                />
              </div>
              
              {/* Quick Actions - REDESIGNED */}
              <div className="quick-actions-section">
                <h3 className="section-title">الإجراءات السريعة</h3>
                <div className="quick-actions-grid">
                  <button 
                    className="quick-action-btn primary-action"
                    onClick={() => { setShowAddDoctorForm(true); handleTabChange('doctors'); }}
                  >
                    <div className="action-icon-wrapper">
                      <span className="action-icon">➕</span>
                    </div>
                    <span className="action-text">إضافة طبيب جديد</span>
                    <span className="action-arrow">←</span>
                  </button>
                  <button 
                    className="quick-action-btn secondary-action"
                    onClick={() => handleTabChange('doctor_requests')}
                  >
                    <div className="action-icon-wrapper orange">
                      <span className="action-icon">📋</span>
                    </div>
                    <span className="action-text">مراجعة الطلبات</span>
                    {statistics.pendingRequests > 0 && (
                      <span className="action-badge-inline">{statistics.pendingRequests}</span>
                    )}
                    <span className="action-arrow">←</span>
                  </button>
                  <button 
                    className="quick-action-btn tertiary-action"
                    onClick={() => handleTabChange('audit')}
                  >
                    <div className="action-icon-wrapper teal">
                      <span className="action-icon">📜</span>
                    </div>
                    <span className="action-text">سجل النظام</span>
                    <span className="action-arrow">←</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              DOCTOR REQUESTS TAB - REDESIGNED
              ═══════════════════════════════════════════════════════════════ */}
          {activeTab === 'doctor_requests' && (
            <div className="requests-section">
              <div className="section-header-pro">
                <div className="section-header-content">
                  <div className="section-icon">📋</div>
                  <div className="section-text">
                    <h3>طلبات تسجيل الأطباء</h3>
                    <p>مراجعة وإدارة طلبات تسجيل الأطباء الجدد</p>
                  </div>
                </div>
              </div>

              {/* Search and Filter - REDESIGNED */}
              <div className="search-filter-container">
                <div className="search-box-pro">
                  <span className="search-icon-pro">🔍</span>
                  <input
                    type="text"
                    placeholder="البحث بالاسم أو رقم الترخيص أو الرقم الوطني..."
                    value={requestSearchTerm}
                    onChange={(e) => setRequestSearchTerm(e.target.value)}
                  />
                  {requestSearchTerm && (
                    <button className="clear-btn" onClick={() => setRequestSearchTerm('')}>✕</button>
                  )}
                </div>
                <div className="filter-chips">
                  <button 
                    className={`filter-chip ${requestFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setRequestFilter('all')}
                  >
                    <span className="chip-text">الكل</span>
                    <span className="chip-count">{doctorRequests.length}</span>
                  </button>
                  <button 
                    className={`filter-chip pending ${requestFilter === 'pending' ? 'active' : ''}`}
                    onClick={() => setRequestFilter('pending')}
                  >
                    <span className="chip-icon">⏳</span>
                    <span className="chip-text">معلق</span>
                    <span className="chip-count">{doctorRequests.filter(r => r.requestInfo?.status === 'pending').length}</span>
                  </button>
                  <button 
                    className={`filter-chip accepted ${requestFilter === 'accepted' ? 'active' : ''}`}
                    onClick={() => setRequestFilter('accepted')}
                  >
                    <span className="chip-icon">✅</span>
                    <span className="chip-text">مقبول</span>
                    <span className="chip-count">{doctorRequests.filter(r => r.requestInfo?.status === 'accepted').length}</span>
                  </button>
                  <button 
                    className={`filter-chip rejected ${requestFilter === 'rejected' ? 'active' : ''}`}
                    onClick={() => setRequestFilter('rejected')}
                  >
                    <span className="chip-icon">❌</span>
                    <span className="chip-text">مرفوض</span>
                    <span className="chip-count">{doctorRequests.filter(r => r.requestInfo?.status === 'rejected').length}</span>
                  </button>
                </div>
              </div>

              {/* Requests List - REDESIGNED */}
              {requestsLoading ? (
                <div className="loading-state-pro">
                  <div className="loading-spinner-pro"></div>
                  <p>جاري تحميل الطلبات...</p>
                </div>
              ) : filteredRequests.length === 0 ? (
                <div className="empty-state-pro">
                  <div className="empty-icon-wrapper">
                    <span className="empty-icon">📭</span>
                  </div>
                  <h4>لا توجد طلبات</h4>
                  <p>لا توجد طلبات تسجيل مطابقة للبحث</p>
                </div>
              ) : (
                <div className="data-table-container">
                  <table className="data-table-pro">
                    <thead>
                      <tr>
                        <th>رقم الطلب</th>
                        <th>الاسم</th>
                        <th>التخصص</th>
                        <th>رقم الترخيص</th>
                        <th>تاريخ الطلب</th>
                        <th>الحالة</th>
                        <th>الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRequests.map((request) => {
                        const specInfo = getSpecializationInfo(request.doctorInfo?.specialization);
                        return (
                          <tr key={request._id} className={`status-row-${request.requestInfo?.status}`}>
                            <td>
                              <span className="request-id-cell">{request.requestId || request._id.slice(-8)}</span>
                            </td>
                            <td>
                              <div className="name-cell-pro">
                                <span className="full-name-pro">{request.personalInfo?.firstName} {request.personalInfo?.lastName}</span>
                                <span className="national-id-pro">{request.personalInfo?.nationalId}</span>
                              </div>
                            </td>
                            <td>
                              <div className="specialization-cell">
                                <span className="spec-icon-cell">{specInfo.icon}</span>
                                <span className="spec-name-cell">{specInfo.nameAr}</span>
                                {specInfo.hasECG && <span className="ecg-tag">ECG AI</span>}
                              </div>
                            </td>
                            <td>
                              <span className="license-cell-pro">{request.doctorInfo?.medicalLicenseNumber}</span>
                            </td>
                            <td>
                              <span className="date-cell-pro">{formatDate(request.requestInfo?.submittedAt)}</span>
                            </td>
                            <td>
                              <span className={`status-pill status-${request.requestInfo?.status}`}>
                                {request.requestInfo?.status === 'pending' && '⏳ قيد المراجعة'}
                                {request.requestInfo?.status === 'accepted' && '✅ مقبول'}
                                {request.requestInfo?.status === 'rejected' && '❌ مرفوض'}
                              </span>
                            </td>
                            <td>
                              <div className="actions-cell-pro">
                                <button 
                                  className="action-btn-pro view"
                                  onClick={() => handleViewRequest(request)}
                                  title="عرض التفاصيل"
                                >
                                  <span>👁️</span>
                                </button>
                                {request.requestInfo?.status === 'pending' && (
                                  <>
                                    <button 
                                      className="action-btn-pro accept"
                                      onClick={() => {
                                        setSelectedRequest(request);
                                        setShowAcceptConfirm(true);
                                      }}
                                      title="قبول الطلب"
                                    >
                                      <span>✅</span>
                                    </button>
                                    <button 
                                      className="action-btn-pro reject"
                                      onClick={() => {
                                        setSelectedRequest(request);
                                        setShowRejectModal(true);
                                      }}
                                      title="رفض الطلب"
                                    >
                                      <span>❌</span>
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
            </div>
          )}

          {/* Doctors Tab - REDESIGNED */}
          {activeTab === 'doctors' && (
            <div className="doctors-section">
              <div className="section-header-pro">
                <div className="section-header-content">
                  <div className="section-icon">👨‍⚕️</div>
                  <div className="section-text">
                    <h3>إدارة الأطباء</h3>
                    <p>عرض وإدارة حسابات الأطباء المسجلين</p>
                  </div>
                </div>
                <button 
                  className="add-btn-pro"
                  onClick={() => setShowAddDoctorForm(true)}
                >
                  <span>➕</span> إضافة طبيب جديد
                </button>
              </div>

              {/* Search and Filter */}
              <div className="search-filter-container">
                <div className="search-box-pro">
                  <span className="search-icon-pro">🔍</span>
                  <input
                    type="text"
                    placeholder="البحث بالاسم أو رقم الترخيص أو الرقم الوطني..."
                    value={doctorSearchTerm}
                    onChange={(e) => setDoctorSearchTerm(e.target.value)}
                  />
                  {doctorSearchTerm && (
                    <button className="clear-btn" onClick={() => setDoctorSearchTerm('')}>✕</button>
                  )}
                </div>
                <div className="filter-chips">
                  <button 
                    className={`filter-chip ${doctorFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setDoctorFilter('all')}
                  >
                    الكل
                  </button>
                  <button 
                    className={`filter-chip active-filter ${doctorFilter === 'active' ? 'active' : ''}`}
                    onClick={() => setDoctorFilter('active')}
                  >
                    نشط
                  </button>
                  <button 
                    className={`filter-chip inactive-filter ${doctorFilter === 'inactive' ? 'active' : ''}`}
                    onClick={() => setDoctorFilter('inactive')}
                  >
                    غير نشط
                  </button>
                </div>
              </div>

              {/* Doctors List */}
              {doctorsLoading ? (
                <div className="loading-state-pro">
                  <div className="loading-spinner-pro"></div>
                  <p>جاري تحميل الأطباء...</p>
                </div>
              ) : filteredDoctors.length === 0 ? (
                <div className="empty-state-pro">
                  <div className="empty-icon-wrapper">
                    <span className="empty-icon">👨‍⚕️</span>
                  </div>
                  <h4>لا يوجد أطباء</h4>
                  <p>لا يوجد أطباء مطابقين للبحث</p>
                </div>
              ) : (
                <div className="data-table-container">
                  <table className="data-table-pro">
                    <thead>
                      <tr>
                        <th>الاسم</th>
                        <th>التخصص</th>
                        <th>رقم الترخيص</th>
                        <th>المستشفى</th>
                        <th>الحالة</th>
                        <th>الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDoctors.map((doctor) => {
                        const specInfo = getSpecializationInfo(doctor.specialization);
                        return (
                          <tr key={doctor.id} className={doctor.isActive === false ? 'inactive-row' : ''}>
                            <td>
                              <div className="name-cell-pro">
                                <span className="full-name-pro">{doctor.firstName} {doctor.lastName}</span>
                                <span className="national-id-pro">{doctor.nationalId}</span>
                              </div>
                            </td>
                            <td>
                              <div className="specialization-cell">
                                <span className="spec-icon-cell">{specInfo.icon}</span>
                                <span className="spec-name-cell">{specInfo.nameAr}</span>
                              </div>
                            </td>
                            <td>
                              <span className="license-cell-pro">{doctor.medicalLicenseNumber}</span>
                            </td>
                            <td>
                              <span className="hospital-cell">{doctor.hospitalAffiliation}</span>
                            </td>
                            <td>
                              <span className={`status-pill ${doctor.isActive !== false ? 'status-active' : 'status-inactive'}`}>
                                {doctor.isActive !== false ? '✅ نشط' : '❌ غير نشط'}
                              </span>
                            </td>
                            <td>
                              <div className="actions-cell-pro">
                                <button 
                                  className="action-btn-pro view"
                                  onClick={() => { setSelectedDoctor(doctor); setShowDoctorDetails(true); }}
                                  title="عرض التفاصيل"
                                >
                                  <span>👁️</span>
                                </button>
                                {doctor.isActive !== false ? (
                                  <button 
                                    className="action-btn-pro deactivate"
                                    onClick={() => handleDeactivate(doctor, 'doctor')}
                                    title="إلغاء التفعيل"
                                  >
                                    <span>🚫</span>
                                  </button>
                                ) : (
                                  <button 
                                    className="action-btn-pro reactivate"
                                    onClick={() => handleReactivate(doctor, 'doctor')}
                                    title="إعادة التفعيل"
                                  >
                                    <span>✅</span>
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
            </div>
          )}

          {/* Patients Tab - REDESIGNED */}
          {activeTab === 'patients' && (
            <div className="patients-section">
              <div className="section-header-pro">
                <div className="section-header-content">
                  <div className="section-icon">👥</div>
                  <div className="section-text">
                    <h3>إدارة المرضى</h3>
                    <p>عرض وإدارة حسابات المرضى المسجلين</p>
                  </div>
                </div>
              </div>

              {/* Search and Filter */}
              <div className="search-filter-container">
                <div className="search-box-pro">
                  <span className="search-icon-pro">🔍</span>
                  <input
                    type="text"
                    placeholder="البحث بالاسم أو الرقم الوطني..."
                    value={patientSearchTerm}
                    onChange={(e) => setPatientSearchTerm(e.target.value)}
                  />
                  {patientSearchTerm && (
                    <button className="clear-btn" onClick={() => setPatientSearchTerm('')}>✕</button>
                  )}
                </div>
                <div className="filter-chips">
                  <button 
                    className={`filter-chip ${patientFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setPatientFilter('all')}
                  >
                    الكل
                  </button>
                  <button 
                    className={`filter-chip active-filter ${patientFilter === 'active' ? 'active' : ''}`}
                    onClick={() => setPatientFilter('active')}
                  >
                    نشط
                  </button>
                  <button 
                    className={`filter-chip inactive-filter ${patientFilter === 'inactive' ? 'active' : ''}`}
                    onClick={() => setPatientFilter('inactive')}
                  >
                    غير نشط
                  </button>
                </div>
              </div>

              {/* Patients List */}
              {patientsLoading ? (
                <div className="loading-state-pro">
                  <div className="loading-spinner-pro"></div>
                  <p>جاري تحميل المرضى...</p>
                </div>
              ) : filteredPatients.length === 0 ? (
                <div className="empty-state-pro">
                  <div className="empty-icon-wrapper">
                    <span className="empty-icon">👥</span>
                  </div>
                  <h4>لا يوجد مرضى</h4>
                  <p>لا يوجد مرضى مطابقين للبحث</p>
                </div>
              ) : (
                <div className="data-table-container">
                  <table className="data-table-pro">
                    <thead>
                      <tr>
                        <th>الاسم</th>
                        <th>الرقم الوطني</th>
                        <th>الجنس</th>
                        <th>رقم الهاتف</th>
                        <th>الحالة</th>
                        <th>الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPatients.map((patient) => (
                        <tr key={patient.id} className={patient.isActive === false ? 'inactive-row' : ''}>
                          <td>
                            <div className="name-cell-pro">
                              <span className="full-name-pro">{patient.firstName} {patient.lastName}</span>
                            </div>
                          </td>
                          <td>
                            <span className="national-id-cell">{patient.nationalId || patient.childId || '-'}</span>
                          </td>
                          <td>
                            <span className={`gender-pill ${patient.gender}`}>
                              {patient.gender === 'male' ? '♂ ذكر' : '♀ أنثى'}
                            </span>
                          </td>
                          <td>
                            <span className="phone-cell">{patient.phoneNumber || '-'}</span>
                          </td>
                          <td>
                            <span className={`status-pill ${patient.isActive !== false ? 'status-active' : 'status-inactive'}`}>
                              {patient.isActive !== false ? '✅ نشط' : '❌ غير نشط'}
                            </span>
                          </td>
                          <td>
                            <div className="actions-cell-pro">
                              <button 
                                className="action-btn-pro view"
                                onClick={() => { setSelectedPatient(patient); setShowPatientDetails(true); }}
                                title="عرض التفاصيل"
                              >
                                <span>👁️</span>
                              </button>
                              {patient.isActive !== false ? (
                                <button 
                                  className="action-btn-pro deactivate"
                                  onClick={() => handleDeactivate(patient, 'patient')}
                                  title="إلغاء التفعيل"
                                >
                                  <span>🚫</span>
                                </button>
                              ) : (
                                <button 
                                  className="action-btn-pro reactivate"
                                  onClick={() => handleReactivate(patient, 'patient')}
                                  title="إعادة التفعيل"
                                >
                                  <span>✅</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Audit Log Tab - REDESIGNED */}
          {activeTab === 'audit' && (
            <div className="audit-section">
              <div className="section-header-pro">
                <div className="section-header-content">
                  <div className="section-icon">📜</div>
                  <div className="section-text">
                    <h3>سجل النظام</h3>
                    <p>سجل جميع العمليات والإجراءات في النظام</p>
                  </div>
                </div>
                <button className="refresh-btn-pro" onClick={loadAuditLogs}>
                  <span>🔄</span> تحديث
                </button>
              </div>

              {auditLoading ? (
                <div className="loading-state-pro">
                  <div className="loading-spinner-pro"></div>
                  <p>جاري تحميل السجلات...</p>
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="empty-state-pro">
                  <div className="empty-icon-wrapper">
                    <span className="empty-icon">📜</span>
                  </div>
                  <h4>لا توجد سجلات</h4>
                  <p>لم يتم تسجيل أي إجراءات بعد</p>
                </div>
              ) : (
                <div className="audit-logs-container-pro">
                  {auditLogs.map((log, index) => (
                    <div key={index} className="audit-log-card">
                      <div className="log-icon-wrapper">
                        {log.action?.includes('ADD') && <span className="log-icon add">➕</span>}
                        {log.action?.includes('DEACTIVATE') && <span className="log-icon deactivate">🚫</span>}
                        {log.action?.includes('REACTIVATE') && <span className="log-icon reactivate">✅</span>}
                        {log.action?.includes('ACCEPT') && <span className="log-icon accept">✅</span>}
                        {log.action?.includes('REJECT') && <span className="log-icon reject">❌</span>}
                        {log.action?.includes('LOGOUT') && <span className="log-icon logout">🚪</span>}
                        {!log.action?.match(/ADD|DEACTIVATE|REACTIVATE|ACCEPT|REJECT|LOGOUT/) && <span className="log-icon default">📋</span>}
                      </div>
                      <div className="log-content-pro">
                        <p className="log-details-pro">{log.details}</p>
                        <span className="log-time-pro">{formatDateTime(log.timestamp)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          MODALS - WITH FIXED Z-INDEX
          ═══════════════════════════════════════════════════════════════ */}

      {/* General Modal */}
      {modal.isOpen && (
        <div className="modal-overlay-pro" onClick={closeModal}>
          <div className="modal-content-pro" onClick={(e) => e.stopPropagation()}>
            <div className={`modal-icon-pro ${modal.type}`}>
              {modal.type === 'success' && '✅'}
              {modal.type === 'error' && '❌'}
              {modal.type === 'info' && 'ℹ️'}
              {modal.type === 'warning' && '⚠️'}
            </div>
            <h3 className="modal-title-pro">{modal.title}</h3>
            <p className="modal-message-pro">{modal.message}</p>
            <button className="modal-button-pro primary" onClick={closeModal}>
              حسناً
            </button>
          </div>
        </div>
      )}

      {/* Accept Confirmation Modal */}
      {showAcceptConfirm && selectedRequest && (
        <div className="modal-overlay-pro" onClick={() => setShowAcceptConfirm(false)}>
          <div className="modal-content-pro" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon-pro success">✅</div>
            <h3 className="modal-title-pro">تأكيد قبول الطلب</h3>
            <p className="modal-message-pro">
              هل تريد قبول طلب تسجيل الطبيب:<br/>
              <strong>{selectedRequest.personalInfo?.firstName} {selectedRequest.personalInfo?.lastName}</strong>
            </p>
            <div className="modal-buttons-pro">
              <button 
                className="modal-button-pro secondary" 
                onClick={() => setShowAcceptConfirm(false)}
              >
                إلغاء
              </button>
              <button 
                className="modal-button-pro success"
                onClick={handleAcceptRequest}
                disabled={processingRequest}
              >
                {processingRequest ? (
                  <>
                    <span className="spinner-small"></span>
                    جاري المعالجة...
                  </>
                ) : 'تأكيد القبول'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Credentials Modal */}
      {generatedCredentials && (
        <div className="modal-overlay-pro">
          <div className="modal-content-pro credentials-modal">
            <div className="modal-icon-pro success">🎉</div>
            <h3 className="modal-title-pro">تم قبول الطلب بنجاح</h3>
            <p className="modal-subtitle">بيانات دخول الطبيب {generatedCredentials.doctorName}</p>
            
            <div className="credentials-box">
              <div className="credential-row">
                <span className="credential-label">البريد الإلكتروني:</span>
                <span className="credential-value">{generatedCredentials.email}</span>
                <button 
                  className="copy-btn-pro"
                  onClick={() => navigator.clipboard.writeText(generatedCredentials.email)}
                  title="نسخ"
                >
                  📋
                </button>
              </div>
              <div className="credential-row">
                <span className="credential-label">كلمة المرور:</span>
                <span className="credential-value password">{generatedCredentials.password}</span>
                <button 
                  className="copy-btn-pro"
                  onClick={() => navigator.clipboard.writeText(generatedCredentials.password)}
                  title="نسخ"
                >
                  📋
                </button>
              </div>
            </div>

            <div className="credentials-warning">
              <span className="warning-icon">⚠️</span>
              <p>يرجى نسخ هذه البيانات وإرسالها للطبيب. لن تظهر مرة أخرى.</p>
            </div>

            <button 
              className="modal-button-pro primary"
              onClick={() => setGeneratedCredentials(null)}
            >
              تم، إغلاق
            </button>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedRequest && (
        <div className="modal-overlay-pro" onClick={() => setShowRejectModal(false)}>
          <div className="modal-content-pro" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-pro" onClick={() => setShowRejectModal(false)}>✕</button>
            <div className="modal-icon-pro warning">❌</div>
            <h3 className="modal-title-pro">رفض طلب التسجيل</h3>
            <p className="modal-message-pro">
              رفض طلب تسجيل الطبيب:<br/>
              <strong>{selectedRequest.personalInfo?.firstName} {selectedRequest.personalInfo?.lastName}</strong>
            </p>
            
            <div className="form-group-pro">
              <label>سبب الرفض *</label>
              <select 
                value={rejectReason} 
                onChange={(e) => setRejectReason(e.target.value)}
                className="form-select-pro"
              >
                <option value="">اختر السبب...</option>
                {REJECTION_REASONS.map(reason => (
                  <option key={reason.id} value={reason.id}>
                    {reason.icon} {reason.nameAr}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group-pro">
              <label>ملاحظات إضافية</label>
              <textarea
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                placeholder="أدخل أي ملاحظات إضافية..."
                rows={3}
                className="form-textarea-pro"
              />
            </div>

            <div className="modal-buttons-pro">
              <button 
                className="modal-button-pro secondary" 
                onClick={() => setShowRejectModal(false)}
              >
                إلغاء
              </button>
              <button 
                className="modal-button-pro danger"
                onClick={handleRejectRequest}
                disabled={!rejectReason || processingRequest}
              >
                {processingRequest ? (
                  <>
                    <span className="spinner-small"></span>
                    جاري المعالجة...
                  </>
                ) : 'تأكيد الرفض'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Doctor Form Modal */}
      {showAddDoctorForm && (
        <div className="modal-overlay-pro" onClick={() => setShowAddDoctorForm(false)}>
          <div className="modal-content-pro large" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-pro" onClick={() => setShowAddDoctorForm(false)}>✕</button>
            
            <div className="form-header-pro">
              <div className="form-icon">👨‍⚕️</div>
              <div className="form-title">
                <h3>إضافة طبيب جديد</h3>
                <p>أدخل بيانات الطبيب لإنشاء حساب جديد</p>
              </div>
            </div>

            <div className="form-body-pro">
              {/* Personal Information Section */}
              <div className="form-section-pro">
                <h4><span>👤</span> المعلومات الشخصية</h4>
                <div className="form-grid-pro">
                  <div className="form-group-pro">
                    <label>الاسم الأول <span className="required">*</span></label>
                    <input
                      type="text"
                      value={newDoctor.firstName}
                      onChange={(e) => setNewDoctor({...newDoctor, firstName: e.target.value})}
                      placeholder="أدخل الاسم الأول"
                    />
                  </div>
                  <div className="form-group-pro">
                    <label>الكنية <span className="required">*</span></label>
                    <input
                      type="text"
                      value={newDoctor.lastName}
                      onChange={(e) => setNewDoctor({...newDoctor, lastName: e.target.value})}
                      placeholder="أدخل الكنية"
                    />
                  </div>
                  <div className="form-group-pro">
                    <label>الرقم الوطني <span className="required">*</span></label>
                    <input
                      type="text"
                      value={newDoctor.nationalId}
                      onChange={(e) => setNewDoctor({...newDoctor, nationalId: e.target.value.replace(/\D/g, '').slice(0, 11)})}
                      placeholder="11 رقم"
                      maxLength={11}
                    />
                  </div>
                  <div className="form-group-pro">
                    <label>رقم الهاتف <span className="required">*</span></label>
                    <input
                      type="text"
                      value={newDoctor.phoneNumber}
                      onChange={(e) => setNewDoctor({...newDoctor, phoneNumber: e.target.value})}
                      placeholder="مثال: 0912345678"
                    />
                  </div>
                  <div className="form-group-pro">
                    <label>الجنس <span className="required">*</span></label>
                    <select
                      value={newDoctor.gender}
                      onChange={(e) => setNewDoctor({...newDoctor, gender: e.target.value})}
                    >
                      <option value="male">ذكر</option>
                      <option value="female">أنثى</option>
                    </select>
                  </div>
                  <div className="form-group-pro">
                    <label>تاريخ الميلاد</label>
                    <input
                      type="date"
                      value={newDoctor.dateOfBirth}
                      onChange={(e) => setNewDoctor({...newDoctor, dateOfBirth: e.target.value})}
                    />
                  </div>
                  <div className="form-group-pro">
                    <label>المحافظة <span className="required">*</span></label>
                    <select
                      value={newDoctor.governorate}
                      onChange={(e) => setNewDoctor({...newDoctor, governorate: e.target.value})}
                    >
                      <option value="">اختر المحافظة</option>
                      {SYRIAN_GOVERNORATES.map(gov => (
                        <option key={gov.id} value={gov.id}>{gov.nameAr}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group-pro">
                    <label>المدينة</label>
                    <input
                      type="text"
                      value={newDoctor.city}
                      onChange={(e) => setNewDoctor({...newDoctor, city: e.target.value})}
                      placeholder="أدخل اسم المدينة"
                    />
                  </div>
                </div>
              </div>

              {/* Professional Information Section */}
              <div className="form-section-pro">
                <h4><span>🏥</span> المعلومات المهنية</h4>
                <div className="form-grid-pro">
                  <div className="form-group-pro">
                    <label>رقم الترخيص الطبي <span className="required">*</span></label>
                    <input
                      type="text"
                      value={newDoctor.medicalLicenseNumber}
                      onChange={(e) => setNewDoctor({...newDoctor, medicalLicenseNumber: e.target.value.toUpperCase()})}
                      placeholder="مثال: SY12345678"
                    />
                    <span className="field-hint">8-20 حرف/رقم (A-Z, 0-9)</span>
                  </div>
                  <div className="form-group-pro">
                    <label>التخصص <span className="required">*</span></label>
                    <select
                      value={newDoctor.specialization}
                      onChange={(e) => setNewDoctor({...newDoctor, specialization: e.target.value})}
                    >
                      <option value="">اختر التخصص</option>
                      {MEDICAL_SPECIALIZATIONS.map(spec => (
                        <option key={spec.id} value={spec.id}>
                          {spec.icon} {spec.nameAr}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group-pro">
                    <label>التخصص الفرعي</label>
                    <input
                      type="text"
                      value={newDoctor.subSpecialization}
                      onChange={(e) => setNewDoctor({...newDoctor, subSpecialization: e.target.value})}
                      placeholder="اختياري"
                    />
                  </div>
                  <div className="form-group-pro">
                    <label>سنوات الخبرة</label>
                    <input
                      type="number"
                      value={newDoctor.yearsOfExperience}
                      onChange={(e) => setNewDoctor({...newDoctor, yearsOfExperience: e.target.value})}
                      min="0"
                      max="60"
                      placeholder="0-60"
                    />
                  </div>
                  <div className="form-group-pro span-2">
                    <label>المستشفى / المركز الصحي <span className="required">*</span></label>
                    <input
                      type="text"
                      value={newDoctor.hospitalAffiliation}
                      onChange={(e) => setNewDoctor({...newDoctor, hospitalAffiliation: e.target.value})}
                      placeholder="أدخل اسم المستشفى أو المركز الصحي"
                    />
                  </div>
                  <div className="form-group-pro span-2">
                    <label>عنوان العيادة <span className="required">*</span></label>
                    <textarea
                      value={newDoctor.address}
                      onChange={(e) => setNewDoctor({...newDoctor, address: e.target.value})}
                      placeholder="أدخل عنوان العيادة بالتفصيل"
                      rows={2}
                    />
                  </div>
                  <div className="form-group-pro">
                    <label>رسوم الكشف (ل.س)</label>
                    <input
                      type="number"
                      value={newDoctor.consultationFee}
                      onChange={(e) => setNewDoctor({...newDoctor, consultationFee: e.target.value})}
                      min="0"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              {/* Working Days Section */}
              <div className="form-section-pro">
                <h4><span>📅</span> أيام العمل <span className="required">*</span></h4>
                <div className="days-grid-pro">
                  {WEEKDAYS.map(day => (
                    <button
                      key={day.id}
                      type="button"
                      className={`day-btn ${newDoctor.availableDays.includes(day.id) ? 'selected' : ''}`}
                      onClick={() => handleDayToggle(day.id)}
                    >
                      <span className="day-name">{day.nameAr}</span>
                      <span className="day-check">{newDoctor.availableDays.includes(day.id) ? '✓' : ''}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Email Preview */}
              {newDoctor.firstName && newDoctor.lastName && newDoctor.medicalLicenseNumber && (
                <div className="email-preview-pro">
                  <span className="preview-label">البريد الإلكتروني المقترح:</span>
                  <code>{generateDoctorEmail(newDoctor.firstName, newDoctor.lastName, newDoctor.medicalLicenseNumber)}</code>
                </div>
              )}
            </div>

            <div className="form-footer-pro">
              <button 
                className="btn-secondary-pro" 
                onClick={() => setShowAddDoctorForm(false)}
              >
                إلغاء
              </button>
              <button 
                className="btn-primary-pro"
                onClick={handleAddDoctor}
                disabled={addDoctorLoading}
              >
                {addDoctorLoading ? (
                  <>
                    <span className="spinner-small"></span>
                    جاري الإضافة...
                  </>
                ) : (
                  <>
                    <span>➕</span>
                    إضافة الطبيب
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Doctor Credentials Modal */}
      {newDoctorCredentials && (
        <div className="modal-overlay-pro">
          <div className="modal-content-pro credentials-modal">
            <div className="modal-icon-pro success">🎉</div>
            <h3 className="modal-title-pro">تم إضافة الطبيب بنجاح</h3>
            <p className="modal-subtitle">بيانات دخول الطبيب {newDoctorCredentials.doctorName}</p>
            
            <div className="credentials-box">
              <div className="credential-row">
                <span className="credential-label">البريد الإلكتروني:</span>
                <span className="credential-value">{newDoctorCredentials.email}</span>
                <button 
                  className="copy-btn-pro"
                  onClick={() => navigator.clipboard.writeText(newDoctorCredentials.email)}
                  title="نسخ"
                >
                  📋
                </button>
              </div>
              <div className="credential-row">
                <span className="credential-label">كلمة المرور:</span>
                <span className="credential-value password">{newDoctorCredentials.password}</span>
                <button 
                  className="copy-btn-pro"
                  onClick={() => navigator.clipboard.writeText(newDoctorCredentials.password)}
                  title="نسخ"
                >
                  📋
                </button>
              </div>
            </div>

            <div className="credentials-warning">
              <span className="warning-icon">⚠️</span>
              <p>يرجى نسخ هذه البيانات وإرسالها للطبيب. لن تظهر مرة أخرى.</p>
            </div>

            <button 
              className="modal-button-pro primary"
              onClick={() => {
                setNewDoctorCredentials(null);
                setShowAddDoctorForm(false);
              }}
            >
              تم، إغلاق
            </button>
          </div>
        </div>
      )}

      {/* Deactivate Modal */}
      {showDeactivateModal && deactivateTarget && (
        <div className="modal-overlay-pro" onClick={() => setShowDeactivateModal(false)}>
          <div className="modal-content-pro" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon-pro warning">🚫</div>
            <h3 className="modal-title-pro">إلغاء تفعيل الحساب</h3>
            <p className="modal-message-pro">
              إلغاء تفعيل حساب {deactivateType === 'doctor' ? 'الطبيب' : 'المريض'}:<br />
              <strong>{deactivateTarget.firstName} {deactivateTarget.lastName}</strong>
            </p>
            
            <div className="form-group-pro">
              <label>سبب إلغاء التفعيل *</label>
              <select 
                value={deactivateReason} 
                onChange={(e) => setDeactivateReason(e.target.value)}
                className="form-select-pro"
              >
                <option value="">اختر السبب...</option>
                {DEACTIVATION_REASONS.map(reason => (
                  <option key={reason.id} value={reason.id}>
                    {reason.icon} {reason.nameAr}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group-pro">
              <label>ملاحظات إضافية</label>
              <textarea
                value={deactivateNotes}
                onChange={(e) => setDeactivateNotes(e.target.value)}
                placeholder="أدخل أي ملاحظات إضافية..."
                rows={3}
                className="form-textarea-pro"
              />
            </div>

            <div className="modal-buttons-pro">
              <button 
                className="modal-button-pro secondary" 
                onClick={() => setShowDeactivateModal(false)}
              >
                إلغاء
              </button>
              <button 
                className="modal-button-pro danger"
                onClick={confirmDeactivation}
                disabled={!deactivateReason}
              >
                تأكيد إلغاء التفعيل
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Doctor Details Modal */}
      {showDoctorDetails && selectedDoctor && (
        <div className="modal-overlay-pro" onClick={() => setShowDoctorDetails(false)}>
          <div className="modal-content-pro large" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-pro" onClick={() => setShowDoctorDetails(false)}>✕</button>
            <h3 className="modal-title-pro">تفاصيل الطبيب</h3>
            
            <div className="details-grid-pro">
              <div className="details-section-pro">
                <h4><span>👤</span> المعلومات الشخصية</h4>
                <div className="details-row-pro">
                  <span className="label">الاسم:</span>
                  <span className="value">{selectedDoctor.firstName} {selectedDoctor.lastName}</span>
                </div>
                <div className="details-row-pro">
                  <span className="label">الرقم الوطني:</span>
                  <span className="value">{selectedDoctor.nationalId}</span>
                </div>
                <div className="details-row-pro">
                  <span className="label">الجنس:</span>
                  <span className="value">{selectedDoctor.gender === 'male' ? 'ذكر' : 'أنثى'}</span>
                </div>
                <div className="details-row-pro">
                  <span className="label">رقم الهاتف:</span>
                  <span className="value">{selectedDoctor.phoneNumber}</span>
                </div>
                <div className="details-row-pro">
                  <span className="label">البريد الإلكتروني:</span>
                  <span className="value">{selectedDoctor.email}</span>
                </div>
              </div>

              <div className="details-section-pro">
                <h4><span>🏥</span> المعلومات المهنية</h4>
                <div className="details-row-pro">
                  <span className="label">رقم الترخيص:</span>
                  <span className="value">{selectedDoctor.medicalLicenseNumber}</span>
                </div>
                <div className="details-row-pro">
                  <span className="label">التخصص:</span>
                  <span className="value">
                    {(() => {
                      const spec = getSpecializationInfo(selectedDoctor.specialization);
                      return `${spec.icon} ${spec.nameAr}`;
                    })()}
                  </span>
                </div>
                <div className="details-row-pro">
                  <span className="label">المستشفى:</span>
                  <span className="value">{selectedDoctor.hospitalAffiliation}</span>
                </div>
                <div className="details-row-pro">
                  <span className="label">سنوات الخبرة:</span>
                  <span className="value">{selectedDoctor.yearsOfExperience} سنة</span>
                </div>
              </div>
            </div>

            <div className="modal-footer-pro">
              <span className={`status-badge-large ${selectedDoctor.isActive !== false ? 'active' : 'inactive'}`}>
                {selectedDoctor.isActive !== false ? '✅ نشط' : '❌ غير نشط'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Patient Details Modal */}
      {showPatientDetails && selectedPatient && (
        <div className="modal-overlay-pro" onClick={() => setShowPatientDetails(false)}>
          <div className="modal-content-pro large" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-pro" onClick={() => setShowPatientDetails(false)}>✕</button>
            <h3 className="modal-title-pro">تفاصيل المريض</h3>
            
            <div className="details-grid-pro">
              <div className="details-section-pro">
                <h4><span>👤</span> المعلومات الشخصية</h4>
                <div className="details-row-pro">
                  <span className="label">الاسم:</span>
                  <span className="value">{selectedPatient.firstName} {selectedPatient.lastName}</span>
                </div>
                <div className="details-row-pro">
                  <span className="label">الرقم الوطني:</span>
                  <span className="value">{selectedPatient.nationalId || selectedPatient.childId || '-'}</span>
                </div>
                <div className="details-row-pro">
                  <span className="label">الجنس:</span>
                  <span className="value">{selectedPatient.gender === 'male' ? 'ذكر' : 'أنثى'}</span>
                </div>
                <div className="details-row-pro">
                  <span className="label">تاريخ الميلاد:</span>
                  <span className="value">{formatDate(selectedPatient.dateOfBirth)}</span>
                </div>
                <div className="details-row-pro">
                  <span className="label">رقم الهاتف:</span>
                  <span className="value">{selectedPatient.phoneNumber || '-'}</span>
                </div>
              </div>

              <div className="details-section-pro">
                <h4><span>🏥</span> المعلومات الصحية</h4>
                <div className="details-row-pro">
                  <span className="label">فصيلة الدم:</span>
                  <span className="value">{selectedPatient.bloodType || '-'}</span>
                </div>
                <div className="details-row-pro">
                  <span className="label">الطول:</span>
                  <span className="value">{selectedPatient.height ? `${selectedPatient.height} سم` : '-'}</span>
                </div>
                <div className="details-row-pro">
                  <span className="label">الوزن:</span>
                  <span className="value">{selectedPatient.weight ? `${selectedPatient.weight} كغ` : '-'}</span>
                </div>
              </div>
            </div>

            <div className="modal-footer-pro">
              <span className={`status-badge-large ${selectedPatient.isActive !== false ? 'active' : 'inactive'}`}>
                {selectedPatient.isActive !== false ? '✅ نشط' : '❌ غير نشط'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Request Details Modal */}
      {showRequestDetails && selectedRequest && (
        <div className="modal-overlay-pro" onClick={() => setShowRequestDetails(false)}>
          <div className="modal-content-pro large" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-pro" onClick={() => setShowRequestDetails(false)}>✕</button>
            
            <div className="request-details-header-pro">
              <div className="request-header-main">
                <h2>تفاصيل طلب التسجيل</h2>
                <span className={`status-pill large status-${selectedRequest.requestInfo?.status}`}>
                  {selectedRequest.requestInfo?.status === 'pending' && '⏳ قيد المراجعة'}
                  {selectedRequest.requestInfo?.status === 'accepted' && '✅ تم القبول'}
                  {selectedRequest.requestInfo?.status === 'rejected' && '❌ مرفوض'}
                </span>
              </div>
              <p className="request-id-pro">رقم الطلب: {selectedRequest.requestId || selectedRequest._id}</p>
            </div>

            <div className="details-grid-pro">
              {/* Personal Info */}
              <div className="details-section-pro">
                <h4><span>👤</span> المعلومات الشخصية</h4>
                <div className="details-row-pro">
                  <span className="label">الاسم الكامل:</span>
                  <span className="value">{selectedRequest.personalInfo?.firstName} {selectedRequest.personalInfo?.lastName}</span>
                </div>
                <div className="details-row-pro">
                  <span className="label">الرقم الوطني:</span>
                  <span className="value">{selectedRequest.personalInfo?.nationalId}</span>
                </div>
                <div className="details-row-pro">
                  <span className="label">تاريخ الميلاد:</span>
                  <span className="value">{formatDate(selectedRequest.personalInfo?.dateOfBirth)}</span>
                </div>
                <div className="details-row-pro">
                  <span className="label">الجنس:</span>
                  <span className="value">{selectedRequest.personalInfo?.gender === 'male' ? 'ذكر' : 'أنثى'}</span>
                </div>
                <div className="details-row-pro">
                  <span className="label">رقم الهاتف:</span>
                  <span className="value">{selectedRequest.personalInfo?.phoneNumber}</span>
                </div>
                <div className="details-row-pro">
                  <span className="label">البريد الإلكتروني:</span>
                  <span className="value">{selectedRequest.accountInfo?.email}</span>
                </div>
                <div className="details-row-pro">
                  <span className="label">المحافظة:</span>
                  <span className="value">{getGovernorateName(selectedRequest.personalInfo?.governorate)}</span>
                </div>
              </div>

              {/* Professional Info */}
              <div className="details-section-pro">
                <h4><span>🏥</span> المعلومات المهنية</h4>
                <div className="details-row-pro">
                  <span className="label">رقم الترخيص:</span>
                  <span className="value">{selectedRequest.doctorInfo?.medicalLicenseNumber}</span>
                </div>
                <div className="details-row-pro">
                  <span className="label">التخصص:</span>
                  <span className="value">
                    {(() => {
                      const spec = getSpecializationInfo(selectedRequest.doctorInfo?.specialization);
                      return `${spec.icon} ${spec.nameAr}`;
                    })()}
                  </span>
                </div>
                <div className="details-row-pro">
                  <span className="label">المستشفى:</span>
                  <span className="value">{selectedRequest.doctorInfo?.hospitalAffiliation}</span>
                </div>
                <div className="details-row-pro">
                  <span className="label">سنوات الخبرة:</span>
                  <span className="value">{selectedRequest.doctorInfo?.yearsOfExperience} سنة</span>
                </div>
                <div className="details-row-pro">
                  <span className="label">تاريخ الطلب:</span>
                  <span className="value">{formatDateTime(selectedRequest.requestInfo?.submittedAt)}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons for Pending Requests */}
            {selectedRequest.requestInfo?.status === 'pending' && (
              <div className="request-actions-pro">
                <button 
                  className="btn-success-pro"
                  onClick={() => {
                    setShowAcceptConfirm(true);
                  }}
                >
                  <span>✅</span> قبول الطلب
                </button>
                <button 
                  className="btn-danger-pro"
                  onClick={() => {
                    setShowRejectModal(true);
                  }}
                >
                  <span>❌</span> رفض الطلب
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;