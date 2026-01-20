// backend/models/AuditLog.js
// Audit Log Model for tracking all admin and system actions

const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  // User who performed the action
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: true,
    index: true
  },
  
  // Action performed
  action: {
    type: String,
    required: true,
    enum: [
      // Authentication
      'LOGIN', 'LOGOUT', 'PASSWORD_CHANGE', 'PASSWORD_RESET',
      
      // Doctor Management
      'ADD_DOCTOR', 'UPDATE_DOCTOR', 'DEACTIVATE_DOCTOR', 'ACTIVATE_DOCTOR',
      'VIEW_DOCTOR_DETAILS', 'VIEW_DOCTORS',
      
      // Doctor Request Management (NEW)
      'VIEW_DOCTOR_REQUESTS', 'VIEW_DOCTOR_REQUEST_DETAILS', 
      'APPROVE_DOCTOR_REQUEST', 'REJECT_DOCTOR_REQUEST',
      
      // Patient Management
      'ADD_PATIENT', 'UPDATE_PATIENT', 'DEACTIVATE_PATIENT', 'ACTIVATE_PATIENT',
      'VIEW_PATIENT_DETAILS', 'VIEW_PATIENTS',
      
      // Visit Management
      'CREATE_VISIT', 'UPDATE_VISIT', 'DELETE_VISIT', 'VIEW_VISIT', 'VIEW',
      
      // Statistics
      'VIEW_STATISTICS', 'EXPORT_REPORT',
      
      // Audit
      'VIEW_AUDIT_LOGS', 'VIEW_USER_AUDIT_LOGS',
      
      // AI
      'AI_SYMPTOM_ANALYSIS',
      
      // Generic
      'CREATE', 'UPDATE', 'DELETE', 'OTHER'
    ],
    index: true
  },
  
  // Description of the action
  description: {
    type: String,
    required: true
  },
  
  // Resource affected - FIXED: Only resource types, not action names
  resourceType: {
    type: String,
    enum: [
      'Doctor',
      'DoctorRequest',  // ✅ FIXED: Was missing, actions were here instead
      'Patient', 
      'Visit', 
      'Account', 
      'Admin',
      'AuditLog',
      'Statistics',
      'System', 
      'Other'
    ],
    default: 'Other'
  },
  
  resourceId: {
    type: mongoose.Schema.Types.ObjectId,
    index: true
  },
  
  // For patient-specific logs
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    index: true
  },
  
  // Request details
  ipAddress: {
    type: String
  },
  
  userAgent: {
    type: String
  },
  
  // Result
  success: {
    type: Boolean,
    default: true
  },
  
  errorMessage: {
    type: String
  },
  
  // Metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },
  
  // Timestamp
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: false,
  collection: 'audit_logs'
});

// Indexes for better query performance
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ resourceType: 1, resourceId: 1 });
auditLogSchema.index({ patientId: 1, timestamp: -1 });
auditLogSchema.index({ timestamp: -1 });

// Export with overwrite protection to prevent "Cannot overwrite model" error
module.exports = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);