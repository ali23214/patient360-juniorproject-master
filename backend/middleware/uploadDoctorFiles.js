// backend/middleware/uploadDoctorFiles.js
// Multer configuration for doctor registration file uploads

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ✅ Import file upload manager
const FileUploadManager = require('../utils/fileUpload');

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, '../uploads/doctor-requests/pending');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('✅ Created directory:', uploadDir);
}

// ✅ ORGANIZED STORAGE CONFIGURATION
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      // Generate temporary request ID
      const tempRequestId = `temp_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      
      // Generate organized path
      const fileInfo = FileUploadManager.generateDoctorRequestPath(
        tempRequestId,
        file.fieldname,
        file.originalname
      );
      
      // Create directory
      await FileUploadManager.ensureDirectory(fileInfo.directory);
      
      // Store for later use
      if (!req.uploadDirectories) {
        req.uploadDirectories = {};
      }
      req.uploadDirectories[file.fieldname] = fileInfo.directory;
      req.tempRequestId = tempRequestId;
      
      cb(null, fileInfo.directory);
      
    } catch (error) {
      console.error('Error in doctor request storage:', error);
      cb(error, null);
    }
  },
  
  filename: (req, file, cb) => {
    try {
      const tempRequestId = req.tempRequestId || `temp_${Date.now()}`;
      
      const fileInfo = FileUploadManager.generateDoctorRequestPath(
        tempRequestId,
        file.fieldname,
        file.originalname
      );
      
      cb(null, fileInfo.filename);
      
    } catch (error) {
      console.error('Error generating doctor request filename:', error);
      cb(error, null);
    }
  }
});

// File filter - Accept only PDFs and images
const fileFilter = (req, file, cb) => {
  console.log('🔎 File received:', file.originalname, 'Field:', file.fieldname);
  
  const allowedMimes = [
    // Images
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    
    // PDFs
    'application/pdf'
  ];
  
  if (allowedMimes.includes(file.mimetype)) {
    console.log('✅ File type accepted:', file.mimetype);
    cb(null, true);
  } else {
    console.log('❌ File type rejected:', file.mimetype);
    cb(new Error(`نوع الملف غير مدعوم: ${file.mimetype}. الرجاء رفع صور (JPG, PNG) أو ملفات PDF فقط.`), false);
  }
};

// Multer upload configuration
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max per file
  }
});

// Upload fields configuration
const uploadFields = upload.fields([
  { name: 'medicalCertificate', maxCount: 1 },   // شهادة الطب
  { name: 'licenseDocument', maxCount: 1 },      // الترخيص الطبي
  { name: 'profilePhoto', maxCount: 1 }          // الصورة الشخصية
]);

// Error handling middleware
const handleUploadErrors = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    console.error('❌ Multer error:', err);
    
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'حجم الملف كبير جداً. الحد الأقصى 10 ميغابايت لكل ملف'
      });
    }
    
    return res.status(400).json({
      success: false,
      message: 'خطأ في رفع الملف: ' + err.message
    });
  }
  
  if (err) {
    console.error('❌ File upload error:', err);
    return res.status(400).json({
      success: false,
      message: err.message || 'خطأ في رفع الملف'
    });
  }
  
  next();
};

module.exports = {
  uploadFields,
  handleUploadErrors
};