// src/pages/PatientDashboard.jsx
// ✅ REDESIGNED - Professional Medical Visits Log with Animated BMI Scale

import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import { authAPI } from '../services/api';
import { useTheme } from '../context/ThemeProvider';
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
 * MAP AI RESPONSE TO DB SPECIALIZATIONS
 * Keys = AI model output names → Values = doctors.specialization DB enum
 */
/**
 * BOOKING SPECIALIZATIONS — for appointment booking wizard
 * id must match doctors.specialization DB enum exactly
 */
const BOOKING_SPECIALIZATIONS = [
  { id: 'cardiology', nameAr: 'طب القلب', icon: '❤️' },
  { id: 'pulmonology', nameAr: 'طب الرئة', icon: '🫁' },
  { id: 'general_practice', nameAr: 'طب عام', icon: '🩺' },
  { id: 'orthopedics', nameAr: 'جراحة العظام', icon: '🦿' },
  { id: 'neurology', nameAr: 'طب الأعصاب', icon: '🧠' },
  { id: 'endocrinology', nameAr: 'طب الغدد الصماء', icon: '⚗️' },
  { id: 'dermatology', nameAr: 'طب الجلدية', icon: '🧴' },
  { id: 'gastroenterology', nameAr: 'الجهاز الهضمي', icon: '🫃' },
  { id: 'surgery', nameAr: 'الجراحة العامة', icon: '🔪' },
  { id: 'urology', nameAr: 'المسالك البولية', icon: '💧' },
  { id: 'gynecology', nameAr: 'النساء والتوليد', icon: '🤰' },
  { id: 'psychiatry', nameAr: 'الطب النفسي', icon: '🧘' },
  { id: 'hematology', nameAr: 'طب الدم', icon: '🩸' },
  { id: 'oncology', nameAr: 'طب الأورام', icon: '🎗️' },
  { id: 'otolaryngology', nameAr: 'أنف أذن حنجرة', icon: '👂' },
  { id: 'ophthalmology', nameAr: 'طب العيون', icon: '👁️' },
  { id: 'pediatrics', nameAr: 'طب الأطفال', icon: '👶' },
  { id: 'nephrology', nameAr: 'طب الكلى', icon: '🫘' },
  { id: 'internal_medicine', nameAr: 'الطب الباطني', icon: '🏨' },
  { id: 'emergency_medicine', nameAr: 'طب الطوارئ', icon: '🚑' },
  { id: 'rheumatology', nameAr: 'طب الروماتيزم', icon: '🦴' },
  { id: 'vascular_surgery', nameAr: 'جراحة الأوعية', icon: '🫀' },
  { id: 'anesthesiology', nameAr: 'طب التخدير', icon: '💉' },
  { id: 'radiology', nameAr: 'الأشعة التشخيصية', icon: '📡' }
];

/**
 * MAP AI RESPONSE TO DB SPECIALIZATIONS
 * Keys = AI model output names → Values = doctors.specialization DB enum
 */
const SPECIALIZATION_MAPPING = {
  'Cardiologist': 'cardiology',
  'Pulmonologist': 'pulmonology',
  'General Practitioner': 'general_practice',
  'Rheumatologist': 'rheumatology',
  'Orthopedic Surgeon': 'orthopedics',
  'Neurologist': 'neurology',
  'Endocrinologist': 'endocrinology',
  'Dermatologist': 'dermatology',
  'Gastroenterologist': 'gastroenterology',
  'General Surgeon': 'surgery',
  'Urologist': 'urology',
  'Gynecologist': 'gynecology',
  'Psychiatrist': 'psychiatry',
  'Hematologist': 'hematology',
  'Hematologist/Oncologist': 'oncology',
  'Oncologist': 'oncology',
  'ENT Specialist': 'otolaryngology',
  'Ophthalmologist': 'ophthalmology',
  'Pediatrician': 'pediatrics',
  'Nephrologist': 'nephrology',
  'Internal Medicine': 'internal_medicine',
  'Emergency Medicine': 'emergency_medicine',
  'Anesthesiologist': 'anesthesiology',
  'Radiologist': 'radiology',
  'Vascular Surgeon': 'vascular_surgery'
};

/**
 * ALL 24 MEDICAL SPECIALIZATIONS — matches doctors.specialization DB enum
 */
