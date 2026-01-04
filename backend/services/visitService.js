const Visit = require('../models/Visit');
const Doctor = require('../models/Doctor');
const Person = require('../models/Person');

/**
 * Visit Service
 * Business logic for visit operations
 */

/**
 * Get all visits for a patient with filters
 */
exports.getPatientVisits = async (patientId, filters = {}) => {
  try {
    const { startDate, endDate, doctorId, searchTerm, page = 1, limit = 50, status } = filters;

    // Build query
    const query = { patientId };

    // Date range filter
    if (startDate || endDate) {
      query.visitDate = {};
      if (startDate) {
        query.visitDate.$gte = new Date(startDate);
      }
      if (endDate) {
        query.visitDate.$lte = new Date(endDate);
      }
    }

    // Doctor filter
    if (doctorId) {
      query.doctorId = doctorId;
    }

    // Status filter
    if (status) {
      query.status = status;
    }

    // Search in diagnosis and chief complaint
    if (searchTerm) {
      query.$or = [
        { diagnosis: { $regex: searchTerm, $options: 'i' } },
        { chiefComplaint: { $regex: searchTerm, $options: 'i' } },
        { doctorNotes: { $regex: searchTerm, $options: 'i' } }
      ];
    }

    // Execute query with pagination
    const visits = await Visit.find(query)
      .populate({
        path: 'doctorId',
        populate: {
          path: 'personId',
          select: 'firstName lastName'
        },
        select: 'personId specialization medicalLicenseNumber'
      })
      .sort({ visitDate: -1, visitTime: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const count = await Visit.countDocuments(query);

    // Format visits for frontend
    const formattedVisits = visits.map(visit => formatVisitData(visit));

    return {
      success: true,
      visits: formattedVisits,
      pagination: {
        total: count,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(count / limit)
      }
    };
  } catch (error) {
    console.error('Error in getPatientVisits:', error);
    return {
      success: false,
      message: 'حدث خطأ أثناء جلب الزيارات'
    };
  }
};

/**
 * Get single visit details
 */
exports.getVisitById = async (visitId, patientId) => {
  try {
    const visit = await Visit.findOne({ _id: visitId, patientId })
      .populate({
        path: 'doctorId',
        populate: {
          path: 'personId',
          select: 'firstName lastName phoneNumber'
        },
        select: 'personId specialization medicalLicenseNumber yearsOfExperience'
      })
      .lean();

    if (!visit) {
      return {
        success: false,
        message: 'الزيارة غير موجودة'
      };
    }

    // Format visit data
    const formattedVisit = formatVisitData(visit, true); // true = include full details

    return {
      success: true,
      visit: formattedVisit
    };
  } catch (error) {
    console.error('Error in getVisitById:', error);
    return {
      success: false,
      message: 'حدث خطأ أثناء جلب تفاصيل الزيارة'
    };
  }
};

/**
 * Get visit statistics
 */
exports.getVisitStats = async (patientId) => {
  try {
    const visits = await Visit.find({ patientId }).lean();

    if (visits.length === 0) {
      return {
        success: true,
        stats: {
          totalVisits: 0,
          completedVisits: 0,
          scheduledVisits: 0,
          cancelledVisits: 0,
          noShowVisits: 0,
          lastVisit: null,
          nextVisit: null,
          visitsByStatus: {},
          visitsByMonth: [],
          commonDiagnoses: [],
          doctorsVisited: []
        }
      };
    }

    // Calculate statistics
    const stats = {
      totalVisits: visits.length,
      completedVisits: visits.filter(v => v.status === 'completed').length,
      scheduledVisits: visits.filter(v => v.status === 'scheduled').length,
      cancelledVisits: visits.filter(v => v.status === 'cancelled').length,
      noShowVisits: visits.filter(v => v.status === 'no-show').length,
      
      // Dates
      lastVisit: visits
        .filter(v => v.status === 'completed')
        .sort((a, b) => new Date(b.visitDate) - new Date(a.visitDate))[0]?.visitDate || null,
      
      nextVisit: visits
        .filter(v => v.status === 'scheduled' && new Date(v.visitDate) > new Date())
        .sort((a, b) => new Date(a.visitDate) - new Date(b.visitDate))[0]?.visitDate || null,

      // Visits by status
      visitsByStatus: {
        completed: visits.filter(v => v.status === 'completed').length,
        scheduled: visits.filter(v => v.status === 'scheduled').length,
        cancelled: visits.filter(v => v.status === 'cancelled').length,
        noShow: visits.filter(v => v.status === 'no-show').length
      },

      // Visits by month (last 12 months)
      visitsByMonth: calculateVisitsByMonth(visits),

      // Common diagnoses
      commonDiagnoses: getCommonDiagnoses(visits),

      // Unique doctors visited
      doctorsVisited: [...new Set(visits.map(v => v.doctorId?.toString()))].length
    };

    return {
      success: true,
      stats
    };
  } catch (error) {
    console.error('Error in getVisitStats:', error);
    return {
      success: false,
      message: 'حدث خطأ أثناء حساب إحصائيات الزيارات'
    };
  }
};

/**
 * Get visits grouped by doctor
 */
exports.getVisitsByDoctor = async (patientId) => {
  try {
    const visits = await Visit.find({ patientId })
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

    // Group visits by doctor
    const visitsByDoctor = {};

    visits.forEach(visit => {
      if (!visit.doctorId) return;

      const doctorId = visit.doctorId._id.toString();
      const doctorName = visit.doctorId.personId 
        ? `${visit.doctorId.personId.firstName} ${visit.doctorId.personId.lastName}`
        : 'Unknown Doctor';

      if (!visitsByDoctor[doctorId]) {
        visitsByDoctor[doctorId] = {
          doctorId,
          doctorName,
          specialization: visit.doctorId.specialization,
          visits: []
        };
      }

      visitsByDoctor[doctorId].visits.push(formatVisitData(visit));
    });

    // Convert to array and sort by number of visits
    const groupedVisits = Object.values(visitsByDoctor)
      .sort((a, b) => b.visits.length - a.visits.length);

    return {
      success: true,
      visitsByDoctor: groupedVisits
    };
  } catch (error) {
    console.error('Error in getVisitsByDoctor:', error);
    return {
      success: false,
      message: 'حدث خطأ أثناء تجميع الزيارات حسب الطبيب'
    };
  }
};

/**
 * Helper Functions
 */

/**
 * Format visit data for frontend
 */
function formatVisitData(visit, includeFullDetails = false) {
  const formatted = {
    _id: visit._id,
    visitDate: visit.visitDate,
    visitTime: visit.visitTime,
    status: visit.status,
    chiefComplaint: visit.chiefComplaint,
    diagnosis: visit.diagnosis,
    
    // Doctor information
    doctorId: visit.doctorId?._id,
    doctorName: visit.doctorId?.personId 
      ? `د. ${visit.doctorId.personId.firstName} ${visit.doctorId.personId.lastName}`
      : 'غير محدد',
    specialization: visit.doctorId?.specialization || 'غير محدد',

    // Basic vital signs
    vitalSigns: visit.vitalSigns ? {
      bloodPressure: visit.vitalSigns.bloodPressure,
      heartRate: visit.vitalSigns.heartRate,
      temperature: visit.vitalSigns.temperature,
      oxygenSaturation: visit.vitalSigns.oxygenSaturation
    } : null,

    // Medication count
    medicationsCount: visit.prescribedMedications?.length || 0,
    
    // Lab tests count
    labTestsCount: visit.labTests?.length || 0,

    createdAt: visit.createdAt,
    updatedAt: visit.updatedAt
  };

  // Include full details if requested
  if (includeFullDetails) {
    formatted.prescribedMedications = visit.prescribedMedications || [];
    formatted.labTests = visit.labTests || [];
    formatted.doctorNotes = visit.doctorNotes;
    formatted.doctorInfo = visit.doctorId ? {
      medicalLicenseNumber: visit.doctorId.medicalLicenseNumber,
      yearsOfExperience: visit.doctorId.yearsOfExperience,
      phoneNumber: visit.doctorId.personId?.phoneNumber
    } : null;
  }

  return formatted;
}

/**
 * Calculate visits by month (last 12 months)
 */
function calculateVisitsByMonth(visits) {
  const now = new Date();
  const months = [];

  // Generate last 12 months
  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    months.push({
      month: monthKey,
      count: 0
    });
  }

  // Count visits per month
  visits.forEach(visit => {
    const visitDate = new Date(visit.visitDate);
    const monthKey = `${visitDate.getFullYear()}-${String(visitDate.getMonth() + 1).padStart(2, '0')}`;
    
    const monthData = months.find(m => m.month === monthKey);
    if (monthData) {
      monthData.count++;
    }
  });

  return months;
}

/**
 * Get most common diagnoses
 */
function getCommonDiagnoses(visits) {
  const diagnosisCounts = {};

  visits
    .filter(v => v.diagnosis && v.status === 'completed')
    .forEach(visit => {
      const diagnosis = visit.diagnosis.trim();
      diagnosisCounts[diagnosis] = (diagnosisCounts[diagnosis] || 0) + 1;
    });

  return Object.entries(diagnosisCounts)
    .map(([diagnosis, count]) => ({ diagnosis, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10); // Top 10
}