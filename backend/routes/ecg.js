// backend/routes/ecg.js
// ECG AI Analysis Routes

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Import middleware
const { protect, restrictTo } = require('../middleware/auth');

// ✅ Import file upload manager
const FileUploadManager = require('../utils/fileUpload');

// Import controller
const ecgController = require('../controllers/ecgController');

// ==========================================
// ✅ ORGANIZED MULTER CONFIGURATION FOR ECG UPLOADS
// ==========================================

// Configure storage
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      // For ECG, we need patient ID from request body
      // Frontend must send patientId in the request
      const patientId = req.body.patientId;
      
      if (!patientId) {
        // If no patient ID, use temp folder
        const tempDir = path.join('uploads', 'temp');
        await FileUploadManager.ensureDirectory(tempDir);
        return cb(null, tempDir);
      }
      
      // Generate organized path
      const fileInfo = FileUploadManager.generateFilePath(
        'ecg',
        patientId,
        file.originalname
      );
      
      // Create directory
      await FileUploadManager.ensureDirectory(fileInfo.directory);
      
      cb(null, fileInfo.directory);
      
    } catch (error) {
      console.error('Error creating ECG directory:', error);
      cb(error, null);
    }
  },
  
  filename: (req, file, cb) => {
    try {
      const patientId = req.body.patientId;
      
      if (!patientId) {
        // Temp filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        return cb(null, `ecg-temp-${uniqueSuffix}${ext}`);
      }
      
      // Generate organized filename
      const fileInfo = FileUploadManager.generateFilePath(
        'ecg',
        patientId,
        file.originalname
      );
      
      cb(null, fileInfo.filename);
      
    } catch (error) {
      console.error('Error generating ECG filename:', error);
      cb(error, null);
    }
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