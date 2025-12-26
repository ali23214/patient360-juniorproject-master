// src/pages/AdminDashboard.jsx
// 🏛️ Health Ministry Admin Dashboard - Government Healthcare Platform
// Patient 360° - وزارة الصحة - الجمهورية العربية السورية
// Database Schema Compliant Version

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import { authAPI } from '../services/api';
import '../styles/AdminDashboard.css';

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
  { id: 'Cardiologist', nameAr: 'طبيب قلب', icon: '❤️' },
  { id: 'Pulmonologist', nameAr: 'طبيب أمراض الرئة', icon: '🫁' },
  { id: 'General Practitioner', nameAr: 'طبيب عام', icon: '🩺' },
  { id: 'Infectious Disease Specialist', nameAr: 'طبيب أمراض معدية', icon: '🦠' },
  { id: 'Intensive Care Specialist', nameAr: 'طبيب عناية مركزة', icon: '🏥' },
  { id: 'Rheumatologist', nameAr: 'طبيب روماتيزم', icon: '🦴' },
  { id: 'Orthopedic Surgeon', nameAr: 'جراح عظام', icon: '🦿' },
  { id: 'Neurologist', nameAr: 'طبيب أعصاب', icon: '🧠' },
  { id: 'Endocrinologist', nameAr: 'طبيب غدد صماء', icon: '⚗️' },
  { id: 'Dermatologist', nameAr: 'طبيب جلدية', icon: '🧴' },
  { id: 'Gastroenterologist', nameAr: 'طبيب جهاز هضمي', icon: '🫃' },
  { id: 'General Surgeon', nameAr: 'جراح عام', icon: '🔪' },
  { id: 'Hepatologist', nameAr: 'طبيب كبد', icon: '🫀' },
  { id: 'Urologist', nameAr: 'طبيب مسالك بولية', icon: '💧' },
  { id: 'Gynecologist', nameAr: 'طبيب نساء وتوليد', icon: '🤰' },
  { id: 'Psychiatrist', nameAr: 'طبيب نفسي', icon: '🧘' },
  { id: 'Hematologist', nameAr: 'طبيب دم', icon: '🩸' },
  { id: 'Oncologist', nameAr: 'طبيب أورام', icon: '🎗️' },
  { id: 'ENT Specialist', nameAr: 'طبيب أنف أذن حنجرة', icon: '👂' },
  { id: 'Ophthalmologist', nameAr: 'طبيب عيون', icon: '👁️' },
  { id: 'Pediatrician', nameAr: 'طبيب أطفال', icon: '👶' },
  { id: 'Nephrologist', nameAr: 'طبيب كلى', icon: '🫘' },
  { id: 'Internal Medicine', nameAr: 'طبيب باطنية', icon: '🏨' },
  { id: 'Emergency Medicine', nameAr: 'طبيب طوارئ', icon: '🚑' }
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

// ============================================
// COMPONENTS
// ============================================

