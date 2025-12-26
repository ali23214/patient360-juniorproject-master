import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import { authAPI } from '../services/api';
import { calculateAge, getTodayDate, validateSyrianPhone, validateNationalId } from '../utils/ageCalculator';
import LoadingSpinner from '../components/LoadingSpinner';
import '../styles/SignUp.css';

/**
 * SignUp Component - Patient Registration System with Under-18 Support
 * 
 * UPDATED: Now supports both adult (with national ID) and minor (with parent ID) registration
 * 
 * Features:
 * - Age detection from date of birth
 * - Conditional ID fields (National ID for adults, Parent ID for minors)
 * - Auto-generated child IDs for minors
 * - Full MongoDB integration via REST API
 * - Comprehensive validation
 * 
 * @component
 */
const SignUp = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Age state
  const [age, setAge] = useState(0);
  const [isMinor, setIsMinor] = useState(false);
  
  // Modal state for success/error messages
  const [modal, setModal] = useState({
    isOpen: false,
    type: '',
    title: '',
    message: '',
    onClose: null
  });
  
  /**
   * Form state - Updated to support both adults and minors
   */
  const [formData, setFormData] = useState({
    // ========== Persons Collection Fields ==========
    nationalId: '',           // For adults only
    parentNationalId: '',     // For minors only (NEW)
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: '',
    phoneNumber: '',
    address: '',
    
    // ========== Accounts Collection Fields ==========
    email: '',
    password: '',
    confirmPassword: '',
    
    // ========== Patients Collection Fields ==========
    bloodType: '',
    height: '',
    weight: '',
    smokingStatus: '',
    
    // Health History
    allergies: '',
    chronicDiseases: '',
    familyHistory: '',
    
    // Emergency Contact
    emergencyContactName: '',
    emergencyContactRelationship: '',
    emergencyContactPhone: ''
  });

  const [errors, setErrors] = useState({});

  const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const smokingStatuses = [
    { value: 'non-smoker', label: 'غير مدخن' },
    { value: 'former smoker', label: 'مدخن سابق' },
    { value: 'current smoker', label: 'مدخن حالي' }
  ];

  /**
   * Opens modal with configuration
   */
  const openModal = (type, title, message, onClose = null) => {
    setModal({
      isOpen: true,
      type,
      title,
      message,
      onClose
    });
  };

  /**
   * Closes modal and executes callback
   */
  const closeModal = () => {
    if (modal.onClose) {
      modal.onClose();
    }
    setModal({
      isOpen: false,
      type: '',
      title: '',
      message: '',
      onClose: null
    });
  };

  /**
   * Validates date is in the past
   */
  const isDateInPast = (dateString) => {
    if (!dateString) return false;
    const selectedDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return selectedDate < today;
  };

  /**
   * Validates Arabic or English names
   */
  const isValidName = (name) => {
    const namePattern = /^[a-zA-Z\u0600-\u06FF\s]+$/;
    return namePattern.test(name);
  };

  /**
   * Handle date of birth change - NOW WITH AGE DETECTION
   */
  const handleDateOfBirthChange = (e) => {
    const dob = e.target.value;
    setFormData({ ...formData, dateOfBirth: dob });
    
    // Calculate age and determine if minor
    const calculatedAge = calculateAge(dob);
    setAge(calculatedAge);
    const minor = calculatedAge < 18;
    setIsMinor(minor);
    
    // Clear the appropriate ID field based on age
    if (minor) {
      setFormData(prev => ({ ...prev, nationalId: '' }));
      // Clear national ID error if exists
      if (errors.nationalId) {
        setErrors(prev => ({ ...prev, nationalId: '' }));
      }
    } else {
      setFormData(prev => ({ ...prev, parentNationalId: '' }));
      // Clear parent ID error if exists
      if (errors.parentNationalId) {
        setErrors(prev => ({ ...prev, parentNationalId: '' }));
      }
    }
  };

  /**
   * Comprehensive validation for each step
   */
  const validateStep = () => {
    const newErrors = {};

    // ========================================
    // STEP 1: Personal Information
    // ========================================
    if (currentStep === 1) {
      // First Name
      if (!formData.firstName.trim()) {
        newErrors.firstName = 'الاسم الأول مطلوب';
      } else if (formData.firstName.trim().length < 2) {
        newErrors.firstName = 'الاسم الأول يجب أن يكون حرفين على الأقل';
      } else if (formData.firstName.trim().length > 50) {
        newErrors.firstName = 'الاسم الأول يجب ألا يتجاوز 50 حرفاً';
      } else if (!isValidName(formData.firstName)) {
        newErrors.firstName = 'الاسم يجب أن يحتوي على أحرف عربية أو إنجليزية فقط';
      }
      
      // Last Name
      if (!formData.lastName.trim()) {
        newErrors.lastName = 'اسم العائلة مطلوب';
      } else if (formData.lastName.trim().length < 2) {
        newErrors.lastName = 'اسم العائلة يجب أن يكون حرفين على الأقل';
      } else if (formData.lastName.trim().length > 50) {
        newErrors.lastName = 'اسم العائلة يجب ألا يتجاوز 50 حرفاً';
      } else if (!isValidName(formData.lastName)) {
        newErrors.lastName = 'الاسم يجب أن يحتوي على أحرف عربية أو إنجليزية فقط';
      }
      
      // Email
      if (!formData.email.trim()) {
        newErrors.email = 'البريد الإلكتروني مطلوب';
      } else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formData.email)) {
        newErrors.email = 'البريد الإلكتروني غير صحيح';
      }
      
      // Phone Number
      if (!formData.phoneNumber.trim()) {
        newErrors.phoneNumber = 'رقم الهاتف مطلوب';
      } else if (!validateSyrianPhone(formData.phoneNumber)) {
        newErrors.phoneNumber = 'رقم الهاتف غير صحيح (يجب أن يبدأ بـ +963 أو 09)';
      }
      
      // ID Validation - CONDITIONAL BASED ON AGE
      if (isMinor) {
        // Minor: Validate parent's national ID
        if (!formData.parentNationalId.trim()) {
          newErrors.parentNationalId = 'رقم الهوية الوطنية للوالد/الوالدة مطلوب';
        } else if (!validateNationalId(formData.parentNationalId)) {
          newErrors.parentNationalId = 'رقم الهوية يجب أن يكون 11 رقم بالضبط';
        }
      } else {
        // Adult: Validate national ID
        if (!formData.nationalId.trim()) {
          newErrors.nationalId = 'رقم الهوية الوطنية مطلوب';
        } else if (!validateNationalId(formData.nationalId)) {
          newErrors.nationalId = 'رقم الهوية يجب أن يكون 11 رقم بالضبط';
        }
      }
      
      // Date of Birth
      if (!formData.dateOfBirth) {
        newErrors.dateOfBirth = 'تاريخ الميلاد مطلوب';
      } else if (!isDateInPast(formData.dateOfBirth)) {
        newErrors.dateOfBirth = 'تاريخ الميلاد يجب أن يكون في الماضي';
      } else {
        const calculatedAge = calculateAge(formData.dateOfBirth);
        if (calculatedAge < 0) {
          newErrors.dateOfBirth = 'العمر يجب أن يكون صحيح';
        } else if (calculatedAge > 120) {
          newErrors.dateOfBirth = 'تاريخ الميلاد غير صحيح';
        }
      }
      
      // Gender
      if (!formData.gender) {
        newErrors.gender = 'يرجى اختيار الجنس';
      }
      
      // Address (optional validation)
      if (formData.address.trim() && formData.address.trim().length < 5) {
        newErrors.address = 'العنوان يجب أن يكون 5 أحرف على الأقل';
      } else if (formData.address.trim().length > 200) {
        newErrors.address = 'العنوان يجب ألا يتجاوز 200 حرف';
      }
    }

    // ========================================
    // STEP 2: Medical Information
    // ========================================
    if (currentStep === 2) {
      if (formData.height && (formData.height < 50 || formData.height > 250)) {
        newErrors.height = 'الطول يجب أن يكون بين 50 و 250 سم';
      }
      
      if (formData.weight && (formData.weight < 2 || formData.weight > 300)) {
        newErrors.weight = 'الوزن يجب أن يكون بين 2 و 300 كجم';
      }
    }

    // ========================================
    // STEP 3: Health History & Emergency Contact
    // ========================================
    if (currentStep === 3) {
      // Emergency Contact Name
      if (!formData.emergencyContactName.trim()) {
        newErrors.emergencyContactName = 'اسم جهة الاتصال للطوارئ مطلوب';
      } else if (formData.emergencyContactName.trim().length < 2) {
        newErrors.emergencyContactName = 'الاسم يجب أن يكون حرفين على الأقل';
      } else if (formData.emergencyContactName.trim().length > 100) {
        newErrors.emergencyContactName = 'الاسم يجب ألا يتجاوز 100 حرف';
      } else if (!isValidName(formData.emergencyContactName)) {
        newErrors.emergencyContactName = 'الاسم يجب أن يحتوي على أحرف عربية أو إنجليزية فقط';
      }
      
      // Emergency Contact Relationship
      if (!formData.emergencyContactRelationship.trim()) {
        newErrors.emergencyContactRelationship = 'صلة القرابة مطلوبة';
      } else if (formData.emergencyContactRelationship.trim().length < 2) {
        newErrors.emergencyContactRelationship = 'صلة القرابة يجب أن تكون حرفين على الأقل';
      } else if (formData.emergencyContactRelationship.trim().length > 50) {
        newErrors.emergencyContactRelationship = 'صلة القرابة يجب ألا تتجاوز 50 حرفاً';
      }
      
      // Emergency Contact Phone
      if (!formData.emergencyContactPhone.trim()) {
        newErrors.emergencyContactPhone = 'رقم هاتف الطوارئ مطلوب';
      } else if (!validateSyrianPhone(formData.emergencyContactPhone)) {
        newErrors.emergencyContactPhone = 'رقم الهاتف غير صحيح (يجب أن يبدأ بـ +963 أو 09)';
      }
      
      // Allergies (optional validation)
      if (formData.allergies.trim()) {
        const allergiesArray = formData.allergies.split(',').map(item => item.trim());
        for (let allergy of allergiesArray) {
          if (allergy && (allergy.length < 2 || allergy.length > 100)) {
            newErrors.allergies = 'كل حساسية يجب أن تكون بين 2 و 100 حرف';
            break;
          }
        }
      }
      
      // Chronic Diseases (optional validation)
      if (formData.chronicDiseases.trim()) {
        const diseasesArray = formData.chronicDiseases.split(',').map(item => item.trim());
        for (let disease of diseasesArray) {
          if (disease && (disease.length < 2 || disease.length > 100)) {
            newErrors.chronicDiseases = 'كل مرض يجب أن يكون بين 2 و 100 حرف';
            break;
          }
        }
      }
      
      // Family History (optional validation)
      if (formData.familyHistory.trim()) {
        const historyArray = formData.familyHistory.split(',').map(item => item.trim());
        for (let history of historyArray) {
          if (history && (history.length < 5 || history.length > 200)) {
            newErrors.familyHistory = 'كل سجل عائلي يجب أن يكون بين 5 و 200 حرف';
            break;
          }
        }
      }
    }

    // ========================================
    // STEP 4: Password
    // ========================================
    if (currentStep === 4) {
      if (!formData.password) {
        newErrors.password = 'كلمة المرور مطلوبة';
      } else if (formData.password.length < 8) {
        newErrors.password = 'كلمة المرور يجب أن تكون 8 أحرف على الأقل';
      } else if (!/[A-Z]/.test(formData.password)) {
        newErrors.password = 'كلمة المرور يجب أن تحتوي على حرف كبير واحد على الأقل';
      } else if (!/[0-9]/.test(formData.password)) {
        newErrors.password = 'كلمة المرور يجب أن تحتوي على رقم واحد على الأقل';
      } else if (!/[!@#$%^&*]/.test(formData.password)) {
        newErrors.password = 'كلمة المرور يجب أن تحتوي على رمز خاص واحد على الأقل (!@#$%^&*)';
      }
      
      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'تأكيد كلمة المرور مطلوب';
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'كلمات المرور غير متطابقة';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle next step
   */
  const handleNext = () => {
    if (validateStep()) {
      setCurrentStep(prev => prev + 1);
    }
  };

  /**
   * Handle previous step
   */
  const handlePrev = () => {
    setCurrentStep(prev => prev - 1);
    setErrors({});
  };

  /**
   * Handle form submission - UPDATED WITH API INTEGRATION
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateStep()) {
      return;
    }

    setLoading(true);

    try {
      // Prepare registration data for API
      const registrationData = {
        // Person data
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        dateOfBirth: formData.dateOfBirth,
        nationalId: isMinor ? null : formData.nationalId.trim(),
        parentNationalId: isMinor ? formData.parentNationalId.trim() : null,
        isMinor: isMinor,
        gender: formData.gender,
        phoneNumber: formData.phoneNumber.trim(),
        address: formData.address.trim() || null,
        
        // Account data
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        
        // Patient data
        bloodType: formData.bloodType || null,
        height: formData.height ? parseFloat(formData.height) : null,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        smokingStatus: formData.smokingStatus || null,
        allergies: formData.allergies.trim() 
          ? formData.allergies.split(',').map(item => item.trim()).filter(item => item)
          : [],
        chronicDiseases: formData.chronicDiseases.trim()
          ? formData.chronicDiseases.split(',').map(item => item.trim()).filter(item => item)
          : [],
        familyHistory: formData.familyHistory.trim()
          ? formData.familyHistory.split(',').map(item => item.trim()).filter(item => item)
          : [],
        emergencyContact: {
          name: formData.emergencyContactName.trim(),
          relationship: formData.emergencyContactRelationship.trim(),
          phone: formData.emergencyContactPhone.trim()
        }
      };

      // Call API
      const response = await authAPI.register(registrationData);

      setLoading(false);

      // Show success modal
      openModal(
        'success',
        'تم إنشاء الحساب بنجاح! ✅',
        isMinor 
          ? `مرحباً ${formData.firstName} ${formData.lastName}\n\nتم تسجيلك كمريض في منصة Patient 360° بنجاح.\n\nمعرف الطفل الخاص بك: ${response.childId}\n\nيمكنك الآن تسجيل الدخول باستخدام البريد الإلكتروني:\n${formData.email}`
          : `مرحباً ${formData.firstName} ${formData.lastName}\n\nتم تسجيلك كمريض في منصة Patient 360° بنجاح.\n\nيمكنك الآن تسجيل الدخول باستخدام البريد الإلكتروني:\n${formData.email}`,
        () => navigate('/')
      );
      
    } catch (error) {
      console.error('Registration error:', error);
      setLoading(false);
      
      const errorMessage = error.message || 'حدث خطأ أثناء إنشاء الحساب. الرجاء المحاولة مرة أخرى.';
      
      setErrors({ submit: errorMessage });
      openModal(
        'error',
        'خطأ في التسجيل',
        errorMessage
      );
    }
  };

  /**
   * Handle input changes
   */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  if (loading) {
    return <LoadingSpinner message="جاري إنشاء حسابك..." />;
  }

  return (
    <div className="signup-page">
      <Navbar />
      
      {/* Modal */}
      {modal.isOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className={`modal-header ${modal.type}`}>
              {modal.type === 'success' ? (
                <div className="modal-icon success-icon">✓</div>
              ) : (
                <div className="modal-icon error-icon">✕</div>
              )}
              <h2 className="modal-title">{modal.title}</h2>
            </div>
            <div className="modal-body">
              <p className="modal-message">{modal.message}</p>
            </div>
            <div className="modal-footer">
              <button className="modal-button" onClick={closeModal}>
                {modal.type === 'success' ? 'تسجيل الدخول' : 'حسناً'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="signup-container">
        <div className="signup-wrapper">
          {/* Progress Bar */}
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${(currentStep / 4) * 100}%` }}></div>
            <div className="progress-steps">
              {[4, 3, 2, 1].map(step => (
                <div 
                  key={step} 
                  className={`progress-step ${currentStep >= step ? 'active' : ''} ${currentStep > step ? 'completed' : ''}`}
                >
                  {currentStep > step ? '✓' : step}
                </div>
              ))}
            </div>
          </div>

          {/* Form Header */}
          <div className="form-header">
            <h1 className="form-title">إنشاء حساب مريض جديد</h1>
            <p className="form-subtitle">
              {currentStep === 1 && 'المعلومات الشخصية'}
              {currentStep === 2 && 'المعلومات الطبية'}
              {currentStep === 3 && 'السجل الصحي وجهة الاتصال للطوارئ'}
              {currentStep === 4 && 'حماية الحساب'}
            </p>
          </div>

          {/* Error Alert */}
          {errors.submit && (
            <div className="error-alert">
              <span className="error-icon">⚠️</span>
              <span>{errors.submit}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="signup-form">
            
            {/* STEP 1: Personal Information */}
            {currentStep === 1 && (
              <div className="form-step">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">الاسم الأول *</label>
                    <input
                      type="text"
                      name="firstName"
                      className={`form-input ${errors.firstName ? 'error' : ''}`}
                      value={formData.firstName}
                      onChange={handleChange}
                      placeholder="أدخل اسمك الأول (عربي أو إنجليزي)"
                      maxLength="50"
                    />
                    {errors.firstName && <span className="error-message">{errors.firstName}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">اسم العائلة *</label>
                    <input
                      type="text"
                      name="lastName"
                      className={`form-input ${errors.lastName ? 'error' : ''}`}
                      value={formData.lastName}
                      onChange={handleChange}
                      placeholder="أدخل اسم العائلة (عربي أو إنجليزي)"
                      maxLength="50"
                    />
                    {errors.lastName && <span className="error-message">{errors.lastName}</span>}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">البريد الإلكتروني *</label>
                  <input
                    type="email"
                    name="email"
                    className={`form-input ${errors.email ? 'error' : ''}`}
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="example@domain.com"
                    dir="ltr"
                  />
                  {errors.email && <span className="error-message">{errors.email}</span>}
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">رقم الهاتف *</label>
                    <input
                      type="tel"
                      name="phoneNumber"
                      className={`form-input ${errors.phoneNumber ? 'error' : ''}`}
                      value={formData.phoneNumber}
                      onChange={handleChange}
                      placeholder="+963 9X XXX XXXX أو 09X XXX XXXX"
                      dir="ltr"
                    />
                    {errors.phoneNumber && <span className="error-message">{errors.phoneNumber}</span>}
                    <small className="form-hint">الرقم السوري فقط (+963 أو 09)</small>
                  </div>

                  <div className="form-group">
                    <label className="form-label">تاريخ الميلاد *</label>
                    <input
                      type="date"
                      name="dateOfBirth"
                      className={`form-input ${errors.dateOfBirth ? 'error' : ''}`}
                      value={formData.dateOfBirth}
                      onChange={handleDateOfBirthChange}
                      max={getTodayDate()}
                    />
                    {errors.dateOfBirth && <span className="error-message">{errors.dateOfBirth}</span>}
                    {formData.dateOfBirth && isDateInPast(formData.dateOfBirth) && (
                      <small className="form-hint" style={{ color: isMinor ? '#d32f2f' : '#059669' }}>
                        العمر: {age} سنة {isMinor && '(قاصر - تحت 18)'}
                      </small>
                    )}
                  </div>
                </div>

                {/* CONDITIONAL ID FIELD BASED ON AGE */}
                {isMinor ? (
                  <div className="form-group minor-warning-box">
                    <label className="form-label" style={{ color: '#d32f2f', fontWeight: 'bold' }}>
                      ⚠️ قاصر تحت 18 سنة - رقم هوية الوالد/الوالدة مطلوب *
                    </label>
                    <input
                      type="text"
                      name="parentNationalId"
                      className={`form-input ${errors.parentNationalId ? 'error' : ''}`}
                      value={formData.parentNationalId}
                      onChange={handleChange}
                      placeholder="رقم الهوية الوطنية للوالد/الوالدة (11 رقم)"
                      dir="ltr"
                      maxLength="11"
                    />
                    {errors.parentNationalId && <span className="error-message">{errors.parentNationalId}</span>}
                    <small className="form-hint" style={{ color: '#d32f2f' }}>
                      سيتم إنشاء معرف طفل خاص تلقائياً بعد التسجيل
                    </small>
                  </div>
                ) : (
                  <div className="form-group">
                    <label className="form-label">رقم الهوية الوطنية *</label>
                    <input
                      type="text"
                      name="nationalId"
                      className={`form-input ${errors.nationalId ? 'error' : ''}`}
                      value={formData.nationalId}
                      onChange={handleChange}
                      placeholder="رقم الهوية الوطنية (11 رقم)"
                      dir="ltr"
                      maxLength="11"
                    />
                    {errors.nationalId && <span className="error-message">{errors.nationalId}</span>}
                  </div>
                )}

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">الجنس *</label>
                    <div className="radio-group">
                      <label className="radio-label">
                        <input
                          type="radio"
                          name="gender"
                          value="male"
                          checked={formData.gender === 'male'}
                          onChange={handleChange}
                        />
                        <span className="radio-custom"></span>
                        <span>ذكر</span>
                      </label>
                      <label className="radio-label">
                        <input
                          type="radio"
                          name="gender"
                          value="female"
                          checked={formData.gender === 'female'}
                          onChange={handleChange}
                        />
                        <span className="radio-custom"></span>
                        <span>أنثى</span>
                      </label>
                    </div>
                    {errors.gender && <span className="error-message">{errors.gender}</span>}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">العنوان</label>
                  <textarea
                    name="address"
                    className={`form-input ${errors.address ? 'error' : ''}`}
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="أدخل عنوانك الكامل (اختياري)"
                    rows="3"
                    maxLength="200"
                  />
                  {errors.address && <span className="error-message">{errors.address}</span>}
                  <small className="form-hint">اختياري - يمكنك تركه فارغاً</small>
                </div>
              </div>
            )}

            {/* STEP 2: Medical Information */}
            {currentStep === 2 && (
              <div className="form-step">
                <div className="form-group">
                  <label className="form-label">فصيلة الدم</label>
                  <select
                    name="bloodType"
                    className={`form-input ${errors.bloodType ? 'error' : ''}`}
                    value={formData.bloodType}
                    onChange={handleChange}
                  >
                    <option value="">اختر فصيلة الدم (اختياري)</option>
                    {bloodTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                  {errors.bloodType && <span className="error-message">{errors.bloodType}</span>}
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">الطول (سم)</label>
                    <input
                      type="number"
                      name="height"
                      className={`form-input ${errors.height ? 'error' : ''}`}
                      value={formData.height}
                      onChange={handleChange}
                      placeholder="الطول بالسنتيمتر"
                      min="50"
                      max="250"
                      step="0.1"
                    />
                    {errors.height && <span className="error-message">{errors.height}</span>}
                    <small className="form-hint">من 50 إلى 250 سم (اختياري)</small>
                  </div>

                  <div className="form-group">
                    <label className="form-label">الوزن (كجم)</label>
                    <input
                      type="number"
                      name="weight"
                      className={`form-input ${errors.weight ? 'error' : ''}`}
                      value={formData.weight}
                      onChange={handleChange}
                      placeholder="الوزن بالكيلوجرام"
                      min="2"
                      max="300"
                      step="0.1"
                    />
                    {errors.weight && <span className="error-message">{errors.weight}</span>}
                    <small className="form-hint">من 2 إلى 300 كجم (اختياري)</small>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">حالة التدخين</label>
                  <select
                    name="smokingStatus"
                    className={`form-input ${errors.smokingStatus ? 'error' : ''}`}
                    value={formData.smokingStatus}
                    onChange={handleChange}
                  >
                    <option value="">اختر حالة التدخين (اختياري)</option>
                    {smokingStatuses.map(status => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                  {errors.smokingStatus && <span className="error-message">{errors.smokingStatus}</span>}
                </div>

                <div className="info-message">
                  <span className="info-icon">ℹ️</span>
                  <span>جميع المعلومات في هذه الخطوة اختيارية، ولكن تقديمها يساعد في تحسين جودة الرعاية الطبية</span>
                </div>
              </div>
            )}

            {/* STEP 3: Health History & Emergency Contact */}
            {currentStep === 3 && (
              <div className="form-step">
                <h3 style={{ marginBottom: '20px', color: '#125c7a' }}>السجل الصحي</h3>
                
                <div className="form-group">
                  <label className="form-label">الحساسية</label>
                  <textarea
                    name="allergies"
                    className={`form-input ${errors.allergies ? 'error' : ''}`}
                    value={formData.allergies}
                    onChange={handleChange}
                    placeholder="أدخل أي حساسية لديك، مفصولة بفواصل (مثال: بنسلين، فول سوداني، حليب)"
                    rows="2"
                  />
                  {errors.allergies && <span className="error-message">{errors.allergies}</span>}
                  <small className="form-hint">اختياري - افصل بين الحساسيات بفاصلة (،)</small>
                </div>

                <div className="form-group">
                  <label className="form-label">الأمراض المزمنة</label>
                  <textarea
                    name="chronicDiseases"
                    className={`form-input ${errors.chronicDiseases ? 'error' : ''}`}
                    value={formData.chronicDiseases}
                    onChange={handleChange}
                    placeholder="أدخل أي أمراض مزمنة، مفصولة بفواصل (مثال: سكري، ضغط دم، ربو)"
                    rows="2"
                  />
                  {errors.chronicDiseases && <span className="error-message">{errors.chronicDiseases}</span>}
                  <small className="form-hint">اختياري - افصل بين الأمراض بفاصلة (،)</small>
                </div>

                <div className="form-group">
                  <label className="form-label">التاريخ العائلي المرضي</label>
                  <textarea
                    name="familyHistory"
                    className={`form-input ${errors.familyHistory ? 'error' : ''}`}
                    value={formData.familyHistory}
                    onChange={handleChange}
                    placeholder="أدخل أي أمراض وراثية أو عائلية، مفصولة بفواصل (مثال: أمراض قلب عند الوالد، سكري عند الوالدة)"
                    rows="2"
                  />
                  {errors.familyHistory && <span className="error-message">{errors.familyHistory}</span>}
                  <small className="form-hint">اختياري - افصل بين الأمراض بفاصلة (،)</small>
                </div>

                <div style={{ margin: '30px 0', borderTop: '2px solid #e5e7eb', paddingTop: '30px' }}>
                  <h3 style={{ marginBottom: '20px', color: '#125c7a' }}>جهة الاتصال للطوارئ *</h3>
                  
                  <div className="form-group">
                    <label className="form-label">اسم جهة الاتصال *</label>
                    <input
                      type="text"
                      name="emergencyContactName"
                      className={`form-input ${errors.emergencyContactName ? 'error' : ''}`}
                      value={formData.emergencyContactName}
                      onChange={handleChange}
                      placeholder="الاسم الكامل"
                      maxLength="100"
                    />
                    {errors.emergencyContactName && <span className="error-message">{errors.emergencyContactName}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">صلة القرابة *</label>
                    <input
                      type="text"
                      name="emergencyContactRelationship"
                      className={`form-input ${errors.emergencyContactRelationship ? 'error' : ''}`}
                      value={formData.emergencyContactRelationship}
                      onChange={handleChange}
                      placeholder="مثال: أب، أم، أخ، زوج/زوجة"
                      maxLength="50"
                    />
                    {errors.emergencyContactRelationship && <span className="error-message">{errors.emergencyContactRelationship}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">رقم هاتف الطوارئ *</label>
                    <input
                      type="tel"
                      name="emergencyContactPhone"
                      className={`form-input ${errors.emergencyContactPhone ? 'error' : ''}`}
                      value={formData.emergencyContactPhone}
                      onChange={handleChange}
                      placeholder="+963 9X XXX XXXX أو 09X XXX XXXX"
                      dir="ltr"
                    />
                    {errors.emergencyContactPhone && <span className="error-message">{errors.emergencyContactPhone}</span>}
                    <small className="form-hint">الرقم السوري فقط (+963 أو 09)</small>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: Password */}
            {currentStep === 4 && (
              <div className="form-step">
                <div className="form-group">
                  <label className="form-label">كلمة المرور *</label>
                  <input
                    type="password"
                    name="password"
                    className={`form-input ${errors.password ? 'error' : ''}`}
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="أدخل كلمة مرور قوية"
                  />
                  {errors.password && <span className="error-message">{errors.password}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">تأكيد كلمة المرور *</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    className={`form-input ${errors.confirmPassword ? 'error' : ''}`}
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="أعد إدخال كلمة المرور"
                  />
                  {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}
                </div>

                <div className="password-requirements">
                  <p>متطلبات كلمة المرور:</p>
                  <ul>
                    <li className={formData.password.length >= 8 ? 'met' : ''}>
                      ✓ 8 أحرف على الأقل
                    </li>
                    <li className={/[A-Z]/.test(formData.password) ? 'met' : ''}>
                      ✓ حرف كبير واحد على الأقل (A-Z)
                    </li>
                    <li className={/[0-9]/.test(formData.password) ? 'met' : ''}>
                      ✓ رقم واحد على الأقل (0-9)
                    </li>
                    <li className={/[!@#$%^&*]/.test(formData.password) ? 'met' : ''}>
                      ✓ رمز خاص واحد على الأقل (!@#$%^&*)
                    </li>
                  </ul>
                </div>

                <div className="info-message" style={{ marginTop: '20px' }}>
                  <span className="info-icon">🔒</span>
                  <span>سيتم تشفير كلمة المرور الخاصة بك باستخدام خوارزمية bcrypt لضمان أقصى درجات الأمان</span>
                </div>

                <div className="terms-checkbox">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      required
                    />
                    <span className="checkbox-custom"></span>
                    <span>أوافق على <a href="#" onClick={(e) => e.preventDefault()}>الشروط والأحكام</a> و <a href="#" onClick={(e) => e.preventDefault()}>سياسة الخصوصية</a></span>
                  </label>
                </div>
              </div>
            )}

            {/* Form Actions */}
            <div className="form-actions">
              {currentStep > 1 && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handlePrev}
                  disabled={loading}
                >
                  السابق
                </button>
              )}
              
              {currentStep < 4 ? (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleNext}
                  disabled={loading}
                >
                  التالي
                </button>
              ) : (
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={loading}
                >
                  {loading ? 'جاري إنشاء الحساب...' : 'إنشاء الحساب'}
                </button>
              )}
            </div>

            <div className="login-link">
              لديك حساب بالفعل؟ <Link to="/">تسجيل الدخول</Link>
            </div>

          </form>
        </div>

        {/* Side Illustration */}
        <div className="signup-illustration">
          <div className="illustration-content">
            <h2>مرحباً بك في<br />Patient 360°</h2>
            <p>انضم إلى منصة الرعاية الصحية الرائدة</p>
            
            <div className="features-list">
              <div className="feature">
                <span className="feature-icon">✓</span>
                <span>إدارة متكاملة للسجلات الطبية</span>
              </div>
              <div className="feature">
                <span className="feature-icon">✓</span>
                <span>تواصل مباشر مع الأطباء</span>
              </div>
              <div className="feature">
                <span className="feature-icon">✓</span>
                <span>حجز المواعيد بسهولة</span>
              </div>
              <div className="feature">
                <span className="feature-icon">✓</span>
                <span>تتبع الوصفات الطبية</span>
              </div>
              <div className="feature">
                <span className="feature-icon">✓</span>
                <span>سجل صحي آمن ومشفر</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUp;