// backend/routes/ecg.js
// ECG AI Analysis Routes

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Import middleware
const { protect, restrictTo } = require('../middleware/auth');

// Import controller
const ecgController = require('../controllers/ecgController');

// ==========================================
// MULTER CONFIGURATION FOR ECG UPLOADS
// ==========================================

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads/ecg');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('✅ Created ECG uploads directory:', uploadsDir);
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `ecg-${uniqueSuffix}${ext}`);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPG and PNG are allowed.'), false);
  }
};

// Initialize multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// ==========================================
// ROUTES
// ==========================================

/**
 * @route   POST /api/ecg/analyze
 * @desc    Analyze ECG image with AI
 * @access  Private (Doctor only - Cardiologist recommended)
 */
router.post(
  '/analyze',
  protect,
  restrictTo('doctor'),
  upload.single('ecg_image'),
  ecgController.analyzeEcg
);

/**
 * @route   GET /api/ecg/test
 * @desc    Test if ECG AI service is available
 * @access  Private (Doctor only)
 */
router.get(
  '/test',
  protect,
  restrictTo('doctor'),
  ecgController.testEcgService
);

// Error handler for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'حجم الملف كبير جداً. الحد الأقصى 10MB'
      });
    }
    return res.status(400).json({
      success: false,
      message: 'خطأ في رفع الملف',
      error: error.message
    });
  }
  
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  
  next();
});

module.exports = router;
