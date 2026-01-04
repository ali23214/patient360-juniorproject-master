// src/pages/DoctorDashboard.jsx
// ✅ REDESIGNED v3.0 - Matching PatientDashboard Design System
// Patient 360° - Government Healthcare Platform
// Features:
// - Professional profile header card with logout button
// - Photo upload in visit logs
// - Redesigned ECG AI output with professional cards
// - Tab-based navigation with patient history
// - Purple accent color (#a23f97) theme
// - Full responsive design

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import { logout as logoutService } from '../services/authService';
import '../styles/DoctorDashboard.css';

/**
 * ============================================
 * ECG CONDITION DESCRIPTIONS
 * ============================================
 * Maps ECG conditions to Arabic descriptions and severity levels
 */
const ECG_CONDITIONS = {
  'Normal': {
    nameAr: 'تخطيط طبيعي',
    description: 'تخطيط القلب الكهربائي ضمن الحدود الطبيعية. لا توجد علامات على اضطرابات في النظم أو نقص التروية.',
    severity: 'normal',
    icon: '✅',
    recommendations: [
      'متابعة نمط الحياة الصحي',
      'ممارسة الرياضة بانتظام',
      'فحص دوري كل سنة'
    ]
  },
  'Myocardial Infarction': {
    nameAr: 'احتشاء عضلة القلب',
    description: 'علامات تدل على نوبة قلبية حادة أو سابقة. يتطلب تدخلاً طبياً فورياً.',
    severity: 'critical',
    icon: '🚨',
    recommendations: [
      'تدخل طبي طارئ فوري',
      'قسطرة قلبية تشخيصية',
      'مراقبة في العناية المركزة القلبية'
    ]
  },
  'ST/T change': {
    nameAr: 'تغيرات ST/T',
    description: 'تغيرات في مقطع ST أو موجة T قد تشير إلى نقص تروية أو اضطرابات في القلب.',
    severity: 'warning',
    icon: '⚠️',
    recommendations: [
      'فحوصات إضافية مطلوبة',
      'اختبار الجهد',
      'متابعة دورية'
    ]
  },
  'Conduction Disturbance': {
    nameAr: 'اضطراب التوصيل',
    description: 'اضطراب في نظام التوصيل الكهربائي للقلب مثل إحصار الحزمة أو إحصار أذيني بطيني.',
    severity: 'warning',
    icon: '🔌',
    recommendations: [
      'تقييم شامل للقلب',
      'هولتر مراقبة 24 ساعة',
      'استشارة كهربية القلب'
    ]
  },
  'Hypertrophy': {
    nameAr: 'تضخم القلب',
    description: 'علامات تدل على تضخم في عضلة القلب، قد يكون نتيجة ارتفاع ضغط الدم أو أمراض صمامية.',
    severity: 'warning',
    icon: '💪',
    recommendations: [
      'إيكو القلب',
      'مراقبة ضغط الدم',
      'تقييم أسباب التضخم'
    ]
  }
};

/**
 * ============================================
 * ECG RESULT CARD COMPONENT
 * ============================================
 * Beautiful card design for ECG analysis results
 */
