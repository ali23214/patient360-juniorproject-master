// backend/middleware/uploadDoctorFiles.js
// Multer configuration for doctor registration file uploads

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, '../uploads/doctor-requests');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('✅ Created directory:', uploadDir);
}

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp_fieldname_originalname
    const uniqueSuffix = Date.now() + '_' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext);
    const sanitizedBasename = basename.replace(/[^a-zA-Z0-9]/g, '_');
    
    cb(null, `${uniqueSuffix}_${file.fieldname}_${sanitizedBasename}${ext}`);
  }
});

// File filter - Accept only PDFs and images
const fileFilter = (req, file, cb) => {
  console.log('📎 File received:', file.originalname, 'Field:', file.fieldname);
  
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