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
 * Generate weekly medication schedule
 */
exports.getMedicationSchedule = async (patientId) => {
  try {
    // Get current active medications
    const result = await this.getCurrentMedications(patientId);

    if (!result.success) {
      return result;
    }

    const medications = result.medications;

    if (medications.length === 0) {
      return {
        success: true,
        schedule: {
          weeklySchedule: [],
          medications: []
        }
      };
    }

    // Generate weekly schedule
    const weeklySchedule = generateWeeklySchedule(medications);

    return {
      success: true,
      schedule: {
        weeklySchedule,
        medications: medications.map(med => ({
          medicationName: med.medicationName,
          dosage: med.dosage,
          frequency: med.frequency,
          duration: med.duration,
          instructions: med.instructions,
          doctorName: med.doctorName,
          prescribedDate: med.visitDate
        }))
      }
    };
  } catch (error) {
    console.error('Error in getMedicationSchedule:', error);
    return {
      success: false,
      message: 'حدث خطأ أثناء إنشاء جدول الأدوية'
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
      med.duration.toLowerCase().includes('continuous')
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

    // If no clear duration, assume active if prescribed in last 30 days
    const prescribedDate = new Date(med.visitDate);
    const daysSincePrescribed = (now - prescribedDate) / (1000 * 60 * 60 * 24);
    
    return daysSincePrescribed <= 30;
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

/**
 * Generate weekly medication schedule
 */
function generateWeeklySchedule(medications) {
  const days = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
  const weeklySchedule = [];

  days.forEach((day, index) => {
    const daySchedule = {
      day,
      dayIndex: index,
      medications: []
    };

    medications.forEach(med => {
      // Parse frequency to determine which days
      const times = parseFrequency(med.frequency);
      
      times.forEach(time => {
        daySchedule.medications.push({
          medicationName: med.medicationName,
          dosage: med.dosage,
          time,
          instructions: med.instructions
        });
      });
    });

    // Sort medications by time
    daySchedule.medications.sort((a, b) => {
      const timeA = parseTimeString(a.time);
      const timeB = parseTimeString(b.time);
      return timeA - timeB;
    });

    weeklySchedule.push(daySchedule);
  });

  return weeklySchedule;
}

/**
 * Parse medication frequency to times
 */
function parseFrequency(frequency) {
  if (!frequency) return ['8:00 AM'];

  const freq = frequency.toLowerCase();
  
  // Once daily
  if (freq.includes('مرة') && freq.includes('يوم') || freq.includes('once') && freq.includes('day')) {
    return ['8:00 AM'];
  }
  
  // Twice daily
  if (freq.includes('مرتين') || freq.includes('twice')) {
    return ['8:00 AM', '8:00 PM'];
  }
  
  // Three times daily
  if (freq.includes('ثلاث') || freq.includes('three')) {
    return ['8:00 AM', '2:00 PM', '8:00 PM'];
  }
  
  // Four times daily
  if (freq.includes('أربع') || freq.includes('four')) {
    return ['8:00 AM', '12:00 PM', '4:00 PM', '8:00 PM'];
  }

  // Every X hours
  const hoursMatch = freq.match(/(\d+)\s*(ساعة|hour)/);
  if (hoursMatch) {
    const hours = parseInt(hoursMatch[1]);
    const times = [];
    for (let i = 0; i < 24; i += hours) {
      const hour = i % 12 || 12;
      const period = i < 12 ? 'AM' : 'PM';
      times.push(`${hour}:00 ${period}`);
    }
    return times;
  }

  // Default
  return ['8:00 AM'];
}

/**
 * Parse time string to minutes for sorting
 */
function parseTimeString(timeStr) {
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return 0;
  
  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const period = match[3].toUpperCase();
  
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  
  return hours * 60 + minutes;
}