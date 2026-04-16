/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  Lab Technician Controller — Patient 360°
 *  ─────────────────────────────────────────────────────────────────────────
 *  Lab tech self-service endpoints. Mounted at /api/lab-technician.
 *
 *  Functions:
 *    1. getMyProfile             — Lab tech's own profile + laboratory info
 *    2. getMyDashboardStats      — Today's tests, pending tests, KPIs
 *    3. getMyTestsPerformed      — Lab tech's test completion history
 *    4. getLabPendingOrders      — All pending orders at the lab tech's lab
 *    5. getLabTodaySchedule      — Tests scheduled for today at this lab
 *
 *  Lab tech account → Person → LabTechnician record relationship:
 *    Account.personId → Person._id ← LabTechnician.personId → LabTechnician.laboratoryId
 *
 *  Conventions kept:
 *    - Arabic error messages, emoji-marked console logs
 *    - { success, message, [data] } response shape
 *    - Try/catch in every async function
 * ═══════════════════════════════════════════════════════════════════════════
 */

const {
  LabTechnician, Laboratory, LabTest, AuditLog
} = require('../models');

// ============================================================================
// HELPER: Resolve lab technician record from logged-in account
// ============================================================================

/**
 * Load the LabTechnician document for the currently logged-in user.
 * Throws if account is not linked to a lab technician record.
 */
async function getLabTechFromAccount(account) {
  if (!account.personId) {
    throw new Error('الحساب غير مرتبط بفني مختبر');
  }

  const labTech = await LabTechnician.findOne({ personId: account.personId });
  if (!labTech) {
    throw new Error('لم يتم العثور على ملف فني المختبر');
  }

  return labTech;
}

// ============================================================================
// 1. GET MY PROFILE
// ============================================================================

/**
 * @route   GET /api/lab-technician/me
 * @desc    Lab tech's own profile with their laboratory info populated
 * @access  Private (lab_technician)
 */
exports.getMyProfile = async (req, res) => {
  try {
    const labTech = await LabTechnician.findOne({ personId: req.account.personId })
      .populate('personId', 'firstName fatherName lastName motherName nationalId phoneNumber')
      .populate('laboratoryId', 'name arabicName phoneNumber address governorate city operatingHours testCatalog')
      .lean();

    if (!labTech) {
      return res.status(404).json({
        success: false,
        message: 'لم يتم العثور على ملف فني المختبر'
      });
    }

    return res.json({
      success: true,
      labTechnician: labTech
    });
  } catch (error) {
    console.error('Get lab tech profile error:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في جلب الملف الشخصي'
    });
  }
};

// ============================================================================
// 2. GET DASHBOARD STATS
// ============================================================================

/**
 * @route   GET /api/lab-technician/dashboard-stats
 * @desc    Today's lab KPIs for the dashboard
 * @access  Private (lab_technician)
 */
exports.getMyDashboardStats = async (req, res) => {
  try {
    const labTech = await getLabTechFromAccount(req.account);

    const startOfToday = new Date(new Date().setHours(0, 0, 0, 0));
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    // Run all stats in parallel for speed
    const [
      pendingOrdersCount,
      sampleCollectedCount,
      inProgressCount,
      todayCompletedByMe,
      monthCompletedByMe,
      criticalResultsCount,
      labTodayTotal
    ] = await Promise.all([
      LabTest.countDocuments({
        laboratoryId: labTech.laboratoryId,
        status: { $in: ['ordered', 'scheduled'] }
      }),
      LabTest.countDocuments({
        laboratoryId: labTech.laboratoryId,
        status: 'sample_collected'
      }),
      LabTest.countDocuments({
        laboratoryId: labTech.laboratoryId,
        status: 'in_progress'
      }),
      LabTest.countDocuments({
        laboratoryId: labTech.laboratoryId,
        completedBy: labTech._id,
        completedAt: { $gte: startOfToday }
      }),
      LabTest.countDocuments({
        laboratoryId: labTech.laboratoryId,
        completedBy: labTech._id,
        completedAt: { $gte: startOfMonth }
      }),
      LabTest.countDocuments({
        laboratoryId: labTech.laboratoryId,
        isCritical: true,
        status: 'completed'
      }),
      LabTest.countDocuments({
        laboratoryId: labTech.laboratoryId,
        $or: [
          { scheduledDate: { $gte: startOfToday } },
          { sampleCollectedAt: { $gte: startOfToday } },
          { completedAt: { $gte: startOfToday } }
        ]
      })
    ]);

    return res.json({
      success: true,
      stats: {
        pendingOrdersCount,
        sampleCollectedCount,
        inProgressCount,
        todayCompletedByMe,
        monthCompletedByMe,
        criticalResultsCount,
        labTodayTotal,
        totalTestsPerformed: labTech.totalTestsPerformed || 0
      }
    });
  } catch (error) {
    console.error('Get lab tech stats error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'حدث خطأ في جلب الإحصائيات'
    });
  }
};

// ============================================================================
// 3. GET MY TESTS PERFORMED (history)
// ============================================================================

