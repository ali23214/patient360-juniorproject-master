// src/pages/PatientDashboard.jsx
// ✅ REDESIGNED - Professional Medical Visits Log with Animated BMI Scale

import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import { authAPI } from '../services/api';
import '../styles/PatientDashboard.css';

/**
 * AI SERVICE CONFIG - CONNECTED TO BACKEND
 */
const AI_SERVICE_CONFIG = {
  isEnabled: true,
  apiEndpoint: '/api/patient/ai-symptom-analysis',
  timeout: 30000
};

/**
 * MAP AI RESPONSE TO SPECIALIZATIONS
 */
const SPECIALIZATION_MAPPING = {
  'Cardiologist': 'cardiologist',
  'Pulmonologist': 'pulmonologist',
  'General Practitioner': 'general_practitioner',
  'Infectious Disease Specialist': 'infectious_disease',
  'Intensive Care Specialist': 'intensive_care',
  'Rheumatologist': 'rheumatologist',
  'Orthopedic Surgeon': 'orthopedic_surgeon',
  'Neurologist': 'neurologist',
  'Endocrinologist': 'endocrinologist',
  'Dermatologist': 'dermatologist',
  'Gastroenterologist': 'gastroenterologist',
  'General Surgeon': 'general_surgeon',
  'Hepatologist': 'hepatologist',
  'Urologist': 'urologist',
  'Gynecologist': 'gynecologist',
  'Psychiatrist': 'psychiatrist',
  'Hematologist': 'hematologist',
  'Hematologist/Oncologist': 'hematologist_oncologist',
  'ENT Specialist': 'ent_specialist',
  'Ophthalmologist': 'ophthalmologist'
};

/**
 * ALL 20 MEDICAL SPECIALIZATIONS
 */
const MEDICAL_SPECIALIZATIONS = [
  { id: 'cardiologist', nameEn: 'Cardiologist', nameAr: 'طبيب قلب', icon: '❤️', color: '#ef4444', description: 'متخصص في تشخيص وعلاج أمراض القلب والأوعية الدموية' },
  { id: 'pulmonologist', nameEn: 'Pulmonologist', nameAr: 'طبيب أمراض الرئة', icon: '🫁', color: '#3b82f6', description: 'متخصص في أمراض الجهاز التنفسي والرئتين' },
  { id: 'general_practitioner', nameEn: 'General Practitioner', nameAr: 'طبيب عام', icon: '🩺', color: '#10b981', description: 'طبيب للفحص الشامل والتشخيص الأولي' },
  { id: 'infectious_disease', nameEn: 'Infectious Disease Specialist', nameAr: 'طبيب أمراض معدية', icon: '🦠', color: '#f59e0b', description: 'متخصص في الأمراض المعدية والعدوى' },
  { id: 'intensive_care', nameEn: 'Intensive Care Specialist', nameAr: 'طبيب عناية مركزة', icon: '🏥', color: '#dc2626', description: 'متخصص في رعاية الحالات الحرجة' },
  { id: 'rheumatologist', nameEn: 'Rheumatologist', nameAr: 'طبيب روماتيزم', icon: '🦴', color: '#8b5cf6', description: 'متخصص في أمراض المفاصل والروماتيزم' },
  { id: 'orthopedic_surgeon', nameEn: 'Orthopedic Surgeon', nameAr: 'جراح عظام', icon: '🦿', color: '#6366f1', description: 'متخصص في جراحة العظام والمفاصل' },
  { id: 'neurologist', nameEn: 'Neurologist', nameAr: 'طبيب أعصاب', icon: '🧠', color: '#ec4899', description: 'متخصص في أمراض الجهاز العصبي' },
  { id: 'endocrinologist', nameEn: 'Endocrinologist', nameAr: 'طبيب غدد صماء', icon: '⚗️', color: '#14b8a6', description: 'متخصص في أمراض الغدد والهرمونات' },
  { id: 'dermatologist', nameEn: 'Dermatologist', nameAr: 'طبيب جلدية', icon: '🧴', color: '#f97316', description: 'متخصص في أمراض الجلد والشعر' },
  { id: 'gastroenterologist', nameEn: 'Gastroenterologist', nameAr: 'طبيب جهاز هضمي', icon: '🫃', color: '#eab308', description: 'متخصص في أمراض الجهاز الهضمي' },
  { id: 'general_surgeon', nameEn: 'General Surgeon', nameAr: 'جراح عام', icon: '🔪', color: '#64748b', description: 'متخصص في العمليات الجراحية العامة' },
  { id: 'hepatologist', nameEn: 'Hepatologist', nameAr: 'طبيب كبد', icon: '🫀', color: '#a855f7', description: 'متخصص في أمراض الكبد والمرارة' },
  { id: 'urologist', nameEn: 'Urologist', nameAr: 'طبيب مسالك بولية', icon: '💧', color: '#0ea5e9', description: 'متخصص في أمراض الكلى والمسالك البولية' },
  { id: 'gynecologist', nameEn: 'Gynecologist', nameAr: 'طبيب نساء وتوليد', icon: '🤰', color: '#db2777', description: 'متخصص في صحة المرأة والحمل والولادة' },
  { id: 'psychiatrist', nameEn: 'Psychiatrist', nameAr: 'طبيب نفسي', icon: '🧘', color: '#7c3aed', description: 'متخصص في الصحة النفسية' },
  { id: 'hematologist', nameEn: 'Hematologist', nameAr: 'طبيب دم', icon: '🩸', color: '#be123c', description: 'متخصص في أمراض الدم' },
  { id: 'hematologist_oncologist', nameEn: 'Hematologist/Oncologist', nameAr: 'طبيب دم/أورام', icon: '🎗️', color: '#9333ea', description: 'متخصص في أمراض الدم والأورام' },
  { id: 'ent_specialist', nameEn: 'ENT Specialist', nameAr: 'طبيب أنف أذن حنجرة', icon: '👂', color: '#059669', description: 'متخصص في أمراض الأذن والأنف والحنجرة' },
  { id: 'ophthalmologist', nameEn: 'Ophthalmologist', nameAr: 'طبيب عيون', icon: '👁️', color: '#0284c7', description: 'متخصص في أمراض العيون' }
];

