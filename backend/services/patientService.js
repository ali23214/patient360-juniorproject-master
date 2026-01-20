const Person = require('../models/Person');
const Account = require('../models/Account');
const Patient = require('../models/Patient');
const Visit = require('../models/Visit');

/**
 * Patient Service
 * Business logic for patient operations
 */

/**
 * Get complete patient profile
 * Aggregates data from Person, Account, and Patient collections
 */
exports.getPatientProfile = async (patientId) => {
  try {
    // Get patient document
    const patient = await Patient.findById(patientId)
      .populate('personId')
      .lean();

    if (!patient) {
      return {
        success: false,
        message: 'المريض غير موجود'
      };
    }

    // Get account information
    const account = await Account.findOne({ personId: patient.personId._id })
      .select('email roles isActive lastLogin createdAt')
      .lean();

    // Get visit statistics
    const visitStats = await this.calculateVisitStats(patientId);

    // Combine all data
    const profileData = {
      // Patient ID
      id: patient._id,
      patientId: patient._id,
      
      // Personal Information
      nationalId: patient.personId.nationalId,
      firstName: patient.personId.firstName,
      lastName: patient.personId.lastName,
      dateOfBirth: patient.personId.dateOfBirth,
      age: calculateAge(patient.personId.dateOfBirth),
      gender: patient.personId.gender,
      phoneNumber: patient.personId.phoneNumber,
      address: patient.personId.address,
      
      // Account Information
      email: account?.email,
      roles: account?.roles,
      isActive: account?.isActive,
      lastLogin: account?.lastLogin,
      accountCreated: account?.createdAt,
      
      // Medical Information
      bloodType: patient.bloodType,
      height: patient.height,
      weight: patient.weight,
      bmi: calculateBMI(patient.height, patient.weight),
      smokingStatus: patient.smokingStatus,
      allergies: patient.allergies || [],
      chronicDiseases: patient.chronicDiseases || [],
      familyHistory: patient.familyHistory || [],
      
      // Emergency Contact
      emergencyContact: patient.emergencyContact,
      
      // Visit Statistics
      visitStats,
      
      // Timestamps
      createdAt: patient.createdAt,
      updatedAt: patient.updatedAt
    };

    return {
      success: true,
      patient: profileData
    };
  } catch (error) {
    console.error('Error in getPatientProfile:', error);
    return {
      success: false,
      message: 'حدث خطأ أثناء جلب بيانات المريض'
    };
  }
};

/**
 * Update patient profile
 * Only allows updating specific fields
 */
exports.updatePatientProfile = async (patientId, updates) => {
  try {
    // Validate updates
    const validationResult = this.validateProfileUpdates(updates);
    if (!validationResult.valid) {
      return {
        success: false,
        message: validationResult.message
      };
    }

    const patient = await Patient.findById(patientId);
    if (!patient) {
      return {
        success: false,
        message: 'المريض غير موجود'
      };
    }

    // Separate updates for Person and Patient collections
    const personUpdates = {};
    const patientUpdates = {};

    // Fields that can be updated in Person collection
    const personFields = ['phoneNumber', 'address'];
    personFields.forEach(field => {
      if (updates[field] !== undefined) {
        personUpdates[field] = updates[field];
      }
    });

    // Fields that can be updated in Patient collection
    const patientFields = ['bloodType', 'height', 'weight', 'smokingStatus', 
                          'allergies', 'chronicDiseases', 'familyHistory', 'emergencyContact'];
    patientFields.forEach(field => {
      if (updates[field] !== undefined) {
        patientUpdates[field] = updates[field];
      }
    });

    // Update Person document if needed
    if (Object.keys(personUpdates).length > 0) {
      await Person.findByIdAndUpdate(
        patient.personId,
        { $set: personUpdates },
        { new: true, runValidators: true }
      );
    }

    // Update Patient document if needed
    if (Object.keys(patientUpdates).length > 0) {
      await Patient.findByIdAndUpdate(
        patientId,
        { $set: patientUpdates },
        { new: true, runValidators: true }
      );
    }

    // Get updated profile
    return await this.getPatientProfile(patientId);
  } catch (error) {
    console.error('Error in updatePatientProfile:', error);
    return {
      success: false,
      message: 'حدث خطأ أثناء تحديث بيانات المريض'
    };
  }
};

/**
 * Get medical history summary
 */
