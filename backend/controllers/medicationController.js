const medicationService = require('../services/medicationService');

/**
 * Medication Controller
 * Handles HTTP requests for medication operations
 */

/**
 * @route   GET /api/patient/medications
 * @desc    Get current active medications
 * @access  Private (Patient only)
 */
exports.getCurrentMedications = async (req, res) => {
  try {
    // ✅ استخدم personId بدل patientId
    const patientId = req.user.personId;
    
    console.log('🔍 getCurrentMedications - Patient ID:', patientId);

    const result = await medicationService.getCurrentMedications(patientId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Error in getCurrentMedications controller:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء جلب الأدوية الحالية'
    });
  }
};

/**
 * @route   GET /api/patient/medications/schedule
 * @desc    Get weekly medication schedule
 * @access  Private (Patient only)
 */
exports.getMedicationSchedule = async (req, res) => {
  try {
    // ✅ استخدم personId بدل patientId
    const patientId = req.user.personId;
    
    console.log('📅 getMedicationSchedule - Patient ID:', patientId);

    const result = await medicationService.getMedicationSchedule(patientId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Error in getMedicationSchedule controller:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء إنشاء جدول الأدوية'
    });
  }
};

/**
 * @route   GET /api/patient/medications/history
 * @desc    Get medication history with filters
 * @access  Private (Patient only)
 */
exports.getMedicationHistory = async (req, res) => {
  try {
    // ✅ استخدم personId بدل patientId
    const patientId = req.user.personId;
    
    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      medicationName: req.query.medicationName,
      page: req.query.page || 1,
      limit: req.query.limit || 50
    };

    const result = await medicationService.getMedicationHistory(patientId, filters);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Error in getMedicationHistory controller:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء جلب تاريخ الأدوية'
    });
  }
};

/**
 * @route   GET /api/patient/medications/interactions
 * @desc    Check for medication interactions
 * @access  Private (Patient only)
 */
exports.checkInteractions = async (req, res) => {
  try {
    // ✅ استخدم personId بدل patientId
    const patientId = req.user.personId;

    const result = await medicationService.checkMedicationInteractions(patientId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Error in checkInteractions controller:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء فحص تفاعلات الأدوية'
    });
  }
};