const StatCard = ({ icon, value, label, sublabel, color, onClick }) => (
  <div className={`stat-card ${color}`} onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
    <div className="stat-card-icon"><span>{icon}</span></div>
    <div className="stat-card-content">
      <h3 className="stat-value">{value}</h3>
      <p className="stat-label">{label}</p>
      {sublabel && <span className="stat-sublabel">{sublabel}</span>}
    </div>
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
    totalVisits: 0, todayVisits: 0
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
  const [generatedCredentials, setGeneratedCredentials] = useState(null);
  
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
      
      const [doctorsRes, patientsRes, statsRes] = await Promise.all([
        fetch('http://localhost:5000/api/admin/doctors', { headers }),
        fetch('http://localhost:5000/api/admin/patients', { headers }),
        fetch('http://localhost:5000/api/admin/statistics', { headers })
      ]);
      
      const [doctorsData, patientsData, statsData] = await Promise.all([
        doctorsRes.json(), patientsRes.json(), statsRes.json()
      ]);
      
      const allDoctors = doctorsData.success ? (doctorsData.doctors || []) : [];
      const allPatients = patientsData.success ? (patientsData.patients || []) : [];
      
      setStatistics({
        totalDoctors: allDoctors.length,
        activeDoctors: allDoctors.filter(d => d.isActive !== false).length,
        inactiveDoctors: allDoctors.filter(d => d.isActive === false).length,
        totalPatients: allPatients.length,
        activePatients: allPatients.filter(p => p.isActive !== false).length,
        inactivePatients: allPatients.filter(p => p.isActive === false).length,
        totalVisits: statsData.totalVisits || 0,
        todayVisits: statsData.todayVisits || 0
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
    else if (tab === 'audit' && auditLogs.length === 0) loadAuditLogs();
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
        setGeneratedCredentials({
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
      const endpoint = `http://localhost:5000/api/admin/${deactivateType}s/${deactivateTarget._id}/deactivate`;

      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          reason: deactivateReason,
          notes: deactivateNotes,
          deactivatedBy: admin._id
        })
      });

      const data = await res.json();

      if (data.success) {
        setShowDeactivateModal(false);
        openModal('success', 'تم بنجاح', 'تم إلغاء تفعيل الحساب');
        deactivateType === 'doctor' ? loadDoctors() : loadPatients();
        loadStatistics();
        
        const reasonText = DEACTIVATION_REASONS.find(r => r.id === deactivateReason)?.nameAr;
        const name = deactivateTarget.firstName || deactivateTarget.person?.firstName;
        logAuditAction(`DEACTIVATE_${deactivateType.toUpperCase()}`, 
          `تم إلغاء تفعيل ${deactivateType === 'doctor' ? 'الطبيب' : 'المريض'}: ${name} - السبب: ${reasonText}`);
      } else {
        openModal('error', 'خطأ', data.message || 'حدث خطأ');
      }
    } catch (error) {
      openModal('error', 'خطأ', 'حدث خطأ في الاتصال');
    }
  };

  const handleReactivate = async (target, type) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/admin/${type}s/${target._id}/reactivate`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();

      if (data.success) {
        openModal('success', 'تم', 'تم إعادة تفعيل الحساب');
        type === 'doctor' ? loadDoctors() : loadPatients();
        loadStatistics();
        logAuditAction(`REACTIVATE_${type.toUpperCase()}`, 
          `تم إعادة تفعيل: ${target.firstName || target.person?.firstName}`);
      }
    } catch (error) {
      openModal('error', 'خطأ', 'حدث خطأ');
    }
  };

  // ============================================
  // AUDIT & EXPORT
  // ============================================

  const logAuditAction = async (action, description) => {
    try {
      const token = localStorage.getItem('token');
      await fetch('http://localhost:5000/api/admin/audit-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ action, description, adminId: admin._id, adminName: `${admin.firstName} ${admin.lastName}` })
      });
    } catch (e) { console.error(e); }
  };

  const exportToCSV = (type) => {
    const data = type === 'doctors' ? doctors : patients;
    let headers, rows;
    
    if (type === 'doctors') {
      headers = ['الاسم', 'رقم الترخيص', 'التخصص', 'المستشفى', 'الهاتف', 'الحالة'];
      rows = data.map(d => [
        `${d.firstName || d.person?.firstName} ${d.lastName || d.person?.lastName}`,
        d.medicalLicenseNumber,
        MEDICAL_SPECIALIZATIONS.find(s => s.id === d.specialization)?.nameAr || d.specialization,
        d.hospitalAffiliation,
        d.phoneNumber || d.person?.phoneNumber,
        d.isActive !== false ? 'نشط' : 'غير نشط'
      ]);
    } else {
      headers = ['الاسم', 'الرقم الوطني', 'الجنس', 'الهاتف', 'الحالة'];
      rows = data.map(p => [
        `${p.firstName || p.person?.firstName} ${p.lastName || p.person?.lastName}`,
        p.nationalId || p.person?.nationalId,
        (p.gender || p.person?.gender) === 'male' ? 'ذكر' : 'أنثى',
        p.phoneNumber || p.person?.phoneNumber,
        p.isActive !== false ? 'نشط' : 'غير نشط'
      ]);
    }
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${type}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    logAuditAction(`EXPORT_${type.toUpperCase()}`, `تم تصدير قائمة ${type === 'doctors' ? 'الأطباء' : 'المرضى'}`);
  };

  // ============================================
  // MODAL HELPERS
  // ============================================

  const openModal = (type, title, message, onConfirm = null) => {
    setModal({ isOpen: true, type, title, message, onConfirm });
  };

  const closeModal = () => setModal({ isOpen: false, type: '', title: '', message: '', onConfirm: null });

  const handleLogout = () => {
    openModal('confirm', 'تسجيل الخروج', 'هل أنت متأكد؟', () => authAPI.logout());
  };

  // ============================================
  // FILTERS
  // ============================================

  const filteredDoctors = doctors.filter(d => {
    const name = `${d.firstName || d.person?.firstName || ''} ${d.lastName || d.person?.lastName || ''}`.toLowerCase();
    const license = (d.medicalLicenseNumber || '').toLowerCase();
    const matchSearch = name.includes(doctorSearchTerm.toLowerCase()) || license.includes(doctorSearchTerm.toLowerCase());
    const matchFilter = doctorFilter === 'all' || 
      (doctorFilter === 'active' && d.isActive !== false) ||
      (doctorFilter === 'inactive' && d.isActive === false);
    return matchSearch && matchFilter;
  });

  const filteredPatients = patients.filter(p => {
    const name = `${p.firstName || p.person?.firstName || ''} ${p.lastName || p.person?.lastName || ''}`.toLowerCase();
    const nid = p.nationalId || p.person?.nationalId || '';
    const matchSearch = name.includes(patientSearchTerm.toLowerCase()) || nid.includes(patientSearchTerm);
    const matchFilter = patientFilter === 'all' ||
      (patientFilter === 'active' && p.isActive !== false) ||
      (patientFilter === 'inactive' && p.isActive === false);
    return matchSearch && matchFilter;
  });

  // ============================================
  // RENDER
  // ============================================

  if (loading) {
    return (
      <div className="admin-loading-container">
        <div className="admin-loading-content">
          <div className="ministry-emblem">🏛️</div>
          <div className="loading-spinner-admin"></div>
          <h2>وزارة الصحة</h2>
          <p>جاري تحميل لوحة التحكم...</p>
        </div>
      </div>
    );
  }

  if (!admin) return null;

  return (
    <div className="admin-dashboard">
      <Navbar />

      {/* Standard Modal */}
      {modal.isOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-container" onClick={e => e.stopPropagation()}>
            <div className={`modal-header ${modal.type}`}>
              <div className="modal-icon">{modal.type === 'success' ? '✓' : modal.type === 'error' ? '✕' : '؟'}</div>
              <h2>{modal.title}</h2>
            </div>
            <div className="modal-body"><p style={{ whiteSpace: 'pre-line' }}>{modal.message}</p></div>
            <div className="modal-footer">
              {modal.type === 'confirm' ? (
                <>
                  <button className="modal-button secondary" onClick={closeModal}>إلغاء</button>
                  <button className="modal-button primary" onClick={() => { if (modal.onConfirm) modal.onConfirm(); closeModal(); }}>تأكيد</button>
                </>
              ) : (
                <button className="modal-button primary" onClick={() => { if (modal.onConfirm) modal.onConfirm(); closeModal(); }}>حسناً</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Deactivation Modal */}
      {showDeactivateModal && (
        <div className="modal-overlay" onClick={() => setShowDeactivateModal(false)}>
          <div className="deactivate-modal" onClick={e => e.stopPropagation()}>
            <div className="deactivate-modal-header">
              <div className="deactivate-icon">⚠️</div>
              <h2>إلغاء تفعيل الحساب</h2>
              <p>{deactivateTarget?.firstName || deactivateTarget?.person?.firstName} {deactivateTarget?.lastName || deactivateTarget?.person?.lastName}</p>
            </div>
            <div className="deactivate-modal-body">
              <div className="form-group">
                <label>سبب إلغاء التفعيل <span className="required">*</span></label>
                <div className="deactivate-reasons-grid">
                  {DEACTIVATION_REASONS.map(r => (
                    <div key={r.id} className={`reason-card ${deactivateReason === r.id ? 'selected' : ''}`}
                      onClick={() => setDeactivateReason(r.id)}>
                      <span className="reason-icon">{r.icon}</span>
                      <span className="reason-name">{r.nameAr}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label>ملاحظات</label>
                <textarea value={deactivateNotes} onChange={e => setDeactivateNotes(e.target.value)} rows={3} placeholder="ملاحظات إضافية..." />
              </div>
            </div>
            <div className="deactivate-modal-footer">
              <button className="btn-secondary" onClick={() => setShowDeactivateModal(false)}>إلغاء</button>
              <button className="btn-danger" onClick={confirmDeactivation} disabled={!deactivateReason}>تأكيد</button>
            </div>
          </div>
        </div>
      )}

      {/* Credentials Modal */}
      {generatedCredentials && (
        <div className="modal-overlay">
          <div className="credentials-modal">
            <div className="credentials-header">
              <div className="credentials-icon">✅</div>
              <h2>تم إضافة الطبيب بنجاح</h2>
              <p>{generatedCredentials.doctorName}</p>
            </div>
            <div className="credentials-body">
              <div className="credentials-warning">
                <span>⚠️</span>
                <p>احفظ هذه البيانات الآن! لن تظهر كلمة المرور مرة أخرى.</p>
              </div>
              <div className="credential-item">
                <label>البريد الإلكتروني:</label>
                <div className="credential-value">
                  <code>{generatedCredentials.email}</code>
                  <button className="copy-btn" onClick={() => { navigator.clipboard.writeText(generatedCredentials.email); openModal('success', 'تم', 'تم نسخ البريد'); }}>📋</button>
                </div>
              </div>
              <div className="credential-item">
                <label>كلمة المرور:</label>
                <div className="credential-value">
                  <code>{generatedCredentials.password}</code>
                  <button className="copy-btn" onClick={() => { navigator.clipboard.writeText(generatedCredentials.password); openModal('success', 'تم', 'تم نسخ كلمة المرور'); }}>📋</button>
                </div>
              </div>
            </div>
            <div className="credentials-footer">
              <button className="btn-primary" onClick={() => { setGeneratedCredentials(null); setShowAddDoctorForm(false); }}>تم - إغلاق</button>
            </div>
          </div>
        </div>
      )}

      <div className="admin-container">
        {/* Header */}
        <div className="admin-header">
          <div className="admin-header-content">
            <div className="ministry-badge">
              <div className="ministry-icon">🏛️</div>
              <div className="ministry-info">
                <h1>وزارة الصحة</h1>
                <p>الجمهورية العربية السورية</p>
              </div>
            </div>
            <div className="admin-title">
              <h2>لوحة تحكم المسؤول</h2>
              <p>Patient 360°</p>
            </div>
          </div>
          <div className="admin-user-section">
            <div className="admin-user-info">
              <span className="admin-avatar">👤</span>
              <div className="admin-user-details">
                <span className="admin-name">{admin.firstName} {admin.lastName}</span>
                <span className="admin-role">مسؤول النظام</span>
              </div>
            </div>
            <button className="logout-btn-admin" onClick={handleLogout}>🚪 خروج</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="admin-tabs">
          {[
            { id: 'statistics', icon: '📊', label: 'الإحصائيات' },
            { id: 'doctors', icon: '👨‍⚕️', label: 'الأطباء' },
            { id: 'patients', icon: '👥', label: 'المرضى' },
            { id: 'audit', icon: '📜', label: 'السجلات' }
          ].map(tab => (
            <button key={tab.id} className={`admin-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => handleTabChange(tab.id)}>
              <span className="tab-icon">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="admin-content">
          
          {/* === STATISTICS TAB === */}
          {activeTab === 'statistics' && (
            <div className="tab-content statistics-content">
              <div className="stats-grid">
                <StatCard icon="👨‍⚕️" value={statistics.totalDoctors} label="الأطباء" sublabel={`${statistics.activeDoctors} نشط`} color="blue" onClick={() => handleTabChange('doctors')} />
                <StatCard icon="👥" value={statistics.totalPatients} label="المرضى" sublabel={`${statistics.activePatients} نشط`} color="green" onClick={() => handleTabChange('patients')} />
                <StatCard icon="📋" value={statistics.totalVisits} label="الزيارات" sublabel={`${statistics.todayVisits} اليوم`} color="purple" />
                <StatCard icon="🏥" value={MEDICAL_SPECIALIZATIONS.length} label="التخصصات" color="orange" />
              </div>

              <div className="stats-row">
                <div className="stat-section">
                  <h3>👨‍⚕️ الأطباء</h3>
                  <div className="status-cards">
                    <div className="status-card active"><span>✅</span><span>{statistics.activeDoctors} نشط</span></div>
                    <div className="status-card inactive"><span>⏸️</span><span>{statistics.inactiveDoctors} غير نشط</span></div>
                  </div>
                </div>
                <div className="stat-section">
                  <h3>👥 المرضى</h3>
                  <div className="status-cards">
                    <div className="status-card active"><span>✅</span><span>{statistics.activePatients} نشط</span></div>
                    <div className="status-card inactive"><span>⏸️</span><span>{statistics.inactivePatients} غير نشط</span></div>
                  </div>
                </div>
              </div>

              <div className="quick-actions-section">
                <h3>⚡ إجراءات سريعة</h3>
                <div className="quick-actions-grid">
                  <button className="quick-action-btn" onClick={() => { handleTabChange('doctors'); setTimeout(() => setShowAddDoctorForm(true), 100); }}>
                    <span>➕</span><span>إضافة طبيب</span>
                  </button>
                  <button className="quick-action-btn" onClick={() => handleTabChange('doctors')}><span>👨‍⚕️</span><span>عرض الأطباء</span></button>
                  <button className="quick-action-btn" onClick={() => handleTabChange('patients')}><span>👥</span><span>عرض المرضى</span></button>
                  <button className="quick-action-btn" onClick={() => handleTabChange('audit')}><span>📜</span><span>السجلات</span></button>
                </div>
              </div>
            </div>
          )}

          {/* === DOCTORS TAB === */}
          {activeTab === 'doctors' && (
            <div className="tab-content doctors-content">
              <div className="content-header">
                <div><h2>👨‍⚕️ إدارة الأطباء</h2><p>إضافة وإدارة حسابات الأطباء</p></div>
                <div className="header-actions">
                  <button className="btn-export" onClick={() => exportToCSV('doctors')} disabled={!doctors.length}>📥 تصدير</button>
                  <button className="btn-primary" onClick={() => setShowAddDoctorForm(true)}>➕ إضافة طبيب</button>
                </div>
              </div>

              {/* Add Doctor Form */}
              {showAddDoctorForm && (
                <div className="add-doctor-form-container">
                  <div className="form-header">
                    <h3>➕ إضافة طبيب جديد</h3>
                    <button className="close-form-btn" onClick={() => setShowAddDoctorForm(false)}>✕</button>
                  </div>

                  <div className="form-body">
                    {/* Personal Info */}
                    <div className="form-section">
                      <h4>👤 المعلومات الشخصية (persons collection)</h4>
                      <div className="form-grid">
                        <div className="form-group">
                          <label>الاسم الأول <span className="required">*</span></label>
                          <input type="text" value={newDoctor.firstName} onChange={e => setNewDoctor({...newDoctor, firstName: e.target.value})} placeholder="الاسم الأول" />
                        </div>
                        <div className="form-group">
                          <label>الكنية <span className="required">*</span></label>
                          <input type="text" value={newDoctor.lastName} onChange={e => setNewDoctor({...newDoctor, lastName: e.target.value})} placeholder="الكنية" />
                        </div>
                        <div className="form-group">
                          <label>الرقم الوطني <span className="required">*</span> <small>(11 رقم)</small></label>
                          <input type="text" value={newDoctor.nationalId} onChange={e => setNewDoctor({...newDoctor, nationalId: e.target.value.replace(/\D/g, '').slice(0, 11)})} placeholder="00000000000" maxLength={11} dir="ltr" />
                        </div>
                        <div className="form-group">
                          <label>الجنس</label>
                          <select value={newDoctor.gender} onChange={e => setNewDoctor({...newDoctor, gender: e.target.value})}>
                            <option value="male">ذكر</option>
                            <option value="female">أنثى</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label>تاريخ الميلاد</label>
                          <input type="date" value={newDoctor.dateOfBirth} onChange={e => setNewDoctor({...newDoctor, dateOfBirth: e.target.value})} />
                        </div>
                        <div className="form-group">
                          <label>رقم الهاتف <span className="required">*</span></label>
                          <input type="tel" value={newDoctor.phoneNumber} onChange={e => setNewDoctor({...newDoctor, phoneNumber: e.target.value})} placeholder="09XXXXXXXX" dir="ltr" />
                        </div>
                        <div className="form-group">
                          <label>المحافظة <span className="required">*</span></label>
                          <select value={newDoctor.governorate} onChange={e => setNewDoctor({...newDoctor, governorate: e.target.value})}>
                            <option value="">اختر المحافظة</option>
                            {SYRIAN_GOVERNORATES.map(g => <option key={g.id} value={g.id}>{g.nameAr}</option>)}
                          </select>
                        </div>
                        <div className="form-group">
                          <label>المدينة</label>
                          <input type="text" value={newDoctor.city} onChange={e => setNewDoctor({...newDoctor, city: e.target.value})} placeholder="المدينة" />
                        </div>
                        <div className="form-group full-width">
                          <label>عنوان العيادة <span className="required">*</span></label>
                          <textarea value={newDoctor.address} onChange={e => setNewDoctor({...newDoctor, address: e.target.value})} placeholder="العنوان التفصيلي للعيادة" rows={2} />
                        </div>
                      </div>
                    </div>

                    {/* Doctor Info - Matching Schema */}
                    <div className="form-section">
                      <h4>🩺 المعلومات المهنية (doctors collection)</h4>
                      <div className="schema-note">
                        <strong>⚠️ متطلبات قاعدة البيانات:</strong>
                        <ul>
                          <li>رقم الترخيص: 8-20 حرف/رقم إنجليزي كبير (A-Z, 0-9)</li>
                          <li>التخصص: باللغة الإنجليزية فقط</li>
                          <li>أيام العمل: يوم واحد على الأقل</li>
                        </ul>
                      </div>
                      
                      <div className="form-grid">
                        <div className="form-group">
                          <label>رقم الترخيص الطبي <span className="required">*</span></label>
                          <small className="field-hint"> مثال: SY12345678</small>
                          <input type="text" value={newDoctor.medicalLicenseNumber}
                            onChange={e => setNewDoctor({...newDoctor, medicalLicenseNumber: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20)})}
                            placeholder="SY12345678" dir="ltr" maxLength={20} className="mono-input" />
                        </div>
                        
                        <div className="form-group">
                          <label>التخصص <span className="required">*</span></label>
                          <small className="field-hint">3-100 حرف</small>
                          <select value={newDoctor.specialization} onChange={e => setNewDoctor({...newDoctor, specialization: e.target.value})}>
                            <option value="">اختر التخصص</option>
                            {MEDICAL_SPECIALIZATIONS.map(s => <option key={s.id} value={s.id}>{s.icon} {s.nameAr} ({s.id})</option>)}
                          </select>
                        </div>
                        
                        <div className="form-group">
                          <label>التخصص الفرعي</label>
                          <small className="field-hint">3-100 حرف (اختياري)</small>
                          <input type="text" value={newDoctor.subSpecialization}
                            onChange={e => setNewDoctor({...newDoctor, subSpecialization: e.target.value.slice(0, 100)})}
                            placeholder="التخصص الفرعي" maxLength={100} />
                        </div>
                        
                        <div className="form-group">
                          <label>سنوات الخبرة</label>
                          <small className="field-hint">0-60 سنة</small>
                          <input type="number" value={newDoctor.yearsOfExperience}
                            onChange={e => setNewDoctor({...newDoctor, yearsOfExperience: Math.min(60, Math.max(0, parseInt(e.target.value) || 0)).toString()})}
                            min="0" max="60" placeholder="0" />
                        </div>
                        
                        <div className="form-group">
                          <label>المستشفى / المركز الصحي <span className="required">*</span></label>
                          <small className="field-hint">3-150 حرف</small>
                          <input type="text" value={newDoctor.hospitalAffiliation}
                            onChange={e => setNewDoctor({...newDoctor, hospitalAffiliation: e.target.value.slice(0, 150)})}
                            placeholder="اسم المستشفى أو المركز الصحي" maxLength={150} />
                        </div>
                        
                        <div className="form-group">
                          <label>رسوم الكشف (ل.س)</label>
                          <small className="field-hint">0-1,000,000</small>
                          <input type="number" value={newDoctor.consultationFee}
                            onChange={e => setNewDoctor({...newDoctor, consultationFee: Math.min(1000000, Math.max(0, parseInt(e.target.value) || 0)).toString()})}
                            min="0" max="1000000" placeholder="0" />
                        </div>
                      </div>

                      {/* Available Days */}
                      <div className="form-group full-width">
                        <label>أيام العمل <span className="required">*</span></label>
                        <small className="field-hint">اختر 1-7 أيام (enum: Monday-Sunday)</small>
                        <div className="days-grid">
                          {WEEKDAYS.map(day => (
                            <div key={day.id} className={`day-card ${newDoctor.availableDays.includes(day.id) ? 'selected' : ''}`}
                              onClick={() => handleDayToggle(day.id)}>
                              <span className="day-name-ar">{day.nameAr}</span>
                              <span className="day-name-en">{day.id}</span>
                            </div>
                          ))}
                        </div>
                        {newDoctor.availableDays.length > 0 && (
                          <div className="selected-days">
                            الأيام المختارة: {newDoctor.availableDays.join(', ')}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Email Preview */}
                    {newDoctor.firstName && newDoctor.lastName && newDoctor.medicalLicenseNumber.length >= 8 && (
                      <div className="email-preview">
                        <span className="preview-label">📧 البريد الإلكتروني المُولّد:</span>
                        <code>{generateDoctorEmail(newDoctor.firstName, newDoctor.lastName, newDoctor.medicalLicenseNumber)}</code>
                      </div>
                    )}
                  </div>

                  <div className="form-footer">
                    <button className="btn-secondary" onClick={() => setShowAddDoctorForm(false)}>إلغاء</button>
                    <button className="btn-primary" onClick={handleAddDoctor} disabled={addDoctorLoading}>
                      {addDoctorLoading ? '⏳ جاري...' : '✅ إضافة الطبيب'}
                    </button>
                  </div>
                </div>
              )}

              {/* Search & Filter */}
              <div className="search-filter-bar">
                <div className="search-box">
                  <span>🔍</span>
                  <input type="text" placeholder="بحث..." value={doctorSearchTerm} onChange={e => setDoctorSearchTerm(e.target.value)} />
                </div>
                <div className="filter-buttons">
                  <button className={`filter-btn ${doctorFilter === 'all' ? 'active' : ''}`} onClick={() => setDoctorFilter('all')}>الكل ({doctors.length})</button>
                  <button className={`filter-btn ${doctorFilter === 'active' ? 'active' : ''}`} onClick={() => setDoctorFilter('active')}>نشط</button>
                  <button className={`filter-btn ${doctorFilter === 'inactive' ? 'active' : ''}`} onClick={() => setDoctorFilter('inactive')}>غير نشط</button>
                </div>
              </div>

              {/* Doctors Table */}
              {doctorsLoading ? (
                <div className="loading-state"><div className="spinner"></div><p>جاري التحميل...</p></div>
              ) : filteredDoctors.length === 0 ? (
                <div className="empty-state"><span>👨‍⚕️</span><h3>لا يوجد أطباء</h3></div>
              ) : (
                <div className="data-table-container">
                  <table className="data-table">
                    <thead>
                      <tr><th>الطبيب</th><th>رقم الترخيص</th><th>التخصص</th><th>المستشفى</th><th>الحالة</th><th>الإجراءات</th></tr>
                    </thead>
                    <tbody>
                      {filteredDoctors.map((d, i) => {
                        const firstName = d.firstName || d.person?.firstName || '';
                        const lastName = d.lastName || d.person?.lastName || '';
                        const email = d.email || d.account?.email || '';
                        const gender = d.gender || d.person?.gender || 'male';
                        const spec = MEDICAL_SPECIALIZATIONS.find(s => s.id === d.specialization);
                        
                        return (
                          <tr key={d._id || i} className={d.isActive === false ? 'inactive-row' : ''}>
                            <td>
                              <div className="user-cell">
                                <span className="user-avatar">{gender === 'female' ? '👩‍⚕️' : '👨‍⚕️'}</span>
                                <div><div className="user-name">د. {firstName} {lastName}</div><div className="user-email">{email}</div></div>
                              </div>
                            </td>
                            <td><code>{d.medicalLicenseNumber || '-'}</code></td>
                            <td>{spec ? <span className="specialty-badge">{spec.icon} {spec.nameAr}</span> : d.specialization || '-'}</td>
                            <td>{d.hospitalAffiliation || '-'}</td>
                            <td><span className={`status-badge ${d.isActive !== false ? 'active' : 'inactive'}`}>{d.isActive !== false ? '✅ نشط' : '⏸️ غير نشط'}</span></td>
                            <td>
                              <div className="action-buttons">
                                <button className="action-btn view" onClick={() => { setSelectedDoctor(d); setShowDoctorDetails(true); }}>👁️</button>
                                {d.isActive !== false ? (
                                  <button className="action-btn deactivate" onClick={() => handleDeactivate(d, 'doctor')}>⏸️</button>
                                ) : (
                                  <button className="action-btn reactivate" onClick={() => handleReactivate(d, 'doctor')}>▶️</button>
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

              {/* Doctor Details Modal */}
              {showDoctorDetails && selectedDoctor && (
                <div className="modal-overlay" onClick={() => setShowDoctorDetails(false)}>
                  <div className="details-modal" onClick={e => e.stopPropagation()}>
                    <div className="details-modal-header">
                      <span className="details-avatar">{(selectedDoctor.gender || selectedDoctor.person?.gender) === 'female' ? '👩‍⚕️' : '👨‍⚕️'}</span>
                      <div>
                        <h2>د. {selectedDoctor.firstName || selectedDoctor.person?.firstName} {selectedDoctor.lastName || selectedDoctor.person?.lastName}</h2>
                        <p>{MEDICAL_SPECIALIZATIONS.find(s => s.id === selectedDoctor.specialization)?.nameAr || selectedDoctor.specialization}</p>
                      </div>
                      <button className="close-modal-btn" onClick={() => setShowDoctorDetails(false)}>✕</button>
                    </div>
                    <div className="details-modal-body">
                      <div className="details-grid">
                        <div><strong>رقم الترخيص:</strong> {selectedDoctor.medicalLicenseNumber}</div>
                        <div><strong>التخصص:</strong> {selectedDoctor.specialization}</div>
                        <div><strong>سنوات الخبرة:</strong> {selectedDoctor.yearsOfExperience || 0}</div>
                        <div><strong>المستشفى:</strong> {selectedDoctor.hospitalAffiliation}</div>
                        <div><strong>رسوم الكشف:</strong> {selectedDoctor.consultationFee || 0} ل.س</div>
                        <div><strong>أيام العمل:</strong> {selectedDoctor.availableDays?.map(d => WEEKDAYS.find(w => w.id === d)?.nameAr).join('، ')}</div>
                      </div>
                      <div className="status-display">
                        <span className={`big-status-badge ${selectedDoctor.isActive !== false ? 'active' : 'inactive'}`}>
                          {selectedDoctor.isActive !== false ? '✅ نشط' : '⏸️ غير نشط'}
                        </span>
                      </div>
                    </div>
                    <div className="details-modal-footer">
                      <button className="btn-secondary" onClick={() => setShowDoctorDetails(false)}>إغلاق</button>
                      {selectedDoctor.isActive !== false ? (
                        <button className="btn-danger" onClick={() => { setShowDoctorDetails(false); handleDeactivate(selectedDoctor, 'doctor'); }}>⏸️ إلغاء التفعيل</button>
                      ) : (
                        <button className="btn-success" onClick={() => { setShowDoctorDetails(false); handleReactivate(selectedDoctor, 'doctor'); }}>▶️ إعادة التفعيل</button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* === PATIENTS TAB === */}
          {activeTab === 'patients' && (
            <div className="tab-content patients-content">
              <div className="content-header">
                <div><h2>👥 إدارة المرضى</h2><p>عرض وإدارة حسابات المرضى</p></div>
                <button className="btn-export" onClick={() => exportToCSV('patients')} disabled={!patients.length}>📥 تصدير</button>
              </div>

              <div className="info-banner">ℹ️ البيانات الطبية متاحة فقط للأطباء المعالجين.</div>

              <div className="search-filter-bar">
                <div className="search-box"><span>🔍</span><input type="text" placeholder="بحث..." value={patientSearchTerm} onChange={e => setPatientSearchTerm(e.target.value)} /></div>
                <div className="filter-buttons">
                  <button className={`filter-btn ${patientFilter === 'all' ? 'active' : ''}`} onClick={() => setPatientFilter('all')}>الكل</button>
                  <button className={`filter-btn ${patientFilter === 'active' ? 'active' : ''}`} onClick={() => setPatientFilter('active')}>نشط</button>
                  <button className={`filter-btn ${patientFilter === 'inactive' ? 'active' : ''}`} onClick={() => setPatientFilter('inactive')}>غير نشط</button>
                </div>
              </div>

              {patientsLoading ? (
                <div className="loading-state"><div className="spinner"></div></div>
              ) : filteredPatients.length === 0 ? (
                <div className="empty-state"><span>👥</span><h3>لا يوجد مرضى</h3></div>
              ) : (
                <div className="data-table-container">
                  <table className="data-table">
                    <thead><tr><th>المريض</th><th>الرقم الوطني</th><th>الجنس</th><th>الحالة</th><th>الإجراءات</th></tr></thead>
                    <tbody>
                      {filteredPatients.map((p, i) => {
                        const firstName = p.firstName || p.person?.firstName || '';
                        const lastName = p.lastName || p.person?.lastName || '';
                        const email = p.email || p.account?.email || '';
                        const gender = p.gender || p.person?.gender || 'male';
                        const nid = p.nationalId || p.person?.nationalId || '';
                        
                        return (
                          <tr key={p._id || i} className={p.isActive === false ? 'inactive-row' : ''}>
                            <td>
                              <div className="user-cell">
                                <span className="user-avatar">{gender === 'female' ? '👩' : '👨'}</span>
                                <div><div className="user-name">{firstName} {lastName}</div><div className="user-email">{email}</div></div>
                              </div>
                            </td>
                            <td><code>{nid}</code></td>
                            <td>{gender === 'male' ? 'ذكر' : 'أنثى'}</td>
                            <td><span className={`status-badge ${p.isActive !== false ? 'active' : 'inactive'}`}>{p.isActive !== false ? '✅' : '⏸️'}</span></td>
                            <td>
                              <div className="action-buttons">
                                <button className="action-btn view" onClick={() => { setSelectedPatient(p); setShowPatientDetails(true); }}>👁️</button>
                                {p.isActive !== false ? (
                                  <button className="action-btn deactivate" onClick={() => handleDeactivate(p, 'patient')}>⏸️</button>
                                ) : (
                                  <button className="action-btn reactivate" onClick={() => handleReactivate(p, 'patient')}>▶️</button>
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

              {/* Patient Details */}
              {showPatientDetails && selectedPatient && (
                <div className="modal-overlay" onClick={() => setShowPatientDetails(false)}>
                  <div className="details-modal" onClick={e => e.stopPropagation()}>
                    <div className="details-modal-header patient">
                      <span className="details-avatar">{(selectedPatient.gender || selectedPatient.person?.gender) === 'female' ? '👩' : '👨'}</span>
                      <div>
                        <h2>{selectedPatient.firstName || selectedPatient.person?.firstName} {selectedPatient.lastName || selectedPatient.person?.lastName}</h2>
                        <p>مريض</p>
                      </div>
                      <button className="close-modal-btn" onClick={() => setShowPatientDetails(false)}>✕</button>
                    </div>
                    <div className="details-modal-body">
                      <div className="details-grid">
                        <div><strong>الرقم الوطني:</strong> {selectedPatient.nationalId || selectedPatient.person?.nationalId}</div>
                        <div><strong>الهاتف:</strong> {selectedPatient.phoneNumber || selectedPatient.person?.phoneNumber || '-'}</div>
                        <div><strong>البريد:</strong> {selectedPatient.email || selectedPatient.account?.email}</div>
                      </div>
                      <div className="medical-notice">🔒 البيانات الطبية محمية</div>
                    </div>
                    <div className="details-modal-footer">
                      <button className="btn-secondary" onClick={() => setShowPatientDetails(false)}>إغلاق</button>
                      {selectedPatient.isActive !== false ? (
                        <button className="btn-danger" onClick={() => { setShowPatientDetails(false); handleDeactivate(selectedPatient, 'patient'); }}>⏸️ إلغاء</button>
                      ) : (
                        <button className="btn-success" onClick={() => { setShowPatientDetails(false); handleReactivate(selectedPatient, 'patient'); }}>▶️ تفعيل</button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* === AUDIT TAB === */}
          {activeTab === 'audit' && (
            <div className="tab-content audit-content">
              <div className="content-header">
                <div><h2>📜 سجل النظام</h2><p>تتبع الإجراءات الإدارية</p></div>
                <button className="btn-secondary" onClick={loadAuditLogs}>🔄 تحديث</button>
              </div>

              {auditLoading ? (
                <div className="loading-state"><div className="spinner"></div></div>
              ) : auditLogs.length === 0 ? (
                <div className="empty-state"><span>📜</span><h3>لا توجد سجلات</h3></div>
              ) : (
                <div className="audit-logs-container">
                  {auditLogs.map((log, i) => (
                    <div key={i} className="audit-log-item">
                      <span className="log-icon">{log.action?.includes('ADD') ? '➕' : log.action?.includes('DEACTIVATE') ? '⏸️' : log.action?.includes('REACTIVATE') ? '▶️' : '📋'}</span>
                      <div className="log-content">
                        <p>{log.description}</p>
                        <small>👤 {log.adminName} • 🕐 {formatDateTime(log.timestamp)}</small>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;