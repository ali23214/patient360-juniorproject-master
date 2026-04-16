/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  Pharmacist Controller — Patient 360°
 *  ─────────────────────────────────────────────────────────────────────────
 *  Pharmacist self-service endpoints. Mounted at /api/pharmacist.
 *
 *  Functions:
 *    1. getMyProfile             — Pharmacist's own profile + pharmacy
 *    2. getMyDashboardStats      — Today's dispensing count, low stock alerts
 *    3. getMyDispensingHistory   — Pharmacist's dispensing log
 *    4. getMyPharmacyInventory   — Inventory at the pharmacist's pharmacy
 *    5. searchMedications        — Search drug catalog (for OTC selection)
 *    6. getLowStockAlerts        — Items needing restock at this pharmacy
 *    7. getExpiryAlerts          — Batches expiring within 30 days
 *
 *  Pharmacist account → Person → Pharmacist record relationship:
 *    Account.personId → Person._id ← Pharmacist.personId → Pharmacist.pharmacyId
 *
 *  Conventions kept:
 *    - Arabic error messages, emoji-marked console logs
 *    - { success, message, [data] } response shape
 *    - Try/catch in every async function
 * ═══════════════════════════════════════════════════════════════════════════
 */

const {
  Pharmacist, Pharmacy, PharmacyInventory, PharmacyDispensing,
  Medication, AuditLog
} = require('../models');

// ============================================================================
// HELPER: Resolve pharmacist record from logged-in account
// ============================================================================

/**
 * Load the Pharmacist document for the currently logged-in user.
 * Throws if account is not linked to a pharmacist record.
 */
async function getPharmacistFromAccount(account) {
  if (!account.personId) {
    throw new Error('الحساب غير مرتبط بصيدلاني');
  }

  const pharmacist = await Pharmacist.findOne({ personId: account.personId });
  if (!pharmacist) {
    throw new Error('لم يتم العثور على ملف الصيدلاني');
  }

  return pharmacist;
}

// ============================================================================
// 1. GET MY PROFILE
// ============================================================================

/**
 * @route   GET /api/pharmacist/me
 * @desc    Pharmacist's own profile with their pharmacy info populated
 * @access  Private (pharmacist)
 */