const MEDICAL_SPECIALIZATIONS = [
  { id: 'cardiology', nameEn: 'Cardiology', nameAr: 'طب القلب', icon: '❤️', color: 'var(--tm-error, #D32F2F)', description: 'متخصص في تشخيص وعلاج أمراض القلب والأوعية الدموية' },
  { id: 'pulmonology', nameEn: 'Pulmonology', nameAr: 'طب الرئة', icon: '🫁', color: 'var(--tm-action, #00897B)', description: 'متخصص في أمراض الجهاز التنفسي والرئتين' },
  { id: 'general_practice', nameEn: 'General Practice', nameAr: 'طب عام', icon: '🩺', color: 'var(--tm-success, #00897B)', description: 'طبيب للفحص الشامل والتشخيص الأولي' },
  { id: 'rheumatology', nameEn: 'Rheumatology', nameAr: 'طب الروماتيزم', icon: '🦴', color: '#8b5cf6', description: 'متخصص في أمراض المفاصل والروماتيزم' },
  { id: 'orthopedics', nameEn: 'Orthopedics', nameAr: 'جراحة العظام', icon: '🦿', color: '#6366f1', description: 'متخصص في جراحة العظام والمفاصل' },
  { id: 'neurology', nameEn: 'Neurology', nameAr: 'طب الأعصاب', icon: '🧠', color: '#ec4899', description: 'متخصص في أمراض الجهاز العصبي' },
  { id: 'endocrinology', nameEn: 'Endocrinology', nameAr: 'طب الغدد الصماء', icon: '⚗️', color: 'var(--tm-accent, #4DB6AC)', description: 'متخصص في أمراض الغدد والهرمونات' },
  { id: 'dermatology', nameEn: 'Dermatology', nameAr: 'طب الجلدية', icon: '🧴', color: '#f97316', description: 'متخصص في أمراض الجلد والشعر' },
  { id: 'gastroenterology', nameEn: 'Gastroenterology', nameAr: 'طب الجهاز الهضمي', icon: '🫃', color: '#eab308', description: 'متخصص في أمراض الجهاز الهضمي' },
  { id: 'surgery', nameEn: 'Surgery', nameAr: 'الجراحة العامة', icon: '🔪', color: '#64748b', description: 'متخصص في العمليات الجراحية العامة' },
  { id: 'urology', nameEn: 'Urology', nameAr: 'طب المسالك البولية', icon: '💧', color: '#0ea5e9', description: 'متخصص في أمراض الكلى والمسالك البولية' },
  { id: 'gynecology', nameEn: 'Gynecology', nameAr: 'طب النساء والتوليد', icon: '🤰', color: '#db2777', description: 'متخصص في صحة المرأة والحمل والولادة' },
  { id: 'psychiatry', nameEn: 'Psychiatry', nameAr: 'الطب النفسي', icon: '🧘', color: '#7c3aed', description: 'متخصص في الصحة النفسية' },
  { id: 'hematology', nameEn: 'Hematology', nameAr: 'طب الدم', icon: '🩸', color: '#be123c', description: 'متخصص في أمراض الدم' },
  { id: 'oncology', nameEn: 'Oncology', nameAr: 'طب الأورام', icon: '🎗️', color: '#9333ea', description: 'متخصص في تشخيص وعلاج الأورام' },
  { id: 'otolaryngology', nameEn: 'Otolaryngology (ENT)', nameAr: 'أنف أذن حنجرة', icon: '👂', color: '#059669', description: 'متخصص في أمراض الأذن والأنف والحنجرة' },
  { id: 'ophthalmology', nameEn: 'Ophthalmology', nameAr: 'طب العيون', icon: '👁️', color: '#0284c7', description: 'متخصص في أمراض العيون' },
  { id: 'pediatrics', nameEn: 'Pediatrics', nameAr: 'طب الأطفال', icon: '👶', color: '#f472b6', description: 'متخصص في صحة الأطفال والرضع' },
  { id: 'nephrology', nameEn: 'Nephrology', nameAr: 'طب الكلى', icon: '🫘', color: '#2563eb', description: 'متخصص في أمراض الكلى' },
  { id: 'internal_medicine', nameEn: 'Internal Medicine', nameAr: 'الطب الباطني', icon: '🏨', color: 'var(--tm-primary, #0D3B3E)', description: 'متخصص في الأمراض الباطنية' },
  { id: 'emergency_medicine', nameEn: 'Emergency Medicine', nameAr: 'طب الطوارئ', icon: '🚑', color: '#dc2626', description: 'متخصص في حالات الطوارئ الطبية' },
  { id: 'vascular_surgery', nameEn: 'Vascular Surgery', nameAr: 'جراحة الأوعية', icon: '🫀', color: '#a855f7', description: 'متخصص في جراحة الأوعية الدموية' },
  { id: 'anesthesiology', nameEn: 'Anesthesiology', nameAr: 'طب التخدير', icon: '💉', color: '#78716c', description: 'متخصص في التخدير والرعاية المحيطة بالجراحة' },
  { id: 'radiology', nameEn: 'Radiology', nameAr: 'الأشعة التشخيصية', icon: '📡', color: '#0891b2', description: 'متخصص في التصوير الطبي والأشعة' }
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
    if (b < 18.5) return { label: 'نقص الوزن', labelEn: 'Underweight', color: 'var(--tm-action, #00897B)', class: 'underweight' };
    if (b < 25) return { label: 'وزن طبيعي', labelEn: 'Normal', color: 'var(--tm-success, #00897B)', class: 'normal' };
    if (b < 30) return { label: 'وزن زائد', labelEn: 'Overweight', color: 'var(--tm-warning, #F57C00)', class: 'overweight' };
    return { label: 'سمنة', labelEn: 'Obese', color: 'var(--tm-error, #D32F2F)', class: 'obese' };
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
                {visit.doctorId?.hospitalAffiliation && (
                  <div className="info-row">
                    <span className="info-label">المؤسسة:</span>
                    <span className="info-value">{visit.doctorId.hospitalAffiliation}</span>
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
                {visit.vitalSigns.oxygenSaturation && (
                  <div className="vital-card">
                    <div className="vital-icon">🫁</div>
                    <div className="vital-info">
                      <span className="vital-label">الأكسجين</span>
                      <span className="vital-value">
                        {visit.vitalSigns.oxygenSaturation}
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
                      {med.route && (
                        <div className="med-detail-item">
                          <span className="detail-label">طريقة الاستخدام:</span>
                          <span className="detail-value route-badge">
                            {med.route === 'oral' ? '💊 فموي' :
                             med.route === 'injection' ? '💉 حقن' :
                             med.route === 'topical' ? '🧴 موضعي' :
                             med.route === 'inhalation' ? '🫁 استنشاق' :
                             med.route === 'sublingual' ? '👅 تحت اللسان' :
                             med.route === 'rectal' ? 'شرجي' : med.route}
                          </span>
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

          {/* ECG Analysis if available */}
          {visit.ecgAnalysis && (
            <div className="detail-section ecg-section">
              <div className="section-header">
                <span className="section-icon">❤️</span>
                <h4>نتائج تخطيط القلب (ECG)</h4>
                <span className="section-badge red">ECG Analysis</span>
              </div>
              <div className="section-content highlight-box red">
                {visit.ecgAnalysis.topPrediction && (
                  <div className="ecg-top-result">
                    <span className="ecg-label">التشخيص الرئيسي:</span>
                    <span className="ecg-value">{visit.ecgAnalysis.topPrediction}</span>
                  </div>
                )}
                {visit.ecgAnalysis.recommendation && (
                  <div className="ecg-recommendation">
                    <span className="ecg-label">التوصية:</span>
                    <p>{visit.ecgAnalysis.recommendation}</p>
                  </div>
                )}
                {visit.ecgAnalysis.predictions && visit.ecgAnalysis.predictions.length > 0 && (
                  <div className="ecg-predictions">
                    {visit.ecgAnalysis.predictions.map((pred, idx) => (
                      <div key={idx} className="ecg-prediction-item">
                        <span className="pred-class">{pred.arabicLabel || pred.class}</span>
                        <div className="pred-bar-wrapper">
                          <div className="pred-bar" style={{ width: `${pred.confidence}%` }}></div>
                        </div>
                        <span className="pred-confidence">{pred.confidence?.toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                )}
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
  const { theme } = useTheme();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ isOpen: false, type: '', title: '', message: '', onConfirm: null });
  const [visits, setVisits] = useState([]);
  const [loadingVisits, setLoadingVisits] = useState(false);
  const [medications, setMedications] = useState([]);
  const [loadingMedications, setLoadingMedications] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [labResults, setLabResults] = useState([]);
  const [loadingLabResults, setLoadingLabResults] = useState(false);
  const [prescriptions, setPrescriptions] = useState([]);
  const [loadingPrescriptions, setLoadingPrescriptions] = useState(false);
  const [expandedVisit, setExpandedVisit] = useState(null);
  const [activeSection, setActiveSection] = useState('overview');
  const [symptoms, setSymptoms] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [consultationResult, setConsultationResult] = useState(null);
  const [consultationError, setConsultationError] = useState(null);
  const resultRef = useRef(null);

  // ── Booking Wizard State ────────────────────────────────────────
  const [bookingStep, setBookingStep] = useState(0); // 0=closed, 1=specialization, 2=doctor, 3=slot, 4=confirm
  const [bookingSpec, setBookingSpec] = useState('');
  const [bookingDoctors, setBookingDoctors] = useState([]);
  const [bookingDoctorsLoading, setBookingDoctorsLoading] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [doctorSlots, setDoctorSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [bookingReason, setBookingReason] = useState('');
  const [bookingSubmitting, setBookingSubmitting] = useState(false);

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
  
      
      console.log('🔍 Final Medications:', medsData.medications);
      

    } catch (error) {
      console.error('❌ Error loading medications:', error);
    } finally {
      setLoadingMedications(false);
    }
  };
  
  loadMedications();
}, [user]);

  // Load Appointments
  useEffect(() => {
    const loadAppointments = async () => {
      if (!user) return;
      setLoadingAppointments(true);
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:5000/api/patient/appointments', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (response.ok && data.success) {
          setAppointments(data.appointments || []);
        }
      } catch (error) {
        console.error('Error loading appointments:', error);
      } finally {
        setLoadingAppointments(false);
      }
    };
    loadAppointments();
  }, [user]);

  // Load Lab Results
  useEffect(() => {
    const loadLabResults = async () => {
      if (!user) return;
      setLoadingLabResults(true);
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:5000/api/patient/lab-results', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (response.ok && data.success) {
          setLabResults(data.labTests || []);
        }
      } catch (error) {
        console.error('Error loading lab results:', error);
      } finally {
        setLoadingLabResults(false);
      }
    };
    loadLabResults();
  }, [user]);

  // Load Prescriptions
  useEffect(() => {
    const loadPrescriptions = async () => {
      if (!user) return;
      setLoadingPrescriptions(true);
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:5000/api/patient/prescriptions', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (response.ok && data.success) {
          setPrescriptions(data.prescriptions || []);
        }
      } catch (error) {
        console.error('Error loading prescriptions:', error);
      } finally {
        setLoadingPrescriptions(false);
      }
    };
    loadPrescriptions();
  }, [user]);

  // ══════════════════════════════════════════════════════════════
  // BOOKING WIZARD — Appointment Reservation Flow
  // ══════════════════════════════════════════════════════════════

  /** Step 1 → Step 2: Select specialization → load doctors */
  const handleSelectSpecialization = async (specId) => {
    setBookingSpec(specId);
    setBookingDoctors([]);
    setSelectedDoctor(null);
    setDoctorSlots([]);
    setSelectedSlot(null);
    setBookingStep(2);
    setBookingDoctorsLoading(true);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/patient/doctors?specialization=${specId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setBookingDoctors(data.doctors || []);
      }
    } catch (e) { console.error('Load doctors error:', e); }
    finally { setBookingDoctorsLoading(false); }
  };

  /** Step 2 → Step 3: Select doctor → load available slots */
  const handleSelectDoctor = async (doctor) => {
    setSelectedDoctor(doctor);
    setDoctorSlots([]);
    setSelectedSlot(null);
    setBookingStep(3);
    setSlotsLoading(true);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/patient/doctors/${doctor._id}/slots`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDoctorSlots(data.slots || []);
      }
    } catch (e) { console.error('Load slots error:', e); }
    finally { setSlotsLoading(false); }
  };

  /** Step 3 → Step 4: Select slot → confirm */
  const handleSelectSlot = (slot) => {
    setSelectedSlot(slot);
    setBookingStep(4);
  };

  /** Step 4: Submit booking → create appointment */
  const handleConfirmBooking = async () => {
    if (!selectedDoctor || !selectedSlot || !bookingReason.trim()) {
      openModal('error', 'خطأ', 'الرجاء إدخال سبب الزيارة');
      return;
    }
    setBookingSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/patient/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          appointmentType: 'doctor',
          doctorId: selectedDoctor._id,
          slotId: selectedSlot._id,
          appointmentDate: selectedSlot.date,
          appointmentTime: selectedSlot.startTime,
          reasonForVisit: bookingReason,
          bookingMethod: 'online',
          priority: 'routine',
          status: 'scheduled'
        })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        openModal('success', 'تم الحجز بنجاح ✅', `تم حجز موعدك مع د. ${selectedDoctor.firstName} ${selectedDoctor.lastName}\nالتاريخ: ${formatDate(selectedSlot.date)}\nالوقت: ${selectedSlot.startTime}`);
        setBookingStep(0);
        setBookingSpec('');
        setSelectedDoctor(null);
        setSelectedSlot(null);
        setBookingReason('');
        // Refresh appointments
        const aptRes = await fetch('http://localhost:5000/api/patient/appointments', { headers: { 'Authorization': `Bearer ${token}` } });
        const aptData = await aptRes.json();
        if (aptRes.ok && aptData.success) setAppointments(aptData.appointments || []);
      } else {
        openModal('error', 'خطأ', data.message || 'حدث خطأ أثناء الحجز');
      }
    } catch (e) {
      console.error('Booking error:', e);
      openModal('error', 'خطأ', 'حدث خطأ في الاتصال بالخادم');
    } finally { setBookingSubmitting(false); }
  };

  /** Reset booking wizard */
  const resetBooking = () => {
    setBookingStep(0);
    setBookingSpec('');
    setBookingDoctors([]);
    setSelectedDoctor(null);
    setDoctorSlots([]);
    setSelectedSlot(null);
    setBookingReason('');
  };

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
          {[
            { id: 'overview', icon: '📊', label: 'نظرة عامة' },
            { id: 'appointments', icon: '📅', label: 'المواعيد' },
            { id: 'visits', icon: '📋', label: 'الزيارات' },
            { id: 'labResults', icon: '🔬', label: 'التحاليل' },
            { id: 'prescriptions', icon: '📜', label: 'الوصفات' },
            { id: 'consultation', icon: '🤖', label: 'استشيرني' },
            { id: 'medications', icon: '💊', label: 'الأدوية' }
          ].map(tab => (
            <button 
              key={tab.id} 
              className={`tab-btn ${activeSection === tab.id ? 'active' : ''}`} 
              onClick={() => setActiveSection(tab.id)}
            >
              <span className="tab-icon">{tab.icon}</span>
              {tab.label}
              {tab.id === 'appointments' && appointments.filter(a => a.status === 'scheduled' || a.status === 'confirmed').length > 0 && (
                <span className="tab-badge">{appointments.filter(a => a.status === 'scheduled' || a.status === 'confirmed').length}</span>
              )}
              {tab.id === 'labResults' && labResults.filter(l => !l.isViewedByPatient && l.status === 'completed').length > 0 && (
                <span className="tab-badge new">{labResults.filter(l => !l.isViewedByPatient && l.status === 'completed').length}</span>
              )}
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
                  <h1>{user.firstName} {user.fatherName && `${user.fatherName} `}{user.lastName}</h1>
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
              <div className="quick-stat-card appointments">
                <div className="stat-icon-wrapper"><span>📅</span></div>
                <div className="stat-content">
                  <h3>{appointments.filter(a => a.status === 'scheduled' || a.status === 'confirmed').length}</h3>
                  <p>موعد قادم</p>
                </div>
              </div>
              <div className="quick-stat-card labs">
                <div className="stat-icon-wrapper"><span>🔬</span></div>
                <div className="stat-content">
                  <h3>{labResults.length}</h3>
                  <p>تحليل مخبري</p>
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
                {user.governorate && (
                  <div className="info-display-card">
                    <div className="card-icon-header">
                      <div className="icon-circle gov"><span>🏛️</span></div>
                      <h3>المحافظة</h3>
                    </div>
                    <p className="card-value">{user.governorate}</p>
                  </div>
                )}
                {user.city && (
                  <div className="info-display-card">
                    <div className="card-icon-header">
                      <div className="icon-circle city"><span>🏙️</span></div>
                      <h3>المدينة</h3>
                    </div>
                    <p className="card-value">{user.city}</p>
                  </div>
                )}
                {user.motherName && (
                  <div className="info-display-card">
                    <div className="card-icon-header">
                      <div className="icon-circle mother"><span>👩</span></div>
                      <h3>اسم الأم</h3>
                    </div>
                    <p className="card-value">{user.motherName}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Medical Information Section */}
            {(patientData.bloodType || patientData.height || patientData.weight || patientData.smokingStatus) && (
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
                      {patientData.rhFactor && patientData.rhFactor !== 'unknown' && (
                        <div className="medical-unit">Rh: {patientData.rhFactor === 'positive' ? '+' : '-'}</div>
                      )}
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
                  {patientData.smokingStatus && (
                    <div className="medical-card">
                      <div className="medical-card-header">
                        <div className="medical-icon">🚬</div>
                        <h3>حالة التدخين</h3>
                      </div>
                      <div className="medical-value-large smoking-status">
                        {patientData.smokingStatus === 'non-smoker' ? '🚫 غير مدخن' :
                         patientData.smokingStatus === 'former_smoker' ? '✅ مدخن سابق' :
                         patientData.smokingStatus === 'current_smoker' ? '⚠️ مدخن حالي' : patientData.smokingStatus}
                      </div>
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

            {/* Emergency Contact Section */}
            {patientData.emergencyContact && (
              <div className="data-section">
                <div className="section-header">
                  <div className="section-title-wrapper">
                    <span className="section-icon">🆘</span>
                    <h2>جهة الاتصال للطوارئ</h2>
                  </div>
                </div>
                <div className="emergency-contact-card">
                  <div className="emergency-info-grid">
                    <div className="emergency-item">
                      <span className="emergency-label">👤 الاسم:</span>
                      <span className="emergency-value">{patientData.emergencyContact.name}</span>
                    </div>
                    <div className="emergency-item">
                      <span className="emergency-label">👨‍👩‍👦 صلة القرابة:</span>
                      <span className="emergency-value">{patientData.emergencyContact.relationship}</span>
                    </div>
                    <div className="emergency-item">
                      <span className="emergency-label">📞 رقم الهاتف:</span>
                      <span className="emergency-value" dir="ltr">{patientData.emergencyContact.phoneNumber}</span>
                    </div>
                    {patientData.emergencyContact.alternativePhoneNumber && (
                      <div className="emergency-item">
                        <span className="emergency-label">📱 رقم بديل:</span>
                        <span className="emergency-value" dir="ltr">{patientData.emergencyContact.alternativePhoneNumber}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Previous Surgeries — patients.previousSurgeries[] */}
            {patientData.previousSurgeries && patientData.previousSurgeries.length > 0 && (
              <div className="data-section">
                <div className="section-header">
                  <div className="section-title-wrapper">
                    <span className="section-icon">🔪</span>
                    <h2>العمليات الجراحية السابقة</h2>
                  </div>
                </div>
                <div className="surgeries-grid">
                  {patientData.previousSurgeries.map((surgery, index) => (
                    <div key={index} className="surgery-card">
                      <div className="surgery-icon">🏥</div>
                      <div className="surgery-info">
                        <h4>{surgery.surgeryName}</h4>
                        {surgery.surgeryDate && (
                          <span className="surgery-date">📅 {formatDate(surgery.surgeryDate)}</span>
                        )}
                        {surgery.hospital && (
                          <span className="surgery-hospital">🏨 {surgery.hospital}</span>
                        )}
                        {surgery.notes && (
                          <p className="surgery-notes">{surgery.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Current Long-term Medications — patients.currentMedications[] */}
            {patientData.currentMedications && patientData.currentMedications.length > 0 && (
              <div className="data-section">
                <div className="section-header">
                  <div className="section-title-wrapper">
                    <span className="section-icon">💊</span>
                    <h2>الأدوية المستمرة</h2>
                  </div>
                  <span className="section-count-badge">{patientData.currentMedications.length} دواء</span>
                </div>
                <div className="current-meds-list">
                  {patientData.currentMedications.map((med, index) => (
                    <div key={index} className="current-med-chip">
                      <span className="med-chip-icon">💊</span>
                      <span className="med-chip-name">{med}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* APPOINTMENTS SECTION — appointments collection */}
        {activeSection === 'appointments' && (
          <div className="section-content">
            <div className="page-section-header">
              <div className="section-header-content">
                <div className="section-icon-box"><span>📅</span></div>
                <div><h1>المواعيد الطبية</h1><p>Appointments</p></div>
              </div>
              <div className="header-actions">
                <div className="section-count-badge">{appointments.length} موعد</div>
                {bookingStep === 0 && (
                  <button className="book-apt-btn" onClick={() => setBookingStep(1)}>
                    <span>➕</span> حجز موعد جديد
                  </button>
                )}
              </div>
            </div>

            {/* ══════════════════════════════════════════════════════
                BOOKING WIZARD — 4 Steps
                ══════════════════════════════════════════════════════ */}
            {bookingStep > 0 && (
              <div className="booking-wizard">
                {/* Progress Steps */}
                <div className="booking-progress">
                  {[
                    { num: 1, label: 'التخصص' },
                    { num: 2, label: 'الطبيب' },
                    { num: 3, label: 'الموعد' },
                    { num: 4, label: 'التأكيد' }
                  ].map(s => (
                    <div key={s.num} className={`progress-step ${bookingStep >= s.num ? 'active' : ''} ${bookingStep === s.num ? 'current' : ''}`}>
                      <div className="step-circle">{bookingStep > s.num ? '✓' : s.num}</div>
                      <span className="step-label">{s.label}</span>
                    </div>
                  ))}
                </div>

                <button className="booking-cancel-btn" onClick={resetBooking}>✕ إلغاء الحجز</button>

                {/* ── Step 1: Choose Specialization ────────────── */}
                {bookingStep === 1 && (
                  <div className="booking-step-content">
                    <h2 className="step-title">🏥 اختر التخصص الطبي</h2>
                    <p className="step-desc">اختر التخصص الذي تريد حجز موعد فيه</p>
                    <div className="specializations-grid">
                      {BOOKING_SPECIALIZATIONS.map(spec => (
                        <button key={spec.id} className="spec-card" onClick={() => handleSelectSpecialization(spec.id)}>
                          <span className="spec-icon">{spec.icon}</span>
                          <span className="spec-name">{spec.nameAr}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Step 2: Choose Doctor ─────────────────────── */}
                {bookingStep === 2 && (
                  <div className="booking-step-content">
                    <button className="back-step-btn" onClick={() => setBookingStep(1)}>→ رجوع للتخصصات</button>
                    <h2 className="step-title">👨‍⚕️ اختر الطبيب</h2>
                    <p className="step-desc">الأطباء المتاحون في تخصص {BOOKING_SPECIALIZATIONS.find(s => s.id === bookingSpec)?.nameAr}</p>

                    {bookingDoctorsLoading && (
                      <div className="loading-state"><div className="spinner"></div><p>جاري البحث عن الأطباء...</p></div>
                    )}

                    {!bookingDoctorsLoading && bookingDoctors.length === 0 && (
                      <div className="empty-state-card">
                        <div className="empty-icon">👨‍⚕️</div>
                        <h3>لا يوجد أطباء متاحون حالياً</h3>
                        <p>جرب تخصصاً آخر أو حاول لاحقاً</p>
                      </div>
                    )}

                    {!bookingDoctorsLoading && bookingDoctors.length > 0 && (
                      <div className="doctors-list">
                        {bookingDoctors.map((doc, i) => (
                          <div key={doc._id || i} className="doctor-card-booking" onClick={() => handleSelectDoctor(doc)}>
                            <div className="doc-avatar"><span>👨‍⚕️</span></div>
                            <div className="doc-info">
                              <h3>د. {doc.firstName} {doc.fatherName && `${doc.fatherName} `}{doc.lastName}</h3>
                              <div className="doc-meta-grid">
                                {doc.hospitalAffiliation && (
                                  <span className="doc-meta-item">🏥 {doc.hospitalAffiliation}</span>
                                )}
                                {doc.governorate && (
                                  <span className="doc-meta-item">📍 {doc.governorate}{doc.city ? ` - ${doc.city}` : ''}</span>
                                )}
                                {doc.yearsOfExperience && (
                                  <span className="doc-meta-item">📅 {doc.yearsOfExperience} سنة خبرة</span>
                                )}
                                {doc.consultationFee && (
                                  <span className="doc-meta-item">💰 {doc.consultationFee?.toLocaleString()} {doc.currency || 'ل.س'}</span>
                                )}
                              </div>
                              {doc.averageRating > 0 && (
                                <div className="doc-rating">
                                  <span className="rating-stars">{'⭐'.repeat(Math.round(doc.averageRating))}</span>
                                  <span className="rating-num">{doc.averageRating.toFixed(1)}</span>
                                  <span className="rating-count">({doc.totalReviews} تقييم)</span>
                                </div>
                              )}
                            </div>
                            <div className="doc-select-arrow">←</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ── Step 3: Choose Time Slot ──────────────────── */}
                {bookingStep === 3 && selectedDoctor && (
                  <div className="booking-step-content">
                    <button className="back-step-btn" onClick={() => setBookingStep(2)}>→ رجوع للأطباء</button>
                    <h2 className="step-title">📅 اختر الموعد المتاح</h2>
                    <div className="selected-doctor-mini">
                      <span>👨‍⚕️</span>
                      <span>د. {selectedDoctor.firstName} {selectedDoctor.lastName}</span>
                      <span className="mini-hospital">🏥 {selectedDoctor.hospitalAffiliation || ''}</span>
                    </div>

                    {slotsLoading && (
                      <div className="loading-state"><div className="spinner"></div><p>جاري تحميل المواعيد المتاحة...</p></div>
                    )}

                    {!slotsLoading && doctorSlots.length === 0 && (
                      <div className="empty-state-card">
                        <div className="empty-icon">📅</div>
                        <h3>لا توجد مواعيد متاحة حالياً</h3>
                        <p>لا يوجد أوقات فارغة لهذا الطبيب، جرب طبيباً آخر</p>
                      </div>
                    )}

                    {!slotsLoading && doctorSlots.length > 0 && (
                      <div className="slots-grid">
                        {doctorSlots.map((slot, i) => {
                          const isFull = slot.currentBookings >= slot.maxBookings;
                          const remaining = slot.maxBookings - (slot.currentBookings || 0);
                          return (
                            <button key={slot._id || i}
                              className={`slot-card ${selectedSlot?._id === slot._id ? 'selected' : ''} ${isFull ? 'full' : ''}`}
                              onClick={() => !isFull && handleSelectSlot(slot)}
                              disabled={isFull}>
                              <div className="slot-date">
                                <span className="slot-day-num">{slot.date ? new Date(slot.date).getDate() : '--'}</span>
                                <span className="slot-month">{slot.date ? new Date(slot.date).toLocaleDateString('ar-EG', { month: 'short', weekday: 'short' }) : ''}</span>
                              </div>
                              <div className="slot-time">
                                <span className="time-range">{slot.startTime} — {slot.endTime}</span>
                                {slot.slotDuration && <span className="slot-duration">{slot.slotDuration} دقيقة</span>}
                              </div>
                              <div className={`slot-availability ${isFull ? 'full' : remaining <= 2 ? 'limited' : 'open'}`}>
                                {isFull ? '🔴 مكتمل' : remaining <= 2 ? `🟡 ${remaining} أماكن فقط` : `🟢 ${remaining} أماكن متاحة`}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* ── Step 4: Confirm Booking ───────────────────── */}
                {bookingStep === 4 && selectedDoctor && selectedSlot && (
                  <div className="booking-step-content">
                    <button className="back-step-btn" onClick={() => setBookingStep(3)}>→ رجوع للمواعيد</button>
                    <h2 className="step-title">✅ تأكيد الحجز</h2>

                    <div className="booking-summary">
                      <div className="summary-row">
                        <span className="summary-label">👨‍⚕️ الطبيب:</span>
                        <span className="summary-value">د. {selectedDoctor.firstName} {selectedDoctor.fatherName && `${selectedDoctor.fatherName} `}{selectedDoctor.lastName}</span>
                      </div>
                      <div className="summary-row">
                        <span className="summary-label">🏥 المشفى:</span>
                        <span className="summary-value">{selectedDoctor.hospitalAffiliation || '-'}</span>
                      </div>
                      <div className="summary-row">
                        <span className="summary-label">📅 التاريخ:</span>
                        <span className="summary-value">{formatDate(selectedSlot.date)}</span>
                      </div>
                      <div className="summary-row">
                        <span className="summary-label">🕐 الوقت:</span>
                        <span className="summary-value" dir="ltr">{selectedSlot.startTime} — {selectedSlot.endTime}</span>
                      </div>
                      {selectedDoctor.consultationFee && (
                        <div className="summary-row">
                          <span className="summary-label">💰 رسوم الكشف:</span>
                          <span className="summary-value">{selectedDoctor.consultationFee?.toLocaleString()} {selectedDoctor.currency || 'ل.س'}</span>
                        </div>
                      )}
                    </div>

                    <div className="booking-reason-section">
                      <label>📝 سبب الزيارة <span className="required">*</span></label>
                      <textarea
                        placeholder="مثال: فحص دوري، ألم في الصدر، متابعة..."
                        value={bookingReason}
                        onChange={e => setBookingReason(e.target.value)}
                        className="booking-textarea"
                        rows={3}
                      />
                    </div>

                    <button className="confirm-booking-btn" onClick={handleConfirmBooking}
                      disabled={bookingSubmitting || !bookingReason.trim()}>
                      {bookingSubmitting ? <><span className="btn-spinner"></span> جاري الحجز...</> :
                        <><span>✅</span> تأكيد حجز الموعد</>}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ══════════════════════════════════════════════════════
                EXISTING APPOINTMENTS (unchanged)
                ══════════════════════════════════════════════════════ */}
            {bookingStep === 0 && loadingAppointments && (
              <div className="loading-state"><div className="spinner"></div><p>جاري تحميل المواعيد...</p></div>
            )}

            {bookingStep === 0 && !loadingAppointments && appointments.length === 0 && (
              <div className="empty-state-card">
                <div className="empty-icon">📅</div>
                <h3>لا توجد مواعيد</h3>
                <p>اضغط على "حجز موعد جديد" لحجز أول موعد لك</p>
              </div>
            )}

            {bookingStep === 0 && !loadingAppointments && appointments.length > 0 && (
              <>
                {/* Upcoming Appointments */}
                {appointments.filter(a => ['scheduled', 'confirmed'].includes(a.status)).length > 0 && (
                  <div className="appointments-section-group">
                    <h3 className="group-title"><span>🟢</span> المواعيد القادمة</h3>
                    <div className="appointments-grid">
                      {appointments.filter(a => ['scheduled', 'confirmed'].includes(a.status)).map((apt, i) => (
                        <div key={apt._id || i} className={`appointment-card upcoming ${apt.priority === 'urgent' ? 'urgent' : ''}`}>
                          <div className="apt-card-accent"></div>
                          <div className="apt-card-body">
                            <div className="apt-date-block">
                              <span className="apt-day">{apt.appointmentDate ? new Date(apt.appointmentDate).getDate() : '--'}</span>
                              <span className="apt-month">{apt.appointmentDate ? new Date(apt.appointmentDate).toLocaleDateString('ar-EG', { month: 'short' }) : ''}</span>
                            </div>
                            <div className="apt-info">
                              <div className="apt-type-badge">
                                {apt.appointmentType === 'doctor' ? '🩺 طبيب' :
                                 apt.appointmentType === 'dentist' ? '🦷 أسنان' :
                                 apt.appointmentType === 'lab_test' ? '🔬 تحليل' :
                                 apt.appointmentType === 'follow_up' ? '🔄 متابعة' : '🚑 طوارئ'}
                              </div>
                              <h4>{apt.reasonForVisit || 'موعد طبي'}</h4>
                              <div className="apt-meta">
                                {apt.appointmentTime && <span>🕐 {apt.appointmentTime}</span>}
                                {apt.doctorId?.firstName && <span>👨‍⚕️ د. {apt.doctorId.firstName} {apt.doctorId.lastName}</span>}
                              </div>
                            </div>
                            <div className={`apt-status-badge ${apt.status}`}>
                              {apt.status === 'scheduled' ? 'محجوز' : 'مؤكد'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Past Appointments */}
                {appointments.filter(a => ['completed', 'cancelled', 'no_show'].includes(a.status)).length > 0 && (
                  <div className="appointments-section-group">
                    <h3 className="group-title"><span>📜</span> المواعيد السابقة</h3>
                    <div className="appointments-grid past">
                      {appointments.filter(a => ['completed', 'cancelled', 'no_show'].includes(a.status)).map((apt, i) => (
                        <div key={apt._id || i} className={`appointment-card past ${apt.status}`}>
                          <div className="apt-card-body">
                            <div className="apt-date-block small">
                              <span className="apt-day">{apt.appointmentDate ? new Date(apt.appointmentDate).getDate() : '--'}</span>
                              <span className="apt-month">{apt.appointmentDate ? new Date(apt.appointmentDate).toLocaleDateString('ar-EG', { month: 'short', year: 'numeric' }) : ''}</span>
                            </div>
                            <div className="apt-info">
                              <h4>{apt.reasonForVisit || 'موعد طبي'}</h4>
                              {apt.doctorId?.firstName && <span className="apt-doctor">👨‍⚕️ د. {apt.doctorId.firstName}</span>}
                            </div>
                            <div className={`apt-status-badge ${apt.status}`}>
                              {apt.status === 'completed' ? '✅ مكتمل' : apt.status === 'cancelled' ? '❌ ملغي' : '⚠️ لم يحضر'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* LAB RESULTS SECTION — lab_tests collection */}
        {activeSection === 'labResults' && (
          <div className="section-content">
            <div className="page-section-header">
              <div className="section-header-content">
                <div className="section-icon-box"><span>🔬</span></div>
                <div><h1>نتائج التحاليل المخبرية</h1><p>Laboratory Results</p></div>
              </div>
              <div className="section-count-badge">{labResults.length} تحليل</div>
            </div>

            {loadingLabResults && (
              <div className="loading-state"><div className="spinner"></div><p>جاري تحميل التحاليل...</p></div>
            )}

            {!loadingLabResults && labResults.length === 0 && (
              <div className="empty-state-card">
                <div className="empty-icon">🔬</div>
                <h3>لا توجد تحاليل مخبرية</h3>
                <p>سيتم عرض نتائج تحاليلك هنا بعد إجرائها</p>
              </div>
            )}

            {!loadingLabResults && labResults.length > 0 && (
              <div className="lab-results-list">
                {labResults.map((lab, i) => (
                  <div key={lab._id || i} className={`lab-result-card ${lab.isCritical ? 'critical' : ''} ${!lab.isViewedByPatient && lab.status === 'completed' ? 'unread' : ''}`}>
                    <div className="lab-card-header">
                      <div className="lab-header-info">
                        <div className="lab-number">
                          <span className="lab-icon">{lab.isCritical ? '🔴' : '🔬'}</span>
                          <span>{lab.testNumber}</span>
                          {!lab.isViewedByPatient && lab.status === 'completed' && <span className="new-badge">جديد</span>}
                        </div>
                        <span className="lab-date">📅 {formatDate(lab.orderDate)}</span>
                      </div>
                      <div className={`lab-status-badge ${lab.status}`}>
                        {lab.status === 'ordered' ? '📝 مطلوب' :
                         lab.status === 'scheduled' ? '📅 محجوز' :
                         lab.status === 'sample_collected' ? '🧪 تم أخذ العينة' :
                         lab.status === 'in_progress' ? '⏳ قيد التحليل' :
                         lab.status === 'completed' ? '✅ مكتمل' :
                         lab.status === 'cancelled' ? '❌ ملغي' : lab.status}
                      </div>
                    </div>

                    {/* Tests Ordered */}
                    {lab.testsOrdered && lab.testsOrdered.length > 0 && (
                      <div className="lab-tests-ordered">
                        <span className="tests-label">التحاليل المطلوبة:</span>
                        <div className="tests-chips">
                          {lab.testsOrdered.map((test, j) => (
                            <span key={j} className="test-chip">{test.testName}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Test Results */}
                    {lab.status === 'completed' && lab.testResults && lab.testResults.length > 0 && (
                      <div className="lab-results-table">
                        <div className="results-table-header">
                          <span>التحليل</span><span>النتيجة</span><span>الوحدة</span><span>المرجع</span><span>الحالة</span>
                        </div>
                        {lab.testResults.map((result, j) => (
                          <div key={j} className={`results-table-row ${result.isAbnormal ? 'abnormal' : ''} ${result.isCritical ? 'critical' : ''}`}>
                            <span className="result-name">{result.testName}</span>
                            <span className="result-value">{result.value}</span>
                            <span className="result-unit">{result.unit || '-'}</span>
                            <span className="result-range">{result.referenceRange || '-'}</span>
                            <span className="result-status">
                              {result.isCritical ? '🔴 حرج' : result.isAbnormal ? '🟡 غير طبيعي' : '🟢 طبيعي'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* PDF Download */}
                    {lab.resultPdfUrl && (
                      <a href={lab.resultPdfUrl} target="_blank" rel="noopener noreferrer" className="lab-pdf-btn">
                        <span>📄</span> تحميل التقرير PDF
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PRESCRIPTIONS SECTION — prescriptions collection */}
        {activeSection === 'prescriptions' && (
          <div className="section-content">
            <div className="page-section-header">
              <div className="section-header-content">
                <div className="section-icon-box"><span>📜</span></div>
                <div><h1>الوصفات الطبية</h1><p>Prescriptions</p></div>
              </div>
              <div className="section-count-badge">{prescriptions.length} وصفة</div>
            </div>

            {loadingPrescriptions && (
              <div className="loading-state"><div className="spinner"></div><p>جاري تحميل الوصفات...</p></div>
            )}

            {!loadingPrescriptions && prescriptions.length === 0 && (
              <div className="empty-state-card">
                <div className="empty-icon">📜</div>
                <h3>لا توجد وصفات طبية</h3>
                <p>سيتم عرض وصفاتك الطبية هنا بعد أن يصف لك الطبيب علاجاً</p>
              </div>
            )}

            {!loadingPrescriptions && prescriptions.length > 0 && (
              <div className="prescriptions-list">
                {prescriptions.map((rx, i) => (
                  <div key={rx._id || i} className={`prescription-card ${rx.status}`}>
                    <div className="rx-card-header">
                      <div className="rx-header-info">
                        <span className="rx-number">📜 {rx.prescriptionNumber}</span>
                        <span className="rx-date">{formatDate(rx.prescriptionDate)}</span>
                      </div>
                      <div className={`rx-status-badge ${rx.status}`}>
                        {rx.status === 'active' ? '🟢 نشطة' :
                         rx.status === 'dispensed' ? '✅ تم الصرف' :
                         rx.status === 'partially_dispensed' ? '🟡 صرف جزئي' :
                         rx.status === 'expired' ? '⏰ منتهية' : '❌ ملغاة'}
                      </div>
                    </div>

                    {/* Medications in prescription */}
                    <div className="rx-medications">
                      {rx.medications && rx.medications.map((med, j) => (
                        <div key={j} className={`rx-med-item ${med.isDispensed ? 'dispensed' : ''}`}>
                          <span className="rx-med-icon">{med.isDispensed ? '✅' : '💊'}</span>
                          <div className="rx-med-info">
                            <strong>{med.medicationName}</strong>
                            <span>{med.dosage} — {med.frequency} — {med.duration}</span>
                            {med.route && <span className="rx-route-badge">{med.route === 'oral' ? 'فموي' : med.route === 'injection' ? 'حقن' : med.route}</span>}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* QR Code + Verification */}
                    {rx.status === 'active' && rx.verificationCode && (
                      <div className="rx-verification">
                        <div className="rx-qr-section">
                          <span className="qr-icon">📱</span>
                          <div className="qr-info">
                            <span className="qr-label">رمز التحقق للصيدلية:</span>
                            <span className="verification-code">{rx.verificationCode}</span>
                          </div>
                        </div>
                        {rx.expiryDate && (
                          <div className="rx-expiry">
                            <span>⏰</span>
                            <span>صالحة حتى: {formatDate(rx.expiryDate)}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
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
            <h1>الأدوية الموصوفة</h1>
            <p>Prescribed Medications</p>
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
            <p>يتم عرض تفاصيل كل دواء: الجرعة، التكرار، المدة، والتعليمات</p>
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

          {/* Medication Instructions Banner */}
          <div className="medication-instructions-banner">
            <div className="instructions-icon">⚠️</div>
            <div className="instructions-content">
              <h4>تعليمات هامة</h4>
              <ul>
                <li>التزم بالجرعة والتكرار والمدة المحددة من قبل الطبيب</li>
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