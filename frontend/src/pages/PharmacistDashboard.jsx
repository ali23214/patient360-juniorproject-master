// src/pages/PharmacistDashboard.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar';

const PharmacistDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    
    if (!currentUser) {
      navigate('/');
      return;
    }
    
    // Make sure only pharmacists can access this page
    if (currentUser.role !== 'pharmacist') {
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
          background: 'linear-gradient(135deg, #a23f97 0%, #8b2e7f 100%)',
          color: 'white',
          padding: '40px',
          borderRadius: '16px',
          marginBottom: '30px',
          boxShadow: '0 10px 40px rgba(162, 63, 151, 0.2)'
        }}>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '10px', fontWeight: '700' }}>
            مرحباً {user.firstName} {user.lastName} 💊
          </h1>
          <p style={{ fontSize: '1.3rem', opacity: 0.95 }}>
            لوحة تحكم الصيدلاني - Patient 360°
          </p>
          {user.institution && (
            <p style={{ fontSize: '1.1rem', opacity: 0.9, marginTop: '10px' }}>
              {user.institution}
            </p>
          )}
        </div>

        {/* Pharmacy Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
          <StatCard icon="💊" number="156" label="الوصفات اليوم" color="#a23f97" />
          <StatCard icon="📦" number="850" label="الأدوية المتوفرة" color="#a23f97" />
          <StatCard icon="⚠️" number="12" label="أدوية قاربت النفاد" color="#a23f97" />
          <StatCard icon="✅" number="342" label="الطلبات المكتملة" color="#a23f97" />
        </div>

        {/* Quick Actions */}
        <div style={{ background: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', marginBottom: '30px' }}>
          <h2 style={{ fontSize: '1.5rem', color: '#a23f97', marginBottom: '20px', borderBottom: '2px solid #f3f4f6', paddingBottom: '10px', fontWeight: '700' }}>
            الإجراءات السريعة
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
            <ActionButton label="إضافة دواء جديد" icon="➕" color="#a23f97" />
            <ActionButton label="عرض الوصفات" icon="📋" color="#a23f97" />
            <ActionButton label="إدارة المخزون" icon="📦" color="#a23f97" />
            <ActionButton label="التقارير" icon="📊" color="#a23f97" />
          </div>
        </div>

        {/* Account Information */}
        <div style={{ background: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', marginBottom: '30px' }}>
          <h2 style={{ fontSize: '1.5rem', color: '#a23f97', marginBottom: '20px', borderBottom: '2px solid #f3f4f6', paddingBottom: '10px', fontWeight: '700' }}>
            معلومات الحساب
          </h2>
          
          <div style={{ display: 'grid', gap: '15px' }}>
            <InfoRow label="الاسم الكامل" value={`${user.firstName} ${user.lastName}`} />
            <InfoRow label="البريد الإلكتروني" value={user.email} ltr={true} />
            <InfoRow label="الدور" value="صيدلاني" />
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

        {/* Pharmacist Features */}
        <div style={{ background: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
          <h2 style={{ fontSize: '1.5rem', color: '#a23f97', marginBottom: '20px', borderBottom: '2px solid #f3f4f6', paddingBottom: '10px', fontWeight: '700' }}>
            الخدمات المتاحة للصيادلة 💊
          </h2>
          <ul style={{ listStyle: 'none', padding: 0, lineHeight: '2' }}>
            <li style={{ padding: '8px 0', color: '#6b7280' }}>✓ عرض وإدارة الوصفات الطبية الإلكترونية</li>
            <li style={{ padding: '8px 0', color: '#6b7280' }}>✓ إدارة مخزون الأدوية والمستلزمات</li>
            <li style={{ padding: '8px 0', color: '#6b7280' }}>✓ تتبع الأدوية القاربة على النفاد</li>
            <li style={{ padding: '8px 0', color: '#6b7280' }}>✓ التحقق من التفاعلات الدوائية</li>
            <li style={{ padding: '8px 0', color: '#6b7280' }}>✓ إنشاء تقارير المبيعات والمخزون</li>
            <li style={{ padding: '8px 0', color: '#6b7280' }}>✓ إدارة طلبات الأدوية من الموردين</li>
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

export default PharmacistDashboard;