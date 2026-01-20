const Visit = require('../models/Visit');

/**
 * Medication Service
 * Business logic for medication operations
 */

/**
 * Get current active medications for a patient
 */
exports.getCurrentMedications = async (patientId) => {
  try {
    console.log('🔍 [medicationService] Getting medications for patient:', patientId);
    
    // Get all completed visits with medications
    const visits = await Visit.find({
      patientId,
      status: 'completed',
      prescribedMedications: { $exists: true, $ne: [] }
    })
      .populate({
        path: 'doctorId',
        populate: {
          path: 'personId',
          select: 'firstName lastName'
        },
        select: 'personId specialization'
      })
      .sort({ visitDate: -1 })
      .lean();

    console.log('📋 [medicationService] Found visits:', visits.length);

    if (visits.length === 0) {
      return {
        success: true,
        medications: [],
        count: 0
      };
    }

    // Extract all medications with visit context
    const allMedications = [];

    visits.forEach(visit => {
      if (!visit.prescribedMedications) return;

      visit.prescribedMedications.forEach(med => {
        allMedications.push({
          ...med,
          visitId: visit._id,
          visitDate: visit.visitDate,
          doctorName: visit.doctorId?.personId 
            ? `د. ${visit.doctorId.personId.firstName} ${visit.doctorId.personId.lastName}`
            : 'غير محدد',
          doctorSpecialization: visit.doctorId?.specialization
        });
      });
    });

    // Filter for active medications
    const activeMedications = filterActiveMedications(allMedications);
    
    console.log('📦 [medicationService] All medications:', allMedications.length);
    console.log('✅ [medicationService] Active medications:', activeMedications.length);
    if (allMedications.length > 0) {
      console.log('📝 [medicationService] Sample medication:', JSON.stringify(allMedications[0], null, 2));
    }

    return {
      success: true,
      medications: activeMedications,
      count: activeMedications.length
    };
  } catch (error) {
    console.error('Error in getCurrentMedications:', error);
    return {
      success: false,
      message: 'حدث خطأ أثناء جلب الأدوية الحالية'
    };
  }
};

/**
 * Get medication history (all prescribed medications)
 */
