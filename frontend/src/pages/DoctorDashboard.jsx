// src/pages/DoctorDashboard.jsx
// ✅ PROFESSIONAL REDESIGN - Tab Navigation + Patient History CV
// Matches PatientDashboard Design System

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import { logout as logoutService } from '../services/authService';
import '../styles/DoctorDashboard.css';

/**
 * Doctor Dashboard Component - Professional Healthcare Platform
 * 
 * Features:
 * - Tab-based navigation for organized workflow
 * - Patient search with parent-child selection for minors
 * - Complete patient medical history (CV) from all doctors
 * - Vital signs, diagnosis, and medication management
 * - ECG AI Analysis (Cardiologists only)
 * 
 * @component
 */
const DoctorDashboard = () => {
  const navigate = useNavigate();
  const resultRef = useRef(null);
  
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
  const [aiDiagnosis, setAiDiagnosis] = useState('');
  const [ecgAnalyzing, setEcgAnalyzing] = useState(false);
  
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
    if (!user || !user.specialization) return false;
    const cardioSpecializations = [
      'cardiology', 'cardiologist', 'طب القلب', 'طبيب قلب',
      'أمراض القلب', 'جراحة القلب', 'cardiac surgery',
      'interventional cardiology', 'electrophysiology'
    ];
    return cardioSpecializations.some(spec => 
      user.specialization.toLowerCase().includes(spec.toLowerCase())
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
      
      // Search for patient by national ID
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
      
      // Directly select this patient (no children check for now)
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
    
    // Reset form fields
    resetFormFields();
    
    // Load patient's complete medical history from all doctors
    try {
      const token = localStorage.getItem('token');
      const nationalId = patient.nationalId || patient.childId;
      
      console.log('📋 Loading patient history for:', nationalId);
      
      const historyResponse = await fetch(`http://localhost:5000/api/doctor/patient/${nationalId}/visits`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      console.log('📥 History response status:', historyResponse.status);
      
      if (historyResponse.ok) {
        const historyData = await historyResponse.json();
        console.log('📥 History data:', historyData);
        
        if (historyData.success) {
          setPatientHistory(historyData.visits || []);
        } else {
          setPatientHistory([]);
        }
      } else {
        console.error('Failed to load history');
        setPatientHistory([]);
      }
    } catch (error) {
      console.error('Error loading patient history:', error);
      setPatientHistory([]);
    }
    
    // Switch to patient overview
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
    setChiefComplaint('');
    setDiagnosis('');
    setDoctorNotes('');
    setMedications([]);
    setEcgFile(null);
    setAiDiagnosis('');
  };

  /**
   * Go back to search
   */
  const handleBackToSearch = () => {
    setSelectedPatient(null);
    setPatientHistory([]);
    setSearchId('');
    setActiveSection('search');
    resetFormFields();
  };

  // ═══════════════════════════════════════════════════════════════
  // MEDICATIONS MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  const handleAddMedication = () => {
    if (!newMedication.medicationName || !newMedication.dosage || !newMedication.frequency) {
      openModal('error', 'خطأ', 'الرجاء ملء حقول الدواء المطلوبة (الاسم، الجرعة، التكرار)');
      return;
    }

    setMedications([...medications, { 
      ...newMedication,
      prescribedDate: new Date().toISOString(),
      prescribedBy: `${user.firstName} ${user.lastName}`
    }]);
    
    setNewMedication({
      medicationName: '',
      dosage: '',
      frequency: '',
      duration: '',
      instructions: ''
    });
  };

  const handleRemoveMedication = (index) => {
    openModal('confirm', 'تأكيد الحذف', 'هل أنت متأكد من حذف هذا الدواء؟', () => {
      setMedications(medications.filter((_, i) => i !== index));
    });
  };

  // ═══════════════════════════════════════════════════════════════
  // ECG HANDLING (CARDIOLOGISTS ONLY)
  // ═══════════════════════════════════════════════════════════════

  const handleEcgUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
      if (validTypes.includes(file.type)) {
        setEcgFile(file);
        setAiDiagnosis('');
      } else {
        openModal('error', 'خطأ', 'الرجاء اختيار ملف PDF أو صورة (PNG, JPG)');
        e.target.value = '';
      }
    }
  };

  const handleAiDiagnosis = async () => {
    if (!ecgFile) {
      openModal('error', 'خطأ', 'الرجاء رفع ملف ECG أولاً');
      return;
    }
    
    setEcgAnalyzing(true);
    setAiDiagnosis('');
    
    try {
      // TODO: Replace with actual AI endpoint
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const simulatedResults = {
        rhythm: 'Normal Sinus Rhythm',
        heartRate: vitalSigns.heartRate || '72',
        findings: [
          'إيقاع جيبي طبيعي',
          'معدل ضربات القلب ضمن المعدل الطبيعي',
          'لا توجد علامات على نقص التروية'
        ],
        interpretation: 'تخطيط القلب يُظهر إيقاعاً جيبياً طبيعياً. لا توجد تشوهات ملحوظة.',
        confidence: 94,
        recommendations: ['متابعة روتينية', 'الحفاظ على نمط حياة صحي']
      };
      
      setAiDiagnosis(JSON.stringify(simulatedResults, null, 2));
      
    } catch (error) {
      console.error('ECG Analysis Error:', error);
      openModal('error', 'خطأ', 'حدث خطأ في تحليل تخطيط القلب');
    } finally {
      setEcgAnalyzing(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // SAVE VISIT DATA
  // ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
  // SAVE VISIT DATA - FIXED VERSION
  // ═══════════════════════════════════════════════════════════════

  const handleSaveVisit = async () => {
    if (!selectedPatient) {
      openModal('error', 'خطأ', 'يجب اختيار مريض أولاً');
      return;
    }
    
    if (!chiefComplaint.trim()) {
      openModal('error', 'خطأ', 'يرجى إدخال الشكوى الرئيسية للمريض');
      return;
    }
    
    if (!diagnosis.trim()) {
      openModal('error', 'خطأ', 'يرجى إدخال التشخيص');
      return;
    }
    
    setSaving(true);
    
    try {
      const visitData = {
        chiefComplaint: chiefComplaint.trim(),
        diagnosis: diagnosis.trim(),
        prescribedMedications: medications,
        doctorNotes: doctorNotes.trim() || '',
        visitType: 'regular'
      };
      
      const token = localStorage.getItem('token');
      const nationalId = selectedPatient.nationalId || selectedPatient.childId;
      
      console.log('📤 Sending visit data:', visitData);
      console.log('🆔 Patient national ID:', nationalId);
      console.log('🔗 API URL:', `http://localhost:5000/api/doctor/patient/${nationalId}/visit`);
      
      const response = await fetch(`http://localhost:5000/api/doctor/patient/${nationalId}/visit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(visitData)
      });
      
      const data = await response.json();
      
      console.log('📥 Response status:', response.status);
      console.log('📥 Response data:', data);
      
      if (response.ok && data.success) {
        openModal('success', 'تم الحفظ', 'تم حفظ بيانات الزيارة بنجاح ✅');
        
        // Refresh patient history
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
        
        // Reset form
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
        {/* Welcome Header */}
        <div className="welcome-header">
          <div className="welcome-content">
            <div className="doctor-avatar-header">
              <span>👨‍⚕️</span>
              {isCardiologist() && <span className="cardio-badge-small">❤️</span>}
            </div>
            <div className="welcome-text">
              <h1>مرحباً د. {user.firstName} {user.lastName} 👋</h1>
              <p>
                {user.specialization || 'طبيب'} - {user.institution || user.hospitalAffiliation || 'المؤسسة الصحية'}
                {isCardiologist() && <span className="ai-badge-header">🤖 ECG AI متاح</span>}
              </p>
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogout}>
            تسجيل الخروج 🚪
          </button>
        </div>

        {/* Main Content */}
        {!selectedPatient ? (
          /* ═══════════════════════════════════════════════════════════════
             SEARCH SECTION (Main Page)
             ═══════════════════════════════════════════════════════════════ */
          <div className="section-content">
            <div className="search-main-container">
              {/* Search Header */}
              <div className="search-page-header">
                <div className="search-header-content">
                  <div className="search-icon-box">
                    <span className="search-icon-main">🔍</span>
                    <div className="search-pulse-ring"></div>
                  </div>
                  <div className="search-header-text">
                    <h1>البحث عن مريض</h1>
                    <p>Patient Search - ابحث باستخدام الرقم الوطني</p>
                  </div>
                </div>
              </div>

              {/* Search Card */}
              <div className="search-card">
                <div className="search-card-header">
                  <span>🆔</span>
                  <div>
                    <h3>أدخل الرقم الوطني</h3>
                    <p>يدعم البحث عن الأطفال عبر رقم ولي الأمر</p>
                  </div>
                </div>
                
                <div className="search-input-container">
                  <input
                    type="text"
                    value={searchId}
                    onChange={(e) => setSearchId(e.target.value)}
                    placeholder="الرقم الوطني للمريض أو ولي الأمر..."
                    className="search-input-main"
                    onKeyPress={(e) => e.key === 'Enter' && !searchLoading && handleSearchPatient()}
                    disabled={searchLoading}
                    dir="ltr"
                  />
                  <button
                    className={`search-btn-main ${searchLoading ? 'loading' : ''}`}
                    onClick={handleSearchPatient}
                    disabled={searchLoading || !searchId.trim()}
                  >
                    {searchLoading ? (
                      <><span className="spinner"></span><span>جاري البحث...</span></>
                    ) : (
                      <><span>🔍</span><span>بحث</span></>
                    )}
                  </button>
                </div>
                
                {searchError && (
                  <div className="search-error">
                    <span>❌</span>
                    <p>{searchError}</p>
                  </div>
                )}
              </div>

              {/* Family Selection Modal */}
              {showFamilySelection && familyMembers.length > 0 && (
                <div className="family-selection-card">
                  <div className="family-card-header">
                    <span>👨‍👩‍👧‍👦</span>
                    <div>
                      <h3>اختر المريض</h3>
                      <p>تم العثور على عدة أفراد مرتبطين بهذا الرقم</p>
                    </div>
                  </div>
                  
                  <div className="family-members-list">
                    {familyMembers.map((member, index) => (
                      <button
                        key={member.id || member.childId || index}
                        className={`family-member-btn ${member.isParent ? 'parent' : 'child'}`}
                        onClick={() => handleFamilyMemberSelect(member)}
                      >
                        <div className="member-avatar">
                          {member.isParent ? '👤' : '👶'}
                        </div>
                        <div className="member-info">
                          <span className="member-name">{member.displayName}</span>
                          <span className="member-details">
                            {member.gender === 'male' ? 'ذكر' : member.gender === 'female' ? 'أنثى' : ''}
                            {member.dateOfBirth && ` • ${formatDate(member.dateOfBirth)}`}
                          </span>
                        </div>
                        <span className="member-arrow">←</span>
                      </button>
                    ))}
                  </div>
                  
                  <button 
                    className="cancel-selection-btn"
                    onClick={() => {
                      setShowFamilySelection(false);
                      setFamilyMembers([]);
                    }}
                  >
                    إلغاء
                  </button>
                </div>
              )}

              {/* Quick Info Cards */}
              <div className="info-cards-row">
                <div className="info-tip-card">
                  <span className="tip-icon">💡</span>
                  <div className="tip-content">
                    <h4>نصيحة</h4>
                    <p>يمكنك البحث برقم ولي الأمر للوصول لملفات أطفاله المسجلين</p>
                  </div>
                </div>
                
                {isCardiologist() && (
                  <div className="info-tip-card cardio">
                    <span className="tip-icon">❤️</span>
                    <div className="tip-content">
                      <h4>طبيب قلب</h4>
                      <p>لديك صلاحية استخدام نموذج الذكاء الاصطناعي لتحليل ECG</p>
                    </div>
                  </div>
                )}
              </div>

              {/* How It Works */}
              <div className="how-it-works-section">
                <div className="how-works-header">
                  <span>📖</span>
                  <div>
                    <h3>كيف يعمل النظام؟</h3>
                  </div>
                </div>
                <div className="steps-container">
                  <div className="step-item">
                    <div className="step-number"><span>1</span></div>
                    <div className="step-info">
                      <h4>البحث</h4>
                      <p>ابحث بالرقم الوطني</p>
                    </div>
                  </div>
                  <div className="step-arrow">→</div>
                  <div className="step-item">
                    <div className="step-number"><span>2</span></div>
                    <div className="step-info">
                      <h4>السجل الطبي</h4>
                      <p>عرض تاريخ المريض</p>
                    </div>
                  </div>
                  <div className="step-arrow">→</div>
                  <div className="step-item">
                    <div className="step-number"><span>3</span></div>
                    <div className="step-info">
                      <h4>التشخيص</h4>
                      <p>إضافة زيارة جديدة</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ═══════════════════════════════════════════════════════════════
             PATIENT SELECTED - TAB NAVIGATION
             ═══════════════════════════════════════════════════════════════ */
          <>
            {/* Back Button */}
            <button className="back-to-search-btn" onClick={handleBackToSearch}>
              <span>→</span>
              <span>العودة للبحث</span>
            </button>

            {/* Patient Mini Header */}
            <div className="patient-mini-header">
              <div className="patient-mini-info">
                <div className="patient-mini-avatar">
                  <span>{selectedPatient.gender === 'male' ? '👨' : '👩'}</span>
                </div>
                <div className="patient-mini-text">
                  <h2>{selectedPatient.firstName} {selectedPatient.lastName}</h2>
                  <p>
                    {selectedPatient.nationalId || selectedPatient.childId}
                    {calculateAge(selectedPatient.dateOfBirth) && ` • ${calculateAge(selectedPatient.dateOfBirth)} سنة`}
                    {selectedPatient.childId && !selectedPatient.nationalId && (
                      <span className="minor-tag">قاصر</span>
                    )}
                  </p>
                </div>
              </div>
              {selectedPatient.bloodType && (
                <div className="patient-blood-type">
                  <span>🩸</span>
                  <span>{selectedPatient.bloodType}</span>
                </div>
              )}
            </div>

            {/* Navigation Tabs */}
            <div className="dashboard-tabs">
              <button 
                className={`tab-btn ${activeSection === 'overview' ? 'active' : ''}`}
                onClick={() => setActiveSection('overview')}
              >
                <span className="tab-icon">👤</span>
                نظرة عامة
              </button>
              <button 
                className={`tab-btn ${activeSection === 'history' ? 'active' : ''}`}
                onClick={() => setActiveSection('history')}
              >
                <span className="tab-icon">📋</span>
                السجل الطبي
              </button>
              <button 
                className={`tab-btn ${activeSection === 'newVisit' ? 'active' : ''}`}
                onClick={() => setActiveSection('newVisit')}
              >
                <span className="tab-icon">➕</span>
                زيارة جديدة
              </button>
              {isCardiologist() && (
                <button 
                  className={`tab-btn cardio ${activeSection === 'ecg' ? 'active' : ''}`}
                  onClick={() => setActiveSection('ecg')}
                >
                  <span className="tab-icon">❤️</span>
                  تحليل ECG
                </button>
              )}
            </div>

            {/* Tab Content */}
            <div className="section-content">
              {/* ═══════════════════════════════════════════════════════════════
                  OVERVIEW TAB
                  ═══════════════════════════════════════════════════════════════ */}
              {activeSection === 'overview' && (
                <div className="tab-content-container">
                  {/* Patient Full Info */}
                  <div className="data-section">
                    <div className="section-header">
                      <div className="section-title-wrapper">
                        <span className="section-icon">👤</span>
                        <h2>المعلومات الشخصية</h2>
                      </div>
                    </div>
                    <div className="info-cards-grid">
                      <InfoCard icon="🆔" title="الرقم الوطني" value={selectedPatient.nationalId || selectedPatient.childId || '-'} />
                      <InfoCard icon="👤" title="الاسم الكامل" value={`${selectedPatient.firstName} ${selectedPatient.lastName}`} />
                      <InfoCard icon="🎂" title="العمر" value={calculateAge(selectedPatient.dateOfBirth) ? `${calculateAge(selectedPatient.dateOfBirth)} سنة` : '-'} />
                      <InfoCard icon="📅" title="تاريخ الميلاد" value={formatDate(selectedPatient.dateOfBirth)} />
                      <InfoCard icon={selectedPatient.gender === 'male' ? '♂️' : '♀️'} title="الجنس" value={selectedPatient.gender === 'male' ? 'ذكر' : selectedPatient.gender === 'female' ? 'أنثى' : '-'} />
                      <InfoCard icon="📱" title="رقم الهاتف" value={selectedPatient.phone || selectedPatient.phoneNumber || '-'} dir="ltr" />
                      <InfoCard icon="📍" title="العنوان" value={selectedPatient.address || '-'} fullWidth />
                    </div>
                  </div>

                  {/* Medical Alerts */}
                  <div className="medical-alerts-section">
                    <AlertCard 
                      type="allergies"
                      icon="⚠️"
                      title="الحساسية"
                      items={selectedPatient.allergies}
                      emptyMessage="لا توجد حساسية مسجلة"
                    />
                    <AlertCard 
                      type="diseases"
                      icon="🏥"
                      title="الأمراض المزمنة"
                      items={selectedPatient.chronicDiseases}
                      emptyMessage="لا توجد أمراض مزمنة"
                    />
                    <AlertCard 
                      type="family"
                      icon="👨‍👩‍👧‍👦"
                      title="التاريخ العائلي"
                      items={selectedPatient.familyHistory}
                      emptyMessage="لا يوجد تاريخ عائلي مسجل"
                    />
                  </div>

                  {/* Quick Stats */}
                  <div className="quick-stats-row">
                    <div className="stat-card">
                      <span className="stat-icon">📋</span>
                      <div className="stat-info">
                        <h3>{patientHistory.length}</h3>
                        <p>زيارات سابقة</p>
                      </div>
                    </div>
                    {selectedPatient.bloodType && (
                      <div className="stat-card blood">
                        <span className="stat-icon">🩸</span>
                        <div className="stat-info">
                          <h3>{selectedPatient.bloodType}</h3>
                          <p>فصيلة الدم</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ═══════════════════════════════════════════════════════════════
                  MEDICAL HISTORY TAB (Patient CV)
                  ═══════════════════════════════════════════════════════════════ */}
              {activeSection === 'history' && (
                <div className="tab-content-container">
                  <div className="history-header-section">
                    <div className="history-title">
                      <span>📋</span>
                      <div>
                        <h2>السجل الطبي الكامل</h2>
                        <p>جميع الزيارات السابقة لدى كافة الأطباء</p>
                      </div>
                    </div>
                    <div className="visits-count-badge">
                      <span>{patientHistory.length}</span>
                      <span>زيارة</span>
                    </div>
                  </div>

                  {patientHistory.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-icon">📋</div>
                      <h3>لا توجد زيارات سابقة</h3>
                      <p>لم يتم تسجيل أي زيارات طبية لهذا المريض بعد</p>
                      <button 
                        className="add-visit-btn"
                        onClick={() => setActiveSection('newVisit')}
                      >
                        <span>➕</span>
                        إضافة أول زيارة
                      </button>
                    </div>
                  ) : (
                    <div className="visits-timeline">
                      {patientHistory.map((visit, index) => (
                        <div key={visit.id || index} className="visit-card">
                          <div className="visit-card-header">
                            <div className="visit-date-badge">
                              <span>📅</span>
                              <span>{formatDateTime(visit.visitDate)}</span>
                            </div>
                            <div className="visit-doctor-info">
                              <span>👨‍⚕️</span>
                              <span>{visit.doctorName || 'طبيب'}</span>
                              {visit.specialization && (
                                <span className="spec-tag">{visit.specialization}</span>
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
                                    <span key={i} className="med-tag">
                                      💊 {med.medicationName} - {med.dosage}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {visit.doctorNotes && (
                              <div className="visit-field notes">
                                <label>ملاحظات الطبيب:</label>
                                <p>{visit.doctorNotes}</p>
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
                <div className="tab-content-container">
                  <div className="new-visit-header">
                    <span>➕</span>
                    <div>
                      <h2>تسجيل زيارة جديدة</h2>
                      <p>أدخل بيانات الكشف الطبي</p>
                    </div>
                  </div>

                  {/* Chief Complaint */}
                  <div className="form-section">
                    <div className="form-section-header">
                      <span>📝</span>
                      <h3>الشكوى الرئيسية *</h3>
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
                      <span>🩺</span>
                      <h3>العلامات الحيوية</h3>
                    </div>
                    <div className="vitals-grid">
                      <VitalInput
                        icon="🩺"
                        label="ضغط الدم (انقباضي)"
                        value={vitalSigns.bloodPressureSystolic}
                        onChange={(e) => setVitalSigns({...vitalSigns, bloodPressureSystolic: e.target.value})}
                        unit="mmHg"
                        placeholder="120"
                      />
                      <VitalInput
                        icon="🩺"
                        label="ضغط الدم (انبساطي)"
                        value={vitalSigns.bloodPressureDiastolic}
                        onChange={(e) => setVitalSigns({...vitalSigns, bloodPressureDiastolic: e.target.value})}
                        unit="mmHg"
                        placeholder="80"
                      />
                      <VitalInput
                        icon="💓"
                        label="معدل ضربات القلب"
                        value={vitalSigns.heartRate}
                        onChange={(e) => setVitalSigns({...vitalSigns, heartRate: e.target.value})}
                        unit="BPM"
                        placeholder="72"
                      />
                      <VitalInput
                        icon="🫁"
                        label="نسبة الأكسجين"
                        value={vitalSigns.spo2}
                        onChange={(e) => setVitalSigns({...vitalSigns, spo2: e.target.value})}
                        unit="%"
                        placeholder="98"
                      />
                      <VitalInput
                        icon="🩸"
                        label="مستوى السكر"
                        value={vitalSigns.bloodGlucose}
                        onChange={(e) => setVitalSigns({...vitalSigns, bloodGlucose: e.target.value})}
                        unit="mg/dL"
                        placeholder="100"
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
                        icon="⚖️"
                        label="الوزن"
                        value={vitalSigns.weight}
                        onChange={(e) => setVitalSigns({...vitalSigns, weight: e.target.value})}
                        unit="kg"
                        placeholder="70"
                      />
                      <VitalInput
                        icon="📏"
                        label="الطول"
                        value={vitalSigns.height}
                        onChange={(e) => setVitalSigns({...vitalSigns, height: e.target.value})}
                        unit="cm"
                        placeholder="170"
                      />
                    </div>
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
                      <span className="meds-count">{medications.length}</span>
                    </div>
                    
                    {/* Add Medication Form */}
                    <div className="add-med-form">
                      <div className="med-inputs-row">
                        <input
                          type="text"
                          value={newMedication.medicationName}
                          onChange={(e) => setNewMedication({...newMedication, medicationName: e.target.value})}
                          placeholder="اسم الدواء *"
                          className="med-input"
                        />
                        <input
                          type="text"
                          value={newMedication.dosage}
                          onChange={(e) => setNewMedication({...newMedication, dosage: e.target.value})}
                          placeholder="الجرعة *"
                          className="med-input"
                        />
                        <input
                          type="text"
                          value={newMedication.frequency}
                          onChange={(e) => setNewMedication({...newMedication, frequency: e.target.value})}
                          placeholder="التكرار *"
                          className="med-input"
                        />
                        <input
                          type="text"
                          value={newMedication.duration}
                          onChange={(e) => setNewMedication({...newMedication, duration: e.target.value})}
                          placeholder="المدة"
                          className="med-input"
                        />
                      </div>
                      <button className="add-med-btn" onClick={handleAddMedication}>
                        <span>➕</span>
                        إضافة
                      </button>
                    </div>

                    {/* Medications List */}
                    {medications.length > 0 && (
                      <div className="meds-list-container">
                        {medications.map((med, index) => (
                          <div key={index} className="med-item">
                            <div className="med-item-info">
                              <span className="med-name">💊 {med.medicationName}</span>
                              <span className="med-details">
                                {med.dosage} • {med.frequency}
                                {med.duration && ` • ${med.duration}`}
                              </span>
                            </div>
                            <button 
                              className="remove-med-btn"
                              onClick={() => handleRemoveMedication(index)}
                            >
                              🗑️
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
                  ECG TAB (Cardiologists Only)
                  ═══════════════════════════════════════════════════════════════ */}
              {activeSection === 'ecg' && isCardiologist() && (
                <div className="tab-content-container">
                  <div className="ecg-header-section">
                    <div className="ecg-header-icon">
                      <span>❤️</span>
                      <div className="ecg-pulse"></div>
                    </div>
                    <div className="ecg-header-text">
                      <h2>تحليل تخطيط القلب (ECG)</h2>
                      <p>AI-Powered ECG Analysis - نموذج الذكاء الاصطناعي</p>
                    </div>
                    <div className="cardio-only-badge">
                      <span>🤖</span>
                      <span>متاح لأطباء القلب</span>
                    </div>
                  </div>

                  {/* Upload Section */}
                  <div className="ecg-upload-section">
                    <label className="ecg-upload-area">
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        onChange={handleEcgUpload}
                        className="hidden-input"
                      />
                      <div className="upload-content">
                        <div className="upload-icon">📤</div>
                        <h3>رفع ملف ECG</h3>
                        <p>اضغط لاختيار ملف أو اسحب الملف هنا</p>
                        <span className="upload-hint">PDF, PNG, JPG</span>
                        {ecgFile && (
                          <div className="file-selected-badge">
                            <span>✓</span>
                            <span>{ecgFile.name}</span>
                          </div>
                        )}
                      </div>
                    </label>

                    <button
                      className={`analyze-ecg-btn ${ecgAnalyzing ? 'analyzing' : ''} ${!ecgFile ? 'disabled' : ''}`}
                      onClick={handleAiDiagnosis}
                      disabled={!ecgFile || ecgAnalyzing}
                    >
                      {ecgAnalyzing ? (
                        <><span className="spinner"></span><span>جاري التحليل...</span></>
                      ) : (
                        <><span>🤖</span><span>تحليل بالذكاء الاصطناعي</span></>
                      )}
                    </button>
                  </div>

                  {/* AI Results */}
                  {aiDiagnosis && (
                    <div className="ai-results-section" ref={resultRef}>
                      <div className="results-header">
                        <span>✅</span>
                        <h3>نتائج التحليل</h3>
                      </div>
                      <pre className="ai-output">{aiDiagnosis}</pre>
                    </div>
                  )}

                  {/* Info Notice */}
                  <div className="ecg-notice">
                    <span>⚠️</span>
                    <p>
                      <strong>تنبيه:</strong> نتائج الذكاء الاصطناعي استرشادية ولا تغني عن التقييم السريري. 
                      يرجى مراجعة النتائج واتخاذ القرار الطبي المناسب.
                    </p>
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