const consultationAPI = {
  analyzeSymptoms: async (symptoms) => {
    if (!AI_SERVICE_CONFIG.isEnabled) throw new Error('AI_SERVICE_NOT_ENABLED');
    
    const token = localStorage.getItem('token');
    const response = await fetch(`http://localhost:5000${AI_SERVICE_CONFIG.apiEndpoint}`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify({ symptoms }),
      signal: AbortSignal.timeout(AI_SERVICE_CONFIG.timeout)
    });
    
    if (!response.ok) throw new Error(`API_ERROR_${response.status}`);
    return await response.json();
  },
  
  getSpecializationByName: (specialistName) => {
    const specializationId = SPECIALIZATION_MAPPING[specialistName];
    if (!specializationId) return null;
    return MEDICAL_SPECIALIZATIONS.find(s => s.id === specializationId) || null;
  }
};

/**
 * BMI Scale Component - Professional Animated Scale
 */
const BMIScaleIndicator = ({ bmi, weight, height }) => {
  const [animatedPosition, setAnimatedPosition] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    if (bmi) {
      setIsVisible(true);
      // Animate to position after mount
      const timer = setTimeout(() => {
        // Calculate position (BMI range 15-40 mapped to 0-100%)
        const minBMI = 15;
        const maxBMI = 40;
        const clampedBMI = Math.max(minBMI, Math.min(maxBMI, parseFloat(bmi)));
        const position = ((clampedBMI - minBMI) / (maxBMI - minBMI)) * 100;
        setAnimatedPosition(position);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [bmi]);

  if (!bmi) return null;

  const getBMICategory = (value) => {
    const b = parseFloat(value);
    if (b < 18.5) return { label: 'نقص الوزن', labelEn: 'Underweight', color: '#3b82f6', class: 'underweight' };
    if (b < 25) return { label: 'وزن طبيعي', labelEn: 'Normal', color: '#10b981', class: 'normal' };
    if (b < 30) return { label: 'وزن زائد', labelEn: 'Overweight', color: '#f59e0b', class: 'overweight' };
    return { label: 'سمنة', labelEn: 'Obese', color: '#ef4444', class: 'obese' };
  };

  const category = getBMICategory(bmi);

  return (
    <div className={`bmi-scale-container ${isVisible ? 'visible' : ''}`}>
      <div className="bmi-scale-header">
        <div className="bmi-scale-title">
          <span className="bmi-icon">⚖️</span>
          <div>
            <h4>مؤشر كتلة الجسم</h4>
            <p>Body Mass Index (BMI)</p>
          </div>
        </div>
        <div className="bmi-value-display" style={{ '--category-color': category.color }}>
          <span className="bmi-number">{bmi}</span>
          <span className="bmi-unit">kg/m²</span>
        </div>
      </div>

      <div className="bmi-scale-wrapper">
        {/* Scale Numbers */}
        <div className="bmi-scale-numbers">
          <span>15</span>
          <span>18.5</span>
          <span>25</span>
          <span>30</span>
          <span>40</span>
        </div>

        {/* Scale Bar */}
        <div className="bmi-scale-bar">
          <div className="bmi-zone underweight" style={{ width: '14%' }}>
            <span className="zone-label">نقص</span>
          </div>
          <div className="bmi-zone normal" style={{ width: '26%' }}>
            <span className="zone-label">طبيعي</span>
          </div>
          <div className="bmi-zone overweight" style={{ width: '20%' }}>
            <span className="zone-label">زائد</span>
          </div>
          <div className="bmi-zone obese" style={{ width: '40%' }}>
            <span className="zone-label">سمنة</span>
          </div>
          
          {/* Animated Indicator */}
          <div 
            className="bmi-indicator"
            style={{ 
              left: `${animatedPosition}%`,
              '--indicator-color': category.color 
            }}
          >
            <div className="indicator-pin">
              <div className="indicator-dot"></div>
              <div className="indicator-line"></div>
            </div>
            <div className="indicator-value">{bmi}</div>
          </div>
        </div>

        {/* Category Labels */}
        <div className="bmi-category-labels">
          <span className="category-underweight">&lt;18.5</span>
          <span className="category-normal">18.5-24.9</span>
          <span className="category-overweight">25-29.9</span>
          <span className="category-obese">≥30</span>
        </div>
      </div>

      {/* Result Badge */}
      <div className={`bmi-result-badge ${category.class}`}>
        <div className="result-icon">
          {category.class === 'underweight' && '📉'}
          {category.class === 'normal' && '✅'}
          {category.class === 'overweight' && '⚠️'}
          {category.class === 'obese' && '🔴'}
        </div>
        <div className="result-text">
          <span className="result-label-ar">{category.label}</span>
          <span className="result-label-en">{category.labelEn}</span>
        </div>
        {weight && height && (
          <div className="result-details">
            <span>الوزن: {weight} كجم</span>
            <span>الطول: {height} سم</span>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Professional Visit Details Accordion Component
 */
const VisitDetailsAccordion = ({ visit, isExpanded, onToggle, formatDateTime }) => {
  const contentRef = useRef(null);
  const [contentHeight, setContentHeight] = useState(0);

  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight);
    }
  }, [isExpanded, visit]);

  const getDoctorName = () => {
    if (visit.doctorId?.firstName && visit.doctorId?.lastName) {
      return `د. ${visit.doctorId.firstName} ${visit.doctorId.lastName}`;
    }
    return 'طبيب';
  };

  const getSpecialization = () => {
    return visit.doctorId?.specialization || visit.specialization || 'طب عام';
  };

  return (
    <div className={`visit-accordion ${isExpanded ? 'expanded' : ''}`}>
      {/* Accordion Header */}
      <div className="visit-accordion-header" onClick={onToggle}>
        <div className="visit-header-main">
          {/* Timeline Dot */}
          <div className="timeline-connector">
            <div className="timeline-dot">
              <span className="dot-pulse"></span>
            </div>
            <div className="timeline-line"></div>
          </div>

          {/* Visit Summary */}
          <div className="visit-summary">
            <div className="visit-date-badge">
              <span className="date-icon">📅</span>
              <span className="date-text">{formatDateTime(visit.visitDate)}</span>
            </div>
            
            <div className="doctor-info-badge">
              <div className="doctor-avatar">
                <span>👨‍⚕️</span>
              </div>
              <div className="doctor-details">
                <span className="doctor-name">{getDoctorName()}</span>
                <span className="doctor-spec">{getSpecialization()}</span>
              </div>
            </div>
          </div>

          {/* Quick Preview */}
          <div className="visit-quick-preview">
            {visit.chiefComplaint && (
              <div className="preview-chip complaint">
                <span className="chip-icon">💬</span>
                <span className="chip-text">{visit.chiefComplaint.substring(0, 40)}...</span>
              </div>
            )}
            {visit.diagnosis && (
              <div className="preview-chip diagnosis">
                <span className="chip-icon">🔬</span>
                <span className="chip-text">{visit.diagnosis.substring(0, 30)}...</span>
              </div>
            )}
          </div>

          {/* Expand Button */}
          <button className="expand-btn">
            <span className="expand-icon">{isExpanded ? '▲' : '▼'}</span>
            <span className="expand-text">{isExpanded ? 'إخفاء' : 'التفاصيل'}</span>
          </button>
        </div>
      </div>

      {/* Accordion Content */}
      <div 
        className="visit-accordion-content"
        style={{ maxHeight: isExpanded ? `${contentHeight}px` : '0px' }}
      >
        <div className="content-inner" ref={contentRef}>
          {/* Doctor Information Section */}
          <div className="detail-section doctor-section">
            <div className="section-header">
              <span className="section-icon">👨‍⚕️</span>
              <h4>معلومات الطبيب المعالج</h4>
              <span className="section-badge purple">Physician Info</span>
            </div>
            <div className="doctor-info-card">
              <div className="doctor-avatar-large">
                <span>👨‍⚕️</span>
                <div className="avatar-ring"></div>
              </div>
              <div className="doctor-info-content">
                <div className="info-row">
                  <span className="info-label">الاسم:</span>
                  <span className="info-value">{getDoctorName()}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">التخصص:</span>
                  <span className="info-value specialization-badge">{getSpecialization()}</span>
                </div>
                {visit.doctorId?.institution && (
                  <div className="info-row">
                    <span className="info-label">المؤسسة:</span>
                    <span className="info-value">{visit.doctorId.institution}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Chief Complaint Section */}
          {visit.chiefComplaint && (
            <div className="detail-section complaint-section">
              <div className="section-header">
                <span className="section-icon">💬</span>
                <h4>الشكوى الرئيسية</h4>
                <span className="section-badge blue">Chief Complaint</span>
              </div>
              <div className="section-content highlight-box blue">
                <p>{visit.chiefComplaint}</p>
              </div>
            </div>
          )}

          {/* Diagnosis Section */}
          {visit.diagnosis && (
            <div className="detail-section diagnosis-section">
              <div className="section-header">
                <span className="section-icon">🔬</span>
                <h4>التشخيص</h4>
                <span className="section-badge green">Diagnosis</span>
              </div>
              <div className="section-content highlight-box green">
                <div className="diagnosis-content">
                  <div className="diagnosis-icon">🩺</div>
                  <p>{visit.diagnosis}</p>
                </div>
              </div>
            </div>
          )}

          {/* Vital Signs Section */}
          {visit.vitalSigns && Object.keys(visit.vitalSigns).some(k => visit.vitalSigns[k]) && (
            <div className="detail-section vitals-section">
              <div className="section-header">
                <span className="section-icon">📊</span>
                <h4>العلامات الحيوية</h4>
                <span className="section-badge orange">Vital Signs</span>
              </div>
              <div className="vitals-grid">
                {visit.vitalSigns.bloodPressureSystolic && (
                  <div className="vital-card">
                    <div className="vital-icon">🩺</div>
                    <div className="vital-info">
                      <span className="vital-label">ضغط الدم</span>
                      <span className="vital-value">
                        {visit.vitalSigns.bloodPressureSystolic}/{visit.vitalSigns.bloodPressureDiastolic}
                        <small>mmHg</small>
                      </span>
                    </div>
                  </div>
                )}
                {visit.vitalSigns.heartRate && (
                  <div className="vital-card">
                    <div className="vital-icon">💓</div>
                    <div className="vital-info">
                      <span className="vital-label">نبض القلب</span>
                      <span className="vital-value">
                        {visit.vitalSigns.heartRate}
                        <small>BPM</small>
                      </span>
                    </div>
                  </div>
                )}
                {visit.vitalSigns.temperature && (
                  <div className="vital-card">
                    <div className="vital-icon">🌡️</div>
                    <div className="vital-info">
                      <span className="vital-label">الحرارة</span>
                      <span className="vital-value">
                        {visit.vitalSigns.temperature}
                        <small>°C</small>
                      </span>
                    </div>
                  </div>
                )}
                {visit.vitalSigns.spo2 && (
                  <div className="vital-card">
                    <div className="vital-icon">🫁</div>
                    <div className="vital-info">
                      <span className="vital-label">الأكسجين</span>
                      <span className="vital-value">
                        {visit.vitalSigns.spo2}
                        <small>%</small>
                      </span>
                    </div>
                  </div>
                )}
                {visit.vitalSigns.bloodGlucose && (
                  <div className="vital-card">
                    <div className="vital-icon">🩸</div>
                    <div className="vital-info">
                      <span className="vital-label">السكر</span>
                      <span className="vital-value">
                        {visit.vitalSigns.bloodGlucose}
                        <small>mg/dL</small>
                      </span>
                    </div>
                  </div>
                )}
                {visit.vitalSigns.weight && (
                  <div className="vital-card">
                    <div className="vital-icon">⚖️</div>
                    <div className="vital-info">
                      <span className="vital-label">الوزن</span>
                      <span className="vital-value">
                        {visit.vitalSigns.weight}
                        <small>kg</small>
                      </span>
                    </div>
                  </div>
                )}
                {visit.vitalSigns.height && (
                  <div className="vital-card">
                    <div className="vital-icon">📏</div>
                    <div className="vital-info">
                      <span className="vital-label">الطول</span>
                      <span className="vital-value">
                        {visit.vitalSigns.height}
                        <small>cm</small>
                      </span>
                    </div>
                  </div>
                )}
                {visit.vitalSigns.respiratoryRate && (
                  <div className="vital-card">
                    <div className="vital-icon">💨</div>
                    <div className="vital-info">
                      <span className="vital-label">التنفس</span>
                      <span className="vital-value">
                        {visit.vitalSigns.respiratoryRate}
                        <small>/min</small>
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Medications Section */}
          {visit.prescribedMedications && visit.prescribedMedications.length > 0 && (
            <div className="detail-section medications-section">
              <div className="section-header">
                <span className="section-icon">💊</span>
                <h4>الأدوية الموصوفة</h4>
                <span className="section-badge purple">
                  {visit.prescribedMedications.length} دواء
                </span>
              </div>
              <div className="medications-list">
                {visit.prescribedMedications.map((med, index) => (
                  <div key={index} className="medication-card">
                    <div className="med-header">
                      <div className="med-icon">💊</div>
                      <h5 className="med-name">{med.medicationName}</h5>
                    </div>
                    <div className="med-details">
                      <div className="med-detail-item">
                        <span className="detail-label">الجرعة:</span>
                        <span className="detail-value">{med.dosage}</span>
                      </div>
                      <div className="med-detail-item">
                        <span className="detail-label">التكرار:</span>
                        <span className="detail-value">{med.frequency}</span>
                      </div>
                      {med.duration && (
                        <div className="med-detail-item">
                          <span className="detail-label">المدة:</span>
                          <span className="detail-value">{med.duration}</span>
                        </div>
                      )}
                      {med.instructions && (
                        <div className="med-detail-item full-width">
                          <span className="detail-label">التعليمات:</span>
                          <span className="detail-value">{med.instructions}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Doctor Notes Section */}
          {visit.doctorNotes && (
            <div className="detail-section notes-section">
              <div className="section-header">
                <span className="section-icon">📝</span>
                <h4>ملاحظات الطبيب</h4>
                <span className="section-badge teal">Doctor Notes</span>
              </div>
              <div className="section-content highlight-box teal">
                <div className="notes-content">
                  <div className="notes-icon">📋</div>
                  <p>{visit.doctorNotes}</p>
                </div>
              </div>
            </div>
          )}

          {/* ECG Results if available */}
          {visit.ecgResults && (
            <div className="detail-section ecg-section">
              <div className="section-header">
                <span className="section-icon">❤️</span>
                <h4>نتائج تخطيط القلب</h4>
                <span className="section-badge red">ECG Results</span>
              </div>
              <div className="section-content highlight-box red">
                <pre className="ecg-results">{JSON.stringify(visit.ecgResults, null, 2)}</pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const PatientDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ isOpen: false, type: '', title: '', message: '', onConfirm: null });
  const [visits, setVisits] = useState([]);
  const [loadingVisits, setLoadingVisits] = useState(false);
  const [medications, setMedications] = useState([]);
const [medicationSchedule, setMedicationSchedule] = useState(null);
const [loadingMedications, setLoadingMedications] = useState(false);
  const [expandedVisit, setExpandedVisit] = useState(null);
  const [activeSection, setActiveSection] = useState('overview');
  const [symptoms, setSymptoms] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [consultationResult, setConsultationResult] = useState(null);
  const [consultationError, setConsultationError] = useState(null);
  const resultRef = useRef(null);

  const handleAnalyzeSymptoms = async () => {
    if (!symptoms.trim()) { 
      setConsultationError('Please enter your symptoms'); 
      return; 
    }
    
    if (!AI_SERVICE_CONFIG.isEnabled) { 
      setConsultationError('SERVICE_NOT_AVAILABLE'); 
      return; 
    }
    
    setIsAnalyzing(true); 
    setConsultationError(null); 
    setConsultationResult(null);
    
    try {
      console.log('📝 Analyzing symptoms:', symptoms);
      const response = await consultationAPI.analyzeSymptoms(symptoms);
      console.log('✅ AI Response:', response);
      
      if (response.success && response.data) {
        const specialistName = response.data.specialist;
        console.log('🔍 Looking for specialist:', specialistName);
        const spec = consultationAPI.getSpecializationByName(specialistName);
        
        if (spec) {
          console.log('✅ Found specialization:', spec);
          setConsultationResult({ 
            specialization: spec, 
            disease: response.data.disease,
            organSystem: response.data.organ_system,
            inputSymptoms: symptoms 
          });
          setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
        } else {
          console.error('❌ Specialization not found for:', specialistName);
          setConsultationError('SPECIALIZATION_NOT_FOUND');
        }
      } else {
        console.error('❌ Invalid response:', response);
        setConsultationError('INVALID_RESPONSE');
      }
    } catch (error) { 
      console.error('❌ AI Analysis Error:', error);
      if (error.message.includes('503')) {
        setConsultationError('AI service unavailable. Please try again later.');
      } else if (error.message.includes('504')) {
        setConsultationError('Request timeout. Please try again.');
      } else {
        setConsultationError('An error occurred during analysis.');
      }
    }
    finally { 
      setIsAnalyzing(false); 
    }
  };

  const resetConsultation = () => { 
    setSymptoms(''); 
    setConsultationResult(null); 
    setConsultationError(null); 
  };
  
  const openModal = (type, title, message, onConfirm = null) => setModal({ isOpen: true, type, title, message, onConfirm });
  const closeModal = () => setModal({ isOpen: false, type: '', title: '', message: '', onConfirm: null });
  const handleModalConfirm = () => { if (modal.onConfirm) modal.onConfirm(); closeModal(); };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const currentUser = authAPI.getCurrentUser();
      if (!currentUser) { 
        openModal('error', 'غير مصرح', 'يجب عليك تسجيل الدخول أولاً', () => navigate('/')); 
        return; 
      }
      if (currentUser.roles?.[0] !== 'patient') { 
        openModal('error', 'غير مصرح', 'هذه الصفحة متاحة للمرضى فقط', () => navigate('/')); 
        return; 
      }
      setUser(currentUser); 
      setVisits([]); 
      setLoading(false);
    };
    loadData();
  }, [navigate]);

  useEffect(() => {
    const loadVisits = async () => {
      if (!user) return;
      setLoadingVisits(true);
      
      try {
        const token = localStorage.getItem('token');
        console.log('📋 Loading patient visits...');
        
        const response = await fetch('http://localhost:5000/api/patient/visits', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        console.log('📥 Visits response:', data);
        
        if (response.ok && data.success) {
          setVisits(data.visits || []);
        } else {
          console.error('Failed to load visits:', data.message);
          setVisits([]);
        }
      } catch (error) {
        console.error('❌ Error loading visits:', error);
        setVisits([]);
      } finally {
        setLoadingVisits(false);
      }
    };
    
    loadVisits();
  }, [user]);

  useEffect(() => {
  const loadMedications = async () => {
    if (!user) return;
    
    setLoadingMedications(true);
    
    try {
      const token = localStorage.getItem('token');
      
      console.log('💊 Loading medications...');
      
      // Load current medications
      const medsResponse = await fetch('http://localhost:5000/api/patient/medications', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const medsData = await medsResponse.json();
      console.log('📥 Medications response:', medsData);
      
      if (medsResponse.ok && medsData.success) {
        setMedications(medsData.medications || []);
      }
      
      // Load medication schedule
      const scheduleResponse = await fetch('http://localhost:5000/api/patient/medications/schedule', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const scheduleData = await scheduleResponse.json();
      console.log('📅 Schedule response:', scheduleData);
      
      if (scheduleResponse.ok && scheduleData.success) {
        setMedicationSchedule(scheduleData.schedule);
      }
      
      console.log('🔍 Final Medications:', medsData.medications);
      console.log('🔍 Final Schedule:', scheduleData.schedule);

    } catch (error) {
      console.error('❌ Error loading medications:', error);
    } finally {
      setLoadingMedications(false);
    }
  };
  
  loadMedications();
}, [user]);

  const handleLogout = () => openModal('confirm', 'تأكيد تسجيل الخروج', 'هل أنت متأكد من رغبتك في تسجيل الخروج؟', () => authAPI.logout());
  
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }) : '-';
  
  const calculateAge = (d) => { 
    if (!d) return null; 
    const t = new Date(), b = new Date(d); 
    let a = t.getFullYear() - b.getFullYear(); 
    if (t.getMonth() < b.getMonth() || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())) a--; 
    return a; 
  };
  
  const calculateBMI = (h, w) => (h && w) ? (w / ((h/100) ** 2)).toFixed(1) : null;
  
  const getBMICategory = (b) => !b ? null : b < 18.5 ? 'نقص الوزن' : b < 25 ? 'وزن طبيعي' : b < 30 ? 'وزن زائد' : 'سمنة';
  
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

  const toggleVisitExpansion = (visitId) => {
    setExpandedVisit(expandedVisit === visitId ? null : visitId);
  };

  const getBMICategoryClass = (b) => !b ? '' : b < 18.5 ? 'underweight' : b < 25 ? 'normal' : b < 30 ? 'overweight' : 'obese';

  if (loading) return (
    <div className="loading-container">
      <div className="loading-spinner"></div>
      <p>جاري التحميل...</p>
    </div>
  );
  
  if (!user) return null;

  const age = calculateAge(user.dateOfBirth);
  const patientData = user.roleData?.patient || {};
  const bmi = calculateBMI(patientData.height, patientData.weight);
  const bmiCategory = getBMICategory(bmi);
  const bmiCategoryClass = getBMICategoryClass(parseFloat(bmi));

  return (
    <div className="patient-dashboard">
      <Navbar />
      
      {/* Modal */}
      {modal.isOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-container" onClick={e => e.stopPropagation()}>
            <div className={`modal-header ${modal.type}`}>
              <div className="modal-icon">{modal.type === 'success' ? '✓' : modal.type === 'error' ? '✕' : '؟'}</div>
              <h2>{modal.title}</h2>
            </div>
            <div className="modal-body"><p>{modal.message}</p></div>
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
        {/* Dashboard Tabs */}
        <div className="dashboard-tabs">
          {['overview', 'visits', 'consultation', 'medications'].map(section => (
            <button 
              key={section} 
              className={`tab-btn ${activeSection === section ? 'active' : ''}`} 
              onClick={() => setActiveSection(section)}
            >
              <span className="tab-icon">
                {section === 'overview' ? '📊' : section === 'visits' ? '📋' : section === 'consultation' ? '🤖' : '💊'}
              </span>
              {section === 'overview' ? 'نظرة عامة' : section === 'visits' ? 'سجل الزيارات' : section === 'consultation' ? 'استشيرني' : 'تقويم الأدوية'}
            </button>
          ))}
        </div>

        {/* OVERVIEW SECTION */}
        {activeSection === 'overview' && (
          <div className="section-content">
            {/* Profile Header Card - Combined with Welcome */}
            <div className="profile-header-card">
              {/* Logout Button */}
              <button className="logout-btn-profile" onClick={handleLogout}>
                <span>🚪</span>
                <span>تسجيل الخروج</span>
              </button>
              
              <div className="profile-main-content">
                <div className="profile-avatar">
                  <div className="avatar-circle"><span>{user.gender === 'male' ? '👨' : '👩'}</span></div>
                  <div className="avatar-badge"><span>✓</span></div>
                </div>
                <div className="profile-header-info">
                  <p className="welcome-greeting">مرحباً 👋</p>
                  <h1>{user.firstName} {user.lastName}</h1>
                  <p className="profile-role">مريض - Patient 360°</p>
                  <div className="profile-meta-info">
                    {age && <div className="meta-item"><span>🎂</span><span>{age} سنة</span></div>}
                    {user.gender && <div className="meta-item"><span>{user.gender === 'male' ? '♂️' : '♀️'}</span><span>{user.gender === 'male' ? 'ذكر' : 'أنثى'}</span></div>}
                    {patientData.bloodType && <div className="meta-item"><span>🩸</span><span>{patientData.bloodType}</span></div>}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="quick-stats-grid">
              <div className="quick-stat-card visits">
                <div className="stat-icon-wrapper"><span>📋</span></div>
                <div className="stat-content">
                  <h3>{visits.length}</h3>
                  <p>زيارة طبية</p>
                </div>
              </div>
              {bmi && (
                <div className={`quick-stat-card bmi ${bmiCategoryClass}`}>
                  <div className="stat-icon-wrapper"><span>⚖️</span></div>
                  <div className="stat-content">
                    <h3>{bmi}</h3>
                    <p>مؤشر كتلة الجسم</p>
                    <span className={`stat-badge ${bmiCategoryClass}`}>{bmiCategory}</span>
                  </div>
                </div>
              )}
            </div>

            {/* BMI Scale Indicator - NEW PROFESSIONAL COMPONENT */}
            {bmi && (
              <BMIScaleIndicator 
                bmi={bmi} 
                weight={patientData.weight} 
                height={patientData.height} 
              />
            )}

            {/* Personal Information Section */}
            <div className="data-section">
              <div className="section-header">
                <div className="section-title-wrapper">
                  <span className="section-icon">👤</span>
                  <h2>المعلومات الشخصية</h2>
                </div>
              </div>
              <div className="info-cards-grid">
                <div className="info-display-card">
                  <div className="card-icon-header">
                    <div className="icon-circle email"><span>✉️</span></div>
                    <h3>البريد الإلكتروني</h3>
                  </div>
                  <p className="card-value" dir="ltr">{user.email}</p>
                </div>
                <div className="info-display-card">
                  <div className="card-icon-header">
                    <div className="icon-circle phone"><span>📱</span></div>
                    <h3>رقم الهاتف</h3>
                  </div>
                  <p className="card-value" dir="ltr">{user.phoneNumber || 'غير محدد'}</p>
                </div>
                <div className="info-display-card">
                  <div className="card-icon-header">
                    <div className="icon-circle id"><span>🆔</span></div>
                    <h3>رقم الهوية</h3>
                  </div>
                  <p className="card-value">{user.nationalId || 'غير محدد'}</p>
                </div>
                <div className="info-display-card">
                  <div className="card-icon-header">
                    <div className="icon-circle birth"><span>🎂</span></div>
                    <h3>تاريخ الميلاد</h3>
                  </div>
                  <p className="card-value">{formatDate(user.dateOfBirth)}</p>
                </div>
                {user.address && (
                  <div className="info-display-card full-width">
                    <div className="card-icon-header">
                      <div className="icon-circle address"><span>📍</span></div>
                      <h3>العنوان</h3>
                    </div>
                    <p className="card-value">{user.address}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Medical Information Section */}
            {(patientData.bloodType || patientData.height || patientData.weight) && (
              <div className="data-section">
                <div className="section-header">
                  <div className="section-title-wrapper">
                    <span className="section-icon">🏥</span>
                    <h2>المعلومات الطبية</h2>
                  </div>
                </div>
                <div className="medical-info-grid">
                  {patientData.bloodType && (
                    <div className="medical-card">
                      <div className="medical-card-header">
                        <div className="medical-icon">🩸</div>
                        <h3>فصيلة الدم</h3>
                      </div>
                      <div className="medical-value-large">{patientData.bloodType}</div>
                    </div>
                  )}
                  {patientData.height && (
                    <div className="medical-card">
                      <div className="medical-card-header">
                        <div className="medical-icon">📏</div>
                        <h3>الطول</h3>
                      </div>
                      <div className="medical-value-large">{patientData.height}</div>
                      <div className="medical-unit">سم</div>
                    </div>
                  )}
                  {patientData.weight && (
                    <div className="medical-card">
                      <div className="medical-card-header">
                        <div className="medical-icon">⚖️</div>
                        <h3>الوزن</h3>
                      </div>
                      <div className="medical-value-large">{patientData.weight}</div>
                      <div className="medical-unit">كجم</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Health History Section */}
            <div className="data-section">
              <div className="section-header">
                <div className="section-title-wrapper">
                  <span className="section-icon">📜</span>
                  <h2>السجل الصحي</h2>
                </div>
              </div>
              <div className="health-history-grid">
                <div className="history-card allergies-card">
                  <div className="history-header">
                    <div className="history-icon">⚠️</div>
                    <h3>الحساسية</h3>
                    <span className="count-badge">{patientData.allergies?.length || 0}</span>
                  </div>
                  {patientData.allergies?.length > 0 ? (
                    <ul className="history-list">
                      {patientData.allergies.map((a, i) => (
                        <li key={i} className="history-item"><span>•</span><span>{a}</span></li>
                      ))}
                    </ul>
                  ) : (
                    <div className="no-data-message"><span>✓</span><p>لا توجد حساسية مسجلة</p></div>
                  )}
                </div>
                <div className="history-card diseases-card">
                  <div className="history-header">
                    <div className="history-icon">🏥</div>
                    <h3>الأمراض المزمنة</h3>
                    <span className="count-badge">{patientData.chronicDiseases?.length || 0}</span>
                  </div>
                  {patientData.chronicDiseases?.length > 0 ? (
                    <ul className="history-list">
                      {patientData.chronicDiseases.map((d, i) => (
                        <li key={i} className="history-item"><span>•</span><span>{d}</span></li>
                      ))}
                    </ul>
                  ) : (
                    <div className="no-data-message"><span>✓</span><p>لا توجد أمراض مزمنة</p></div>
                  )}
                </div>
                <div className="history-card family-card">
                  <div className="history-header">
                    <div className="history-icon">👨‍👩‍👧‍👦</div>
                    <h3>التاريخ العائلي</h3>
                    <span className="count-badge">{patientData.familyHistory?.length || 0}</span>
                  </div>
                  {patientData.familyHistory?.length > 0 ? (
                    <ul className="history-list">
                      {patientData.familyHistory.map((h, i) => (
                        <li key={i} className="history-item"><span>•</span><span>{h}</span></li>
                      ))}
                    </ul>
                  ) : (
                    <div className="no-data-message"><span>✓</span><p>لا يوجد تاريخ عائلي مسجل</p></div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VISITS SECTION - REDESIGNED */}
        {activeSection === 'visits' && (
          <div className="section-content">
            <div className="visits-page-container redesigned">
              {/* Header */}
              <div className="visits-page-header">
                <div className="visits-header-content">
                  <div className="visits-icon-box">
                    <span>📋</span>
                    <div className="pulse-ring"></div>
                  </div>
                  <div className="visits-header-text">
                    <h1>سجل الزيارات الطبية</h1>
                    <p>Medical Visits History</p>
                  </div>
                </div>
                <div className="visits-count-badge">
                  <span className="count-number">{visits.length}</span>
                  <span>زيارة</span>
                </div>
              </div>

              {/* Loading State */}
              {loadingVisits && (
                <div className="loading-state">
                  <div className="spinner"></div>
                  <p>جاري تحميل الزيارات...</p>
                </div>
              )}

              {/* Empty State */}
              {!loadingVisits && visits.length === 0 && (
                <div className="empty-state-card">
                  <div className="empty-icon">📋</div>
                  <h3>لا توجد زيارات طبية</h3>
                  <p>سيتم عرض زياراتك الطبية هنا بعد مراجعة الطبيب</p>
                  <div className="empty-info">
                    <span>💡</span>
                    <p>سجل الزيارات يتضمن التشخيص والأدوية وملاحظات الطبيب</p>
                  </div>
                </div>
              )}

              {/* Visits Timeline - Professional Accordion */}
              {!loadingVisits && visits.length > 0 && (
                <div className="visits-timeline-professional">
                  {visits.map((visit, index) => (
                    <VisitDetailsAccordion
                      key={visit._id || index}
                      visit={visit}
                      isExpanded={expandedVisit === (visit._id || index)}
                      onToggle={() => toggleVisitExpansion(visit._id || index)}
                      formatDateTime={formatDateTime}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* CONSULTATION SECTION */}
        {activeSection === 'consultation' && (
          <div className="section-content">
            <div className="consultation-main-container">
              <div className="consultation-page-header">
                <div className="consultation-header-content">
                  <div className="consultation-icon-box">
                    <span className="ai-icon">🤖</span>
                    <div className="ai-pulse-ring"></div>
                  </div>
                  <div className="consultation-header-text">
                    <h1>استشيرني</h1>
                    <p>AI Medical Consultation Assistant</p>
                  </div>
                </div>
                <div className="consultation-header-badge">
                  <span>🏥</span>
                  <span>{MEDICAL_SPECIALIZATIONS.length} تخصص طبي</span>
                </div>
              </div>

              <div className="consultation-disclaimer-banner">
                <span>⚠️</span>
                <p><strong>Important:</strong> This service provides guidance only and does not replace professional medical consultation.</p>
              </div>
              
              <div className="symptoms-input-card">
                <div className="input-card-header">
                  <span>💬</span>
                  <div>
                    <h3>Describe Your Symptoms</h3>
                    <p>صف أعراضك باللغة الإنجليزية</p>
                  </div>
                </div>
                <div className="input-card-body">
                  <textarea 
                    className="symptoms-textarea-main" 
                    placeholder="Example: I have chest pain and shortness of breath..." 
                    value={symptoms} 
                    onChange={e => setSymptoms(e.target.value)} 
                    rows={4} 
                    disabled={isAnalyzing} 
                    dir="ltr" 
                  />
                  <div className="input-actions">
                    {consultationResult && (
                      <button className="reset-btn" onClick={resetConsultation}>
                        <span>🔄</span>
                        <span>استشارة جديدة</span>
                      </button>
                    )}
                    <button className="analyze-main-btn" onClick={handleAnalyzeSymptoms} disabled={!symptoms.trim() || isAnalyzing}>
                      {isAnalyzing ? (
                        <>
                          <span className="spinner"></span>
                          <span>Analyzing...</span>
                        </>
                      ) : (
                        <>
                          <span>🔍</span>
                          <span>Analyze Symptoms</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
                {consultationError && (
                  <div className="consultation-error-message">
                    <span>❌</span>
                    <p>{consultationError}</p>
                  </div>
                )}
              </div>
              
              {consultationResult && (
                <div className="consultation-result-card" ref={resultRef}>
                  <div className="result-card-header">
                    <div className="result-success-icon">✅</div>
                    <div>
                      <h3>Analysis Results</h3>
                      <p>نتائج التحليل</p>
                    </div>
                  </div>
                  <div className="result-card-body">
                    <div className="result-info-row">
                      <span className="result-label">🩺 Possible Condition:</span>
                      <span className="result-value">{consultationResult.disease}</span>
                    </div>
                    
                    <div className="result-info-row">
                      <span className="result-label">🫀 Affected System:</span>
                      <span className="result-value">{consultationResult.organSystem}</span>
                    </div>
                    
                    <div className="result-specialization-card" style={{ borderColor: consultationResult.specialization.color }}>
                      <div className="result-spec-icon" style={{ background: `${consultationResult.specialization.color}20` }}>
                        <span>{consultationResult.specialization.icon}</span>
                      </div>
                      <div className="result-spec-info">
                        <div className="result-label">👨‍⚕️ Recommended Specialist:</div>
                        <h4>{consultationResult.specialization.nameAr}</h4>
                        <p className="result-spec-en">{consultationResult.specialization.nameEn}</p>
                        <p className="result-spec-desc">{consultationResult.specialization.description}</p>
                      </div>
                    </div>
                    
                    <div className="result-symptoms-ref">
                      <span>💡</span>
                      <div>
                        <strong>Based on:</strong>
                        <p>"{consultationResult.inputSymptoms}"</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="all-specializations-section">
                <div className="specializations-section-header">
                  <div className="spec-section-title">
                    <span>🏥</span>
                    <div>
                      <h2>التخصصات الطبية المتاحة</h2>
                      <p>All Available Medical Specializations</p>
                    </div>
                  </div>
                  <div className="spec-count-badge">
                    <span className="count-num">{MEDICAL_SPECIALIZATIONS.length}</span>
                    <span>تخصص</span>
                  </div>
                </div>
                <div className="specializations-elegant-grid">
                  {MEDICAL_SPECIALIZATIONS.map((spec, i) => (
                    <div key={spec.id} className="spec-elegant-card" style={{ '--spec-color': spec.color, '--delay': `${i * 0.03}s` }}>
                      <div className="spec-card-top-accent" style={{ background: spec.color }}></div>
                      <div className="spec-card-content">
                        <div className="spec-icon-wrapper" style={{ background: `${spec.color}15` }}>
                          <span>{spec.icon}</span>
                        </div>
                        <div className="spec-text-content">
                          <h4>{spec.nameAr}</h4>
                          <p>{spec.nameEn}</p>
                        </div>
                      </div>
                      <div className="spec-hover-description">
                        <p>{spec.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="how-service-works">
                <div className="how-works-header">
                  <span>📖</span>
                  <div>
                    <h3>كيف تعمل الخدمة؟</h3>
                    <p>How does it work?</p>
                  </div>
                </div>
                <div className="how-steps-container">
                  <div className="how-step-item">
                    <div className="step-num-circle"><span>1</span></div>
                    <div className="step-info"><h4>Describe Symptoms</h4><p>وصف الأعراض</p></div>
                  </div>
                  <div className="step-arrow">→</div>
                  <div className="how-step-item">
                    <div className="step-num-circle"><span>2</span></div>
                    <div className="step-info"><h4>AI Analysis</h4><p>تحليل الذكاء الاصطناعي</p></div>
                  </div>
                  <div className="step-arrow">→</div>
                  <div className="how-step-item">
                    <div className="step-num-circle"><span>3</span></div>
                    <div className="step-info"><h4>Get Recommendation</h4><p>الحصول على التوصية</p></div>
                  </div>
                </div>
              </div>

              <div className="important-notice-box">
                <div className="notice-icon-wrap">⚠️</div>
                <div className="notice-content">
                  <h4>تنبيه هام / Important Notice</h4>
                  <p>هذه الخدمة استرشادية فقط ولا تغني عن الاستشارة الطبية المباشرة. في حالة الطوارئ، توجه لأقرب مستشفى فوراً.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MEDICATIONS SECTION */}
      {activeSection === 'medications' && (
  <div className="section-content">
    <div className="medications-page-container">
      {/* Header */}
      <div className="medications-page-header">
        <div className="medications-header-content">
          <div className="medications-icon-box">
            <span>💊</span>
            <div className="pulse-ring"></div>
          </div>
          <div className="medications-header-text">
            <h1>تقويم الأدوية</h1>
            <p>Medication Calendar & Schedule</p>
          </div>
        </div>
        <div className="medications-count-badge">
          <span className="count-number">{medications.length}</span>
          <span>دواء نشط</span>
        </div>
      </div>

      {/* Loading State */}
      {loadingMedications && (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>جاري تحميل الأدوية...</p>
        </div>
      )}

      {/* Empty State */}
      {!loadingMedications && medications.length === 0 && (
        <div className="empty-state-card">
          <div className="empty-icon">💊</div>
          <h3>لا توجد أدوية موصوفة</h3>
          <p>سيتم عرض الأدوية الموصوفة هنا بعد زيارة الطبيب</p>
          <div className="empty-info">
            <span>💡</span>
            <p>التقويم يعرض مواعيد تناول الأدوية اليومية والأسبوعية</p>
          </div>
        </div>
      )}

      {/* Active Medications */}
      {!loadingMedications && medications.length > 0 && (
        <>
          {/* Current Medications List */}
          <div className="current-medications-section">
            <div className="section-header-meds">
              <div className="header-left">
                <span className="section-icon">📋</span>
                <div>
                  <h2>الأدوية النشطة</h2>
                  <p>Active Medications</p>
                </div>
              </div>
              <span className="meds-count-badge">{medications.length} دواء</span>
            </div>

            <div className="medications-grid">
              {medications.map((med, index) => (
                <div key={index} className="medication-card-calendar">
                  {/* Card Header */}
                  <div className="med-card-header-calendar">
                    <div className="med-icon-wrapper">
                      <span>💊</span>
                    </div>
                    <div className="med-header-info">
                      <h3>{med.medicationName}</h3>
                      <p className="med-dosage">{med.dosage}</p>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="med-card-body-calendar">
                    <div className="med-info-row">
                      <span className="info-icon">🕐</span>
                      <div className="info-content">
                        <span className="info-label">التكرار:</span>
                        <span className="info-value">{med.frequency}</span>
                      </div>
                    </div>

                    {med.duration && (
                      <div className="med-info-row">
                        <span className="info-icon">⏱️</span>
                        <div className="info-content">
                          <span className="info-label">المدة:</span>
                          <span className="info-value">{med.duration}</span>
                        </div>
                      </div>
                    )}

                    {med.instructions && (
                      <div className="med-info-row">
                        <span className="info-icon">📝</span>
                        <div className="info-content">
                          <span className="info-label">التعليمات:</span>
                          <span className="info-value">{med.instructions}</span>
                        </div>
                      </div>
                    )}

                    {/* Doctor Info */}
                    <div className="med-doctor-info">
                      <div className="doctor-avatar-small">
                        <span>👨‍⚕️</span>
                      </div>
                      <div className="doctor-details-small">
                        <span className="doctor-name-small">{med.doctorName}</span>
                        {med.doctorSpecialization && (
                          <span className="doctor-spec-small">{med.doctorSpecialization}</span>
                        )}
                      </div>
                    </div>

                    {/* Prescribed Date */}
                    <div className="prescribed-date">
                      <span className="date-icon">📅</span>
                      <span className="date-text">
                        {new Date(med.visitDate).toLocaleDateString('ar-EG', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Weekly Schedule */}
          {medicationSchedule && medicationSchedule.weeklySchedule && (
            <div className="weekly-schedule-section">
              <div className="section-header-meds">
                <div className="header-left">
                  <span className="section-icon">📅</span>
                  <div>
                    <h2>التقويم الأسبوعي</h2>
                    <p>Weekly Medication Schedule</p>
                  </div>
                </div>
              </div>

              <div className="weekly-schedule-grid">
                {medicationSchedule.weeklySchedule.map((daySchedule, index) => (
                  <div 
                    key={index} 
                    className={`day-schedule-card ${index === new Date().getDay() ? 'today' : ''}`}
                  >
                    {/* Day Header */}
                    <div className="day-header">
                      <h3>{daySchedule.day}</h3>
                      {index === new Date().getDay() && (
                        <span className="today-badge">اليوم</span>
                      )}
                      <span className="day-count">
                        {daySchedule.medications.length} جرعة
                      </span>
                    </div>

                    {/* Day Medications Timeline */}
                    <div className="day-medications-timeline">
                      {daySchedule.medications.length > 0 ? (
                        daySchedule.medications.map((med, medIndex) => (
                          <div key={medIndex} className="timeline-item">
                            <div className="timeline-time">
                              <span className="time-icon">🕐</span>
                              <span className="time-text">{med.time}</span>
                            </div>
                            <div className="timeline-content">
                              <div className="timeline-med-name">
                                <span className="med-icon-small">💊</span>
                                <span>{med.medicationName}</span>
                              </div>
                              <div className="timeline-med-dosage">{med.dosage}</div>
                              {med.instructions && (
                                <div className="timeline-med-instructions">
                                  {med.instructions}
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="no-medications-day">
                          <span>✓</span>
                          <p>لا توجد أدوية</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Medication Instructions Banner */}
          <div className="medication-instructions-banner">
            <div className="instructions-icon">⚠️</div>
            <div className="instructions-content">
              <h4>تعليمات هامة</h4>
              <ul>
                <li>التزم بمواعيد تناول الأدوية المحددة من قبل الطبيب</li>
                <li>لا توقف أو تغير الجرعة دون استشارة الطبيب</li>
                <li>احتفظ بالأدوية في مكان آمن وبعيد عن متناول الأطفال</li>
                <li>في حالة نسيان جرعة، استشر الطبيب أو الصيدلي</li>
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  </div>
)}
      </div>
    </div>
  );
};

export default PatientDashboard;