exports.getMyProfile = async (req, res) => {
  try {
    const pharmacist = await Pharmacist.findOne({ personId: req.account.personId })
      .populate('personId', 'firstName fatherName lastName motherName nationalId phoneNumber')
      .populate('pharmacyId', 'name arabicName phoneNumber address governorate city operatingHours')
      .lean();

    if (!pharmacist) {
      return res.status(404).json({
        success: false,
        message: 'لم يتم العثور على ملف الصيدلاني'
      });
    }

    return res.json({
      success: true,
      pharmacist
    });
  } catch (error) {
    console.error('Get pharmacist profile error:', error);
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
 * @route   GET /api/pharmacist/dashboard-stats
 * @desc    Today's dispensing KPIs + alerts for pharmacist's dashboard
 * @access  Private (pharmacist)
 */
exports.getMyDashboardStats = async (req, res) => {
  try {
    const pharmacist = await getPharmacistFromAccount(req.account);

    const startOfToday = new Date(new Date().setHours(0, 0, 0, 0));
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    // Run all stats in parallel for speed
    const [
      todayDispensingCount,
      monthDispensingCount,
      todayPrescriptionBased,
      todayOtc,
      lowStockItemsCount,
      expiryAlertsCount
    ] = await Promise.all([
      PharmacyDispensing.countDocuments({
        pharmacistId: pharmacist._id,
        dispensingDate: { $gte: startOfToday }
      }),
      PharmacyDispensing.countDocuments({
        pharmacistId: pharmacist._id,
        dispensingDate: { $gte: startOfMonth }
      }),
      PharmacyDispensing.countDocuments({
        pharmacistId: pharmacist._id,
        dispensingDate: { $gte: startOfToday },
        dispensingType: 'prescription_based'
      }),
      PharmacyDispensing.countDocuments({
        pharmacistId: pharmacist._id,
        dispensingDate: { $gte: startOfToday },
        dispensingType: 'otc'
      }),
      PharmacyInventory.countDocuments({
        pharmacyId: pharmacist.pharmacyId,
        lowStockAlert: true
      }),
      PharmacyInventory.countDocuments({
        pharmacyId: pharmacist.pharmacyId,
        expiryAlert: true
      })
    ]);

    return res.json({
      success: true,
      stats: {
        todayDispensingCount,
        monthDispensingCount,
        todayPrescriptionBased,
        todayOtc,
        lowStockItemsCount,
        expiryAlertsCount,
        totalPrescriptionsDispensed: pharmacist.totalPrescriptionsDispensed || 0
      }
    });
  } catch (error) {
    console.error('Get pharmacist stats error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'حدث خطأ في جلب الإحصائيات'
    });
  }
};

// ============================================================================
// 3. GET MY DISPENSING HISTORY
// ============================================================================

/**
 * @route   GET /api/pharmacist/dispensing-history
 * @desc    Pharmacist's own dispensing log, paginated
 * @access  Private (pharmacist)
 *
 * Query: page, limit, type (prescription_based | otc), startDate, endDate
 */
exports.getMyDispensingHistory = async (req, res) => {
  try {
    const pharmacist = await getPharmacistFromAccount(req.account);

    const { page = 1, limit = 20, type, startDate, endDate } = req.query;

    const safePage = Math.max(parseInt(page, 10) || 1, 1);
    const safeLimit = Math.min(parseInt(limit, 10) || 20, 100);

    const query = { pharmacistId: pharmacist._id };
    if (type && ['prescription_based', 'otc'].includes(type)) {
      query.dispensingType = type;
    }
    if (startDate || endDate) {
      query.dispensingDate = {};
      if (startDate) query.dispensingDate.$gte = new Date(startDate);
      if (endDate) query.dispensingDate.$lte = new Date(endDate);
    }

    const [dispensings, total] = await Promise.all([
      PharmacyDispensing.find(query)
        .populate('patientPersonId', 'firstName lastName nationalId')
        .populate('patientChildId', 'firstName lastName childRegistrationNumber')
        .sort({ dispensingDate: -1 })
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit)
        .lean(),
      PharmacyDispensing.countDocuments(query)
    ]);

    return res.json({
      success: true,
      count: total,
      page: safePage,
      pages: Math.ceil(total / safeLimit),
      dispensings
    });
  } catch (error) {
    console.error('Get dispensing history error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'حدث خطأ في جلب السجل'
    });
  }
};

// ============================================================================
// 4. GET MY PHARMACY INVENTORY
// ============================================================================

/**
 * @route   GET /api/pharmacist/inventory
 * @desc    Inventory at pharmacist's pharmacy with medication details
 * @access  Private (pharmacist)
 *
 * Query: page, limit, search (medication name), lowStockOnly (boolean)
 */
exports.getMyPharmacyInventory = async (req, res) => {
  try {
    const pharmacist = await getPharmacistFromAccount(req.account);

    const { page = 1, limit = 50, search, lowStockOnly } = req.query;

    const safePage = Math.max(parseInt(page, 10) || 1, 1);
    const safeLimit = Math.min(parseInt(limit, 10) || 50, 200);

    const query = { pharmacyId: pharmacist.pharmacyId };
    if (lowStockOnly === 'true') {
      query.lowStockAlert = true;
    }

    // Get inventory items first
    let inventoryItems = await PharmacyInventory.find(query)
      .populate('medicationId', 'tradeName arabicTradeName scientificName arabicScientificName strength dosageForm requiresPrescription controlledSubstance category')
      .sort({ updatedAt: -1 })
      .lean();

    // Filter by search term post-population (since we're searching populated fields)
    if (search) {
      const searchLower = search.toLowerCase();
      inventoryItems = inventoryItems.filter(item => {
        const med = item.medicationId;
        if (!med) return false;
        return (
          med.tradeName?.toLowerCase().includes(searchLower)
          || med.arabicTradeName?.toLowerCase().includes(searchLower)
          || med.scientificName?.toLowerCase().includes(searchLower)
          || med.arabicScientificName?.toLowerCase().includes(searchLower)
        );
      });
    }

    const total = inventoryItems.length;
    const start = (safePage - 1) * safeLimit;
    const paginated = inventoryItems.slice(start, start + safeLimit);

    return res.json({
      success: true,
      count: total,
      page: safePage,
      pages: Math.ceil(total / safeLimit),
      inventory: paginated
    });
  } catch (error) {
    console.error('Get inventory error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'حدث خطأ في جلب المخزون'
    });
  }
};

