const Visit = require('../models/Visit');
const Person = require('../models/Person');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');

// ==========================================
// DOCTOR FUNCTIONS
// ==========================================

/**
 * @route   POST /api/doctor/patient/:nationalId/visit
 * @desc    Create a new visit for a patient (WITH FILE UPLOAD SUPPORT)
 * @access  Private (Doctor only)
 */
exports.createVisit = async (req, res) => {
  try {
    const { nationalId } = req.params;
    const {
      chiefComplaint,
      diagnosis,
      prescribedMedications,
      doctorNotes,
      visitType
    } = req.body;

    console.log('🔵 ========== CREATE VISIT REQUEST ==========');
    console.log('📋 National ID:', nationalId);
    console.log('📝 Chief Complaint:', chiefComplaint);
    console.log('🔬 Diagnosis:', diagnosis);
    console.log('📷 File uploaded:', req.file ? 'YES' : 'NO');
    if (req.file) {
      console.log('📁 File name:', req.file.filename);
      console.log('📁 File size:', req.file.size, 'bytes');
    }

   // Find patient by national ID or child ID
    console.log('🔍 Searching for person:', nationalId);
    
    const person = await Person.findOne({
      $or: [
        { nationalId: nationalId },
        { childId: nationalId }
      ]
    }).lean();
    
    console.log('📥 Person found:', person ? '✅' : '❌');
    
    if (!person) {
      return res.status(404).json({
        success: false,
        message: 'لم يتم العثور على المريض'
      });
    }

    // Get doctor ID from authenticated user
    const doctor = await Doctor.findOne({ personId: req.user.personId }).lean();
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'لم يتم العثور على بيانات الطبيب'
      });
    }

    // Parse medications if it's a JSON string
    let parsedMedications = [];
    if (prescribedMedications) {
      try {
        parsedMedications = typeof prescribedMedications === 'string' 
          ? JSON.parse(prescribedMedications) 
          : prescribedMedications;
      } catch (e) {
        console.error('Error parsing medications:', e);
      }
    }

    // Create visit object
    const visitData = {
      patientId: person._id,
      doctorId: doctor._id,
      visitDate: new Date(),
      visitType: visitType || 'regular',
      status: 'completed',
      chiefComplaint,
      diagnosis,
      prescribedMedications: parsedMedications || [],
      doctorNotes: doctorNotes || ''
    };

    // ✅ ADD ATTACHMENT IF FILE WAS UPLOADED
    if (req.file) {
      // Get the account ID - try multiple possible fields
      const accountId = req.user._id || req.user.accountId || req.user.id;
      
      console.log('👤 User ID for uploadedBy:', accountId);
      console.log('👤 User object keys:', Object.keys(req.user));
      
      const attachment = {
        fileName: req.file.originalname,
        fileType: req.file.mimetype.startsWith('image/') ? 'image' : 'pdf',
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
        filePath: req.file.path,
        fileUrl: `/uploads/visits/${req.file.filename}`,
        description: 'Visit attachment',
        uploadedBy: accountId,
        uploadedAt: new Date()
      };

      visitData.attachments = [attachment];
      console.log('✅ Attachment added to visit data');
    }

    // Create visit
    const visit = await Visit.create(visitData);

    // Populate patient and doctor info
    await visit.populate([
      { path: 'patientId', select: 'firstName lastName nationalId' },
      { path: 'doctorId', select: 'specialization institution' }
    ]);

    console.log('✅ Visit created successfully');
    console.log('✅ ==========================================');

    res.status(201).json({
      success: true,
      message: 'تم حفظ الزيارة بنجاح',
      visit
    });

  } catch (error) {
    console.error('❌ Error creating visit:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'خطأ في البيانات المدخلة',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء حفظ الزيارة'
    });
  }
};

/**
 * @route   GET /api/doctor/patient/:nationalId/visits
 * @desc    Get all visits for a specific patient
 * @access  Private (Doctor only)
 */
exports.getPatientVisitsByNationalId = async (req, res) => {
  try {
    const { nationalId } = req.params;

    
// Find patient by national ID or child ID
    console.log('🔍 Searching for person visits:', nationalId);
    
    const person = await Person.findOne({
      $or: [
        { nationalId: nationalId },
        { childId: nationalId }
      ]
    }).lean();
    
    console.log('📥 Person found:', person ? '✅' : '❌');
    
    if (!person) {
      return res.status(404).json({
        success: false,
        message: 'لم يتم العثور على المريض'
      });
    }

    // Get visits
    const visits = await Visit.find({ patientId: person._id })
      .populate('doctorId', 'specialization institution')
      .sort({ visitDate: -1 })
      .lean();

    res.json({
      success: true,
      count: visits.length,
      visits
    });

  } catch (error) {
    console.error('Error fetching patient visits:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء جلب الزيارات'
    });
  }
};

/**
 * @route   GET /api/doctor/visits
 * @desc    Get all visits by this doctor
 * @access  Private (Doctor only)
 */
exports.getDoctorVisits = async (req, res) => {
  try {
    // Get doctor
    const doctor = await Doctor.findOne({ personId: req.user.personId }).lean();
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'لم يتم العثور على بيانات الطبيب'
      });
    }

    // Get visits
    const visits = await Visit.find({ doctorId: doctor._id })
      .populate('patientId', 'firstName lastName nationalId')
      .sort({ visitDate: -1 })
      .limit(50)
      .lean();

    res.json({
      success: true,
      count: visits.length,
      visits
    });

  } catch (error) {
    console.error('Error fetching doctor visits:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء جلب الزيارات'
    });
  }
};

