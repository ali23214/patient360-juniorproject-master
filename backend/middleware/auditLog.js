// backend/middleware/auditLog.js
// Audit Logging Middleware for Patient360 System

/**
 * Audit Logging Middleware
 * Logs all admin and system actions
 */
exports.auditLog = (action) => {
  return async (req, res, next) => {
    // Import model HERE to avoid circular dependency
    const AuditLog = require('../models/AuditLog');
    
    // Store original res.json to intercept response
    const originalJson = res.json.bind(res);
    
    // Override res.json to capture response
    res.json = function(body) {
      // Create audit log entry asynchronously (don't block response)
      const logEntry = {
        userId: req.user?._id || req.user?.accountId,
        action: action || determineAction(req.method),
        description: `${action || req.method} - ${req.originalUrl}`,
        resourceType: determineResourceType(req.originalUrl),
        resourceId: req.params.id || req.params.visitId || req.params.medicationId || null,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
        success: body.success !== false && res.statusCode < 400,
        errorMessage: body.message && !body.success ? body.message : null,
        metadata: {
          method: req.method,
          query: req.query,
          params: req.params,
          statusCode: res.statusCode
        },
        timestamp: new Date()
      };

      // Save audit log (non-blocking)
      AuditLog.create(logEntry).catch(err => {
        console.error('❌ Failed to create audit log:', err.message);
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
  const actionMap = {
    'GET': 'VIEW',
    'POST': 'CREATE',
    'PUT': 'UPDATE',
    'PATCH': 'UPDATE',
    'DELETE': 'DELETE'
  };
  return actionMap[method] || 'OTHER';
}

/**
 * Determine resource type from URL
 */
function determineResourceType(url) {
  if (url.includes('/patient')) return 'Patient';
  if (url.includes('/doctor')) return 'Doctor';
  if (url.includes('/visit')) return 'Visit';
  if (url.includes('/medication')) return 'Visit';
  if (url.includes('/admin')) return 'System';
  if (url.includes('/audit')) return 'System';
  return 'Other';
}

/**
 * Get audit logs (for admin)
 * This is a controller function, not middleware
 */
exports.getAuditLogs = async (req, res) => {
  try {
    // Import model here
    const AuditLog = require('../models/AuditLog');
    
    const { 
      patientId, 
      userId,
      startDate, 
      endDate, 
      action, 
      resourceType,
      page = 1, 
      limit = 50 
    } = req.query;

    // Build query
    const query = {};
    
    if (patientId) query.patientId = patientId;
    if (userId) query.userId = userId;
    if (action) query.action = action;
    if (resourceType) query.resourceType = resourceType;
    
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    // Get logs with pagination
    const logs = await AuditLog.find(query)
      .populate('userId', 'email roles')
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    const count = await AuditLog.countDocuments(query);

    res.status(200).json({
      success: true,
      count,
      page: parseInt(page),
      pages: Math.ceil(count / parseInt(limit)),
      logs: logs.map(log => ({
        id: log._id,
        action: log.action,
        description: log.description,
        resourceType: log.resourceType,
        resourceId: log.resourceId,
        userEmail: log.userId?.email || 'Unknown',
        userRoles: log.userId?.roles || [],
        ipAddress: log.ipAddress,
        timestamp: log.timestamp,
        success: log.success
      }))
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
    // Import model here
    const AuditLog = require('../models/AuditLog');
    const mongoose = require('mongoose');
    
    const { patientId, startDate, endDate } = req.query;

    const matchStage = {};
    
    if (patientId) {
      matchStage.patientId = new mongoose.Types.ObjectId(patientId);
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
