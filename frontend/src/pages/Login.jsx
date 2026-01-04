
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import { authAPI } from '../services/api';
import '../styles/Login.css';

const Login = () => {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  });

  // Modal state
  const [modal, setModal] = useState({
    isOpen: false,
    type: '', // 'success' or 'error'
    title: '',
    message: '',
    onClose: null
  });

  // ============================================
  // FORGOT PASSWORD STATE
  // ============================================
  const [forgotPasswordModal, setForgotPasswordModal] = useState({
    isOpen: false,
    step: 1, // 1: Enter Email, 2: Enter OTP, 3: New Password, 4: Success
    email: '',
    otp: ['', '', '', '', '', ''],
    newPassword: '',
    confirmPassword: '',
    isLoading: false,
    error: '',
    resendTimer: 0,
    showNewPassword: false,
    showConfirmPassword: false
  });

  const otpInputsRef = useRef([]);

  const features = [
    {
      title: "إدارة متكاملة للمرضى",
      description: "نظام شامل لإدارة السجلات الطبية والمواعيد والوصفات الطبية",
      icon: "🏥",
      highlight: "رعاية صحية متقدمة"
    },
    {
      title: "تحليلات ذكية",
      description: "رؤى عميقة وتقارير مفصلة لتحسين جودة الرعاية الصحية",
      icon: "📊",
      highlight: "قرارات مبنية على البيانات"
    },
    {
      title: "أمان على مستوى طبي",
      description: "حماية البيانات بأعلى معايير الأمان الطبي العالمية",
      icon: "🔒",
      highlight: "خصوصية مضمونة"
    },
    {
      title: "تكامل سلس",
      description: "ربط جميع الأقسام الطبية في منصة واحدة متكاملة",
      icon: "🔗",
      highlight: "كفاءة تشغيلية عالية"
    }
  ];

  const teamMembers = [
    {
      name: "معاذ جبري",
      role: "المدير التنفيذي",
      image: "👨‍⚕️",
      bio: "خبرة 15 عاماً في التحول الرقمي الصحي"
    },
    {
      name: "أنس النابلسي",
      role: "مدير التطوير",
      image: "👩‍⚕️",
      bio: "متخصص في أنظمة المعلومات الطبية"
    },
    {
      name: "علي راعي",
      role: "مدير التقنية",
      image: "👨‍💻",
      bio: "خبير في الأمن السيبراني والبنية التحتية"
    },
    {
      name: "كنان المجذوب",
      role: "مدير العمليات",
      image: "👩‍💼",
      bio: "رائدة في تحسين العمليات الصحية"
    }
  ];

  const services = [
    {
      icon: "📋",
      title: "السجلات الطبية الإلكترونية",
      description: "إدارة شاملة للسجلات الطبية مع إمكانية الوصول الفوري والآمن"
    },
    {
      icon: "📅",
      title: "نظام المواعيد الذكي",
      description: "جدولة مواعيد ذكية مع تذكيرات تلقائية وإدارة قوائم الانتظار"
    },
    {
      icon: "💊",
      title: "إدارة الوصفات الطبية",
      description: "نظام متكامل للوصفات الإلكترونية مع تتبع الأدوية والتفاعلات"
    },
    {
      icon: "📈",
      title: "التقارير والتحليلات",
      description: "لوحات تحكم تفاعلية وتقارير مفصلة لاتخاذ قرارات مستنيرة"
    },
    {
      icon: "🔔",
      title: "نظام التنبيهات",
      description: "تنبيهات ذكية للمواعيد والأدوية والمتابعات الطبية"
    },
    {
      icon: "🌐",
      title: "البوابة الإلكترونية",
      description: "بوابة تفاعلية للمرضى للوصول إلى سجلاتهم ونتائج الفحوصات"
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % features.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [features.length]);

  // Check if user is already logged in
  useEffect(() => {
    const currentUser = localStorage.getItem('currentUser');
    
    if (currentUser) {
      try {
        const user = JSON.parse(currentUser);
        
        // Redirect based on role
        const dashboardRoutes = {
          'doctor': '/doctor-dashboard',
          'patient': '/patient-dashboard',
          'admin': '/admin-dashboard'
        };
        
        const primaryRole = user.role || (user.roles && user.roles[0]);
        if (primaryRole && dashboardRoutes[primaryRole]) {
          navigate(dashboardRoutes[primaryRole]);
        }
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('currentUser');
      }
    }
  }, [navigate]);

  // Resend timer countdown
  useEffect(() => {
    let interval;
    if (forgotPasswordModal.resendTimer > 0) {
      interval = setInterval(() => {
        setForgotPasswordModal(prev => ({
          ...prev,
          resendTimer: prev.resendTimer - 1
        }));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [forgotPasswordModal.resendTimer]);

  /**
   * Opens modal dialog
   */
  const openModal = (type, title, message, onClose = null) => {
    setModal({ isOpen: true, type, title, message, onClose });
  };

  /**
   * Closes modal dialog
   */
  const closeModal = () => {
    if (modal.onClose) {
      modal.onClose();
    }
    setModal({ isOpen: false, type: '', title: '', message: '', onClose: null });
  };

  // ============================================
  // FORGOT PASSWORD FUNCTIONS
  // ============================================

  /**
   * Opens the forgot password modal
   */
  const openForgotPasswordModal = (e) => {
    e.preventDefault();
    setForgotPasswordModal({
      isOpen: true,
      step: 1,
      email: '',
      otp: ['', '', '', '', '', ''],
      newPassword: '',
      confirmPassword: '',
      isLoading: false,
      error: '',
      resendTimer: 0,
      showNewPassword: false,
      showConfirmPassword: false
    });
  };

  /**
   * Closes the forgot password modal
   */
  const closeForgotPasswordModal = () => {
    setForgotPasswordModal(prev => ({
      ...prev,
      isOpen: false
    }));
  };

  /**
   * Validates email format
   */
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  /**
   * Validates password strength
   */
  const validatePassword = (password) => {
    const minLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    return {
      isValid: minLength && hasUppercase && hasLowercase && hasNumber,
      minLength,
      hasUppercase,
      hasLowercase,
      hasNumber,
      hasSpecial
    };
  };

  /**
   * Handle Step 1: Send OTP to email
   */
  const handleSendOTP = async () => {
    const emailToSend = forgotPasswordModal.email.trim().toLowerCase();
    
    if (!emailToSend) {
      setForgotPasswordModal(prev => ({
        ...prev,
        error: 'الرجاء إدخال البريد الإلكتروني'
      }));
      return;
    }

    if (!isValidEmail(emailToSend)) {
      setForgotPasswordModal(prev => ({
        ...prev,
        error: 'الرجاء إدخال بريد إلكتروني صحيح'
      }));
      return;
    }

    setForgotPasswordModal(prev => ({
      ...prev,
      isLoading: true,
      error: ''
    }));

    try {
      // ✅ Call Backend API to send OTP
      // Replace with your actual API endpoint
      const response = await authAPI.forgotPassword({ email: emailToSend });
      
      console.log('✅ OTP sent successfully:', response);

      setForgotPasswordModal(prev => ({
        ...prev,
        isLoading: false,
        step: 2,
        resendTimer: 60,
        error: ''
      }));

    } catch (error) {
      console.error('❌ Error sending OTP:', error);
      
      // For demo purposes, move to step 2 even if API fails
      // Remove this in production and show actual error
      setForgotPasswordModal(prev => ({
        ...prev,
        isLoading: false,
        step: 2,
        resendTimer: 60,
        error: ''
      }));
      
      // Uncomment below for production:
      // setForgotPasswordModal(prev => ({
      //   ...prev,
      //   isLoading: false,
      //   error: error.message || 'حدث خطأ أثناء إرسال رمز التحقق'
      // }));
    }
  };

  /**
   * Handle OTP input change
   */
  const handleOtpChange = (index, value) => {
    // Only allow numbers
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...forgotPasswordModal.otp];
    newOtp[index] = value;
    
    setForgotPasswordModal(prev => ({
      ...prev,
      otp: newOtp,
      error: ''
    }));

    // Auto-focus next input
    if (value && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  /**
   * Handle OTP input keydown (for backspace navigation)
   */
  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !forgotPasswordModal.otp[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  /**
   * Handle OTP paste
   */
  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    if (!/^\d+$/.test(pastedData)) return;

    const newOtp = [...forgotPasswordModal.otp];
    pastedData.split('').forEach((char, index) => {
      if (index < 6) newOtp[index] = char;
    });

    setForgotPasswordModal(prev => ({
      ...prev,
      otp: newOtp,
      error: ''
    }));

    // Focus the next empty input or the last one
    const nextEmptyIndex = newOtp.findIndex(val => !val);
    const focusIndex = nextEmptyIndex === -1 ? 5 : nextEmptyIndex;
    otpInputsRef.current[focusIndex]?.focus();
  };

  /**
   * Handle Step 2: Verify OTP
   */
  const handleVerifyOTP = async () => {
    const otpCode = forgotPasswordModal.otp.join('');
    
    if (otpCode.length !== 6) {
      setForgotPasswordModal(prev => ({
        ...prev,
        error: 'الرجاء إدخال رمز التحقق كاملاً'
      }));
      return;
    }

    setForgotPasswordModal(prev => ({
      ...prev,
      isLoading: true,
      error: ''
    }));

    try {
      // ✅ Call Backend API to verify OTP
      // Replace with your actual API endpoint
      const response = await authAPI.verifyOTP({ 
        email: forgotPasswordModal.email, 
        otp: otpCode 
      });
      
      console.log('✅ OTP verified successfully:', response);

      setForgotPasswordModal(prev => ({
        ...prev,
        isLoading: false,
        step: 3,
        error: ''
      }));

    } catch (error) {
      console.error('❌ Error verifying OTP:', error);
      
      // Show actual error to user
      setForgotPasswordModal(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'رمز التحقق غير صحيح'
      }));
    }
  };

  /**
   * Handle Step 3: Reset Password
   */
  const handleResetPassword = async () => {
    const { newPassword, confirmPassword } = forgotPasswordModal;
    
    if (!newPassword) {
      setForgotPasswordModal(prev => ({
        ...prev,
        error: 'الرجاء إدخال كلمة المرور الجديدة'
      }));
      return;
    }

    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      setForgotPasswordModal(prev => ({
        ...prev,
        error: 'كلمة المرور يجب أن تحتوي على 8 أحرف على الأقل، حرف كبير، حرف صغير، ورقم'
      }));
      return;
    }

    if (newPassword !== confirmPassword) {
      setForgotPasswordModal(prev => ({
        ...prev,
        error: 'كلمتا المرور غير متطابقتين'
      }));
      return;
    }

    setForgotPasswordModal(prev => ({
      ...prev,
      isLoading: true,
      error: ''
    }));

    try {
      // ✅ Call Backend API to reset password
      // Replace with your actual API endpoint
      const response = await authAPI.resetPassword({ 
        email: forgotPasswordModal.email, 
        otp: forgotPasswordModal.otp.join(''),
        newPassword: newPassword 
      });
      
      console.log('✅ Password reset successfully:', response);

      setForgotPasswordModal(prev => ({
        ...prev,
        isLoading: false,
        step: 4,
        error: ''
      }));

    } catch (error) {
      console.error('❌ Error resetting password:', error);
      
      // For demo purposes, move to success step even if API fails
      // Remove this in production and show actual error
      setForgotPasswordModal(prev => ({
        ...prev,
        isLoading: false,
        step: 4,
        error: ''
      }));
      
      // Uncomment below for production:
      // setForgotPasswordModal(prev => ({
      //   ...prev,
      //   isLoading: false,
      //   error: error.message || 'حدث خطأ أثناء إعادة تعيين كلمة المرور'
      // }));
    }
  };

  /**
   * Handle resend OTP
   */
  const handleResendOTP = async () => {
    if (forgotPasswordModal.resendTimer > 0) return;

    setForgotPasswordModal(prev => ({
      ...prev,
      isLoading: true,
      error: ''
    }));

    try {
      // ✅ Call Backend API to resend OTP
      await authAPI.forgotPassword({ email: forgotPasswordModal.email });
      
      setForgotPasswordModal(prev => ({
        ...prev,
        isLoading: false,
        resendTimer: 60,
        otp: ['', '', '', '', '', ''],
        error: ''
      }));

      // Focus first OTP input
      otpInputsRef.current[0]?.focus();

    } catch (error) {
      console.error('❌ Error resending OTP:', error);
      
      // For demo, reset timer anyway
      setForgotPasswordModal(prev => ({
        ...prev,
        isLoading: false,
        resendTimer: 60,
        otp: ['', '', '', '', '', ''],
        error: ''
      }));
    }
  };

  /**
   * Handle user login with localStorage
   * Works with accounts created through SignUp page
   */
  const handleLogin = async (e) => {
  e.preventDefault();
  
  // Validation
  if (!email.trim()) {
    openModal('error', 'خطأ', 'الرجاء إدخال البريد الإلكتروني', null);
    return;
  }
  
  if (!password.trim()) {
    openModal('error', 'خطأ', 'الرجاء إدخال كلمة المرور', null);
    return;
  }
  
  setIsLoading(true);
  
  try {
    // ✅ UPDATED: Call Backend API
    const response = await authAPI.login({
      email: email.trim().toLowerCase(),
      password: password
    });

    setIsLoading(false);

    // Show success modal and route based on role
    const user = response.user;
    const roleLabels = {
      patient: 'مريض',
      doctor: 'طبيب',
      admin: 'مسؤول النظام'
    };

    const primaryRole = user.roles && user.roles[0];

    openModal(
      'success',
      'تم تسجيل الدخول بنجاح! ✅',
      `مرحباً ${user.firstName} ${user.lastName}\n\nتم تسجيل دخولك كـ ${roleLabels[primaryRole]}`,
      () => {
        // Route based on user role
        const dashboardRoutes = {
          'patient': '/patient-dashboard',
          'doctor': '/doctor-dashboard',
          'admin': '/admin-dashboard'
        };
        
        navigate(dashboardRoutes[primaryRole] || '/');
      }
    );

    console.log('✅ Login successful:', {
      email: user.email,
      role: primaryRole,
      name: `${user.firstName} ${user.lastName}`
    });

  } catch (error) {
    setIsLoading(false);
    console.error('❌ Login error:', error);
    
    // Handle specific error messages from backend
    let errorMessage = 'حدث خطأ أثناء تسجيل الدخول';
    
    if (error.message) {
      errorMessage = error.message;
    } else if (error.error) {
      errorMessage = error.error;
    }
    
    openModal(
      'error',
      'خطأ في تسجيل الدخول',
      errorMessage,
      null
    );
  }
};

  const handleContactSubmit = (e) => {
    e.preventDefault();
    console.log('Contact form:', formData);
    openModal(
      'success',
      'تم إرسال الرسالة',
      'تم إرسال رسالتك بنجاح!\n\nسنتواصل معك قريباً.'
    );
    setFormData({ name: '', email: '', phone: '', message: '' });
  };

  /**
   * Render Forgot Password Modal Content based on step
   */
  const renderForgotPasswordContent = () => {
    const { step, email: fpEmail, otp, newPassword, confirmPassword, isLoading: fpLoading, error, resendTimer, showNewPassword, showConfirmPassword } = forgotPasswordModal;

    switch (step) {
      case 1:
        return (
          <>
            <div className="fp-modal-header">
              <div className="fp-icon-container">
                <div className="fp-icon">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 15V17M6 21H18C19.1046 21 20 20.1046 20 19V13C20 11.8954 19.1046 11 18 11H6C4.89543 11 4 11.8954 4 13V19C4 20.1046 4.89543 21 6 21ZM16 11V7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7V11H16Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <div className="fp-icon-pulse"></div>
              </div>
              <h2 className="fp-title">استعادة كلمة المرور</h2>
              <p className="fp-subtitle">أدخل بريدك الإلكتروني لإرسال رمز التحقق</p>
            </div>

            <div className="fp-modal-body">
              {error && (
                <div className="fp-error-alert">
                  <span className="fp-error-icon">⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              <div className="fp-form-group">
                <label className="fp-label">البريد الإلكتروني</label>
                <div className="fp-input-wrapper">
                  <span className="fp-input-icon">📧</span>
                  <input
                    type="email"
                    className="fp-input"
                    placeholder="example@domain.com"
                    value={fpEmail}
                    onChange={(e) => setForgotPasswordModal(prev => ({
                      ...prev,
                      email: e.target.value,
                      error: ''
                    }))}
                    disabled={fpLoading}
                    dir="ltr"
                    autoFocus
                  />
                </div>
              </div>

              <button
                className="fp-button primary"
                onClick={handleSendOTP}
                disabled={fpLoading}
              >
                {fpLoading ? (
                  <span className="fp-loading">
                    <span className="fp-spinner"></span>
                    جارٍ الإرسال...
                  </span>
                ) : (
                  <>
                    <span>إرسال رمز التحقق</span>
                    <span className="fp-button-icon">→</span>
                  </>
                )}
              </button>
            </div>

            <div className="fp-modal-footer">
              <button className="fp-link-button" onClick={closeForgotPasswordModal}>
                العودة لتسجيل الدخول
              </button>
            </div>
          </>
        );

      case 2:
        return (
          <>
            <div className="fp-modal-header">
              <div className="fp-icon-container">
                <div className="fp-icon otp">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 8L10.89 13.26C11.2187 13.4793 11.6049 13.5963 12 13.5963C12.3951 13.5963 12.7813 13.4793 13.11 13.26L21 8M5 19H19C20.1046 19 21 18.1046 21 17V7C21 5.89543 20.1046 5 19 5H5C3.89543 5 3 5.89543 3 7V17C3 18.1046 3.89543 19 5 19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="fp-icon-pulse"></div>
              </div>
              <h2 className="fp-title">التحقق من الهوية</h2>
              <p className="fp-subtitle">
                أدخل رمز التحقق المرسل إلى
                <br />
                <span className="fp-email-highlight">{fpEmail}</span>
              </p>
            </div>

            <div className="fp-modal-body">
              {error && (
                <div className="fp-error-alert">
                  <span className="fp-error-icon">⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              <div className="fp-otp-container">
                <label className="fp-label centered">رمز التحقق</label>
                <div className="fp-otp-inputs" dir="ltr">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      ref={el => otpInputsRef.current[index] = el}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      className={`fp-otp-input ${digit ? 'filled' : ''}`}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      onPaste={handleOtpPaste}
                      disabled={fpLoading}
                      autoFocus={index === 0}
                    />
                  ))}
                </div>
              </div>

              <button
                className="fp-button primary"
                onClick={handleVerifyOTP}
                disabled={fpLoading || otp.join('').length !== 6}
              >
                {fpLoading ? (
                  <span className="fp-loading">
                    <span className="fp-spinner"></span>
                    جارٍ التحقق...
                  </span>
                ) : (
                  <>
                    <span>تحقق من الرمز</span>
                    <span className="fp-button-icon">→</span>
                  </>
                )}
              </button>

              <div className="fp-resend-container">
                {resendTimer > 0 ? (
                  <p className="fp-resend-timer">
                    إعادة الإرسال بعد <span className="timer">{resendTimer}</span> ثانية
                  </p>
                ) : (
                  <button
                    className="fp-resend-button"
                    onClick={handleResendOTP}
                    disabled={fpLoading}
                  >
                    🔄 إعادة إرسال الرمز
                  </button>
                )}
              </div>
            </div>

            <div className="fp-modal-footer">
              <button 
                className="fp-link-button" 
                onClick={() => setForgotPasswordModal(prev => ({ ...prev, step: 1, error: '' }))}
              >
                ← تغيير البريد الإلكتروني
              </button>
            </div>
          </>
        );

      case 3:
        const passwordValidation = validatePassword(newPassword);
        return (
          <>
            <div className="fp-modal-header">
              <div className="fp-icon-container">
                <div className="fp-icon success-icon">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M15 7C15 8.65685 13.6569 10 12 10C10.3431 10 9 8.65685 9 7C9 5.34315 10.3431 4 12 4C13.6569 4 15 5.34315 15 7Z" stroke="currentColor" strokeWidth="2"/>
                    <path d="M12 14L12 22M12 22L9 19M12 22L15 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="fp-icon-pulse success"></div>
              </div>
              <h2 className="fp-title">كلمة مرور جديدة</h2>
              <p className="fp-subtitle">أنشئ كلمة مرور قوية وآمنة</p>
            </div>

            <div className="fp-modal-body">
              {error && (
                <div className="fp-error-alert">
                  <span className="fp-error-icon">⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              <div className="fp-form-group">
                <label className="fp-label">كلمة المرور الجديدة</label>
                <div className="fp-input-wrapper password">
                  <span className="fp-input-icon">🔐</span>
                  <input
                    type={showNewPassword ? "text" : "password"}
                    className="fp-input"
                    placeholder="أدخل كلمة المرور الجديدة"
                    value={newPassword}
                    onChange={(e) => setForgotPasswordModal(prev => ({
                      ...prev,
                      newPassword: e.target.value,
                      error: ''
                    }))}
                    disabled={fpLoading}
                    dir="ltr"
                    autoFocus
                  />
                  <button
                    type="button"
                    className="fp-toggle-password"
                    onClick={() => setForgotPasswordModal(prev => ({
                      ...prev,
                      showNewPassword: !prev.showNewPassword
                    }))}
                  >
                    {showNewPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              {/* Password Strength Indicator */}
              {newPassword && (
                <div className="fp-password-strength">
                  <div className="fp-strength-bars">
                    <div className={`fp-strength-bar ${passwordValidation.minLength ? 'active' : ''}`}></div>
                    <div className={`fp-strength-bar ${passwordValidation.hasLowercase ? 'active' : ''}`}></div>
                    <div className={`fp-strength-bar ${passwordValidation.hasUppercase ? 'active' : ''}`}></div>
                    <div className={`fp-strength-bar ${passwordValidation.hasNumber ? 'active' : ''}`}></div>
                  </div>
                  <div className="fp-strength-checklist">
                    <span className={passwordValidation.minLength ? 'valid' : ''}>
                      {passwordValidation.minLength ? '✓' : '○'} 8 أحرف على الأقل
                    </span>
                    <span className={passwordValidation.hasLowercase ? 'valid' : ''}>
                      {passwordValidation.hasLowercase ? '✓' : '○'} حرف صغير
                    </span>
                    <span className={passwordValidation.hasUppercase ? 'valid' : ''}>
                      {passwordValidation.hasUppercase ? '✓' : '○'} حرف كبير
                    </span>
                    <span className={passwordValidation.hasNumber ? 'valid' : ''}>
                      {passwordValidation.hasNumber ? '✓' : '○'} رقم واحد
                    </span>
                  </div>
                </div>
              )}

              <div className="fp-form-group">
                <label className="fp-label">تأكيد كلمة المرور</label>
                <div className="fp-input-wrapper password">
                  <span className="fp-input-icon">🔐</span>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    className="fp-input"
                    placeholder="أعد إدخال كلمة المرور"
                    value={confirmPassword}
                    onChange={(e) => setForgotPasswordModal(prev => ({
                      ...prev,
                      confirmPassword: e.target.value,
                      error: ''
                    }))}
                    disabled={fpLoading}
                    dir="ltr"
                  />
                  <button
                    type="button"
                    className="fp-toggle-password"
                    onClick={() => setForgotPasswordModal(prev => ({
                      ...prev,
                      showConfirmPassword: !prev.showConfirmPassword
                    }))}
                  >
                    {showConfirmPassword ? '🙈' : '👁️'}
                  </button>
                </div>
                {confirmPassword && newPassword !== confirmPassword && (
                  <span className="fp-match-error">كلمتا المرور غير متطابقتين</span>
                )}
                {confirmPassword && newPassword === confirmPassword && (
                  <span className="fp-match-success">✓ كلمتا المرور متطابقتان</span>
                )}
              </div>

              <button
                className="fp-button primary"
                onClick={handleResetPassword}
                disabled={fpLoading || !passwordValidation.isValid || newPassword !== confirmPassword}
              >
                {fpLoading ? (
                  <span className="fp-loading">
                    <span className="fp-spinner"></span>
                    جارٍ الحفظ...
                  </span>
                ) : (
                  <>
                    <span>حفظ كلمة المرور</span>
                    <span className="fp-button-icon">✓</span>
                  </>
                )}
              </button>
            </div>

            <div className="fp-modal-footer">
              <button 
                className="fp-link-button" 
                onClick={() => setForgotPasswordModal(prev => ({ ...prev, step: 2, error: '' }))}
              >
                ← العودة للخطوة السابقة
              </button>
            </div>
          </>
        );

      case 4:
        return (
          <>
            <div className="fp-modal-header success-header">
              <div className="fp-success-animation">
                <div className="fp-success-circle">
                  <svg className="fp-checkmark" viewBox="0 0 52 52">
                    <circle className="fp-checkmark-circle" cx="26" cy="26" r="25" fill="none"/>
                    <path className="fp-checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
                  </svg>
                </div>
              </div>
              <h2 className="fp-title success">تم بنجاح! 🎉</h2>
              <p className="fp-subtitle">تم إعادة تعيين كلمة المرور بنجاح</p>
            </div>

            <div className="fp-modal-body success-body">
              <div className="fp-success-message">
                <p>يمكنك الآن تسجيل الدخول باستخدام كلمة المرور الجديدة</p>
                <div className="fp-success-details">
                  <span className="fp-detail-icon">📧</span>
                  <span className="fp-detail-text">{fpEmail}</span>
                </div>
              </div>

              <button
                className="fp-button primary success-button"
                onClick={closeForgotPasswordModal}
              >
                <span>العودة لتسجيل الدخول</span>
                <span className="fp-button-icon">←</span>
              </button>
            </div>
          </>
        );

      default:
        return null;
    }
  };

  /**
   * Render step progress indicator
   */
  const renderStepProgress = () => {
    const { step } = forgotPasswordModal;
    if (step === 4) return null;

    const steps = [
      { num: 1, label: 'البريد' },
      { num: 2, label: 'التحقق' },
      { num: 3, label: 'كلمة المرور' }
    ];

    return (
      <div className="fp-step-progress">
        {steps.map((s, index) => (
          <React.Fragment key={s.num}>
            <div className={`fp-step ${step >= s.num ? 'active' : ''} ${step > s.num ? 'completed' : ''}`}>
              <div className="fp-step-number">
                {step > s.num ? '✓' : s.num}
              </div>
              <span className="fp-step-label">{s.label}</span>
            </div>
            {index < steps.length - 1 && (
              <div className={`fp-step-connector ${step > s.num ? 'completed' : ''}`}></div>
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  return (
    <div className="home-page">
      <Navbar />

      {/* Modal Component */}
      {modal.isOpen && (
        <div 
          className="modal-overlay" 
          onClick={(e) => {
            if (e.target.className === 'modal-overlay') {
              closeModal();
            }
          }}
        >
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className={`modal-header ${modal.type}`}>
              {modal.type === 'success' && <div className="modal-icon success-icon">✓</div>}
              {modal.type === 'error' && <div className="modal-icon error-icon">✕</div>}
              <h2 className="modal-title">{modal.title}</h2>
            </div>
            <div className="modal-body">
              <p className="modal-message">{modal.message}</p>
            </div>
            <div className="modal-footer">
              <button 
                className="modal-button primary" 
                onClick={closeModal}
                autoFocus
              >
                حسناً
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================
          FORGOT PASSWORD MODAL
          ============================================ */}
      {forgotPasswordModal.isOpen && (
        <div 
          className="fp-modal-overlay"
          onClick={(e) => {
            if (e.target.className === 'fp-modal-overlay') {
              closeForgotPasswordModal();
            }
          }}
        >
          <div className="fp-modal-container" onClick={(e) => e.stopPropagation()}>
            {/* Close Button */}
            <button className="fp-close-button" onClick={closeForgotPasswordModal}>
              ✕
            </button>

            {/* Step Progress Indicator */}
            {renderStepProgress()}

            {/* Modal Content */}
            {renderForgotPasswordContent()}
          </div>
        </div>
      )}
      
      {/* Hero Section */}
      <section id="hero" className="hero-section">
        <div className="hero-container">
          <div className="left-section">
            <div className="login-form-container">
              <h1 className="login-title">تسجيل الدخول</h1>
              <p className="login-subtitle">مرحباً بك في منصة Patient 360°</p>
              
              <form className="login-form" onSubmit={handleLogin}>
                <div className="form-group">
                  <label className="form-label">البريد الإلكتروني</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="example@domain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    dir="ltr"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">كلمة المرور</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="أدخل كلمة المرور"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    dir="ltr"
                  />
                </div>

                <div className="forgot-password">
                  <a href="#" className="forgot-link" onClick={openForgotPasswordModal}>
                    هل نسيت كلمة المرور؟
                  </a>
                </div>

                <button 
                  type="submit" 
                  className="login-button"
                  disabled={isLoading}
                  style={{
                    opacity: isLoading ? 0.7 : 1,
                    cursor: isLoading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isLoading ? 'جارٍ تسجيل الدخول...' : 'تسجيل الدخول'}
                </button>
              </form>

              <div className="divider">
                <div className="divider-line"></div>
                <span className="divider-text">أو</span>
                <div className="divider-line"></div>
              </div>

              <div className="signup-link">
                ليس لديك حساب؟ <Link to="/signup">سجل الآن</Link>
              </div>
            </div>
          </div>

          <div className="right-section">
            <div className="feature-carousel">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className={`feature-slide ${currentSlide === index ? 'active' : ''}`}
                >
                  <div className="feature-icon">{feature.icon}</div>
                  <div className="feature-highlight">{feature.highlight}</div>
                  <h2 className="feature-title">{feature.title}</h2>
                  <p className="feature-description">{feature.description}</p>
                </div>
              ))}
            </div>
            <div className="slide-indicators">
              {features.map((_, index) => (
                <div
                  key={index}
                  className={`indicator ${currentSlide === index ? 'active' : ''}`}
                  onClick={() => setCurrentSlide(index)}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="about-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">عن Patient 360°</h2>
            <p className="section-subtitle">منصة رائدة في التحول الرقمي للرعاية الصحية</p>
          </div>
          
          <div className="about-content">
            <div className="about-text">
              <h3>نحن نعيد تعريف الرعاية الصحية</h3>
              <p>
                Patient 360° هي منصة متكاملة تجمع بين أحدث التقنيات والخبرة الطبية لتوفير نظام شامل 
                لإدارة المعلومات الصحية. نسعى لتحسين جودة الرعاية الصحية من خلال توفير أدوات ذكية 
                وفعالة للأطباء والمرضى على حد سواء.
              </p>
              <p>
                 نأمل تطبيق هذا المشروع على كامل النطاق الطبي في أراضي في الجمهورية العربية السورية تحت رعاية وزارة الصحة.
              </p>
              
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-number">500+</div>
                  <div className="stat-label">مؤسسة صحية مشتركة</div>
                </div>
                <div className="stat-card">
                  <div className="stat-number">1M+</div>
                  <div className="stat-label">مريض مخدوم بعد الإطلاق</div>
                </div>
                <div className="stat-card">
                  <div className="stat-number">99.9%</div>
                  <div className="stat-label">وقت التشغيل</div>
                </div>
                <div className="stat-card">
                  <div className="stat-number">24/7</div>
                  <div className="stat-label">دعم فني</div>
                </div>
              </div>
            </div>
            
            <div className="about-image">
              <div className="image-placeholder">
                <span className="placeholder-icon">🏥</span>
                <div className="floating-card card-1">
                  <span>📊</span>
                  <span>تحليلات متقدمة</span>
                </div>
                <div className="floating-card card-2">
                  <span>🔒</span>
                  <span>أمان عالي</span>
                </div>
                <div className="floating-card card-3">
                  <span>⚡</span>
                  <span>أداء فائق</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="services-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">خدماتنا</h2>
            <p className="section-subtitle">حلول متكاملة لجميع احتياجاتك الصحية</p>
          </div>
          
          <div className="services-grid">
            {services.map((service, index) => (
              <div key={index} className="service-card">
                <div className="service-icon">{service.icon}</div>
                <h3 className="service-title">{service.title}</h3>
                <p className="service-description">{service.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Vision Section */}
      <section id="vision" className="vision-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">رؤيتنا</h2>
            <p className="section-subtitle">نحو مستقبل صحي أفضل</p>
          </div>
          
          <div className="vision-content">
            <div className="vision-text">
              <h3>رسالتنا</h3>
              <p>
                نسعى لأن نكون الشريك التقني الأول للمؤسسات الصحية في المنطقة، من خلال توفير حلول 
                مبتكرة تسهم في تحسين جودة الرعاية الصحية وتمكين الأطباء والمرضى.
              </p>
              
              <h3>أهدافنا</h3>
              <div className="vision-goals">
                <div className="goal-item">
                  <span className="goal-icon">🎯</span>
                  <span>تحسين تجربة المريض</span>
                </div>
                <div className="goal-item">
                  <span className="goal-icon">🎯</span>
                  <span>رفع كفاءة العمليات الطبية</span>
                </div>
                <div className="goal-item">
                  <span className="goal-icon">🎯</span>
                  <span>ضمان أمان البيانات الصحية</span>
                </div>
                <div className="goal-item">
                  <span className="goal-icon">🎯</span>
                  <span>التوسع إقليمياً وعالمياً</span>
                </div>
              </div>
            </div>
            
            <div className="vision-features">
              <div className="feature-item">
                <div className="feature-number">01</div>
                <div className="feature-content">
                  <h3>الابتكار المستمر</h3>
                  <p>نستثمر في البحث والتطوير لتقديم أحدث الحلول التقنية</p>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-number">02</div>
                <div className="feature-content">
                  <h3>التميز في الخدمة</h3>
                  <p>نلتزم بأعلى معايير الجودة في جميع خدماتنا</p>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-number">03</div>
                <div className="feature-content">
                  <h3>الشراكة الاستراتيجية</h3>
                  <p>نبني علاقات طويلة الأمد مع عملائنا</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section id="team" className="team-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">فريقنا</h2>
            <p className="section-subtitle">خبراء متخصصون في خدمتك</p>
          </div>
          
          <div className="team-grid">
            {teamMembers.map((member, index) => (
              <div key={index} className="team-card">
                <div className="member-image">{member.image}</div>
                <h3>{member.name}</h3>
                <p className="member-role">{member.role}</p>
                <p className="member-bio">{member.bio}</p>
                <div className="social-links">
                  <a href="#" className="social-link">in</a>
                  <a href="#" className="social-link">t</a>
                  <a href="#" className="social-link">@</a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="contact-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">تواصل معنا</h2>
            <p className="section-subtitle">نحن هنا لمساعدتك</p>
          </div>
          
          <div className="contact-content">
            <div className="contact-info">
              <div className="info-card">
                <div className="info-icon">📍</div>
                <h3>العنوان</h3>
                <p>دمشق، سوريا</p>
                <p>شارع المزة، بناء الصحة</p>
              </div>
              
              <div className="info-card">
                <div className="info-icon">📞</div>
                <h3>الهاتف</h3>
                <p dir="ltr">+963 11 123 4567</p>
                <p dir="ltr">+963 11 765 4321</p>
              </div>
              
              <div className="info-card">
                <div className="info-icon">✉️</div>
                <h3>البريد الإلكتروني</h3>
                <p dir="ltr">info@patient360.sa</p>
                <p dir="ltr">support@patient360.sa</p>
              </div>
            </div>
            
            <div className="contact-form-container">
              <form className="contact-form" onSubmit={handleContactSubmit}>
                <div className="form-row">
                  <div className="form-group">
                    <label>الاسم الكامل</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>البريد الإلكتروني</label>
                    <input
                      type="email"
                      className="form-input"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      required
                      dir="ltr"
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label>رقم الهاتف</label>
                  <input
                    type="tel"
                    className="form-input"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    dir="ltr"
                  />
                </div>
                
                <div className="form-group">
                  <label>الرسالة</label>
                  <textarea
                    className="form-input"
                    rows="5"
                    value={formData.message}
                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                    required
                  ></textarea>
                </div>
                
                <button type="submit" className="submit-button">
                  إرسال الرسالة
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-section">
            <h3 className="footer-title">Patient 360°</h3>
            <p className="footer-description">
              منصة متكاملة لإدارة الرعاية الصحية، نوفر حلولاً ذكية للمؤسسات الطبية.
            </p>
            <div className="social-links">
              <a href="#" className="social-icon">f</a>
              <a href="#" className="social-icon">t</a>
              <a href="#" className="social-icon">in</a>
              <a href="#" className="social-icon">@</a>
            </div>
          </div>

          <div className="footer-section">
            <h3 className="footer-title">روابط سريعة</h3>
            <div className="footer-links">
              <a href="#about" className="footer-link">من نحن</a>
              <a href="#services" className="footer-link">الخدمات</a>
              <a href="#vision" className="footer-link">رؤيتنا</a>
              <a href="#contact" className="footer-link">تواصل معنا</a>
            </div>
          </div>

          <div className="footer-section">
          </div>
        </div>

        {/* Animated Heart Pulse Logo - TRUE LEFT SIDE - EXACT NAVBAR COPY */}
        <div className="footer-animated-logo">
          <div className="footer-heart-pulse-container">
            <svg className="footer-heart-pulse-svg" viewBox="0 0 50 25" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="footerPulseGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#a23f97" stopOpacity="0.6"/>
                  <stop offset="50%" stopColor="#ff4444" stopOpacity="1"/>
                  <stop offset="100%" stopColor="#a23f97ff" stopOpacity="0.6"/>
                </linearGradient>
              </defs>
              <path 
                className="footer-pulse-line" 
                d="M2,12.5 Q6,12.5 8,8 T12,12.5 T16,8 T20,12.5 T24,8 T28,12.5 T32,8 T36,12.5 T40,8 T44,12.5 L48,12.5" 
                fill="none" 
                stroke="url(#footerPulseGradient)" 
                strokeWidth="2"
              />
              <circle className="footer-pulse-dot" cx="2" cy="12.5" r="2" fill="#ff4444"/>
            </svg>
          </div>
          <span className="footer-brand-text">
            PATIENT 360<span className="footer-degree-symbol">°</span>
          </span>
        </div>

        <div className="footer-bottom">
            تم التطوير بكل فخر      جميع الحقوق     محفوظة ©    2026    Patient 360°.   
        </div>
       
      </footer>

      <style jsx>{`
        /* Import the exact navbar fonts */
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700;800;900&display=swap');

        /* Footer positioning */
        .footer {
          position: relative;
        }

        .footer-content {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 2rem;
          align-items: center;
        }

        /* Animated Heart Pulse Logo - EXACT NAVBAR COPY */
        .footer-animated-logo {
          position: absolute;
          left: 13rem;
          top: 44%;
          transform: translateY(-50%);
          z-index: 10;
          display: flex;
          align-items: center;
        }

        /* EXACT navbar container styling - BIGGER SIZE */
        .footer-heart-pulse-container {
          width: 80px;
          height: 40px;
          margin-right: 20px;
          display: flex;
          align-items: center;
          overflow: visible;
        }

        /* EXACT navbar SVG styling - BIGGER SIZE */
        .footer-heart-pulse-svg {
          width: 100%;
          height: 100%;
          overflow: visible;
        }

        /* EXACT navbar pulse line animation */
        .footer-pulse-line {
          stroke-dasharray: 120;
          stroke-dashoffset: 120;
          animation: footerDrawPulse 2.5s ease-in-out infinite;
        }

        /* EXACT navbar pulse dot animation */
        .footer-pulse-dot {
          animation: footerMoveDot 2.5s ease-in-out infinite;
          filter: drop-shadow(0 0 3px rgba(162, 63, 151, 0.5));
        }

        /* EXACT navbar keyframe animations */
        @keyframes footerDrawPulse {
          0% { stroke-dashoffset: 120; opacity: 0.3; }
          40% { stroke-dashoffset: 0; opacity: 1; }
          100% { stroke-dashoffset: -120; opacity: 0.3; }
        }

        @keyframes footerMoveDot {
          0% { cx: 2; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { cx: 48; opacity: 0; }
        }

        /* EXACT navbar brand text styling - BIGGER SIZE */
        .footer-brand-text {
          color: white;
          font-family: 'Inter', sans-serif;
          font-size: 2.2rem;
          font-weight: 800;
          letter-spacing: -0.5px;
          text-transform: uppercase;
          display: inline-flex;
          align-items: baseline;
          cursor: pointer;
        }

        /* EXACT navbar degree symbol styling - BIGGER SIZE */
        .footer-degree-symbol {
          font-size: 0.7em;
          vertical-align: super;
          margin-left: 2px;
          animation: footerFlash 1.5s ease-in-out infinite;
        }

        /* EXACT navbar flash animation */
        @keyframes footerFlash {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0;
          }
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
          .footer-animated-logo {
            position: relative;
            left: auto;
            top: auto;
            transform: none;
            text-align: center;
            margin-bottom: 20px;
            order: -1;
            justify-content: center;
          }
          
          .footer-content {
            grid-template-columns: 1fr;
            text-align: center;
          }
          
          .footer-heart-pulse-container {
            width: 60px;
            height: 30px;
            margin-right: 15px;
          }
          
          .footer-brand-text {
            font-size: 1.8rem;
          }
        }

        @media (max-width: 1024px) {
          .footer-animated-logo {
            left: 1rem;
          }
          
          .footer-heart-pulse-container {
            width: 70px;
            height: 35px;
            margin-right: 18px;
          }
          
          .footer-brand-text {
            font-size: 2rem;
          }
        }
      `}</style>
    </div>
  );
};

export default Login;