exports.getMedicationHistory = async (patientId, filters = {}) => {
  try {
    const { startDate, endDate, medicationName, page = 1, limit = 50 } = filters;

    // Build query
    const query = {
      patientId,
      status: 'completed',
      prescribedMedications: { $exists: true, $ne: [] }
    };

    // Date filter
    if (startDate || endDate) {
      query.visitDate = {};
      if (startDate) query.visitDate.$gte = new Date(startDate);
      if (endDate) query.visitDate.$lte = new Date(endDate);
    }

    // Get visits with medications
    const visits = await Visit.find(query)
      .populate({
        path: 'doctorId',
        populate: {
          path: 'personId',
          select: 'firstName lastName'
        },
        select: 'personId specialization'
      })
      .sort({ visitDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const count = await Visit.countDocuments(query);

    // Extract and format medications
    const medicationHistory = [];

    visits.forEach(visit => {
      if (!visit.prescribedMedications) return;

      visit.prescribedMedications.forEach(med => {
        // Filter by medication name if provided
        if (medicationName && !med.medicationName.includes(medicationName)) {
          return;
        }

        medicationHistory.push({
          ...med,
          visitId: visit._id,
          visitDate: visit.visitDate,
          doctorName: visit.doctorId?.personId 
            ? `د. ${visit.doctorId.personId.firstName} ${visit.doctorId.personId.lastName}`
            : 'غير محدد',
          doctorSpecialization: visit.doctorId?.specialization,
          isActive: isMedicationActive(med, visit.visitDate)
        });
      });
    });

    // Get unique medication names for statistics
    const uniqueMedications = [...new Set(medicationHistory.map(m => m.medicationName))];

    return {
      success: true,
      history: medicationHistory,
      statistics: {
        totalPrescriptions: medicationHistory.length,
        uniqueMedications: uniqueMedications.length,
        activeMedications: medicationHistory.filter(m => m.isActive).length
      },
      pagination: {
        total: count,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(count / limit)
      }
    };
  } catch (error) {
    console.error('Error in getMedicationHistory:', error);
    return {
      success: false,
      message: 'حدث خطأ أثناء جلب تاريخ الأدوية'
    };
  }
};

/**
 * Check for potential medication interactions (Basic implementation)
 */
exports.checkMedicationInteractions = async (patientId) => {
  try {
    const result = await this.getCurrentMedications(patientId);

    if (!result.success || result.medications.length === 0) {
      return {
        success: true,
        interactions: [],
        warnings: []
      };
    }

    const medications = result.medications;

    // Basic interaction checking
    // In production, this would use a drug interaction database/API
    const interactions = [];
    const warnings = [];

    // Check for duplicate medications
    const medicationNames = medications.map(m => m.medicationName.toLowerCase());
    const duplicates = medicationNames.filter((name, index) => 
      medicationNames.indexOf(name) !== index
    );

    if (duplicates.length > 0) {
      warnings.push({
        type: 'DUPLICATE',
        severity: 'medium',
        message: 'تم وصف نفس الدواء من قبل أكثر من طبيب',
        medications: duplicates
      });
    }

    // Check for excessive number of medications (polypharmacy)
    if (medications.length >= 5) {
      warnings.push({
        type: 'POLYPHARMACY',
        severity: 'low',
        message: `تتناول ${medications.length} أدوية حالياً. يُنصح بمراجعة الطبيب لمراجعة الأدوية`,
        count: medications.length
      });
    }

    return {
      success: true,
      interactions,
      warnings,
      medicationCount: medications.length
    };
  } catch (error) {
    console.error('Error in checkMedicationInteractions:', error);
    return {
      success: false,
      message: 'حدث خطأ أثناء فحص تفاعلات الأدوية'
    };
  }
};

/**
 * Helper Functions
 */

/**
 * Filter active medications based on duration
 */
function filterActiveMedications(medications) {
  const now = new Date();
  
  return medications.filter(med => {
    // If duration contains "مستمر" or "continuous", it's always active
    if (med.duration && (
      med.duration.includes('مستمر') || 
      med.duration.toLowerCase().includes('continuous') ||
      med.duration.toLowerCase().includes('ongoing')
    )) {
      return true;
    }

    // If duration contains number of days
    const daysMatch = med.duration?.match(/(\d+)\s*(يوم|day)/i);
    if (daysMatch) {
      const days = parseInt(daysMatch[1]);
      const prescribedDate = new Date(med.visitDate);
      const endDate = new Date(prescribedDate);
      endDate.setDate(endDate.getDate() + days);
      
      return now <= endDate;
    }

    // If duration contains weeks
    const weeksMatch = med.duration?.match(/(\d+)\s*(أسبوع|week)/i);
    if (weeksMatch) {
      const weeks = parseInt(weeksMatch[1]);
      const prescribedDate = new Date(med.visitDate);
      const endDate = new Date(prescribedDate);
      endDate.setDate(endDate.getDate() + (weeks * 7));
      
      return now <= endDate;
    }

    // If duration contains months
    const monthsMatch = med.duration?.match(/(\d+)\s*(شهر|month)/i);
    if (monthsMatch) {
      const months = parseInt(monthsMatch[1]);
      const prescribedDate = new Date(med.visitDate);
      const endDate = new Date(prescribedDate);
      endDate.setMonth(endDate.getMonth() + months);
      
      return now <= endDate;
    }

    // ✅ DEFAULT: If no clear duration, assume active if prescribed in last 90 days (3 months)
    const prescribedDate = new Date(med.visitDate);
    const daysSincePrescribed = (now - prescribedDate) / (1000 * 60 * 60 * 24);
    
    return daysSincePrescribed <= 90;  // ← غيرنا من 30 لـ 90 يوم
  });
}

/**
 * Check if a medication is currently active
 */
function isMedicationActive(medication, visitDate) {
  const now = new Date();
  const prescribedDate = new Date(visitDate);

  // Continuous medications are always active
  if (medication.duration && (
    medication.duration.includes('مستمر') ||
    medication.duration.toLowerCase().includes('continuous')
  )) {
    return true;
  }

  // Check duration in days
  const daysMatch = medication.duration?.match(/(\d+)\s*(يوم|day)/i);
  if (daysMatch) {
    const days = parseInt(daysMatch[1]);
    const endDate = new Date(prescribedDate);
    endDate.setDate(endDate.getDate() + days);
    
    return now <= endDate;
  }

  // Default: active if prescribed in last 30 days
  const daysSincePrescribed = (now - prescribedDate) / (1000 * 60 * 60 * 24);
  return daysSincePrescribed <= 30;
}
