const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

// Load environment variables
dotenv.config();

// Import database connection
const connectDB = require('./config/database');

// Connect to database
connectDB();

// Import middleware and routes
const { apiLimiter } = require('./middleware/security');
const authRoutes = require('./routes/auth');
const patientRoutes = require('./routes/patient');
const doctorRoutes = require('./routes/doctor');
const adminRoutes = require('./routes/admin');
const visitRoutes = require('./routes/visit');
const ecgRoutes = require('./routes/ecg'); // ✅ NEW: ECG AI Routes

// Initialize express app
const app = express();

// Body parser middleware - MUST BE BEFORE CORS
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS middleware - FIXED VERSION
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Security Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// ==================== STATIC FILE SERVING ====================
// Serve uploaded files (MUST BE BEFORE ROUTES)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
console.log('📁 Static files served from /uploads');
console.log('📂 Doctor requests: /uploads/doctor-requests/');
console.log('📂 Visit attachments: /uploads/visits/');
console.log('📂 ECG images: /uploads/ecg/'); // ✅ NEW

// Rate limiting
app.use('/api/', apiLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/patient', patientRoutes); 
app.use('/api/doctor', doctorRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/visits', visitRoutes);
app.use('/api/ecg', ecgRoutes); // ✅ NEW: ECG AI Routes

// Welcome route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Patient 360° API Server - Healthcare Management System',
    version: '2.1.0', // ✅ Updated version
    status: 'Running ✅',
    features: [
      '👥 Patient Registration',
      '👨‍⚕️ Doctor Management',
      '📋 Doctor Registration Requests',
      '🏥 Visit Management',
      '📎 File Upload Support',
      '🔐 JWT Authentication',
      '👑 Admin Dashboard',
      '🤖 ECG AI Analysis' // ✅ NEW Feature
    ],
    endpoints: {
      // Authentication
      auth: '/api/auth',
      signup: 'POST /api/auth/signup',
      registerDoctor: 'POST /api/auth/register-doctor',
      login: 'POST /api/auth/login',
      verify: 'GET /api/auth/verify',
      
      // Patient
      patient: '/api/patient',
      
      // Doctor
      doctor: '/api/doctor',
      
      // Admin
      admin: '/api/admin',
      statistics: 'GET /api/admin/statistics',
      doctors: 'GET /api/admin/doctors',
      patients: 'GET /api/admin/patients',
      doctorRequests: 'GET /api/admin/doctor-requests',
      approveRequest: 'POST /api/admin/doctor-requests/:id/approve',
      rejectRequest: 'POST /api/admin/doctor-requests/:id/reject',
      
      // Visits
      visits: '/api/visits',
      
      // ECG AI Analysis (NEW)
      ecg: '/api/ecg',
      analyzeEcg: 'POST /api/ecg/analyze',
      testEcg: 'GET /api/ecg/test',
      
      // File Uploads
      uploads: '/uploads'
    },
    documentation: {
      baseUrl: `http://localhost:${process.env.PORT || 5000}`,
      apiDocs: '/api-docs (coming soon)',
      uploadLimits: {
        maxFileSize: '10MB per file',
        allowedTypes: ['PDF', 'JPG', 'PNG', 'GIF', 'WEBP']
      }
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'المسار غير موجود',
    requestedPath: req.path,
    method: req.method,
    hint: 'تحقق من صحة المسار أو راجع التوثيق'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.error('❌ Server Error:', err.message);
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'حدث خطأ في الخادم',
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      error: err 
    })
  });
});

// Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log('\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🏥  PATIENT 360° - HEALTHCARE MANAGEMENT SYSTEM');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🚀  Server Status: RUNNING`);
  console.log(`🌍  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📡  Port: ${PORT}`);
  console.log(`🔗  API Base URL: http://localhost:${PORT}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋  AVAILABLE ROUTES:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🔐  Auth:          http://localhost:${PORT}/api/auth`);
  console.log(`    └─ POST /signup          - Patient Registration`);
  console.log(`    └─ POST /register-doctor - Doctor Registration`);
  console.log(`    └─ POST /login           - User Login`);
  console.log(`    └─ GET  /verify          - Token Verification`);
  console.log('');
  console.log(`👤  Patient:       http://localhost:${PORT}/api/patient`);
  console.log('');
  console.log(`👨‍⚕️  Doctor:        http://localhost:${PORT}/api/doctor`);
  console.log('');
  console.log(`👑  Admin:         http://localhost:${PORT}/api/admin`);
  console.log(`    └─ GET  /statistics           - Dashboard Stats`);
  console.log(`    └─ GET  /doctors              - List All Doctors`);
  console.log(`    └─ GET  /patients             - List All Patients`);
  console.log(`    └─ GET  /doctor-requests      - Pending Requests`);
  console.log(`    └─ POST /doctor-requests/:id/approve - Approve`);
  console.log(`    └─ POST /doctor-requests/:id/reject  - Reject`);
  console.log('');
  console.log(`🏥  Visits:        http://localhost:${PORT}/api/visits`);
  console.log('');
  console.log(`🤖  ECG AI:        http://localhost:${PORT}/api/ecg`); // ✅ NEW
  console.log(`    └─ POST /analyze             - Analyze ECG Image`); // ✅ NEW
  console.log(`    └─ GET  /test                - Test AI Service`); // ✅ NEW
  console.log('');
  console.log(`📁  File Uploads:  http://localhost:${PORT}/uploads`);
  console.log(`    └─ Doctor Requests: /uploads/doctor-requests/`);
  console.log(`    └─ Visit Files:     /uploads/visits/`);
  console.log(`    └─ ECG Images:      /uploads/ecg/`); // ✅ NEW
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅  FEATURES ENABLED:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅  CORS enabled for:');
  console.log('    - http://localhost:3000');
  console.log('    - http://localhost:3001');
  console.log('    - http://localhost:3002');
  console.log('✅  File Upload Support (PDF, Images)');
  console.log('✅  ECG AI Analysis (VGG16 Model)'); // ✅ NEW
  console.log('✅  Rate Limiting Active');
  console.log('✅  Security Headers (Helmet)');
  console.log('✅  Static File Serving');
  console.log('✅  JWT Authentication');
  console.log('✅  MongoDB Connected');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📖  Quick Start:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔹  Test API:      GET  http://localhost:5000/');
  console.log('🔹  Health Check:  GET  http://localhost:5000/health');
  console.log('🔹  Patient Signup: POST http://localhost:5000/api/auth/signup');
  console.log('🔹  Doctor Request: POST http://localhost:5000/api/auth/register-doctor');
  console.log('🔹  ECG Analysis:   POST http://localhost:5000/api/ecg/analyze'); // ✅ NEW
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('💡  Ready to accept requests!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('\n');
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.error('❌ UNHANDLED PROMISE REJECTION');
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.error('🛑 Server shutting down...');
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.error('\n');
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('\n');
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.error('❌ UNCAUGHT EXCEPTION');
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.error('🛑 Server shutting down...');
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.error('\n');
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('👋 SIGTERM received');
  console.log('🛑 Shutting down gracefully...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n');
  process.exit(0);
});

module.exports = app;
