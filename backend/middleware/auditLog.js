const mongoose = require('mongoose');

/**
 * Audit Log Schema
 * Tracks all access to patient data for HIPAA compliance
 */
const auditLogSchema = new mongoose.Schema({
  // Who accessed the data
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: true
  },
  userEmail: {
    type: String,
    required: true
  },
  userRoles: [{
    type: String,
    enum: ['patient', 'doctor', 'admin', 'pharmacist', 'laboratory']
  }],
  
  // What was accessed
  action: {
    type: String,
    required: true,
    enum: ['VIEW', 'CREATE', 'UPDATE', 'DELETE', 'EXPORT']
  },
  resourceType: {
    type: String,
    required: true,
    enum: ['PATIENT_PROFILE', 'VISIT', 'MEDICATION', 'LAB_RESULT', 'MEDICAL_HISTORY']
  },
  resourceId: {
    type: mongoose.Schema.Types.ObjectId
  },
  
  // Which patient's data was accessed
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient'
  },
  
  // Request details
  method: {
    type: String,
    required: true,
    enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
  },
  endpoint: {
    type: String,
    required: true
  },
  ipAddress: String,
  userAgent: String,
  
  // Response details
  statusCode: Number,
  success: Boolean,
  
  // Additional metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },
  
  // Timestamp
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'audit_logs'
});

// Index for efficient querying
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ patientId: 1, timestamp: -1 });
auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ action: 1, resourceType: 1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

/**
 * Audit Logging Middleware
 * Logs all access to patient data
 */
exports.auditLog = (resourceType) => {
  return async (req, res, next) => {
    // Store original res.json to intercept response
    const originalJson = res.json.bind(res);
    
    // Override res.json to capture response
    res.json = function(body) {
      // Create audit log entry
      const logEntry = {
        userId: req.user?.accountId,
        userEmail: req.user?.email || 'unknown',
        userRoles: req.user?.roles || [],
        action: determineAction(req.method),
        resourceType: resourceType,
        resourceId: req.params.visitId || req.params.medicationId || null,
        patientId: req.user?.patientId,
        method: req.method,
        endpoint: req.originalUrl,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
        statusCode: res.statusCode,
        success: body.success || false,
        metadata: {
          query: req.query,
          params: req.params
        },
        timestamp: new Date()
      };

      // Save audit log asynchronously (don't block response)
      AuditLog.create(logEntry).catch(err => {
        console.error('Failed to create audit log:', err);
      });

      // Send original response
      return originalJson(body);
    };

    next();
  };
};

/**
 * Determine action type based on HTTP method
 */
function determineAction(method) {
  switch (method) {
    case 'GET':
      return 'VIEW';
    case 'POST':
      return 'CREATE';
    case 'PUT':
    case 'PATCH':
      return 'UPDATE';
    case 'DELETE':
      return 'DELETE';
    default:
      return 'VIEW';
  }
}

/**
 * Get audit logs for a specific patient
 * Admin/Doctor use only
 */
exports.getAuditLogs = async (req, res) => {
  try {
    const { patientId, startDate, endDate, action, page = 1, limit = 50 } = req.query;

    // Build query
    const query = {};
    
    if (patientId) {
      query.patientId = patientId;
    }
    
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }
    
    if (action) {
      query.action = action;
    }

    // Get logs with pagination
    const logs = await AuditLog.find(query)
      .sort({ timestamp: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-__v')
      .lean();

    const count = await AuditLog.countDocuments(query);

    res.status(200).json({
      success: true,
      count,
      page: Number(page),
      pages: Math.ceil(count / limit),
      logs
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء جلب سجلات التدقيق'
    });
  }
};

/**
 * Get audit statistics
 */
exports.getAuditStats = async (req, res) => {
  try {
    const { patientId, startDate, endDate } = req.query;

    const matchStage = {};
    
    if (patientId) {
      matchStage.patientId = mongoose.Types.ObjectId(patientId);
    }
    
    if (startDate || endDate) {
      matchStage.timestamp = {};
      if (startDate) matchStage.timestamp.$gte = new Date(startDate);
      if (endDate) matchStage.timestamp.$lte = new Date(endDate);
    }

    const stats = await AuditLog.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            action: '$action',
            resourceType: '$resourceType'
          },
          count: { $sum: 1 },
          uniqueUsers: { $addToSet: '$userId' }
        }
      },
      {
        $project: {
          action: '$_id.action',
          resourceType: '$_id.resourceType',
          count: 1,
          uniqueUsers: { $size: '$uniqueUsers' },
          _id: 0
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.status(200).json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error fetching audit stats:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء جلب إحصائيات التدقيق'
    });
  }
};

module.exports.AuditLog = AuditLog;