exports.getMedicalHistory = async (patientId) => {
  try {
    const patient = await Patient.findById(patientId)
      .populate('personId')
      .lean();

    if (!patient) {
      return {
        success: false,
        message: 'المريض غير موجود'
      };
    }

    // Get all visits
    const visits = await Visit.find({ patientId })
      .sort({ visitDate: -1 })
      .populate('doctorId', 'firstName lastName specialization')
      .lean();

    // Extract unique diagnoses
    const diagnoses = [...new Set(visits
      .filter(v => v.diagnosis)
      .map(v => v.diagnosis))];

    // Extract all prescribed medications
    const allMedications = visits
      .filter(v => v.prescribedMedications && v.prescribedMedications.length > 0)
      .flatMap(v => v.prescribedMedications);

    // Extract unique lab tests
    const labTests = [...new Set(visits
      .filter(v => v.labTests && v.labTests.length > 0)
      .flatMap(v => v.labTests.map(test => test.testName)))];

    const summary = {
      // Basic Info
      patientInfo: {
        name: `${patient.personId.firstName} ${patient.personId.lastName}`,
        nationalId: patient.personId.nationalId,
        age: calculateAge(patient.personId.dateOfBirth),
        gender: patient.personId.gender
      },
      
      // Medical Profile
      medicalProfile: {
        bloodType: patient.bloodType,
        allergies: patient.allergies || [],
        chronicDiseases: patient.chronicDiseases || [],
        familyHistory: patient.familyHistory || [],
        smokingStatus: patient.smokingStatus
      },
      
      // Visit History
      visitHistory: {
        totalVisits: visits.length,
        lastVisit: visits[0]?.visitDate,
        diagnoses: diagnoses,
        totalMedications: allMedications.length,
        labTests: labTests
      },
      
      // Health Metrics
      healthMetrics: {
        height: patient.height,
        weight: patient.weight,
        bmi: calculateBMI(patient.height, patient.weight)
      }
    };

    return {
      success: true,
      summary
    };
  } catch (error) {
    console.error('Error in getMedicalHistory:', error);
    return {
      success: false,
      message: 'حدث خطأ أثناء جلب التاريخ الطبي'
    };
  }
};

/**
 * Calculate visit statistics
 */
exports.calculateVisitStats = async (patientId) => {
  try {
    const visits = await Visit.find({ patientId }).lean();

    if (visits.length === 0) {
      return {
        totalVisits: 0,
        completedVisits: 0,
        scheduledVisits: 0,
        cancelledVisits: 0,
        lastVisit: null,
        nextVisit: null
      };
    }

    const stats = {
      totalVisits: visits.length,
      completedVisits: visits.filter(v => v.status === 'completed').length,
      scheduledVisits: visits.filter(v => v.status === 'scheduled').length,
      cancelledVisits: visits.filter(v => v.status === 'cancelled').length,
      lastVisit: visits
        .filter(v => v.status === 'completed')
        .sort((a, b) => new Date(b.visitDate) - new Date(a.visitDate))[0]?.visitDate || null,
      nextVisit: visits
        .filter(v => v.status === 'scheduled' && new Date(v.visitDate) > new Date())
        .sort((a, b) => new Date(a.visitDate) - new Date(b.visitDate))[0]?.visitDate || null
    };

    return stats;
  } catch (error) {
    console.error('Error calculating visit stats:', error);
    return null;
  }
};

/**
 * Validate profile update fields
 */
exports.validateProfileUpdates = (updates) => {
  // Fields that are NOT allowed to be updated by patient
  const restrictedFields = ['nationalId', 'firstName', 'lastName', 'dateOfBirth', 'gender', 'email', 'roles'];
  
  for (const field of restrictedFields) {
    if (updates[field] !== undefined) {
      return {
        valid: false,
        message: `لا يمكن تحديث الحقل: ${field}`
      };
    }
  }

  // Validate specific fields
  if (updates.phoneNumber && !isValidPhoneNumber(updates.phoneNumber)) {
    return {
      valid: false,
      message: 'رقم الهاتف غير صالح'
    };
  }

  if (updates.height && (updates.height < 50 || updates.height > 250)) {
    return {
      valid: false,
      message: 'الطول يجب أن يكون بين 50 و 250 سم'
    };
  }

  if (updates.weight && (updates.weight < 2 || updates.weight > 300)) {
    return {
      valid: false,
      message: 'الوزن يجب أن يكون بين 2 و 300 كجم'
    };
  }

  return { valid: true };
};

/**
 * Helper Functions
 */

function calculateAge(dateOfBirth) {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

function calculateBMI(height, weight) {
  if (!height || !weight) return null;
  
  const heightInMeters = height / 100;
  const bmi = weight / (heightInMeters * heightInMeters);
  
  return Math.round(bmi * 10) / 10;
}

function isValidPhoneNumber(phone) {
  // Syrian phone format: +963XXXXXXXXX or 09XXXXXXXX
  const phoneRegex = /^(\+963[0-9]{9}|09[0-9]{8})$/;
  return phoneRegex.test(phone);
}