/**
 * @route   GET /api/doctor/visit/:visitId
 * @desc    Get visit details
 * @access  Private (Doctor only)
 */
exports.getVisitDetailsDoctor = async (req, res) => {
  try {
    const { visitId } = req.params;

    const visit = await Visit.findById(visitId)
      .populate('patientId', 'firstName lastName nationalId dateOfBirth gender')
      .populate('doctorId', 'specialization institution')
      .lean();

    if (!visit) {
      return res.status(404).json({
        success: false,
        message: 'لم يتم العثور على الزيارة'
      });
    }

    res.json({
      success: true,
      visit
    });

  } catch (error) {
    console.error('Error fetching visit details:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء جلب تفاصيل الزيارة'
    });
  }
};

/**
 * @route   PUT /api/doctor/visit/:visitId
 * @desc    Update visit
 * @access  Private (Doctor only)
 */
exports.updateVisit = async (req, res) => {
  try {
    const { visitId } = req.params;
    const {
      chiefComplaint,
      diagnosis,
      prescribedMedications,
      doctorNotes,
      status
    } = req.body;

    // Find and update visit
    const visit = await Visit.findByIdAndUpdate(
      visitId,
      {
        $set: {
          chiefComplaint,
          diagnosis,
          prescribedMedications,
          doctorNotes,
          status
        }
      },
      { new: true, runValidators: true }
    ).populate([
      { path: 'patientId', select: 'firstName lastName nationalId' },
      { path: 'doctorId', select: 'specialization institution' }
    ]);

    if (!visit) {
      return res.status(404).json({
        success: false,
        message: 'لم يتم العثور على الزيارة'
      });
    }

    res.json({
      success: true,
      message: 'تم تحديث الزيارة بنجاح',
      visit
    });

  } catch (error) {
    console.error('Error updating visit:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'خطأ في البيانات المدخلة',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء تحديث الزيارة'
    });
  }
};

// ==========================================
// PATIENT FUNCTIONS
// ==========================================

/**
 * @route   GET /api/patient/visits
 * @desc    Get all patient visits with filters
 * @access  Private (Patient only)
 */
exports.getVisits = async (req, res) => {
  try {
    // Get patient ID from authenticated user
    const patient = await Patient.findOne({ personId: req.user.personId }).lean();
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'لم يتم العثور على بيانات المريض'
      });
    }

    // Build query
    const query = { patientId: req.user.personId };

    // Apply filters if provided
    if (req.query.status) {
      query.status = req.query.status;
    }

    if (req.query.startDate || req.query.endDate) {
      query.visitDate = {};
      if (req.query.startDate) {
        query.visitDate.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        query.visitDate.$lte = new Date(req.query.endDate);
      }
    }

    if (req.query.doctorId) {
      query.doctorId = req.query.doctorId;
    }

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // Get visits
    const visits = await Visit.find(query)
      .populate('doctorId', 'firstName lastName specialization institution')
      .sort({ visitDate: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count
    const total = await Visit.countDocuments(query);

    res.json({
      success: true,
      count: visits.length,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      visits
    });

  } catch (error) {
    console.error('Error fetching visits:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء جلب الزيارات'
    });
  }
};

/**
 * @route   GET /api/patient/visits/:visitId
 * @desc    Get single visit details
 * @access  Private (Patient only)
 */
exports.getVisitDetails = async (req, res) => {
  try {
    const { visitId } = req.params;

    // Find visit and verify ownership
    const visit = await Visit.findOne({
      _id: visitId,
      patientId: req.user.personId
    })
      .populate('doctorId', 'firstName lastName specialization institution phoneNumber')
      .lean();

    if (!visit) {
      return res.status(404).json({
        success: false,
        message: 'لم يتم العثور على الزيارة'
      });
    }

    res.json({
      success: true,
      visit
    });

  } catch (error) {
    console.error('Error fetching visit details:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء جلب تفاصيل الزيارة'
    });
  }
};

/**
 * @route   GET /api/patient/visits/stats
 * @desc    Get visit statistics
 * @access  Private (Patient only)
 */
exports.getVisitStats = async (req, res) => {
  try {
    const stats = await Visit.aggregate([
      { $match: { patientId: req.user.personId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const total = await Visit.countDocuments({ patientId: req.user.personId });

    res.json({
      success: true,
      stats: {
        total,
        byStatus: stats
      }
    });

  } catch (error) {
    console.error('Error fetching visit stats:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء حساب إحصائيات الزيارات'
    });
  }
};

/**
 * @route   GET /api/patient/visits/by-doctor
 * @desc    Get visits grouped by doctor
 * @access  Private (Patient only)
 */
exports.getVisitsByDoctor = async (req, res) => {
  try {
    const visits = await Visit.aggregate([
      { $match: { patientId: req.user.personId } },
      {
        $group: {
          _id: '$doctorId',
          count: { $sum: 1 },
          lastVisit: { $max: '$visitDate' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Populate doctor info
    await Visit.populate(visits, {
      path: '_id',
      select: 'firstName lastName specialization institution'
    });

    res.json({
      success: true,
      visits
    });

  } catch (error) {
    console.error('Error fetching visits by doctor:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء تجميع الزيارات'
    });
  }
};

module.exports = exports;