/**
 * @route   GET /api/lab-technician/tests-performed
 * @desc    Lab tech's completed tests history, paginated
 * @access  Private (lab_technician)
 *
 * Query: page, limit, startDate, endDate
 */
exports.getMyTestsPerformed = async (req, res) => {
  try {
    const labTech = await getLabTechFromAccount(req.account);

    const { page = 1, limit = 20, startDate, endDate } = req.query;

    const safePage = Math.max(parseInt(page, 10) || 1, 1);
    const safeLimit = Math.min(parseInt(limit, 10) || 20, 100);

    const query = { completedBy: labTech._id };
    if (startDate || endDate) {
      query.completedAt = {};
      if (startDate) query.completedAt.$gte = new Date(startDate);
      if (endDate) query.completedAt.$lte = new Date(endDate);
    }

    const [tests, total] = await Promise.all([
      LabTest.find(query)
        .populate('patientPersonId', 'firstName lastName nationalId')
        .populate('patientChildId', 'firstName lastName childRegistrationNumber')
        .populate('orderedBy', 'specialization medicalLicenseNumber')
        .sort({ completedAt: -1 })
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit)
        .lean(),
      LabTest.countDocuments(query)
    ]);

    return res.json({
      success: true,
      count: total,
      page: safePage,
      pages: Math.ceil(total / safeLimit),
      tests
    });
  } catch (error) {
    console.error('Get tests performed error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'حدث خطأ في جلب السجل'
    });
  }
};

// ============================================================================
// 4. GET LAB PENDING ORDERS (queue)
// ============================================================================

/**
 * @route   GET /api/lab-technician/pending-orders
 * @desc    All pending tests at the lab tech's laboratory.
 *          Sorted by priority (stat → urgent → routine), then by orderDate.
 * @access  Private (lab_technician)
 *
 * Query: page, limit, status (filter to specific status)
 */
exports.getLabPendingOrders = async (req, res) => {
  try {
    const labTech = await getLabTechFromAccount(req.account);

    const { page = 1, limit = 20, status } = req.query;

    const safePage = Math.max(parseInt(page, 10) || 1, 1);
    const safeLimit = Math.min(parseInt(limit, 10) || 20, 100);

    const query = {
      laboratoryId: labTech.laboratoryId,
      status: status
        ? status
        : { $in: ['ordered', 'scheduled', 'sample_collected', 'in_progress'] }
    };

    // MongoDB aggregation to sort by priority (stat first) then orderDate
    const priorityOrder = { stat: 1, urgent: 2, routine: 3 };

    const [allTests, total] = await Promise.all([
      LabTest.find(query)
        .populate('patientPersonId', 'firstName lastName nationalId phoneNumber')
        .populate('patientChildId', 'firstName lastName childRegistrationNumber phoneNumber')
        .populate('orderedBy', 'specialization medicalLicenseNumber')
        .lean(),
      LabTest.countDocuments(query)
    ]);

    // Sort in JS so we can use the priorityOrder map
    allTests.sort((a, b) => {
      const ap = priorityOrder[a.priority] || 99;
      const bp = priorityOrder[b.priority] || 99;
      if (ap !== bp) return ap - bp;
      return new Date(a.orderDate) - new Date(b.orderDate);
    });

    const paginated = allTests.slice(
      (safePage - 1) * safeLimit,
      safePage * safeLimit
    );

    return res.json({
      success: true,
      count: total,
      page: safePage,
      pages: Math.ceil(total / safeLimit),
      tests: paginated
    });
  } catch (error) {
    console.error('Get pending orders error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'حدث خطأ في جلب الطلبات المعلقة'
    });
  }
};

// ============================================================================
// 5. GET LAB TODAY SCHEDULE
// ============================================================================

/**
 * @route   GET /api/lab-technician/today-schedule
 * @desc    Tests scheduled or active at the lab today
 * @access  Private (lab_technician)
 */
exports.getLabTodaySchedule = async (req, res) => {
  try {
    const labTech = await getLabTechFromAccount(req.account);

    const startOfToday = new Date(new Date().setHours(0, 0, 0, 0));
    const endOfToday = new Date(new Date().setHours(23, 59, 59, 999));

    const tests = await LabTest.find({
      laboratoryId: labTech.laboratoryId,
      $or: [
        { scheduledDate: { $gte: startOfToday, $lte: endOfToday } },
        { sampleCollectedAt: { $gte: startOfToday, $lte: endOfToday } },
        {
          status: { $in: ['ordered', 'scheduled', 'sample_collected', 'in_progress'] }
        }
      ]
    })
      .populate('patientPersonId', 'firstName lastName nationalId')
      .populate('patientChildId', 'firstName lastName childRegistrationNumber')
      .populate('orderedBy', 'specialization medicalLicenseNumber')
      .sort({ scheduledDate: 1, orderDate: 1 })
      .lean();

    return res.json({
      success: true,
      count: tests.length,
      tests
    });
  } catch (error) {
    console.error('Get today schedule error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'حدث خطأ في جلب جدول اليوم'
    });
  }
};