// src/pages/LaboratoryDashboard.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar';

const LaboratoryDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    
    if (!currentUser) {
      navigate('/');
      return;
    }
    
    // Make sure only laboratory staff can access this page
    if (currentUser.role !== 'laboratory') {
      alert('غير مصرح لك بالوصول إلى هذه الصفحة');
      navigate('/');
      return;
    }
    
    setUser(currentUser);
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    alert('تم تسجيل الخروج بنجاح');
    navigate('/');
  };

  if (!user) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'Cairo, sans-serif' }}>جاري التحميل...</div>;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafb' }}>
      <Navbar />
      
      <div style={{ padding: '100px 40px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'Cairo, sans-serif' }}>
        {/* Welcome Header */}
        <div style={{ 
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          color: 'white',
          padding: '40px',
          borderRadius: '16px',
          marginBottom: '30px',
          boxShadow: '0 10px 40px rgba(245, 158, 11, 0.2)'
        }}>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '10px', fontWeight: '700' }}>
            مرحباً {user.firstName} {user.lastName} 🔬
          </h1>
          <p style={{ fontSize: '1.3rem', opacity: 0.95 }}>
            لوحة تحكم المختبر - Patient 360°
          </p>
          {user.institution && (
            <p style={{ fontSize: '1.1rem', opacity: 0.9, marginTop: '10px' }}>
              {user.institution}
            </p>
          )}
        </div>

        {/* Lab Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
          <StatCard icon="🔬" number="48" label="التحاليل اليوم" color="#f59e0b" />
          <StatCard icon="⏳" number="15" label="قيد المعالجة" color="#f59e0b" />
          <StatCard icon="✅" number="33" label="نتائج جاهزة" color="#f59e0b" />
          <StatCard icon="📊" number="856" label="إجمالي التحاليل" color="#f59e0b" />
        </div>

        {/* Test Categories */}
        <div style={{ background: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', marginBottom: '30px' }}>
          <h2 style={{ fontSize: '1.5rem', color: '#f59e0b', marginBottom: '20px', borderBottom: '2px solid #f3f4f6', paddingBottom: '10px', fontWeight: '700' }}>
            أنواع التحاليل
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
            <TestCategory icon="🩸" title="تحاليل الدم" count="23 تحليل جديد" />
            <TestCategory icon="💉" title="فحوصات السكري" count="8 فحص جديد" />
            <TestCategory icon="🧬" title="الفحوصات الجينية" count="5 فحص جديد" />
            <TestCategory icon="🦠" title="الفحوصات الميكروبية" count="12 فحص جديد" />
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{ background: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', marginBottom: '30px' }}>
          <h2 style={{ fontSize: '1.5rem', color: '#f59e0b', marginBottom: '20px', borderBottom: '2px solid #f3f4f6', paddingBottom: '10px', fontWeight: '700' }}>
            الإجراءات السريعة
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
            <ActionButton label="إضافة نتيجة جديدة" icon="➕" color="#f59e0b" />
            <ActionButton label="عرض التحاليل المعلقة" icon="⏳" color="#f59e0b" />
            <ActionButton label="إدارة الأجهزة" icon="🖥️" color="#f59e0b" />
            <ActionButton label="التقارير الإحصائية" icon="📊" color="#f59e0b" />
          </div>
        </div>

        {/* Account Information */}
        <div style={{ background: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', marginBottom: '30px' }}>
          <h2 style={{ fontSize: '1.5rem', color: '#f59e0b', marginBottom: '20px', borderBottom: '2px solid #f3f4f6', paddingBottom: '10px', fontWeight: '700' }}>
            معلومات الحساب
          </h2>
          
          <div style={{ display: 'grid', gap: '15px' }}>
            <InfoRow label="الاسم الكامل" value={`${user.firstName} ${user.lastName}`} />
            <InfoRow label="البريد الإلكتروني" value={user.email} ltr={true} />
            <InfoRow label="الدور" value="أخصائي مختبر" />
            <InfoRow label="رقم الهاتف" value={user.phone} ltr={true} />
            {user.licenseNumber && <InfoRow label="رقم الترخيص" value={user.licenseNumber} />}
            {user.institution && <InfoRow label="المؤسسة الصحية" value={user.institution} />}
          </div>
          
          <button onClick={handleLogout} style={{ marginTop: '30px', padding: '12px 30px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '10px', fontSize: '1rem', fontWeight: '600', cursor: 'pointer', transition: 'all 0.3s ease', fontFamily: 'Cairo, sans-serif' }}
            onMouseOver={(e) => e.target.style.background = '#dc2626'}
            onMouseOut={(e) => e.target.style.background = '#ef4444'}
          >
            تسجيل الخروج 🚪
          </button>
        </div>

        {/* Laboratory Features */}
        <div style={{ background: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
          <h2 style={{ fontSize: '1.5rem', color: '#f59e0b', marginBottom: '20px', borderBottom: '2px solid #f3f4f6', paddingBottom: '10px', fontWeight: '700' }}>
            الخدمات المتاحة للمختبرات 🔬
          </h2>
          <ul style={{ listStyle: 'none', padding: 0, lineHeight: '2' }}>
            <li style={{ padding: '8px 0', color: '#6b7280' }}>✓ إدارة طلبات التحاليل والفحوصات</li>
            <li style={{ padding: '8px 0', color: '#6b7280' }}>✓ إدخال وتسجيل نتائج التحاليل</li>
            <li style={{ padding: '8px 0', color: '#6b7280' }}>✓ تتبع حالة التحاليل قيد المعالجة</li>
            <li style={{ padding: '8px 0', color: '#6b7280' }}>✓ إنشاء التقارير الطبية التفصيلية</li>
            <li style={{ padding: '8px 0', color: '#6b7280' }}>✓ إدارة معدات وأجهزة المختبر</li>
            <li style={{ padding: '8px 0', color: '#6b7280' }}>✓ مراقبة الجودة والمعايير المخبرية</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon, number, label, color }) => (
  <div style={{ background: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', textAlign: 'center', transition: 'transform 0.2s', cursor: 'pointer' }}
    onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
    onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
  >
    <div style={{ fontSize: '3rem', marginBottom: '10px' }}>{icon}</div>
    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: color }}>{number}</div>
    <div style={{ color: '#6b7280', marginTop: '5px' }}>{label}</div>
  </div>
);

const TestCategory = ({ icon, title, count }) => (
  <div style={{ padding: '20px', background: '#fffbeb', borderRadius: '10px', border: '1px solid #fef3c7', cursor: 'pointer', transition: 'all 0.2s' }}
    onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
    onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
  >
    <div style={{ fontSize: '2rem', marginBottom: '10px' }}>{icon}</div>
    <div style={{ fontWeight: 'bold', color: '#374151', marginBottom: '5px' }}>{title}</div>
    <div style={{ color: '#6b7280', fontSize: '0.9rem' }}>{count}</div>
  </div>
);

const ActionButton = ({ label, icon, color }) => (
  <button style={{ padding: '15px', background: `${color}15`, color: color, border: `2px solid ${color}`, borderRadius: '10px', cursor: 'pointer', fontFamily: 'Cairo, sans-serif', fontWeight: '600', fontSize: '0.95rem', transition: 'all 0.2s' }}
    onMouseOver={(e) => { e.target.style.background = color; e.target.style.color = 'white'; }}
    onMouseOut={(e) => { e.target.style.background = `${color}15`; e.target.style.color = color; }}
  >
    {icon} {label}
  </button>
);

const InfoRow = ({ label, value, ltr }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderTop: '1px solid #f3f4f6' }}>
    <strong style={{ color: '#374151' }}>{label}:</strong>
    <span style={{ color: '#6b7280', direction: ltr ? 'ltr' : 'rtl' }}>{value}</span>
  </div>
);

export default LaboratoryDashboard;