// ============================================================================
// 5. SEARCH MEDICATIONS (for OTC selection)
// ============================================================================

/**
 * @route   GET /api/pharmacist/medications/search?q=...&otcOnly=true
 * @desc    Search the medication catalog. Optionally filter to OTC drugs only
 *          (for the OTC dispensing flow where Rx-required drugs aren't valid).
 * @access  Private (pharmacist)
 *
 * Query: q (search term), otcOnly (boolean), limit
 */
exports.searchMedications = async (req, res) => {
  try {
    const { q, otcOnly, limit = 20 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'يجب إدخال حرفين على الأقل للبحث'
      });
    }

    const safeLimit = Math.min(parseInt(limit, 10) || 20, 50);

    const regex = new RegExp(q.trim(), 'i');
    const query = {
      $or: [
        { tradeName: regex },
        { arabicTradeName: regex },
        { scientificName: regex },
        { arabicScientificName: regex }
      ],
      isAvailable: true,
      isDiscontinued: false
    };

    if (otcOnly === 'true') {
      query.requiresPrescription = false;
    }

    const medications = await Medication.find(query)
      .limit(safeLimit)
      .lean();

    return res.json({
      success: true,
      count: medications.length,
      medications
    });
  } catch (error) {
    console.error('Search medications error:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في البحث'
    });
  }
};

// ============================================================================
// 6. LOW STOCK ALERTS
// ============================================================================

/**
 * @route   GET /api/pharmacist/alerts/low-stock
 * @desc    Items at or below minimum stock at the pharmacist's pharmacy
 * @access  Private (pharmacist)
 */
exports.getLowStockAlerts = async (req, res) => {
  try {
    const pharmacist = await getPharmacistFromAccount(req.account);

    const lowStockItems = await PharmacyInventory.find({
      pharmacyId: pharmacist.pharmacyId,
      lowStockAlert: true
    })
      .populate('medicationId', 'tradeName arabicTradeName strength dosageForm')
      .sort({ currentStock: 1 })
      .lean();

    return res.json({
      success: true,
      count: lowStockItems.length,
      items: lowStockItems
    });
  } catch (error) {
    console.error('Get low stock error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'حدث خطأ في جلب التنبيهات'
    });
  }
};

// ============================================================================
// 7. EXPIRY ALERTS
// ============================================================================

/**
 * @route   GET /api/pharmacist/alerts/expiry
 * @desc    Inventory items with batches expiring within 30 days
 * @access  Private (pharmacist)
 */
exports.getExpiryAlerts = async (req, res) => {
  try {
    const pharmacist = await getPharmacistFromAccount(req.account);

    const expiryItems = await PharmacyInventory.find({
      pharmacyId: pharmacist.pharmacyId,
      expiryAlert: true
    })
      .populate('medicationId', 'tradeName arabicTradeName strength dosageForm')
      .lean();

    // Add a "soonest expiry" field for sorting/display
    const itemsWithSoonestExpiry = expiryItems.map(item => {
      const soonest = (item.batches || [])
        .filter(b => b.quantity > 0)
        .reduce((min, b) => {
          if (!min || (b.expiryDate && b.expiryDate < min)) return b.expiryDate;
          return min;
        }, null);
      return { ...item, soonestExpiryDate: soonest };
    });

    itemsWithSoonestExpiry.sort((a, b) => {
      if (!a.soonestExpiryDate) return 1;
      if (!b.soonestExpiryDate) return -1;
      return new Date(a.soonestExpiryDate) - new Date(b.soonestExpiryDate);
    });

    return res.json({
      success: true,
      count: itemsWithSoonestExpiry.length,
      items: itemsWithSoonestExpiry
    });
  } catch (error) {
    console.error('Get expiry alerts error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'حدث خطأ في جلب التنبيهات'
    });
  }
};