// backend/controllers/ecgController.js
// ECG AI Analysis Controller - Calls Flask API

const path = require('path');
const fs = require('fs');
const fsPromises = fs.promises;
const FormData = require('form-data');
const axios = require('axios');

// Flask API configuration
const FLASK_API_URL = 'http://localhost:8000/predict';

/**
 * @route   POST /api/ecg/analyze
 * @desc    Analyze ECG image using AI model (Flask API)
 * @access  Private (Doctor only - Cardiologist)
 */
exports.analyzeEcg = async (req, res) => {
  let tempFilePath = null;

  try {
    console.log('🔵 ========== ECG ANALYSIS REQUEST ==========');
    
    // Check if file was uploaded
    if (!req.file) {
      console.log('❌ No file uploaded');
      return res.status(400).json({
        success: false,
        message: 'الرجاء رفع صورة ECG'
      });
    }

    console.log('📁 File uploaded:', req.file.originalname);
    console.log('📦 File size:', req.file.size, 'bytes');
    console.log('📂 Temp path:', req.file.path);

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      console.log('❌ Invalid file type:', req.file.mimetype);
      
      // Delete uploaded file
      await fsPromises.unlink(req.file.path).catch(err => 
        console.error('Error deleting file:', err)
      );
      
      return res.status(400).json({
        success: false,
        message: 'نوع الملف غير مدعوم. الرجاء رفع صورة (JPG, PNG)'
      });
    }

    console.log('✅ File type valid:', req.file.mimetype);

    // Store temp file path for cleanup
    tempFilePath = req.file.path;

    // Create form data to send to Flask API
    const formData = new FormData();
    formData.append('file', fs.createReadStream(tempFilePath));

    console.log('🚀 Calling Flask API:', FLASK_API_URL);

    // Call Flask API
    const response = await axios.post(FLASK_API_URL, formData, {
      headers: {
        ...formData.getHeaders()
      },
      timeout: 30000 // 30 second timeout
    });

    console.log('✅ Flask API response received');
    console.log('📊 Result:', JSON.stringify(response.data, null, 2));

    // Clean up temp file
    console.log('🧹 Cleaning up temp file...');
    await fsPromises.unlink(tempFilePath).catch(err => 
      console.warn('Warning: Could not delete temp file:', err.message)
    );
    tempFilePath = null;

    // Check if prediction was successful
    if (!response.data.success) {
      console.log('❌ Prediction failed:', response.data.error);
      return res.status(500).json({
        success: false,
        message: 'فشل تحليل ECG',
        error: response.data.error
      });
    }

    console.log('✅ ========== ECG ANALYSIS SUCCESS ==========');

    // Send response
    res.status(200).json(response.data);

  } catch (error) {
    console.error('❌ ========== ECG ANALYSIS ERROR ==========');
    
    // Check if it's a Flask API connection error
    if (error.code === 'ECONNREFUSED') {
      console.error('❌ Cannot connect to Flask API!');
      console.error('💡 Make sure the Flask server is running on port 8000');
      console.error('💡 Start it with: python flask_ecg_server.py');
      
      return res.status(503).json({
        success: false,
        message: 'خدمة تحليل ECG غير متاحة. الرجاء التواصل مع الدعم الفني.',
        error: 'AI service not running. Please start the Flask server.'
      });
    }

    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('❌ ==========================================');

    // Clean up temp file if it exists
    if (tempFilePath) {
      await fsPromises.unlink(tempFilePath).catch(err => 
        console.warn('Warning: Could not delete temp file:', err.message)
      );
    }

    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء تحليل ECG',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

/**
 * @route   GET /api/ecg/test
 * @desc    Test if ECG AI service is available
 * @access  Private (Doctor only)
 */
exports.testEcgService = async (req, res) => {
  try {
    // Test Flask API health
    const response = await axios.get('http://localhost:8000/health', {
      timeout: 5000
    });
    
    res.json({
      success: true,
      message: 'ECG AI service is available',
      status: response.data.status,
      model_loaded: response.data.model_loaded
    });
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        success: false,
        message: 'ECG AI service not running',
        hint: 'Start the Flask server with: python flask_ecg_server.py'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'ECG AI service not available',
      error: error.message
    });
  }
};
