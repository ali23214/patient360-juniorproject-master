// src/pages/AdminDashboard.jsx
// 🏛️ Health Ministry Admin Dashboard - Government Healthcare Platform
// Patient 360° - وزارة الصحة - الجمهورية العربية السورية

import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import { authAPI } from '../services/api';
import '../styles/AdminDashboard.css';

/**
 * SYRIAN GOVERNORATES - المحافظات السورية
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
 * MEDICAL SPECIALIZATIONS - التخصصات الطبية
 */
const MEDICAL_SPECIALIZATIONS = [
  { id: 'cardiologist', nameEn: 'Cardiologist', nameAr: 'طبيب قلب', icon: '❤️' },
  { id: 'pulmonologist', nameEn: 'Pulmonologist', nameAr: 'طبيب أمراض الرئة', icon: '🫁' },
  { id: 'general_practitioner', nameEn: 'General Practitioner', nameAr: 'طبيب عام', icon: '🩺' },
  { id: 'infectious_disease', nameEn: 'Infectious Disease Specialist', nameAr: 'طبيب أمراض معدية', icon: '🦠' },
  { id: 'intensive_care', nameEn: 'Intensive Care Specialist', nameAr: 'طبيب عناية مركزة', icon: '🏥' },
  { id: 'rheumatologist', nameEn: 'Rheumatologist', nameAr: 'طبيب روماتيزم', icon: '🦴' },
  { id: 'orthopedic_surgeon', nameEn: 'Orthopedic Surgeon', nameAr: 'جراح عظام', icon: '🦿' },
  { id: 'neurologist', nameEn: 'Neurologist', nameAr: 'طبيب أعصاب', icon: '🧠' },
  { id: 'endocrinologist', nameEn: 'Endocrinologist', nameAr: 'طبيب غدد صماء', icon: '⚗️' },
  { id: 'dermatologist', nameEn: 'Dermatologist', nameAr: 'طبيب جلدية', icon: '🧴' },
  { id: 'gastroenterologist', nameEn: 'Gastroenterologist', nameAr: 'طبيب جهاز هضمي', icon: '🫃' },
  { id: 'general_surgeon', nameEn: 'General Surgeon', nameAr: 'جراح عام', icon: '🔪' },
  { id: 'hepatologist', nameEn: 'Hepatologist', nameAr: 'طبيب كبد', icon: '🫀' },
  { id: 'urologist', nameEn: 'Urologist', nameAr: 'طبيب مسالك بولية', icon: '💧' },
  { id: 'gynecologist', nameEn: 'Gynecologist', nameAr: 'طبيب نساء وتوليد', icon: '🤰' },
  { id: 'psychiatrist', nameEn: 'Psychiatrist', nameAr: 'طبيب نفسي', icon: '🧘' },
  { id: 'hematologist', nameEn: 'Hematologist', nameAr: 'طبيب دم', icon: '🩸' },
  { id: 'hematologist_oncologist', nameEn: 'Hematologist/Oncologist', nameAr: 'طبيب دم/أورام', icon: '🎗️' },
  { id: 'ent_specialist', nameEn: 'ENT Specialist', nameAr: 'طبيب أنف أذن حنجرة', icon: '👂' },
  { id: 'ophthalmologist', nameEn: 'Ophthalmologist', nameAr: 'طبيب عيون', icon: '👁️' }
];

/**
 * DEACTIVATION REASONS - أسباب إلغاء التفعيل
 */
const DEACTIVATION_REASONS = [
  { id: 'death', nameAr: 'وفاة', nameEn: 'Death', icon: '🕊️' },
  { id: 'license_revoked', nameAr: 'إلغاء الترخيص', nameEn: 'License Revoked', icon: '🚫' },
  { id: 'user_request', nameAr: 'طلب المستخدم', nameEn: 'User Request', icon: '📝' },
  { id: 'fraud', nameAr: 'احتيال', nameEn: 'Fraud', icon: '⚠️' },
  { id: 'retirement', nameAr: 'تقاعد', nameEn: 'Retirement', icon: '🏖️' },
  { id: 'transfer', nameAr: 'نقل', nameEn: 'Transfer', icon: '🔄' },
  { id: 'other', nameAr: 'سبب آخر', nameEn: 'Other', icon: '📋' }
];

/**
 * EDUCATION LEVELS - المؤهلات العلمية
 */
const EDUCATION_LEVELS = [
  { id: 'bachelor', nameAr: 'بكالوريوس', nameEn: 'Bachelor' },
  { id: 'master', nameAr: 'ماجستير', nameEn: 'Master' },
  { id: 'phd', nameAr: 'دكتوراه', nameEn: 'PhD' },
  { id: 'fellowship', nameAr: 'زمالة', nameEn: 'Fellowship' },
  { id: 'board', nameAr: 'بورد', nameEn: 'Board Certification' }
];

/**
 * Generate unique email for doctor
 */
const generateDoctorEmail = (firstName, lastName, licenseNumber) => {
  const cleanFirst = firstName.toLowerCase().replace(/\s+/g, '');
  const cleanLast = lastName.toLowerCase().replace(/\s+/g, '');
  return `${cleanFirst}.${cleanLast}.${licenseNumber}@patient360.gov.sy`;
};

/**
 * Generate secure password
 */
const generatePassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

/**
 * Statistics Card Component
 */
const StatCard = ({ icon, value, label, sublabel, color, trend, onClick }) => (
  <div className={`stat-card ${color}`} onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
    <div className="stat-card-icon">
      <span>{icon}</span>
    </div>
    <div className="stat-card-content">
      <h3 className="stat-value">{value}</h3>
      <p className="stat-label">{label}</p>
      {sublabel && <span className="stat-sublabel">{sublabel}</span>}
    </div>
    {trend && (
      <div className={`stat-trend ${trend > 0 ? 'up' : 'down'}`}>
        <span>{trend > 0 ? '↑' : '↓'}</span>
        <span>{Math.abs(trend)}%</span>
      </div>
    )}
  </div>
);

/**
 * Main Admin Dashboard Component
 */