const ECGResultCard = ({ result }) => {
  const condition = ECG_CONDITIONS[result.prediction] || {
    nameAr: result.prediction,
    description: 'تم تحليل تخطيط القلب بواسطة الذكاء الاصطناعي.',
    severity: 'info',
    icon: '🔬',
    recommendations: ['مراجعة الطبيب للتقييم النهائي']
  };

  const getSeverityClass = (severity) => {
    switch (severity) {
      case 'critical': return 'severity-critical';
      case 'warning': return 'severity-warning';
      case 'normal': return 'severity-normal';
      default: return 'severity-info';
    }
  };

  return (
    <div className="ecg-result-modern">
      {/* Header with Main Diagnosis */}
      <div className={`ecg-result-header ${getSeverityClass(condition.severity)}`}>
        <div className="result-header-icon">
          <span>{condition.icon}</span>
        </div>
        <div className="result-header-content">
          <div className="result-header-label">التشخيص الرئيسي</div>
          <h2 className="result-diagnosis-title">{condition.nameAr}</h2>
          <p className="result-diagnosis-en">{result.prediction}</p>
        </div>
        <div className="result-confidence-badge">
          <div className="confidence-circle">
            <svg viewBox="0 0 36 36">
              <path
                className="confidence-bg"
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="confidence-progress"
                strokeDasharray={`${parseFloat(result.confidence_percentage) || 0}, 100`}
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="confidence-text">{result.confidence_percentage}</span>
          </div>
          <span className="confidence-label">نسبة الثقة</span>
        </div>
      </div>

      {/* Description Card */}
      <div className="ecg-description-card">
        <div className="description-icon">📋</div>
        <div className="description-content">
          <h4>شرح التشخيص</h4>
          <p>{condition.description}</p>
        </div>
      </div>

      {/* Top Predictions Grid */}
      <div className="ecg-predictions-section">
        <div className="predictions-header">
          <span className="predictions-icon">📊</span>
          <h3>أعلى الاحتمالات</h3>
        </div>
        <div className="predictions-grid">
          {result.top_predictions && result.top_predictions.map((pred, index) => (
            <div key={index} className={`prediction-card ${index === 0 ? 'primary' : ''}`}>
              <div className="prediction-rank">
                <span>{index + 1}</span>
              </div>
              <div className="prediction-content">
                <h4>{pred.label}</h4>
                <div className="prediction-bar-container">
                  <div 
                    className="prediction-bar" 
                    style={{ width: pred.percentage }}
                  ></div>
                </div>
                <span className="prediction-percentage">{pred.percentage}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations Section */}
      <div className="ecg-recommendations-section">
        <div className="recommendations-header">
          <span className="recommendations-icon">💡</span>
          <h3>التوصيات الطبية</h3>
        </div>
        <div className="recommendations-list">
          {condition.recommendations.map((rec, index) => (
            <div key={index} className="recommendation-item">
              <span className="rec-number">{index + 1}</span>
              <span className="rec-text">{rec}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Warning Banner if Critical */}
      {result.warning && (
        <div className="ecg-warning-banner">
          <span className="warning-icon">⚠️</span>
          <div className="warning-content">
            <h4>تحذير مهم</h4>
            <p>{result.warning}</p>
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="ecg-disclaimer">
        <span className="disclaimer-icon">ℹ️</span>
        <p>
          <strong>ملاحظة:</strong> هذه النتائج استرشادية من الذكاء الاصطناعي ولا تغني عن التقييم السريري الشامل والخبرة الطبية المباشرة.
        </p>
      </div>
    </div>
  );
};

/**
 * ============================================
 * PHOTO PREVIEW COMPONENT
 * ============================================
 * Displays uploaded photo with remove option
 */
const PhotoPreview = ({ photo, onRemove }) => {
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    if (photo && photo instanceof File) {
      const url = URL.createObjectURL(photo);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else if (typeof photo === 'string') {
      setPreviewUrl(photo);
    }
  }, [photo]);

  if (!previewUrl) return null;

  return (
    <div className="photo-preview-container">
      <div className="photo-preview-wrapper">
        <img src={previewUrl} alt="Visit attachment" className="photo-preview-image" />
        <button className="photo-remove-btn" onClick={onRemove} type="button">
          <span>✕</span>
        </button>
      </div>
      <span className="photo-preview-label">📷 صورة مرفقة</span>
    </div>
  );
};

/**
 * ============================================
 * DOCTOR DASHBOARD MAIN COMPONENT
 * ============================================
 */
const DoctorDashboard = () => {
  const navigate = useNavigate();
  const resultRef = useRef(null);
  const ecgFileInputRef = useRef(null);
  
  // ═══════════════════════════════════════════════════════════════
  // STATE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════
  
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('search');
  
  // Patient States
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientHistory, setPatientHistory] = useState([]);
  const [searchId, setSearchId] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);
  
  // Parent-Child Selection States
  const [familyMembers, setFamilyMembers] = useState([]);
  const [showFamilySelection, setShowFamilySelection] = useState(false);
  
  // Modal State
  const [modal, setModal] = useState({ isOpen: false, type: '', title: '', message: '', onConfirm: null });
  
  // Saving States
  const [saving, setSaving] = useState(false);
  
  // ECG States (Cardiologists Only)
  const [ecgFile, setEcgFile] = useState(null);
  const [ecgPreview, setEcgPreview] = useState(null);
  const [aiDiagnosis, setAiDiagnosis] = useState(null);
  const [ecgAnalyzing, setEcgAnalyzing] = useState(false);
  
  // Visit Photo State
  const [visitPhoto, setVisitPhoto] = useState(null);
  const [visitPhotoPreview, setVisitPhotoPreview] = useState(null);
  const photoInputRef = useRef(null);
  
  // Vital Signs State
  const [vitalSigns, setVitalSigns] = useState({
    bloodPressureSystolic: '',
    bloodPressureDiastolic: '',
    heartRate: '',
    spo2: '',
    bloodGlucose: '',
    temperature: '',
    weight: '',
    height: '',
    respiratoryRate: ''
  });
  
  // Diagnosis States
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [doctorNotes, setDoctorNotes] = useState('');
  
  // Medications State
  const [medications, setMedications] = useState([]);
  const [newMedication, setNewMedication] = useState({
    medicationName: '',
    dosage: '',
    frequency: '',
    duration: '',
    instructions: ''
  });

  // ═══════════════════════════════════════════════════════════════
  // HELPER FUNCTIONS
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Check if the logged-in doctor is a cardiologist
   */
  const isCardiologist = useCallback(() => {
    if (!user || !user.roleData || !user.roleData.doctor || !user.roleData.doctor.specialization) {
      return false;
    }
    
    const cardioSpecializations = [
      'cardiology', 'cardiologist', 'طب القلب', 'طبيب قلب',
      'أمراض القلب', 'جراحة القلب', 'cardiac surgery',
      'interventional cardiology', 'electrophysiology'
    ];
    
    return cardioSpecializations.some(spec => 
      user.roleData.doctor.specialization.toLowerCase().includes(spec.toLowerCase())
    );
  }, [user]);

  /**
   * Calculate age from date of birth
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
   * Format date to Arabic locale
   */
  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  /**
   * Format date with time
   */
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

  // Modal Functions
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

  // ═══════════════════════════════════════════════════════════════
  // INITIAL DATA LOADING
  // ═══════════════════════════════════════════════════════════════

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const userData = localStorage.getItem('user');
      
      if (!userData) {
        openModal('error', 'غير مصرح', 'يجب تسجيل الدخول أولاً', () => navigate('/'));
        return;
      }
      
      const parsedUser = JSON.parse(userData);
      
      if (!parsedUser.roles || !parsedUser.roles.includes('doctor')) {
        openModal('error', 'غير مصرح', 'هذه الصفحة متاحة للأطباء فقط', () => navigate('/'));
        return;
      }
      
      setUser(parsedUser);
      setLoading(false);
    };
    
    loadData();
  }, [navigate]);

  // ═══════════════════════════════════════════════════════════════
  // AUTHENTICATION
  // ═══════════════════════════════════════════════════════════════

  const handleLogout = () => {
    openModal('confirm', 'تأكيد تسجيل الخروج', 'هل أنت متأكد من رغبتك في تسجيل الخروج؟', async () => {
      await logoutService();
      navigate('/');
    });
  };

  // ═══════════════════════════════════════════════════════════════
  // PATIENT SEARCH WITH PARENT-CHILD SYSTEM
  // ═══════════════════════════════════════════════════════════════

  const handleSearchPatient = async () => {
    if (!searchId.trim()) {
      setSearchError('الرجاء إدخال الرقم الوطني للمريض');
      return;
    }
    
    setSearchLoading(true);
    setSearchError(null);
    setFamilyMembers([]);
    setShowFamilySelection(false);
    
    try {
      const token = localStorage.getItem('token');
      
      console.log('🔍 Searching for patient:', searchId);
      
      const response = await fetch(`http://localhost:5000/api/doctor/search/${searchId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      
      console.log('📥 Search response:', data);
      
      if (!response.ok || !data.success) {
        setSearchError(data.message || 'لم يتم العثور على المريض');
        setSearchLoading(false);
        return;
      }
      
      await selectPatient(data.patient);
      
    } catch (error) {
      console.error('❌ Search error:', error);
      setSearchError('حدث خطأ في البحث عن المريض');
    } finally {
      setSearchLoading(false);
    }
  };

  /**
   * Select a patient and load their complete medical history
   */
  const selectPatient = async (patient) => {
    setSelectedPatient(patient);
    setShowFamilySelection(false);
    
    resetFormFields();
    
    try {
      const token = localStorage.getItem('token');
      const nationalId = patient.nationalId || patient.childId;
      
      console.log('📋 Loading patient history for:', nationalId);
      
      const historyResponse = await fetch(`http://localhost:5000/api/doctor/patient/${nationalId}/visits`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (historyResponse.ok) {
        const historyData = await historyResponse.json();
        console.log('📥 History response:', historyData);
        
        if (historyData.success) {
          setPatientHistory(historyData.visits || []);
        }
      }
    } catch (error) {
      console.error('❌ Error loading patient history:', error);
    }
    
    setActiveSection('overview');
  };

  /**
   * Handle family member selection
   */
  const handleFamilyMemberSelect = (member) => {
    selectPatient(member);
  };

  /**
   * Reset form fields
   */
  const resetFormFields = () => {
    setChiefComplaint('');
    setDiagnosis('');
    setDoctorNotes('');
    setVitalSigns({
      bloodPressureSystolic: '',
      bloodPressureDiastolic: '',
      heartRate: '',
      spo2: '',
      bloodGlucose: '',
      temperature: '',
      weight: '',
      height: '',
      respiratoryRate: ''
    });
    setMedications([]);
    setNewMedication({
      medicationName: '',
      dosage: '',
      frequency: '',
      duration: '',
      instructions: ''
    });
    setVisitPhoto(null);
    setVisitPhotoPreview(null);
    setEcgFile(null);
    setEcgPreview(null);
    setAiDiagnosis(null);
  };

  /**
   * Go back to patient search
   */
  const handleBackToSearch = () => {
    setSelectedPatient(null);
    setPatientHistory([]);
    setSearchId('');
    setSearchError(null);
    resetFormFields();
    setActiveSection('search');
  };

  // ═══════════════════════════════════════════════════════════════
  // PHOTO UPLOAD HANDLERS
  // ═══════════════════════════════════════════════════════════════

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        openModal('error', 'خطأ', 'حجم الصورة يجب أن يكون أقل من 10 ميجابايت');
        return;
      }
      
      setVisitPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setVisitPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    setVisitPhoto(null);
    setVisitPhotoPreview(null);
    if (photoInputRef.current) {
      photoInputRef.current.value = '';
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // ECG HANDLERS (Cardiologists Only)
  // ═══════════════════════════════════════════════════════════════

  const handleEcgUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setEcgFile(file);
      setAiDiagnosis(null);
      
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setEcgPreview(reader.result);
        };
        reader.readAsDataURL(file);
      } else {
        setEcgPreview(null);
      }
    }
  };

  const handleRemoveEcg = () => {
    setEcgFile(null);
    setEcgPreview(null);
    setAiDiagnosis(null);
    if (ecgFileInputRef.current) {
      ecgFileInputRef.current.value = '';
    }
  };

  const handleAiDiagnosis = async () => {
    if (!ecgFile) return;
    
    setEcgAnalyzing(true);
    
    try {
      const formData = new FormData();
      formData.append('ecgFile', ecgFile);
      
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/doctor/ecg/analyze', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setAiDiagnosis(data.analysis);
        setTimeout(() => {
          resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      } else {
        openModal('error', 'خطأ', data.message || 'حدث خطأ في تحليل تخطيط القلب');
      }
    } catch (error) {
      console.error('ECG analysis error:', error);
      openModal('error', 'خطأ', 'حدث خطأ في الاتصال بخدمة التحليل');
    } finally {
      setEcgAnalyzing(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // MEDICATION HANDLERS
  // ═══════════════════════════════════════════════════════════════

  const handleAddMedication = () => {
    if (!newMedication.medicationName.trim()) {
      openModal('error', 'خطأ', 'الرجاء إدخال اسم الدواء');
      return;
    }
    
    setMedications([...medications, { ...newMedication, id: Date.now() }]);
    setNewMedication({
      medicationName: '',
      dosage: '',
      frequency: '',
      duration: '',
      instructions: ''
    });
  };

  const handleRemoveMedication = (id) => {
    setMedications(medications.filter(med => med.id !== id));
  };

  // ═══════════════════════════════════════════════════════════════
  // SAVE VISIT
  // ═══════════════════════════════════════════════════════════════

  const handleSaveVisit = async () => {
    if (!chiefComplaint.trim()) {
      openModal('error', 'خطأ', 'الرجاء إدخال الشكوى الرئيسية');
      return;
    }
    
    setSaving(true);
    
    try {
      const token = localStorage.getItem('token');
      const nationalId = selectedPatient.nationalId || selectedPatient.childId;
      
      const formData = new FormData();
      formData.append('chiefComplaint', chiefComplaint);
      formData.append('diagnosis', diagnosis);
      formData.append('doctorNotes', doctorNotes);
      formData.append('vitalSigns', JSON.stringify(vitalSigns));
      formData.append('prescribedMedications', JSON.stringify(medications));
      
      if (visitPhoto) {
        formData.append('visitPhoto', visitPhoto);
      }
      
      if (aiDiagnosis && isCardiologist()) {
        formData.append('ecgAnalysis', JSON.stringify(aiDiagnosis));
      }
      
      console.log('📤 Sending visit data with photo...');
      console.log('🆔 Patient national ID:', nationalId);
      
      const response = await fetch(`http://localhost:5000/api/doctor/patient/${nationalId}/visit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      const data = await response.json();
      
      console.log('📥 Response status:', response.status);
      console.log('📥 Response data:', data);
      
      if (response.ok && data.success) {
        openModal('success', 'تم الحفظ', 'تم حفظ بيانات الزيارة بنجاح ✅');
        
        try {
          const historyResponse = await fetch(`http://localhost:5000/api/doctor/patient/${nationalId}/visits`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (historyResponse.ok) {
            const historyData = await historyResponse.json();
            if (historyData.success) {
              setPatientHistory(historyData.visits || []);
            }
          }
        } catch (err) {
          console.error('Error refreshing history:', err);
        }
        
        resetFormFields();
        setActiveSection('history');
        
      } else {
        openModal('error', 'خطأ', data.message || 'حدث خطأ في حفظ البيانات');
      }
      
    } catch (error) {
      console.error('❌ Error saving visit:', error);
      openModal('error', 'خطأ', 'حدث خطأ في الاتصال بالخادم');
    } finally {
      setSaving(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // LOADING STATE
  // ═══════════════════════════════════════════════════════════════

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>جاري التحميل...</p>
      </div>
    );
  }

  if (!user) return null;

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════

  return (
    <div className="doctor-dashboard">
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
                <button className="modal-button primary" onClick={modal.onConfirm ? handleModalConfirm : closeModal}>حسناً</button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="dashboard-container">
        {/* ═══════════════════════════════════════════════════════════════
            PROFILE HEADER CARD - Matching PatientDashboard Design
            ═══════════════════════════════════════════════════════════════ */}
        <div className="profile-header-card">
          {/* Logout Button */}
          <button className="logout-btn-profile" onClick={handleLogout}>
            <span>🚪</span>
            <span>تسجيل الخروج</span>
          </button>
          
          <div className="profile-main-content">
            <div className="profile-avatar">
              <div className="avatar-circle">
                <span>👨‍⚕️</span>
              </div>
              <div className="avatar-badge">
                <span>✓</span>
              </div>
              {isCardiologist() && (
                <div className="cardio-badge">
                  <span>❤️</span>
                </div>
              )}
            </div>
            <div className="profile-header-info">
              <p className="welcome-greeting">مرحباً بك 👋</p>
              <h1>د. {user.firstName} {user.lastName}</h1>
              <p className="profile-role">طبيب - Patient 360°</p>
              <div className="profile-meta-info">
                {user.roleData?.doctor?.specialization && (
                  <div className="meta-item specialization">
                    <span>{user.roleData.doctor.specialization === 'Cardiologist' ? '❤️' : '🩺'}</span>
                    <span>{user.roleData.doctor.specialization}</span>
                  </div>
                )}
                {user.roleData?.doctor?.hospitalAffiliation && (
                  <div className="meta-item hospital">
                    <span>🏥</span>
                    <span>{user.roleData.doctor.hospitalAffiliation}</span>
                  </div>
                )}
                {user.roleData?.doctor?.yearsOfExperience && (
                  <div className="meta-item experience">
                    <span>📅</span>
                    <span>{user.roleData.doctor.yearsOfExperience} سنة خبرة</span>
                  </div>
                )}
                {isCardiologist() && (
                  <div className="meta-item ai-badge">
                    <span>🤖</span>
                    <span>AI ECG Analysis</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Patient Search Section */}
        {!selectedPatient && (
          <div className="search-section">
            <div className="search-card">
              <div className="search-header">
                <span className="search-icon">🔍</span>
                <h2>البحث عن مريض</h2>
              </div>
              
              <div className="search-form">
                <div className="search-input-wrapper">
                  <input
                    type="text"
                    placeholder="أدخل الرقم الوطني للمريض..."
                    value={searchId}
                    onChange={(e) => setSearchId(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearchPatient()}
                  />
                  <button 
                    className={`search-btn ${searchLoading ? 'loading' : ''}`}
                    onClick={handleSearchPatient}
                    disabled={searchLoading}
                  >
                    {searchLoading ? (
                      <span className="spinner-small"></span>
                    ) : (
                      <>
                        <span>🔎</span>
                        <span>بحث</span>
                      </>
                    )}
                  </button>
                </div>
                
                {searchError && (
                  <div className="search-error">
                    <span>⚠️</span>
                    <span>{searchError}</span>
                  </div>
                )}
              </div>

              {/* Family Selection */}
              {showFamilySelection && familyMembers.length > 0 && (
                <div className="family-selection">
                  <h3>اختر المريض:</h3>
                  <div className="family-members-grid">
                    {familyMembers.map((member, index) => (
                      <button
                        key={index}
                        className="family-member-card"
                        onClick={() => handleFamilyMemberSelect(member)}
                      >
                        <span className="member-icon">
                          {member.isChild ? '👶' : member.gender === 'male' ? '👨' : '👩'}
                        </span>
                        <span className="member-name">{member.firstName} {member.lastName}</span>
                        {member.isChild && <span className="child-badge">طفل</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Patient Selected - Dashboard View */}
        {selectedPatient && (
          <>
            {/* Back Button & Patient Info */}
            <div className="patient-header-bar">
              <button className="back-btn" onClick={handleBackToSearch}>
                <span>→</span>
                <span>بحث جديد</span>
              </button>
              
              <div className="patient-quick-info">
                <span className="patient-avatar">
                  {selectedPatient.gender === 'male' ? '👨' : '👩'}
                </span>
                <div className="patient-name-info">
                  <h3>{selectedPatient.firstName} {selectedPatient.lastName}</h3>
                  <span className="patient-id">{selectedPatient.nationalId || selectedPatient.childId}</span>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="dashboard-tabs">
              <button
                className={`tab-btn ${activeSection === 'overview' ? 'active' : ''}`}
                onClick={() => setActiveSection('overview')}
              >
                <span className="tab-icon">📋</span>
                <span>الملف الطبي</span>
              </button>
              <button
                className={`tab-btn ${activeSection === 'history' ? 'active' : ''}`}
                onClick={() => setActiveSection('history')}
              >
                <span className="tab-icon">📜</span>
                <span>سجل الزيارات</span>
              </button>
              <button
                className={`tab-btn ${activeSection === 'newVisit' ? 'active' : ''}`}
                onClick={() => setActiveSection('newVisit')}
              >
                <span className="tab-icon">➕</span>
                <span>زيارة جديدة</span>
              </button>
              {isCardiologist() && (
                <button
                  className={`tab-btn ecg-tab ${activeSection === 'ecg' ? 'active' : ''}`}
                  onClick={() => setActiveSection('ecg')}
                >
                  <span className="tab-icon">❤️</span>
                  <span>تحليل ECG</span>
                </button>
              )}
            </div>

            {/* Tab Content */}
            <div className="tab-content">
              {/* ═══════════════════════════════════════════════════════════════
                  OVERVIEW TAB - Patient Medical File
                  ═══════════════════════════════════════════════════════════════ */}
              {activeSection === 'overview' && (
                <div className="tab-content-container">
                  {/* Patient Profile Card */}
                  <div className="patient-profile-card">
                    <div className="profile-header">
                      <div className="profile-avatar">
                        <span>{selectedPatient.gender === 'male' ? '👨' : '👩'}</span>
                      </div>
                      <div className="profile-info">
                        <h2>{selectedPatient.firstName} {selectedPatient.lastName}</h2>
                        <div className="profile-meta">
                          <span><strong>الرقم الوطني:</strong> {selectedPatient.nationalId || selectedPatient.childId}</span>
                          {calculateAge(selectedPatient.dateOfBirth) && (
                            <span><strong>العمر:</strong> {calculateAge(selectedPatient.dateOfBirth)} سنة</span>
                          )}
                          <span><strong>الجنس:</strong> {selectedPatient.gender === 'male' ? 'ذكر' : 'أنثى'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Medical Info Grid */}
                  <div className="medical-info-grid">
                    <InfoCard 
                      icon="🩸" 
                      title="فصيلة الدم" 
                      value={selectedPatient.bloodType || '-'} 
                    />
                    <InfoCard 
                      icon="📏" 
                      title="الطول" 
                      value={selectedPatient.height ? `${selectedPatient.height} سم` : '-'} 
                    />
                    <InfoCard 
                      icon="⚖️" 
                      title="الوزن" 
                      value={selectedPatient.weight ? `${selectedPatient.weight} كغ` : '-'} 
                    />
                    <InfoCard 
                      icon="🚬" 
                      title="حالة التدخين" 
                      value={selectedPatient.smokingStatus === 'non-smoker' ? 'غير مدخن' : 
                             selectedPatient.smokingStatus === 'former smoker' ? 'مدخن سابق' : 
                             selectedPatient.smokingStatus === 'current smoker' ? 'مدخن حالي' : '-'} 
                    />
                  </div>

                  {/* Medical Alerts */}
                  <div className="medical-alerts-grid">
                    <AlertCard
                      type="danger"
                      icon="⚠️"
                      title="الحساسية"
                      items={selectedPatient.allergies}
                      emptyMessage="لا توجد حساسية مسجلة"
                    />
                    <AlertCard
                      type="warning"
                      icon="🏥"
                      title="الأمراض المزمنة"
                      items={selectedPatient.chronicDiseases}
                      emptyMessage="لا توجد أمراض مزمنة"
                    />
                    <AlertCard
                      type="info"
                      icon="👨‍👩‍👧‍👦"
                      title="التاريخ العائلي"
                      items={selectedPatient.familyHistory}
                      emptyMessage="لا يوجد تاريخ عائلي"
                    />
                  </div>

                  {/* Emergency Contact */}
                  {selectedPatient.emergencyContactName && (
                    <div className="emergency-contact-card">
                      <div className="emergency-header">
                        <span>🆘</span>
                        <h3>جهة اتصال الطوارئ</h3>
                      </div>
                      <div className="emergency-info">
                        <span><strong>الاسم:</strong> {selectedPatient.emergencyContactName}</span>
                        <span><strong>الصلة:</strong> {selectedPatient.emergencyContactRelationship}</span>
                        <span><strong>الهاتف:</strong> {selectedPatient.emergencyContactPhone}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ═══════════════════════════════════════════════════════════════
                  HISTORY TAB - Visit History
                  ═══════════════════════════════════════════════════════════════ */}
              {activeSection === 'history' && (
                <div className="tab-content-container">
                  <div className="history-header">
                    <span>📜</span>
                    <div>
                      <h2>سجل الزيارات الطبية</h2>
                      <p>جميع زيارات المريض من مختلف الأطباء</p>
                    </div>
                    <span className="visits-count">{patientHistory.length} زيارة</span>
                  </div>

                  {patientHistory.length === 0 ? (
                    <div className="empty-state">
                      <span className="empty-icon">📋</span>
                      <h3>لا توجد زيارات سابقة</h3>
                      <p>لم يتم تسجيل أي زيارات طبية لهذا المريض بعد</p>
                    </div>
                  ) : (
                    <div className="visits-timeline">
                      {patientHistory.map((visit, index) => (
                        <div key={visit._id || index} className="visit-card">
                          <div className="visit-card-header">
                            <div className="visit-date">
                              <span className="date-icon">📅</span>
                              <span>{formatDateTime(visit.visitDate || visit.createdAt)}</span>
                            </div>
                            <div className="visit-doctor">
                              <span className="doctor-icon">👨‍⚕️</span>
                              <span>{visit.doctorName || 'طبيب'}</span>
                              {visit.doctorSpecialization && (
                                <span className="doc-spec">({visit.doctorSpecialization})</span>
                              )}
                            </div>
                          </div>
                          
                          <div className="visit-card-body">
                            {visit.chiefComplaint && (
                              <div className="visit-field">
                                <label>الشكوى الرئيسية:</label>
                                <p>{visit.chiefComplaint}</p>
                              </div>
                            )}
                            
                            {visit.diagnosis && (
                              <div className="visit-field diagnosis">
                                <label>التشخيص:</label>
                                <p>{visit.diagnosis}</p>
                              </div>
                            )}
                            
                            {visit.vitalSigns && Object.keys(visit.vitalSigns).some(k => visit.vitalSigns[k]) && (
                              <div className="visit-vitals">
                                <label>العلامات الحيوية:</label>
                                <div className="vitals-mini-grid">
                                  {visit.vitalSigns.bloodPressureSystolic && (
                                    <span>🩺 {visit.vitalSigns.bloodPressureSystolic}/{visit.vitalSigns.bloodPressureDiastolic} mmHg</span>
                                  )}
                                  {visit.vitalSigns.heartRate && (
                                    <span>💓 {visit.vitalSigns.heartRate} BPM</span>
                                  )}
                                  {visit.vitalSigns.temperature && (
                                    <span>🌡️ {visit.vitalSigns.temperature}°C</span>
                                  )}
                                  {visit.vitalSigns.spo2 && (
                                    <span>🫁 {visit.vitalSigns.spo2}%</span>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            {visit.prescribedMedications?.length > 0 && (
                              <div className="visit-medications">
                                <label>الأدوية الموصوفة:</label>
                                <div className="meds-list">
                                  {visit.prescribedMedications.map((med, i) => (
                                    <div key={i} className="med-item">
                                      <span className="med-icon">💊</span>
                                      <span className="med-name">{med.medicationName}</span>
                                      {med.dosage && <span className="med-dosage">{med.dosage}</span>}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ═══════════════════════════════════════════════════════════════
                  NEW VISIT TAB
                  ═══════════════════════════════════════════════════════════════ */}
              {activeSection === 'newVisit' && (
                <div className="tab-content-container new-visit-section">
                  {/* Chief Complaint */}
                  <div className="form-section">
                    <div className="form-section-header">
                      <span>💬</span>
                      <h3>الشكوى الرئيسية <span className="required">*</span></h3>
                    </div>
                    <textarea
                      value={chiefComplaint}
                      onChange={(e) => setChiefComplaint(e.target.value)}
                      placeholder="اكتب الشكوى الرئيسية للمريض..."
                      className="form-textarea"
                      rows={3}
                    />
                  </div>

                  {/* Vital Signs */}
                  <div className="form-section">
                    <div className="form-section-header">
                      <span>📊</span>
                      <h3>العلامات الحيوية</h3>
                    </div>
                    <div className="vitals-grid">
                      <VitalInput
                        icon="🩺"
                        label="ضغط الدم الانقباضي"
                        value={vitalSigns.bloodPressureSystolic}
                        onChange={(e) => setVitalSigns({...vitalSigns, bloodPressureSystolic: e.target.value})}
                        unit="mmHg"
                        placeholder="120"
                      />
                      <VitalInput
                        icon="🩺"
                        label="ضغط الدم الانبساطي"
                        value={vitalSigns.bloodPressureDiastolic}
                        onChange={(e) => setVitalSigns({...vitalSigns, bloodPressureDiastolic: e.target.value})}
                        unit="mmHg"
                        placeholder="80"
                      />
                      <VitalInput
                        icon="💓"
                        label="نبض القلب"
                        value={vitalSigns.heartRate}
                        onChange={(e) => setVitalSigns({...vitalSigns, heartRate: e.target.value})}
                        unit="BPM"
                        placeholder="75"
                      />
                      <VitalInput
                        icon="🫁"
                        label="تشبع الأكسجين"
                        value={vitalSigns.spo2}
                        onChange={(e) => setVitalSigns({...vitalSigns, spo2: e.target.value})}
                        unit="%"
                        placeholder="98"
                      />
                      <VitalInput
                        icon="🌡️"
                        label="درجة الحرارة"
                        value={vitalSigns.temperature}
                        onChange={(e) => setVitalSigns({...vitalSigns, temperature: e.target.value})}
                        unit="°C"
                        placeholder="37"
                      />
                      <VitalInput
                        icon="🩸"
                        label="سكر الدم"
                        value={vitalSigns.bloodGlucose}
                        onChange={(e) => setVitalSigns({...vitalSigns, bloodGlucose: e.target.value})}
                        unit="mg/dL"
                        placeholder="100"
                      />
                    </div>
                  </div>

                  {/* Photo Upload Section */}
                  <div className="form-section">
                    <div className="form-section-header">
                      <span>📷</span>
                      <h3>إرفاق صورة (اختياري)</h3>
                    </div>
                    
                    {!visitPhoto ? (
                      <label className="photo-upload-area">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          ref={photoInputRef}
                          className="hidden-input"
                        />
                        <div className="upload-content">
                          <div className="upload-icon-circle">
                            <span>📷</span>
                          </div>
                          <h4>اضغط لإرفاق صورة</h4>
                          <p>صورة أشعة، تحاليل، أو أي صورة طبية</p>
                          <div className="upload-formats">
                            <span>JPG</span>
                            <span>PNG</span>
                            <span>حتى 10MB</span>
                          </div>
                        </div>
                      </label>
                    ) : (
                      <PhotoPreview photo={visitPhoto} onRemove={handleRemovePhoto} />
                    )}
                  </div>

                  {/* Diagnosis */}
                  <div className="form-section">
                    <div className="form-section-header">
                      <span>🔬</span>
                      <h3>التشخيص</h3>
                    </div>
                    <textarea
                      value={diagnosis}
                      onChange={(e) => setDiagnosis(e.target.value)}
                      placeholder="اكتب التشخيص..."
                      className="form-textarea"
                      rows={3}
                    />
                  </div>

                  {/* Medications */}
                  <div className="form-section">
                    <div className="form-section-header">
                      <span>💊</span>
                      <h3>الأدوية الموصوفة</h3>
                    </div>
                    
                    {/* Add Medication Form */}
                    <div className="add-medication-form">
                      <div className="med-inputs-grid">
                        <input
                          type="text"
                          placeholder="اسم الدواء"
                          value={newMedication.medicationName}
                          onChange={(e) => setNewMedication({...newMedication, medicationName: e.target.value})}
                          className="med-input"
                        />
                        <input
                          type="text"
                          placeholder="الجرعة"
                          value={newMedication.dosage}
                          onChange={(e) => setNewMedication({...newMedication, dosage: e.target.value})}
                          className="med-input"
                        />
                        <input
                          type="text"
                          placeholder="التكرار"
                          value={newMedication.frequency}
                          onChange={(e) => setNewMedication({...newMedication, frequency: e.target.value})}
                          className="med-input"
                        />
                        <input
                          type="text"
                          placeholder="المدة"
                          value={newMedication.duration}
                          onChange={(e) => setNewMedication({...newMedication, duration: e.target.value})}
                          className="med-input"
                        />
                      </div>
                      <input
                        type="text"
                        placeholder="تعليمات خاصة"
                        value={newMedication.instructions}
                        onChange={(e) => setNewMedication({...newMedication, instructions: e.target.value})}
                        className="med-input full-width"
                      />
                      <button className="add-med-btn" onClick={handleAddMedication}>
                        <span>➕</span>
                        <span>إضافة الدواء</span>
                      </button>
                    </div>

                    {/* Medications List */}
                    {medications.length > 0 && (
                      <div className="medications-list">
                        {medications.map((med) => (
                          <div key={med.id} className="medication-item">
                            <div className="med-item-content">
                              <span className="med-icon">💊</span>
                              <div className="med-details">
                                <strong>{med.medicationName}</strong>
                                <span>{med.dosage} - {med.frequency} - {med.duration}</span>
                                {med.instructions && <small>{med.instructions}</small>}
                              </div>
                            </div>
                            <button 
                              className="remove-med-btn"
                              onClick={() => handleRemoveMedication(med.id)}
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Doctor Notes */}
                  <div className="form-section">
                    <div className="form-section-header">
                      <span>📋</span>
                      <h3>ملاحظات وتوصيات</h3>
                    </div>
                    <textarea
                      value={doctorNotes}
                      onChange={(e) => setDoctorNotes(e.target.value)}
                      placeholder="اكتب ملاحظاتك وتوصياتك للمريض..."
                      className="form-textarea"
                      rows={4}
                    />
                  </div>

                  {/* Save Button */}
                  <div className="save-section">
                    <button
                      className={`save-visit-btn ${saving ? 'saving' : ''}`}
                      onClick={handleSaveVisit}
                      disabled={saving || !chiefComplaint.trim()}
                    >
                      {saving ? (
                        <><span className="spinner"></span><span>جاري الحفظ...</span></>
                      ) : (
                        <><span>💾</span><span>حفظ الزيارة</span></>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* ═══════════════════════════════════════════════════════════════
                  ECG TAB (Cardiologists Only) - REDESIGNED
                  ═══════════════════════════════════════════════════════════════ */}
              {activeSection === 'ecg' && isCardiologist() && (
                <div className="tab-content-container ecg-section">
                  {/* ECG Header */}
                  <div className="ecg-page-header">
                    <div className="ecg-header-icon-wrapper">
                      <span className="ecg-heart-icon">❤️</span>
                      <div className="ecg-pulse-ring"></div>
                      <div className="ecg-pulse-ring delay-1"></div>
                    </div>
                    <div className="ecg-header-content">
                      <h1>تحليل تخطيط القلب (ECG)</h1>
                      <p>AI-Powered ECG Analysis System</p>
                    </div>
                    <div className="ecg-ai-badge">
                      <span>🤖</span>
                      <span>Powered by AI</span>
                    </div>
                  </div>

                  {/* Upload Section */}
                  <div className="ecg-upload-card">
                    <div className="ecg-upload-header">
                      <span>📤</span>
                      <h3>رفع ملف تخطيط القلب</h3>
                    </div>

                    {!ecgFile ? (
                      <label className="ecg-upload-dropzone">
                        <input
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg"
                          onChange={handleEcgUpload}
                          ref={ecgFileInputRef}
                          className="hidden-input"
                        />
                        <div className="dropzone-content">
                          <div className="dropzone-icon">
                            <span>📤</span>
                          </div>
                          <h4>اضغط لاختيار ملف أو اسحب الملف هنا</h4>
                          <p>PDF, PNG, JPG - تخطيط القلب الكهربائي</p>
                          <div className="dropzone-formats">
                            <span className="format-tag">📄 PDF</span>
                            <span className="format-tag">🖼️ PNG</span>
                            <span className="format-tag">🖼️ JPG</span>
                          </div>
                        </div>
                      </label>
                    ) : (
                      <div className="ecg-file-preview-card">
                        {ecgPreview ? (
                          <div className="ecg-image-preview">
                            <img src={ecgPreview} alt="ECG Preview" />
                          </div>
                        ) : (
                          <div className="ecg-pdf-preview">
                            <span className="pdf-icon">📄</span>
                            <span className="pdf-name">{ecgFile.name}</span>
                          </div>
                        )}
                        <div className="ecg-file-info">
                          <span className="file-name">📎 {ecgFile.name}</span>
                          <span className="file-size">({(ecgFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                          <button className="remove-ecg-btn" onClick={handleRemoveEcg}>
                            <span>✕</span> إزالة
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Analyze Button */}
                    <button
                      className={`ecg-analyze-btn ${ecgAnalyzing ? 'analyzing' : ''} ${!ecgFile ? 'disabled' : ''}`}
                      onClick={handleAiDiagnosis}
                      disabled={!ecgFile || ecgAnalyzing}
                    >
                      {ecgAnalyzing ? (
                        <>
                          <div className="analyze-spinner"></div>
                          <span>جاري التحليل بالذكاء الاصطناعي...</span>
                        </>
                      ) : (
                        <>
                          <span className="analyze-icon">🤖</span>
                          <span>تحليل بالذكاء الاصطناعي</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* AI Results - New Design */}
                  {aiDiagnosis && (
                    <div ref={resultRef}>
                      <ECGResultCard result={aiDiagnosis} />
                    </div>
                  )}

                  {/* Info Notice */}
                  <div className="ecg-info-notice">
                    <div className="notice-icon">💡</div>
                    <div className="notice-content">
                      <h4>كيفية الاستخدام</h4>
                      <ol>
                        <li>ارفع صورة أو ملف PDF لتخطيط القلب</li>
                        <li>اضغط على زر "تحليل بالذكاء الاصطناعي"</li>
                        <li>راجع النتائج والتوصيات</li>
                        <li>اتخذ القرار الطبي المناسب بناءً على خبرتك السريرية</li>
                      </ol>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════

/**
 * Info Card Component
 */
const InfoCard = ({ icon, title, value, fullWidth = false, dir = 'rtl' }) => (
  <div className={`info-display-card ${fullWidth ? 'full-width' : ''}`}>
    <div className="card-icon-header">
      <div className="icon-circle">
        <span>{icon}</span>
      </div>
      <h3>{title}</h3>
    </div>
    <p className="card-value" dir={dir}>{value || '-'}</p>
  </div>
);

/**
 * Alert Card Component
 */
const AlertCard = ({ type, icon, title, items, emptyMessage }) => {
  const itemsList = Array.isArray(items) ? items : (items ? [items] : []);
  
  return (
    <div className={`alert-card ${type}`}>
      <div className="alert-header">
        <span className="alert-icon">{icon}</span>
        <h3>{title}</h3>
        <span className="count-badge">{itemsList.length}</span>
      </div>
      {itemsList.length > 0 ? (
        <ul className="alert-list">
          {itemsList.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      ) : (
        <div className="no-data">
          <span>✓</span>
          <p>{emptyMessage}</p>
        </div>
      )}
    </div>
  );
};

/**
 * Vital Input Component
 */
const VitalInput = ({ icon, label, value, onChange, unit, placeholder }) => (
  <div className="vital-input-group">
    <label>
      <span>{icon}</span>
      {label}
    </label>
    <div className="input-with-unit">
      <input
        type="number"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      />
      <span className="unit">{unit}</span>
    </div>
  </div>
);

export default DoctorDashboard;