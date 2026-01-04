// backend/middleware/auditLog.js
// FIXED Audit Log Middleware - Matches AuditLog Model

const AuditLog = require('../models/AuditLog');

/**
 * Map action names to resource types
 * This fixes the mismatch between action and resourceType
 */
function getResourceTypeFromAction(action) {
  // Doctor actions
  if (action.includes('DOCTOR_REQUEST')) return 'DoctorRequest';
  if (action.includes('DOCTOR')) return 'Doctor';
  
  // Patient actions
  if (action.includes('PATIENT')) return 'Patient';
  
  // Visit actions
  if (action.includes('VISIT')) return 'Visit';
  
  // Statistics actions
  if (action.includes('STATISTICS')) return 'Statistics';
  
  // Audit actions
  if (action.includes('AUDIT')) return 'AuditLog';
  
  // Account actions
  if (action.includes('LOGIN') || action.includes('PASSWORD') || action.includes('LOGOUT')) return 'Account';
  
  // Default
  return 'Other';
}

/**
 * Audit Log Middleware
 * Creates audit logs for admin actions
 */
exports.auditLog = (action) => {
  return async (req, res, next) => {
    // Store original res.json to intercept response
    const originalJson = res.json.bind(res);
    
    // Override res.json to capture response
    res.json = function(body) {
      // Get the correct resourceType based on action
      const resourceType = getResourceTypeFromAction(action);
      
      // Create audit log entry
      const logEntry = {
        userId: req.user?._id || req.user?.accountId,
        action: action,
        description: `${action} performed by ${req.user?.email || 'unknown'}`,
        resourceType: resourceType,  // ✅ FIXED: Maps action to resource type
        resourceId: req.params.id || null,
        patientId: req.params.patientId || null,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
        success: body.success !== false,
        errorMessage: body.success === false ? body.message : null,
        metadata: {
          method: req.method,
          endpoint: req.originalUrl,
          query: req.query,
          params: req.params
        },
        timestamp: new Date()
      };

      // Save audit log asynchronously (don't block response)
      AuditLog.create(logEntry)
        .then(() => {
          // Success - log created
        })
        .catch(err => {
          console.error('Failed to create audit log:', err);
        });

      // Send original response
      return originalJson(body);
    };

    next();
  };
};

/**
 * Get audit logs for admin
 */
exports.getAuditLogs = async (req, res) => {
  try {
    const { userId, action, startDate, endDate, page = 1, limit = 50 } = req.query;

    // Build query
    const query = {};
    
    if (userId) {
      query.userId = userId;
    }
    
    if (action) {
      query.action = action;
    }
    
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    // Get logs with pagination
    const logs = await AuditLog.find(query)
      .sort({ timestamp: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('userId', 'email')
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
 * Get audit logs for a specific user
 */
exports.getUserAuditLogs = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const logs = await AuditLog.find({ userId })
      .sort({ timestamp: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-__v')
      .lean();

    const count = await AuditLog.countDocuments({ userId });

    res.status(200).json({
      success: true,
      count,
      page: Number(page),
      pages: Math.ceil(count / limit),
      logs
    });
  } catch (error) {
    console.error('Error fetching user audit logs:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء جلب سجلات المستخدم'
    });
  }
};