const AdminDashboard = () => {
  const navigate = useNavigate();
  
  // Core State
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('statistics');
  
  // Modal State
  const [modal, setModal] = useState({ 
    isOpen: false, 
    type: '', 
    title: '', 
    message: '', 
    onConfirm: null 
  });
  
  // Statistics State
  const [statistics, setStatistics] = useState({
    totalDoctors: 0,
    activeDoctors: 0,
    inactiveDoctors: 0,
    totalPatients: 0,
    activePatients: 0,
    inactivePatients: 0,
    totalVisits: 0,
    todayVisits: 0,
    monthlyVisits: 0,
    specializationStats: [],
    governorateStats: [],
    recentActivity: []
  });
  
  // Doctors State
  const [doctors, setDoctors] = useState([]);
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [doctorSearchTerm, setDoctorSearchTerm] = useState('');
  const [doctorFilter, setDoctorFilter] = useState('all'); // all, active, inactive
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [showDoctorDetails, setShowDoctorDetails] = useState(false);
  
  // Patients State
  const [patients, setPatients] = useState([]);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [patientFilter, setPatientFilter] = useState('all');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showPatientDetails, setShowPatientDetails] = useState(false);
  
  // Add Doctor Form State
  const [showAddDoctorForm, setShowAddDoctorForm] = useState(false);
  const [addDoctorLoading, setAddDoctorLoading] = useState(false);
  const [newDoctor, setNewDoctor] = useState({
    firstName: '',
    lastName: '',
    nationalId: '',
    licenseNumber: '',
    specialization: '',
    subSpecialization: '',
    gender: 'male',
    dateOfBirth: '',
    phoneNumber: '',
    education: '',
    yearsOfExperience: '',
    institution: '',
    clinicAddress: '',
    governorate: '',
    city: '',
    email: ''  // ← EDITABLE EMAIL FIELD
  });
  const [generatedCredentials, setGeneratedCredentials] = useState(null);
  
  // Deactivation State
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [deactivateType, setDeactivateType] = useState(''); // 'doctor' or 'patient'
  const [deactivateReason, setDeactivateReason] = useState('');
  const [deactivateNotes, setDeactivateNotes] = useState('');
  
  // Audit Log State
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);

  // ============================================
  // INITIALIZATION
  // ============================================
  
  useEffect(() => {
    const loadAdmin = async () => {
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
    
    loadAdmin();
  }, [navigate]);

  // ============================================
  // API FUNCTIONS
  // ============================================

  const loadStatistics = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Load doctors count
      const doctorsRes = await fetch('http://localhost:5000/api/admin/doctors', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const doctorsData = await doctorsRes.json();
      
      // Load patients count
      const patientsRes = await fetch('http://localhost:5000/api/admin/patients', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const patientsData = await patientsRes.json();
      
      // Load statistics
      const statsRes = await fetch('http://localhost:5000/api/admin/statistics', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const statsData = await statsRes.json();
      
      if (doctorsData.success && patientsData.success) {
        const allDoctors = doctorsData.doctors || [];
        const allPatients = patientsData.patients || [];
        
        setStatistics({
          totalDoctors: allDoctors.length,
          activeDoctors: allDoctors.filter(d => d.isActive !== false).length,
          inactiveDoctors: allDoctors.filter(d => d.isActive === false).length,
          totalPatients: allPatients.length,
          activePatients: allPatients.filter(p => p.isActive !== false).length,
          inactivePatients: allPatients.filter(p => p.isActive === false).length,
          totalVisits: statsData.totalVisits || 0,
          todayVisits: statsData.todayVisits || 0,
          monthlyVisits: statsData.monthlyVisits || 0,
          specializationStats: statsData.specializationStats || [],
          governorateStats: statsData.governorateStats || [],
          recentActivity: statsData.recentActivity || []
        });
      }
    } catch (error) {
      console.error('Error loading statistics:', error);
      // Set mock data for demo
      setStatistics({
        totalDoctors: 0,
        activeDoctors: 0,
        inactiveDoctors: 0,
        totalPatients: 0,
        activePatients: 0,
        inactivePatients: 0,
        totalVisits: 0,
        todayVisits: 0,
        monthlyVisits: 0,
        specializationStats: [],
        governorateStats: [],
        recentActivity: []
      });
    }
  };

  const loadDoctors = async () => {
    setDoctorsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/admin/doctors', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        setDoctors(data.doctors || []);
      } else {
        setDoctors([]);
      }
    } catch (error) {
      console.error('Error loading doctors:', error);
      setDoctors([]);
    } finally {
      setDoctorsLoading(false);
    }
  };

  const loadPatients = async () => {
    setPatientsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/admin/patients', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        setPatients(data.patients || []);
      } else {
        setPatients([]);
      }
    } catch (error) {
      console.error('Error loading patients:', error);
      setPatients([]);
    } finally {
      setPatientsLoading(false);
    }
  };

  const loadAuditLogs = async () => {
    setAuditLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/admin/audit-logs', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        setAuditLogs(data.logs || []);
      } else {
        setAuditLogs([]);
      }
    } catch (error) {
      console.error('Error loading audit logs:', error);
      setAuditLogs([]);
    } finally {
      setAuditLoading(false);
    }
  };

  // ============================================
  // TAB CHANGE HANDLER
  // ============================================

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    
    if (tab === 'doctors' && doctors.length === 0) {
      loadDoctors();
    } else if (tab === 'patients' && patients.length === 0) {
      loadPatients();
    } else if (tab === 'audit' && auditLogs.length === 0) {
      loadAuditLogs();
    }
  };

  // ============================================
  // DOCTOR MANAGEMENT
  // ============================================

  const handleAddDoctor = async () => {
    // Validation
    if (!newDoctor.firstName.trim()) {
      openModal('error', 'خطأ', 'الرجاء إدخال الاسم الأول');
      return;
    }
    if (!newDoctor.lastName.trim()) {
      openModal('error', 'خطأ', 'الرجاء إدخال الكنية');
      return;
    }
    if (!newDoctor.nationalId.trim() || newDoctor.nationalId.length !== 11) {
      openModal('error', 'خطأ', 'الرجاء إدخال الرقم الوطني (11 رقم)');
      return;
    }
    if (!newDoctor.licenseNumber.trim()) {
      openModal('error', 'خطأ', 'الرجاء إدخال رقم الترخيص الطبي');
      return;
    }
    if (!newDoctor.specialization) {
      openModal('error', 'خطأ', 'الرجاء اختيار التخصص');
      return;
    }
    if (!newDoctor.governorate) {
      openModal('error', 'خطأ', 'الرجاء اختيار المحافظة');
      return;
    }
    if (!newDoctor.clinicAddress.trim()) {
      openModal('error', 'خطأ', 'الرجاء إدخال عنوان العيادة');
      return;
    }
    if (!newDoctor.phoneNumber.trim()) {
      openModal('error', 'خطأ', 'الرجاء إدخال رقم الهاتف');
      return;
    }

    setAddDoctorLoading(true);

    try {
      const generatedEmail = generateDoctorEmail(
        newDoctor.firstName,
        newDoctor.lastName,
        newDoctor.licenseNumber
      );
      const generatedPass = generatePassword();

      const doctorData = {
        ...newDoctor,
        email: generatedEmail,
        password: generatedPass,
        role: 'doctor',
        isActive: true,
        createdAt: new Date().toISOString(),
        createdBy: admin._id
      };

      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/admin/doctors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(doctorData)
      });

      const data = await response.json();

      if (data.success) {
        setGeneratedCredentials({
          email: generatedEmail,
          password: generatedPass,
          doctorName: `${newDoctor.firstName} ${newDoctor.lastName}`
        });
        
        // Reset form
        setNewDoctor({
          firstName: '',
          lastName: '',
          nationalId: '',
          licenseNumber: '',
          specialization: '',
          subSpecialization: '',
          gender: 'male',
          dateOfBirth: '',
          phoneNumber: '',
          education: '',
          yearsOfExperience: '',
          institution: '',
          clinicAddress: '',
          governorate: '',
          city: ''
        });
        
        // Reload doctors
        loadDoctors();
        loadStatistics();
        
        // Log action
        logAuditAction('ADD_DOCTOR', `تم إضافة طبيب جديد: ${newDoctor.firstName} ${newDoctor.lastName}`);
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

  const handleDeactivateDoctor = (doctor) => {
    setDeactivateTarget(doctor);
    setDeactivateType('doctor');
    setDeactivateReason('');
    setDeactivateNotes('');
    setShowDeactivateModal(true);
  };

  const handleDeactivatePatient = (patient) => {
    setDeactivateTarget(patient);
    setDeactivateType('patient');
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
        ? `http://localhost:5000/api/admin/doctors/${deactivateTarget._id}/deactivate`
        : `http://localhost:5000/api/admin/patients/${deactivateTarget._id}/deactivate`;

      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          reason: deactivateReason,
          notes: deactivateNotes,
          deactivatedBy: admin._id,
          deactivatedAt: new Date().toISOString()
        })
      });

      const data = await response.json();

      if (data.success) {
        setShowDeactivateModal(false);
        openModal('success', 'تم بنجاح', 'تم إلغاء تفعيل الحساب بنجاح');
        
        if (deactivateType === 'doctor') {
          loadDoctors();
        } else {
          loadPatients();
        }
        loadStatistics();
        
        // Log action
        const reasonText = DEACTIVATION_REASONS.find(r => r.id === deactivateReason)?.nameAr;
        logAuditAction(
          `DEACTIVATE_${deactivateType.toUpperCase()}`,
          `تم إلغاء تفعيل ${deactivateType === 'doctor' ? 'الطبيب' : 'المريض'}: ${deactivateTarget.firstName} ${deactivateTarget.lastName} - السبب: ${reasonText}`
        );
      } else {
        openModal('error', 'خطأ', data.message || 'حدث خطأ أثناء إلغاء التفعيل');
      }
    } catch (error) {
      console.error('Error deactivating:', error);
      openModal('error', 'خطأ', 'حدث خطأ في الاتصال بالخادم');
    }
  };

  const handleReactivate = async (target, type) => {
    try {
      const token = localStorage.getItem('token');
      const endpoint = type === 'doctor'
        ? `http://localhost:5000/api/admin/doctors/${target._id}/reactivate`
        : `http://localhost:5000/api/admin/patients/${target._id}/reactivate`;

      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          reactivatedBy: admin._id,
          reactivatedAt: new Date().toISOString()
        })
      });

      const data = await response.json();

      if (data.success) {
        openModal('success', 'تم بنجاح', 'تم إعادة تفعيل الحساب بنجاح');
        
        if (type === 'doctor') {
          loadDoctors();
        } else {
          loadPatients();
        }
        loadStatistics();
        
        logAuditAction(
          `REACTIVATE_${type.toUpperCase()}`,
          `تم إعادة تفعيل ${type === 'doctor' ? 'الطبيب' : 'المريض'}: ${target.firstName} ${target.lastName}`
        );
      }
    } catch (error) {
      console.error('Error reactivating:', error);
      openModal('error', 'خطأ', 'حدث خطأ في الاتصال بالخادم');
    }
  };

  // ============================================
  // AUDIT LOG
  // ============================================

  const logAuditAction = async (action, description) => {
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
          description,
          adminId: admin._id,
          adminName: `${admin.firstName} ${admin.lastName}`,
          timestamp: new Date().toISOString()
        })
      });
    } catch (error) {
      console.error('Error logging audit action:', error);
    }
  };

  // ============================================
  // EXPORT FUNCTIONS
  // ============================================

  const exportDoctorsToCSV = () => {
    const headers = ['الاسم', 'الرقم الوطني', 'رقم الترخيص', 'التخصص', 'المحافظة', 'الهاتف', 'البريد الإلكتروني', 'الحالة'];
    const rows = doctors.map(d => [
      `${d.firstName} ${d.lastName}`,
      d.nationalId,
      d.licenseNumber || d.roleData?.doctor?.licenseNumber,
      d.roleData?.doctor?.specialization || d.specialization,
      d.governorate,
      d.phoneNumber,
      d.email,
      d.isActive !== false ? 'نشط' : 'غير نشط'
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `doctors_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    logAuditAction('EXPORT_DOCTORS', 'تم تصدير قائمة الأطباء');
  };

  const exportPatientsToCSV = () => {
    const headers = ['الاسم', 'الرقم الوطني', 'الجنس', 'تاريخ الميلاد', 'الهاتف', 'الحالة'];
    const rows = patients.map(p => [
      `${p.firstName} ${p.lastName}`,
      p.nationalId,
      p.gender === 'male' ? 'ذكر' : 'أنثى',
      p.dateOfBirth ? new Date(p.dateOfBirth).toLocaleDateString('ar-EG') : '-',
      p.phoneNumber,
      p.isActive !== false ? 'نشط' : 'غير نشط'
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `patients_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    logAuditAction('EXPORT_PATIENTS', 'تم تصدير قائمة المرضى');
  };

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================

  const openModal = (type, title, message, onConfirm = null) => {
    setModal({ isOpen: true, type, title, message, onConfirm });
  };

  const closeModal = () => {
    setModal({ isOpen: false, type: '', title: '', message: '', onConfirm: null });
  };

  const handleModalConfirm = () => {
    if (modal.onConfirm) modal.onConfirm();
    closeModal();
  };

  const handleLogout = () => {
    openModal('confirm', 'تأكيد تسجيل الخروج', 'هل أنت متأكد من رغبتك في تسجيل الخروج؟', () => {
      authAPI.logout();
    });
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Filter functions
  const filteredDoctors = doctors.filter(doctor => {
    const matchesSearch = 
      doctor.firstName?.toLowerCase().includes(doctorSearchTerm.toLowerCase()) ||
      doctor.lastName?.toLowerCase().includes(doctorSearchTerm.toLowerCase()) ||
      doctor.nationalId?.includes(doctorSearchTerm) ||
      doctor.licenseNumber?.includes(doctorSearchTerm) ||
      doctor.roleData?.doctor?.licenseNumber?.includes(doctorSearchTerm);
    
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

      {/* Modal */}
      {modal.isOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-container" onClick={e => e.stopPropagation()}>
            <div className={`modal-header ${modal.type}`}>
              <div className="modal-icon">
                {modal.type === 'success' ? '✓' : modal.type === 'error' ? '✕' : '؟'}
              </div>
              <h2>{modal.title}</h2>
            </div>
            <div className="modal-body">
              <p>{modal.message}</p>
            </div>
            <div className="modal-footer">
              {modal.type === 'confirm' ? (
                <>
                  <button className="modal-button secondary" onClick={closeModal}>إلغاء</button>
                  <button className="modal-button primary" onClick={handleModalConfirm}>تأكيد</button>
                </>
              ) : (
                <button className="modal-button primary" onClick={modal.onConfirm ? handleModalConfirm : closeModal}>
                  حسناً
                </button>
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
              <p>
                {deactivateTarget?.firstName} {deactivateTarget?.lastName}
              </p>
            </div>
            
            <div className="deactivate-modal-body">
              <div className="form-group">
                <label>سبب إلغاء التفعيل <span className="required">*</span></label>
                <div className="deactivate-reasons-grid">
                  {DEACTIVATION_REASONS.map(reason => (
                    <div
                      key={reason.id}
                      className={`reason-card ${deactivateReason === reason.id ? 'selected' : ''}`}
                      onClick={() => setDeactivateReason(reason.id)}
                    >
                      <span className="reason-icon">{reason.icon}</span>
                      <span className="reason-name">{reason.nameAr}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="form-group">
                <label>ملاحظات إضافية</label>
                <textarea
                  value={deactivateNotes}
                  onChange={(e) => setDeactivateNotes(e.target.value)}
                  placeholder="أضف أي ملاحظات إضافية..."
                  rows={3}
                />
              </div>
            </div>
            
            <div className="deactivate-modal-footer">
              <button 
                className="btn-secondary" 
                onClick={() => setShowDeactivateModal(false)}
              >
                إلغاء
              </button>
              <button 
                className="btn-danger" 
                onClick={confirmDeactivation}
                disabled={!deactivateReason}
              >
                تأكيد إلغاء التفعيل
              </button>
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
                <p>احفظ هذه البيانات الآن! لن يمكنك رؤية كلمة المرور مرة أخرى.</p>
              </div>
              
              <div className="credential-item">
                <label>البريد الإلكتروني:</label>
                <div className="credential-value">
                  <code>{generatedCredentials.email}</code>
                  <button 
                    className="copy-btn"
                    onClick={() => {
                      navigator.clipboard.writeText(generatedCredentials.email);
                      openModal('success', 'تم النسخ', 'تم نسخ البريد الإلكتروني');
                    }}
                  >
                    📋
                  </button>
                </div>
              </div>
              
              <div className="credential-item">
                <label>كلمة المرور:</label>
                <div className="credential-value">
                  <code>{generatedCredentials.password}</code>
                  <button 
                    className="copy-btn"
                    onClick={() => {
                      navigator.clipboard.writeText(generatedCredentials.password);
                      openModal('success', 'تم النسخ', 'تم نسخ كلمة المرور');
                    }}
                  >
                    📋
                  </button>
                </div>
              </div>
            </div>
            
            <div className="credentials-footer">
              <button 
                className="btn-primary"
                onClick={() => {
                  setGeneratedCredentials(null);
                  setShowAddDoctorForm(false);
                }}
              >
                تم - إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="admin-container">
        {/* Admin Header */}
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
              <p>Patient 360° - نظام إدارة الرعاية الصحية</p>
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
            <button className="logout-btn-admin" onClick={handleLogout}>
              <span>🚪</span>
              <span>تسجيل الخروج</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="admin-tabs">
          <button 
            className={`admin-tab ${activeTab === 'statistics' ? 'active' : ''}`}
            onClick={() => handleTabChange('statistics')}
          >
            <span className="tab-icon">📊</span>
            <span>الإحصائيات</span>
          </button>
          <button 
            className={`admin-tab ${activeTab === 'doctors' ? 'active' : ''}`}
            onClick={() => handleTabChange('doctors')}
          >
            <span className="tab-icon">👨‍⚕️</span>
            <span>إدارة الأطباء</span>
          </button>
          <button 
            className={`admin-tab ${activeTab === 'patients' ? 'active' : ''}`}
            onClick={() => handleTabChange('patients')}
          >
            <span className="tab-icon">👥</span>
            <span>إدارة المرضى</span>
          </button>
          <button 
            className={`admin-tab ${activeTab === 'audit' ? 'active' : ''}`}
            onClick={() => handleTabChange('audit')}
          >
            <span className="tab-icon">📜</span>
            <span>سجل النظام</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="admin-content">
          
          {/* ============================================
              STATISTICS TAB
              ============================================ */}
          {activeTab === 'statistics' && (
            <div className="tab-content statistics-content">
              {/* Main Stats Cards */}
              <div className="stats-grid">
                <StatCard
                  icon="👨‍⚕️"
                  value={statistics.totalDoctors}
                  label="إجمالي الأطباء"
                  sublabel={`${statistics.activeDoctors} نشط`}
                  color="blue"
                  onClick={() => handleTabChange('doctors')}
                />
                <StatCard
                  icon="👥"
                  value={statistics.totalPatients}
                  label="إجمالي المرضى"
                  sublabel={`${statistics.activePatients} نشط`}
                  color="green"
                  onClick={() => handleTabChange('patients')}
                />
                <StatCard
                  icon="📋"
                  value={statistics.totalVisits}
                  label="إجمالي الزيارات"
                  sublabel={`${statistics.todayVisits} اليوم`}
                  color="purple"
                />
                <StatCard
                  icon="📈"
                  value={statistics.monthlyVisits}
                  label="زيارات الشهر"
                  sublabel="الشهر الحالي"
                  color="orange"
                />
              </div>

              {/* Secondary Stats */}
              <div className="stats-row">
                <div className="stat-section">
                  <div className="section-header">
                    <h3>👨‍⚕️ حالة الأطباء</h3>
                  </div>
                  <div className="status-cards">
                    <div className="status-card active">
                      <div className="status-icon">✅</div>
                      <div className="status-info">
                        <span className="status-value">{statistics.activeDoctors}</span>
                        <span className="status-label">نشط</span>
                      </div>
                    </div>
                    <div className="status-card inactive">
                      <div className="status-icon">⏸️</div>
                      <div className="status-info">
                        <span className="status-value">{statistics.inactiveDoctors}</span>
                        <span className="status-label">غير نشط</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="stat-section">
                  <div className="section-header">
                    <h3>👥 حالة المرضى</h3>
                  </div>
                  <div className="status-cards">
                    <div className="status-card active">
                      <div className="status-icon">✅</div>
                      <div className="status-info">
                        <span className="status-value">{statistics.activePatients}</span>
                        <span className="status-label">نشط</span>
                      </div>
                    </div>
                    <div className="status-card inactive">
                      <div className="status-icon">⏸️</div>
                      <div className="status-info">
                        <span className="status-value">{statistics.inactivePatients}</span>
                        <span className="status-label">غير نشط</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="quick-actions-section">
                <div className="section-header">
                  <h3>⚡ إجراءات سريعة</h3>
                </div>
                <div className="quick-actions-grid">
                  <button 
                    className="quick-action-btn add-doctor"
                    onClick={() => {
                      handleTabChange('doctors');
                      setTimeout(() => setShowAddDoctorForm(true), 100);
                    }}
                  >
                    <span className="action-icon">➕</span>
                    <span className="action-text">إضافة طبيب جديد</span>
                  </button>
                  <button 
                    className="quick-action-btn view-doctors"
                    onClick={() => handleTabChange('doctors')}
                  >
                    <span className="action-icon">👨‍⚕️</span>
                    <span className="action-text">عرض الأطباء</span>
                  </button>
                  <button 
                    className="quick-action-btn view-patients"
                    onClick={() => handleTabChange('patients')}
                  >
                    <span className="action-icon">👥</span>
                    <span className="action-text">عرض المرضى</span>
                  </button>
                  <button 
                    className="quick-action-btn view-logs"
                    onClick={() => handleTabChange('audit')}
                  >
                    <span className="action-icon">📜</span>
                    <span className="action-text">سجل النظام</span>
                  </button>
                </div>
              </div>

              {/* System Info */}
              <div className="system-info-section">
                <div className="section-header">
                  <h3>ℹ️ معلومات النظام</h3>
                </div>
                <div className="system-info-grid">
                  <div className="system-info-card">
                    <span className="info-icon">🏥</span>
                    <div className="info-content">
                      <span className="info-label">التخصصات المتاحة</span>
                      <span className="info-value">{MEDICAL_SPECIALIZATIONS.length}</span>
                    </div>
                  </div>
                  <div className="system-info-card">
                    <span className="info-icon">🗺️</span>
                    <div className="info-content">
                      <span className="info-label">المحافظات</span>
                      <span className="info-value">{SYRIAN_GOVERNORATES.length}</span>
                    </div>
                  </div>
                  <div className="system-info-card">
                    <span className="info-icon">📅</span>
                    <div className="info-content">
                      <span className="info-label">التاريخ</span>
                      <span className="info-value">{new Date().toLocaleDateString('ar-EG')}</span>
                    </div>
                  </div>
                  <div className="system-info-card">
                    <span className="info-icon">🔄</span>
                    <div className="info-content">
                      <span className="info-label">حالة النظام</span>
                      <span className="info-value status-online">متصل</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================
              DOCTORS TAB
              ============================================ */}
          {activeTab === 'doctors' && (
            <div className="tab-content doctors-content">
              {/* Doctors Header */}
              <div className="content-header">
                <div className="header-title">
                  <h2>👨‍⚕️ إدارة الأطباء</h2>
                  <p>إضافة وإدارة حسابات الأطباء في المنصة</p>
                </div>
                <div className="header-actions">
                  <button 
                    className="btn-export"
                    onClick={exportDoctorsToCSV}
                    disabled={doctors.length === 0}
                  >
                    <span>📥</span>
                    <span>تصدير</span>
                  </button>
                  <button 
                    className="btn-primary"
                    onClick={() => setShowAddDoctorForm(true)}
                  >
                    <span>➕</span>
                    <span>إضافة طبيب</span>
                  </button>
                </div>
              </div>

              {/* Add Doctor Form */}
              {showAddDoctorForm && (
                <div className="add-doctor-form-container">
                  <div className="form-header">
                    <h3>➕ إضافة طبيب جديد</h3>
                    <button 
                      className="close-form-btn"
                      onClick={() => setShowAddDoctorForm(false)}
                    >
                      ✕
                    </button>
                  </div>

                  <div className="form-body">
                    {/* Personal Information */}
                    <div className="form-section">
                      <h4>👤 المعلومات الشخصية</h4>
                      <div className="form-grid">
                        <div className="form-group">
                          <label>الاسم الأول <span className="required">*</span></label>
                          <input
                            type="text"
                            value={newDoctor.firstName}
                            onChange={(e) => setNewDoctor({...newDoctor, firstName: e.target.value})}
                            placeholder="أدخل الاسم الأول"
                          />
                        </div>
                        <div className="form-group">
                          <label>الكنية <span className="required">*</span></label>
                          <input
                            type="text"
                            value={newDoctor.lastName}
                            onChange={(e) => setNewDoctor({...newDoctor, lastName: e.target.value})}
                            placeholder="أدخل الكنية"
                          />
                        </div>
                        <div className="form-group">
                          <label>الرقم الوطني <span className="required">*</span></label>
                          <input
                            type="text"
                            value={newDoctor.nationalId}
                            onChange={(e) => setNewDoctor({...newDoctor, nationalId: e.target.value.replace(/\D/g, '').slice(0, 11)})}
                            placeholder="11 رقم"
                            maxLength={11}
                            dir="ltr"
                          />
                        </div>
                        <div className="form-group">
                          <label>الجنس <span className="required">*</span></label>
                          <select
                            value={newDoctor.gender}
                            onChange={(e) => setNewDoctor({...newDoctor, gender: e.target.value})}
                          >
                            <option value="male">ذكر</option>
                            <option value="female">أنثى</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label>تاريخ الميلاد</label>
                          <input
                            type="date"
                            value={newDoctor.dateOfBirth}
                            onChange={(e) => setNewDoctor({...newDoctor, dateOfBirth: e.target.value})}
                          />
                        </div>
                        <div className="form-group">
                          <label>رقم الهاتف <span className="required">*</span></label>
                          <input
                            type="tel"
                            value={newDoctor.phoneNumber}
                            onChange={(e) => setNewDoctor({...newDoctor, phoneNumber: e.target.value})}
                            placeholder="09XXXXXXXX"
                            dir="ltr"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Professional Information */}
                    <div className="form-section">
                      <h4>🩺 المعلومات المهنية</h4>
                      <div className="form-grid">
                        <div className="form-group">
                          <label>رقم الترخيص الطبي <span className="required">*</span></label>
                          <input
                            type="text"
                            value={newDoctor.licenseNumber}
                            onChange={(e) => setNewDoctor({...newDoctor, licenseNumber: e.target.value})}
                            placeholder="رقم الترخيص من وزارة الصحة"
                            dir="ltr"
                          />
                        </div>
                        <div className="form-group">
                          <label>التخصص <span className="required">*</span></label>
                          <select
                            value={newDoctor.specialization}
                            onChange={(e) => setNewDoctor({...newDoctor, specialization: e.target.value})}
                          >
                            <option value="">اختر التخصص</option>
                            {MEDICAL_SPECIALIZATIONS.map(spec => (
                              <option key={spec.id} value={spec.id}>
                                {spec.icon} {spec.nameAr} - {spec.nameEn}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="form-group">
                          <label>التخصص الفرعي</label>
                          <input
                            type="text"
                            value={newDoctor.subSpecialization}
                            onChange={(e) => setNewDoctor({...newDoctor, subSpecialization: e.target.value})}
                            placeholder="التخصص الفرعي (اختياري)"
                          />
                        </div>
                        <div className="form-group">
                          <label>المؤهل العلمي</label>
                          <select
                            value={newDoctor.education}
                            onChange={(e) => setNewDoctor({...newDoctor, education: e.target.value})}
                          >
                            <option value="">اختر المؤهل</option>
                            {EDUCATION_LEVELS.map(level => (
                              <option key={level.id} value={level.id}>
                                {level.nameAr} - {level.nameEn}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="form-group">
                          <label>سنوات الخبرة</label>
                          <input
                            type="number"
                            value={newDoctor.yearsOfExperience}
                            onChange={(e) => setNewDoctor({...newDoctor, yearsOfExperience: e.target.value})}
                            placeholder="عدد سنوات الخبرة"
                            min="0"
                          />
                        </div>
                        <div className="form-group">
                          <label>المؤسسة الصحية</label>
                          <input
                            type="text"
                            value={newDoctor.institution}
                            onChange={(e) => setNewDoctor({...newDoctor, institution: e.target.value})}
                            placeholder="اسم المستشفى أو المركز الصحي"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Work Location */}
                    <div className="form-section">
                      <h4>📍 موقع العمل</h4>
                      <div className="form-grid">
                        <div className="form-group">
                          <label>المحافظة <span className="required">*</span></label>
                          <select
                            value={newDoctor.governorate}
                            onChange={(e) => setNewDoctor({...newDoctor, governorate: e.target.value})}
                          >
                            <option value="">اختر المحافظة</option>
                            {SYRIAN_GOVERNORATES.map(gov => (
                              <option key={gov.id} value={gov.id}>
                                {gov.nameAr} - {gov.nameEn}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="form-group">
                          <label>المدينة</label>
                          <input
                            type="text"
                            value={newDoctor.city}
                            onChange={(e) => setNewDoctor({...newDoctor, city: e.target.value})}
                            placeholder="اسم المدينة"
                          />
                        </div>
                        <div className="form-group full-width">
                          <label>عنوان العيادة <span className="required">*</span></label>
                          <textarea
                            value={newDoctor.clinicAddress}
                            onChange={(e) => setNewDoctor({...newDoctor, clinicAddress: e.target.value})}
                            placeholder="العنوان التفصيلي للعيادة"
                            rows={2}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Generated Email Preview */}
                    {newDoctor.firstName && newDoctor.lastName && newDoctor.licenseNumber && (
                      <div className="email-preview">
                        <span className="preview-label">📧 البريد الإلكتروني المُولّد:</span>
                        <code>{generateDoctorEmail(newDoctor.firstName, newDoctor.lastName, newDoctor.licenseNumber)}</code>
                      </div>
                    )}
                  </div>

                  <div className="form-footer">
                    <button 
                      className="btn-secondary"
                      onClick={() => setShowAddDoctorForm(false)}
                    >
                      إلغاء
                    </button>
                    <button 
                      className="btn-primary"
                      onClick={handleAddDoctor}
                      disabled={addDoctorLoading}
                    >
                      {addDoctorLoading ? (
                        <>
                          <span className="spinner-small"></span>
                          <span>جاري الإضافة...</span>
                        </>
                      ) : (
                        <>
                          <span>✅</span>
                          <span>إضافة الطبيب</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Search and Filter */}
              <div className="search-filter-bar">
                <div className="search-box">
                  <span className="search-icon">🔍</span>
                  <input
                    type="text"
                    placeholder="بحث بالاسم، الرقم الوطني، أو رقم الترخيص..."
                    value={doctorSearchTerm}
                    onChange={(e) => setDoctorSearchTerm(e.target.value)}
                  />
                </div>
                <div className="filter-buttons">
                  <button 
                    className={`filter-btn ${doctorFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setDoctorFilter('all')}
                  >
                    الكل ({doctors.length})
                  </button>
                  <button 
                    className={`filter-btn ${doctorFilter === 'active' ? 'active' : ''}`}
                    onClick={() => setDoctorFilter('active')}
                  >
                    نشط ({doctors.filter(d => d.isActive !== false).length})
                  </button>
                  <button 
                    className={`filter-btn ${doctorFilter === 'inactive' ? 'active' : ''}`}
                    onClick={() => setDoctorFilter('inactive')}
                  >
                    غير نشط ({doctors.filter(d => d.isActive === false).length})
                  </button>
                </div>
              </div>

              {/* Doctors List */}
              {doctorsLoading ? (
                <div className="loading-state">
                  <div className="spinner"></div>
                  <p>جاري تحميل الأطباء...</p>
                </div>
              ) : filteredDoctors.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">👨‍⚕️</div>
                  <h3>لا يوجد أطباء</h3>
                  <p>لم يتم العثور على أطباء مطابقين للبحث</p>
                </div>
              ) : (
                <div className="doctors-table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>الطبيب</th>
                        <th>الرقم الوطني</th>
                        <th>رقم الترخيص</th>
                        <th>التخصص</th>
                        <th>المحافظة</th>
                        <th>الحالة</th>
                        <th>الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDoctors.map((doctor, index) => {
                        const spec = MEDICAL_SPECIALIZATIONS.find(
                          s => s.id === (doctor.roleData?.doctor?.specialization || doctor.specialization)
                        );
                        const gov = SYRIAN_GOVERNORATES.find(
                          g => g.id === doctor.governorate
                        );
                        
                        return (
                          <tr key={doctor._id || index} className={doctor.isActive === false ? 'inactive-row' : ''}>
                            <td>
                              <div className="user-cell">
                                <div className="user-avatar doctor">
                                  {doctor.gender === 'female' ? '👩‍⚕️' : '👨‍⚕️'}
                                </div>
                                <div className="user-info">
                                  <span className="user-name">د. {doctor.firstName} {doctor.lastName}</span>
                                  <span className="user-email">{doctor.email}</span>
                                </div>
                              </div>
                            </td>
                            <td><code>{doctor.nationalId}</code></td>
                            <td><code>{doctor.licenseNumber || doctor.roleData?.doctor?.licenseNumber || '-'}</code></td>
                            <td>
                              {spec ? (
                                <span className="specialty-badge">
                                  {spec.icon} {spec.nameAr}
                                </span>
                              ) : '-'}
                            </td>
                            <td>{gov?.nameAr || '-'}</td>
                            <td>
                              <span className={`status-badge ${doctor.isActive !== false ? 'active' : 'inactive'}`}>
                                {doctor.isActive !== false ? '✅ نشط' : '⏸️ غير نشط'}
                              </span>
                            </td>
                            <td>
                              <div className="action-buttons">
                                <button 
                                  className="action-btn view"
                                  onClick={() => {
                                    setSelectedDoctor(doctor);
                                    setShowDoctorDetails(true);
                                  }}
                                  title="عرض التفاصيل"
                                >
                                  👁️
                                </button>
                                {doctor.isActive !== false ? (
                                  <button 
                                    className="action-btn deactivate"
                                    onClick={() => handleDeactivateDoctor(doctor)}
                                    title="إلغاء التفعيل"
                                  >
                                    ⏸️
                                  </button>
                                ) : (
                                  <button 
                                    className="action-btn reactivate"
                                    onClick={() => handleReactivate(doctor, 'doctor')}
                                    title="إعادة التفعيل"
                                  >
                                    ▶️
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

              {/* Doctor Details Modal */}
              {showDoctorDetails && selectedDoctor && (
                <div className="modal-overlay" onClick={() => setShowDoctorDetails(false)}>
                  <div className="details-modal" onClick={e => e.stopPropagation()}>
                    <div className="details-modal-header">
                      <div className="details-avatar">
                        {selectedDoctor.gender === 'female' ? '👩‍⚕️' : '👨‍⚕️'}
                      </div>
                      <div className="details-title">
                        <h2>د. {selectedDoctor.firstName} {selectedDoctor.lastName}</h2>
                        <p>{MEDICAL_SPECIALIZATIONS.find(s => s.id === (selectedDoctor.roleData?.doctor?.specialization || selectedDoctor.specialization))?.nameAr || 'طبيب'}</p>
                      </div>
                      <button className="close-modal-btn" onClick={() => setShowDoctorDetails(false)}>✕</button>
                    </div>
                    
                    <div className="details-modal-body">
                      <div className="details-section">
                        <h4>👤 المعلومات الشخصية</h4>
                        <div className="details-grid">
                          <div className="detail-item">
                            <span className="detail-label">الرقم الوطني</span>
                            <span className="detail-value">{selectedDoctor.nationalId}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">البريد الإلكتروني</span>
                            <span className="detail-value">{selectedDoctor.email}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">الهاتف</span>
                            <span className="detail-value">{selectedDoctor.phoneNumber || '-'}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">الجنس</span>
                            <span className="detail-value">{selectedDoctor.gender === 'male' ? 'ذكر' : 'أنثى'}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="details-section">
                        <h4>🩺 المعلومات المهنية</h4>
                        <div className="details-grid">
                          <div className="detail-item">
                            <span className="detail-label">رقم الترخيص</span>
                            <span className="detail-value">{selectedDoctor.licenseNumber || selectedDoctor.roleData?.doctor?.licenseNumber || '-'}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">التخصص</span>
                            <span className="detail-value">
                              {MEDICAL_SPECIALIZATIONS.find(s => s.id === (selectedDoctor.roleData?.doctor?.specialization || selectedDoctor.specialization))?.nameAr || '-'}
                            </span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">المؤسسة</span>
                            <span className="detail-value">{selectedDoctor.institution || selectedDoctor.roleData?.doctor?.institution || '-'}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="details-section">
                        <h4>📍 موقع العمل</h4>
                        <div className="details-grid">
                          <div className="detail-item">
                            <span className="detail-label">المحافظة</span>
                            <span className="detail-value">{SYRIAN_GOVERNORATES.find(g => g.id === selectedDoctor.governorate)?.nameAr || '-'}</span>
                          </div>
                          <div className="detail-item full-width">
                            <span className="detail-label">عنوان العيادة</span>
                            <span className="detail-value">{selectedDoctor.clinicAddress || '-'}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="details-section">
                        <h4>📊 حالة الحساب</h4>
                        <div className="account-status-display">
                          <span className={`big-status-badge ${selectedDoctor.isActive !== false ? 'active' : 'inactive'}`}>
                            {selectedDoctor.isActive !== false ? '✅ الحساب نشط' : '⏸️ الحساب غير نشط'}
                          </span>
                          {selectedDoctor.isActive === false && selectedDoctor.deactivationReason && (
                            <div className="deactivation-info">
                              <span>سبب إلغاء التفعيل: {DEACTIVATION_REASONS.find(r => r.id === selectedDoctor.deactivationReason)?.nameAr}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="details-modal-footer">
                      <button className="btn-secondary" onClick={() => setShowDoctorDetails(false)}>
                        إغلاق
                      </button>
                      {selectedDoctor.isActive !== false ? (
                        <button 
                          className="btn-danger"
                          onClick={() => {
                            setShowDoctorDetails(false);
                            handleDeactivateDoctor(selectedDoctor);
                          }}
                        >
                          ⏸️ إلغاء التفعيل
                        </button>
                      ) : (
                        <button 
                          className="btn-success"
                          onClick={() => {
                            setShowDoctorDetails(false);
                            handleReactivate(selectedDoctor, 'doctor');
                          }}
                        >
                          ▶️ إعادة التفعيل
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============================================
              PATIENTS TAB
              ============================================ */}
          {activeTab === 'patients' && (
            <div className="tab-content patients-content">
              {/* Patients Header */}
              <div className="content-header">
                <div className="header-title">
                  <h2>👥 إدارة المرضى</h2>
                  <p>عرض وإدارة حسابات المرضى في المنصة</p>
                </div>
                <div className="header-actions">
                  <button 
                    className="btn-export"
                    onClick={exportPatientsToCSV}
                    disabled={patients.length === 0}
                  >
                    <span>📥</span>
                    <span>تصدير</span>
                  </button>
                </div>
              </div>

              {/* Info Banner */}
              <div className="info-banner">
                <span className="banner-icon">ℹ️</span>
                <div className="banner-content">
                  <strong>ملاحظة:</strong> يمكنك عرض المعلومات الأساسية للمرضى وإدارة حالة حساباتهم. 
                  البيانات الطبية (الزيارات، التشخيصات، الأدوية) متاحة فقط للأطباء المعالجين.
                </div>
              </div>

              {/* Search and Filter */}
              <div className="search-filter-bar">
                <div className="search-box">
                  <span className="search-icon">🔍</span>
                  <input
                    type="text"
                    placeholder="بحث بالاسم أو الرقم الوطني..."
                    value={patientSearchTerm}
                    onChange={(e) => setPatientSearchTerm(e.target.value)}
                  />
                </div>
                <div className="filter-buttons">
                  <button 
                    className={`filter-btn ${patientFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setPatientFilter('all')}
                  >
                    الكل ({patients.length})
                  </button>
                  <button 
                    className={`filter-btn ${patientFilter === 'active' ? 'active' : ''}`}
                    onClick={() => setPatientFilter('active')}
                  >
                    نشط ({patients.filter(p => p.isActive !== false).length})
                  </button>
                  <button 
                    className={`filter-btn ${patientFilter === 'inactive' ? 'active' : ''}`}
                    onClick={() => setPatientFilter('inactive')}
                  >
                    غير نشط ({patients.filter(p => p.isActive === false).length})
                  </button>
                </div>
              </div>

              {/* Patients List */}
              {patientsLoading ? (
                <div className="loading-state">
                  <div className="spinner"></div>
                  <p>جاري تحميل المرضى...</p>
                </div>
              ) : filteredPatients.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">👥</div>
                  <h3>لا يوجد مرضى</h3>
                  <p>لم يتم العثور على مرضى مطابقين للبحث</p>
                </div>
              ) : (
                <div className="patients-table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>المريض</th>
                        <th>الرقم الوطني</th>
                        <th>الجنس</th>
                        <th>تاريخ الميلاد</th>
                        <th>الهاتف</th>
                        <th>الحالة</th>
                        <th>الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPatients.map((patient, index) => (
                        <tr key={patient._id || index} className={patient.isActive === false ? 'inactive-row' : ''}>
                          <td>
                            <div className="user-cell">
                              <div className="user-avatar patient">
                                {patient.gender === 'female' ? '👩' : '👨'}
                              </div>
                              <div className="user-info">
                                <span className="user-name">{patient.firstName} {patient.lastName}</span>
                                <span className="user-email">{patient.email}</span>
                              </div>
                            </div>
                          </td>
                          <td><code>{patient.nationalId}</code></td>
                          <td>{patient.gender === 'male' ? 'ذكر' : 'أنثى'}</td>
                          <td>{formatDate(patient.dateOfBirth)}</td>
                          <td>{patient.phoneNumber || '-'}</td>
                          <td>
                            <span className={`status-badge ${patient.isActive !== false ? 'active' : 'inactive'}`}>
                              {patient.isActive !== false ? '✅ نشط' : '⏸️ غير نشط'}
                            </span>
                          </td>
                          <td>
                            <div className="action-buttons">
                              <button 
                                className="action-btn view"
                                onClick={() => {
                                  setSelectedPatient(patient);
                                  setShowPatientDetails(true);
                                }}
                                title="عرض التفاصيل"
                              >
                                👁️
                              </button>
                              {patient.isActive !== false ? (
                                <button 
                                  className="action-btn deactivate"
                                  onClick={() => handleDeactivatePatient(patient)}
                                  title="إلغاء التفعيل"
                                >
                                  ⏸️
                                </button>
                              ) : (
                                <button 
                                  className="action-btn reactivate"
                                  onClick={() => handleReactivate(patient, 'patient')}
                                  title="إعادة التفعيل"
                                >
                                  ▶️
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

              {/* Patient Details Modal */}
              {showPatientDetails && selectedPatient && (
                <div className="modal-overlay" onClick={() => setShowPatientDetails(false)}>
                  <div className="details-modal" onClick={e => e.stopPropagation()}>
                    <div className="details-modal-header patient">
                      <div className="details-avatar">
                        {selectedPatient.gender === 'female' ? '👩' : '👨'}
                      </div>
                      <div className="details-title">
                        <h2>{selectedPatient.firstName} {selectedPatient.lastName}</h2>
                        <p>مريض</p>
                      </div>
                      <button className="close-modal-btn" onClick={() => setShowPatientDetails(false)}>✕</button>
                    </div>
                    
                    <div className="details-modal-body">
                      <div className="details-section">
                        <h4>👤 المعلومات الأساسية</h4>
                        <div className="details-grid">
                          <div className="detail-item">
                            <span className="detail-label">الرقم الوطني</span>
                            <span className="detail-value">{selectedPatient.nationalId}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">البريد الإلكتروني</span>
                            <span className="detail-value">{selectedPatient.email}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">الهاتف</span>
                            <span className="detail-value">{selectedPatient.phoneNumber || '-'}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">الجنس</span>
                            <span className="detail-value">{selectedPatient.gender === 'male' ? 'ذكر' : 'أنثى'}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">تاريخ الميلاد</span>
                            <span className="detail-value">{formatDate(selectedPatient.dateOfBirth)}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">العنوان</span>
                            <span className="detail-value">{selectedPatient.address || '-'}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="details-section">
                        <h4>📊 حالة الحساب</h4>
                        <div className="account-status-display">
                          <span className={`big-status-badge ${selectedPatient.isActive !== false ? 'active' : 'inactive'}`}>
                            {selectedPatient.isActive !== false ? '✅ الحساب نشط' : '⏸️ الحساب غير نشط'}
                          </span>
                          {selectedPatient.isActive === false && selectedPatient.deactivationReason && (
                            <div className="deactivation-info">
                              <span>سبب إلغاء التفعيل: {DEACTIVATION_REASONS.find(r => r.id === selectedPatient.deactivationReason)?.nameAr}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="medical-notice">
                        <span className="notice-icon">🔒</span>
                        <p>البيانات الطبية للمريض (الزيارات، التشخيصات، الأدوية) محمية ومتاحة فقط للأطباء المعالجين.</p>
                      </div>
                    </div>
                    
                    <div className="details-modal-footer">
                      <button className="btn-secondary" onClick={() => setShowPatientDetails(false)}>
                        إغلاق
                      </button>
                      {selectedPatient.isActive !== false ? (
                        <button 
                          className="btn-danger"
                          onClick={() => {
                            setShowPatientDetails(false);
                            handleDeactivatePatient(selectedPatient);
                          }}
                        >
                          ⏸️ إلغاء التفعيل
                        </button>
                      ) : (
                        <button 
                          className="btn-success"
                          onClick={() => {
                            setShowPatientDetails(false);
                            handleReactivate(selectedPatient, 'patient');
                          }}
                        >
                          ▶️ إعادة التفعيل
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============================================
              AUDIT LOG TAB
              ============================================ */}
          {activeTab === 'audit' && (
            <div className="tab-content audit-content">
              {/* Audit Header */}
              <div className="content-header">
                <div className="header-title">
                  <h2>📜 سجل النظام</h2>
                  <p>تتبع جميع الإجراءات الإدارية في المنصة</p>
                </div>
                <div className="header-actions">
                  <button 
                    className="btn-secondary"
                    onClick={loadAuditLogs}
                  >
                    <span>🔄</span>
                    <span>تحديث</span>
                  </button>
                </div>
              </div>

              {/* Audit Logs List */}
              {auditLoading ? (
                <div className="loading-state">
                  <div className="spinner"></div>
                  <p>جاري تحميل السجلات...</p>
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📜</div>
                  <h3>لا توجد سجلات</h3>
                  <p>لم يتم تسجيل أي إجراءات بعد</p>
                </div>
              ) : (
                <div className="audit-logs-container">
                  {auditLogs.map((log, index) => (
                    <div key={index} className="audit-log-item">
                      <div className="log-icon">
                        {log.action?.includes('ADD') ? '➕' : 
                         log.action?.includes('DEACTIVATE') ? '⏸️' : 
                         log.action?.includes('REACTIVATE') ? '▶️' : 
                         log.action?.includes('EXPORT') ? '📥' : '📋'}
                      </div>
                      <div className="log-content">
                        <p className="log-description">{log.description}</p>
                        <div className="log-meta">
                          <span className="log-admin">👤 {log.adminName}</span>
                          <span className="log-time">🕐 {formatDateTime(log.timestamp)}</span>
                        </div>
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
