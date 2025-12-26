const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');

// Load environment variables
dotenv.config();

// Import database connection
const connectDB = require('./config/database');

// Connect to database
connectDB();

// Import middleware and routes
const { apiLimiter } = require('./middleware/security');
const authRoutes = require('./routes/auth');
const patientRoutes = require('./routes/patient'); // ← NEW
const doctorRoutes = require('./routes/doctor');
const adminRoutes = require('./routes/admin');  // ← ADD THIS


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

// Rate limiting
app.use('/api/', apiLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/patient', patientRoutes); 
app.use('/api/doctor', doctorRoutes);
app.use('/api/admin', adminRoutes);  // ← ADD THIS


// Welcome route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Patient 360° API Server',
    version: '1.0.0',
    status: 'Running',
    endpoints: {
      auth: '/api/auth',
      signup: 'POST /api/auth/signup',
      login: 'POST /api/auth/login',
      patient: '/api/patient', // ← NEW
      verify: 'GET /api/auth/verify',
      updateLastLogin: 'POST /api/auth/update-last-login'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'المسار غير موجود'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'حدث خطأ في الخادم',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 API URL: http://localhost:${PORT}`);
  console.log(`🔐 Auth Routes: http://localhost:${PORT}/api/auth`);
  console.log(`👤 Patient Routes: http://localhost:${PORT}/api/patient`); 
  console.log(`👨‍⚕️ Doctor Routes: http://localhost:${PORT}/api/doctor`);
  console.log('✅ CORS enabled for http://localhost:3000');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err.message);
  process.exit(1);
});