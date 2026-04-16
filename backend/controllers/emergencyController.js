/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  Emergency Controller — Patient 360°
 *  ─────────────────────────────────────────────────────────────────────────
 *  Mobile emergency AI feature. Mounted at /api/emergency.
 *
 *  Workflow:
 *    1. Patient opens mobile app, taps SOS
 *    2. Patient submits text description AND/OR image AND/OR voice recording
 *    3. App also sends GeoJSON location (required — Syria-bounded)
 *    4. Controller calls AI service (currently mocked) for risk assessment
 *    5. Result saved as EmergencyReport with aiRiskLevel + aiFirstAid steps
 *    6. If risk is high/critical, patient can one-tap "Call Ambulance"
 *    7. Dispatcher views all active reports near a location for prioritization
 *
 *  ⚠️  AI INTEGRATION NOTE:
 *  The callEmergencyAI() helper is currently mocked because the team's
 *  emergency AI model is still under development. It returns realistic
 *  mock responses so the full UI/UX flow can be tested. To switch to a
 *  real AI service later, replace the body of callEmergencyAI() with an
 *  axios call to the Flask service — same input/output contract, no
 *  controller changes needed. Pattern matches how ECG analysis works.
 *
 *  Functions:
 *    1. submitEmergencyReport      — Patient submits emergency
 *    2. getMyEmergencyReports      — Patient's own report history
 *    3. getEmergencyReportById     — Single report detail
 *    4. callAmbulance              — Trigger ambulance dispatch on report
 *    5. resolveEmergencyReport     — Mark report resolved
 *    6. getActiveEmergencies       — Dispatcher view of active reports
 *    7. getNearbyEmergencies       — Dispatcher view by location radius
 *
 *  Conventions kept:
 *    - Arabic error messages, emoji-marked console logs
 *    - { success, message, [data] } response shape
 *    - Try/catch in every async function
 * ═══════════════════════════════════════════════════════════════════════════
 */

const fs = require('fs');
const path = require('path');

const {
  EmergencyReport, Person, Children, AuditLog
} = require('../models');

// ============================================================================
// MOCK AI SERVICE — Replace with real Flask call when model is ready
// ============================================================================

/**
 * Mock emergency AI assessment.
 *
 * Real implementation will be:
 *   const response = await axios.post(EMERGENCY_AI_URL + '/assess', {
 *     text, imagePath, audioPath, locationContext
 *   });
 *   return response.data;
 *
 * Mock returns plausible responses based on simple keyword matching in the
 * text input so the frontend behaves realistically during development.
 *
 * @param {Object} input
 * @param {string} input.text       — patient's text description
 * @param {string} input.imagePath  — local path to uploaded image (or null)
 * @param {string} input.audioPath  — local path to uploaded voice (or null)
 * @param {string} input.inputType  — text | image | voice | combined
 * @returns {Promise<{
 *   aiRiskLevel: 'low'|'moderate'|'high'|'critical',
 *   aiAssessment: string,
 *   aiFirstAid: string[],
 *   confidenceScore: number,
 *   modelVersion: string,
 *   recommendAmbulance: boolean
 * }>}
 */
async function callEmergencyAI(input) {
  console.log('🤖 [MOCK] Emergency AI called with inputType:', input.inputType);

  // Simulate processing latency (real model would take 1-3 seconds)
  await new Promise(resolve => setTimeout(resolve, 800));

  const text = (input.text || '').toLowerCase();

  // Critical keywords (Arabic + English) — recommend ambulance immediately
  const criticalKeywords = [
    'unconscious', 'not breathing', 'no pulse', 'chest pain', 'heart attack',
    'stroke', 'severe bleeding', 'choking',
    'فاقد الوعي', 'لا يتنفس', 'نوبة قلبية', 'سكتة', 'نزيف شديد', 'اختناق'
  ];
  // High-severity keywords
  const highKeywords = [
    'broken bone', 'deep cut', 'burn', 'allergic reaction', 'fall',
    'كسر', 'جرح عميق', 'حروق', 'حساسية شديدة', 'سقوط'
  ];
  // Moderate keywords
  const moderateKeywords = [
    'fever', 'headache', 'vomiting', 'pain', 'dizzy',
    'حمى', 'صداع', 'تقيؤ', 'ألم', 'دوخة'
  ];

  const matchesAny = (keywords) => keywords.some(k => text.includes(k));

  let aiRiskLevel, aiAssessment, aiFirstAid, recommendAmbulance, confidence;

  if (matchesAny(criticalKeywords)) {
    aiRiskLevel = 'critical';
    aiAssessment = 'الحالة حرجة وتتطلب تدخلاً فورياً. اتصل بالإسعاف الآن.';
    aiFirstAid = [
      'اتصل بالإسعاف فوراً (133 في سوريا)',
      'لا تحرك المريض إذا كان هناك احتمال لإصابة في الرأس أو العمود الفقري',
      'تأكد من فتح المجرى التنفسي إذا كان فاقد الوعي',
      'إذا كان لا يتنفس، ابدأ الإنعاش القلبي الرئوي إن أمكن',
      'ابقَ مع المريض حتى وصول المسعفين'
    ];
    recommendAmbulance = true;
    confidence = 0.92;
  } else if (matchesAny(highKeywords)) {
    aiRiskLevel = 'high';
    aiAssessment = 'الحالة خطرة وتحتاج إلى رعاية طبية عاجلة. يُفضل الاتصال بالإسعاف.';
    aiFirstAid = [
      'لا تحرك المنطقة المصابة إذا كان هناك كسر مشتبه به',
      'اضغط بقوة على مكان النزيف بقماشة نظيفة لإيقاف الدم',
      'في حال الحروق، اغسل المنطقة بالماء البارد لمدة 20 دقيقة',
      'تجنب إعطاء أي طعام أو شراب',
      'توجه فوراً لأقرب طوارئ أو اتصل بالإسعاف'
    ];
    recommendAmbulance = true;
    confidence = 0.85;
  } else if (matchesAny(moderateKeywords)) {
    aiRiskLevel = 'moderate';
    aiAssessment = 'الحالة متوسطة الخطورة. يُنصح بمراجعة الطبيب قريباً.';
    aiFirstAid = [
      'اشرب الكثير من الماء',
      'استرخِ في مكان هادئ',
      'إذا استمرت الأعراض أكثر من 24 ساعة، راجع الطبيب',
      'في حال تفاقم الحالة، اتصل بالإسعاف'
    ];
    recommendAmbulance = false;
    confidence = 0.78;
  } else {
    aiRiskLevel = 'low';
    aiAssessment = 'الحالة لا تبدو خطيرة بناءً على الوصف. راقب الأعراض.';
    aiFirstAid = [
      'استرح في مكان مريح',
      'اشرب الماء بانتظام',
      'راقب أي تغير في الأعراض',
      'إذا تفاقمت الحالة، تواصل مع طبيبك أو راجع أقرب عيادة'
    ];
    recommendAmbulance = false;
    confidence = 0.7;
  }

  // If image was provided, slightly bump confidence (simulating multimodal AI)
  if (input.imagePath) confidence = Math.min(0.98, confidence + 0.05);

  return {
    aiRiskLevel,
    aiAssessment,
    aiFirstAid,
    confidenceScore: confidence,
    modelVersion: 'mock-v0.1',
    recommendAmbulance
  };
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Resolve patient ref from logged-in account.
 */
function getPatientRefFromAccount(account) {
  if (account.personId) return { reporterPersonId: account.personId };
  if (account.childId) return { reporterChildId: account.childId };
  return null;
}

/**
 * Validate GeoJSON location is Syria-bounded.
 * Syria roughly: lng 35.5–42.5, lat 32.0–37.5
 */
function validateSyriaLocation(location) {
  if (!location || location.type !== 'Point' || !Array.isArray(location.coordinates)) {
    return 'الموقع الجغرافي غير صالح (يجب أن يكون GeoJSON Point)';
  }
  const [lng, lat] = location.coordinates;
  if (typeof lng !== 'number' || typeof lat !== 'number') {
    return 'إحداثيات الموقع غير صالحة';
  }
  if (lng < 35.5 || lng > 42.5 || lat < 32.0 || lat > 37.5) {
    return 'الموقع خارج حدود سوريا';
  }
  return null;
}

// ============================================================================
// 1. SUBMIT EMERGENCY REPORT
// ============================================================================

/**
 * @route   POST /api/emergency
 * @desc    Patient submits an emergency report. AI assesses, returns risk
 *          + first aid. Ambulance is NOT auto-called — patient confirms.
 * @access  Private (patient)
 *
 * Multipart body (any combination):
 *   text                         — text description
 *   image                        — image file (uploaded via multer)
 *   audio                        — voice recording file
 *   location                     — JSON string: { type:'Point', coordinates:[lng,lat] }
 *   locationAddress?             — human-readable address
 *   governorate?                 — for routing/dispatch
 */
exports.submitEmergencyReport = async (req, res) => {
  console.log('🚨 ========== SUBMIT EMERGENCY ==========');

  // Track uploaded paths for cleanup on error
  const imagePath = req.files?.image?.[0]?.path;
  const audioPath = req.files?.audio?.[0]?.path;

  try {
    const patientRef = getPatientRefFromAccount(req.account);
    if (!patientRef) {
      return res.status(403).json({
        success: false,
        message: 'الحساب غير مرتبط بمريض'
      });
    }

    const { text, locationAddress, governorate } = req.body;

    // ── 1. PARSE & VALIDATE LOCATION ──────────────────────────────────────
    let location;
    try {
      location = typeof req.body.location === 'string'
        ? JSON.parse(req.body.location)
        : req.body.location;
    } catch (e) {
      return res.status(400).json({
        success: false,
        message: 'الموقع الجغرافي بصيغة غير صالحة'
      });
    }

    if (!location) {
      return res.status(400).json({
        success: false,
        message: 'الموقع الجغرافي مطلوب لإرسال البلاغ'
      });
    }

    const locationError = validateSyriaLocation(location);
    if (locationError) {
      return res.status(400).json({
        success: false,
        message: locationError
      });
    }

    // ── 2. DETERMINE INPUT TYPE ───────────────────────────────────────────
    const hasText = text && text.trim().length > 0;
    const hasImage = !!imagePath;
    const hasAudio = !!audioPath;
    const inputCount = [hasText, hasImage, hasAudio].filter(Boolean).length;

    if (inputCount === 0) {
      return res.status(400).json({
        success: false,
        message: 'يجب تقديم وصف نصي أو صورة أو تسجيل صوتي'
      });
    }

    let inputType;
    if (inputCount > 1) inputType = 'combined';
    else if (hasImage) inputType = 'image';
    else if (hasAudio) inputType = 'voice';
    else inputType = 'text';

    console.log('📝 Input type:', inputType);

    // ── 3. CALL AI SERVICE (currently mocked) ─────────────────────────────
    const aiResult = await callEmergencyAI({
      text: text?.trim(),
      imagePath,
      audioPath,
      inputType
    });

    console.log('🎯 AI risk level:', aiResult.aiRiskLevel);

    // ── 4. CREATE EMERGENCY REPORT ────────────────────────────────────────
    const report = await EmergencyReport.create({
      ...patientRef,
      reportedAt: new Date(),
      inputType,
      textDescription: text?.trim(),
      imageUrl: imagePath ? `/uploads/emergency/${path.basename(imagePath)}` : undefined,
      audioUrl: audioPath ? `/uploads/emergency/${path.basename(audioPath)}` : undefined,
      location,
      locationAddress: locationAddress?.trim(),
      governorate,
      aiRiskLevel: aiResult.aiRiskLevel,
      aiAssessment: aiResult.aiAssessment,
      aiFirstAid: aiResult.aiFirstAid,
      aiConfidenceScore: aiResult.confidenceScore,
      aiModelVersion: aiResult.modelVersion,
      recommendAmbulance: aiResult.recommendAmbulance,
      ambulanceStatus: 'not_requested',
      status: 'active'
    });

    console.log('✅ Emergency report created:', report._id);

    // ── 5. AUDIT ──────────────────────────────────────────────────────────
    AuditLog.record({
      userId: req.user._id,
      userEmail: req.user.email,
      action: 'EMERGENCY_REPORT_SUBMITTED',
      description: `Emergency report (${aiResult.aiRiskLevel})`,
      resourceType: 'emergency_report',
      resourceId: report._id,
      patientPersonId: report.reporterPersonId,
      patientChildId: report.reporterChildId,
      ipAddress: req.ip || 'unknown',
      success: true,
      metadata: {
        inputType,
        aiRiskLevel: aiResult.aiRiskLevel,
        recommendAmbulance: aiResult.recommendAmbulance
      }
    });

    return res.status(201).json({
      success: true,
      message: 'تم إرسال البلاغ بنجاح',
      report: {
        _id: report._id,
        aiRiskLevel: report.aiRiskLevel,
        aiAssessment: report.aiAssessment,
        aiFirstAid: report.aiFirstAid,
        aiConfidenceScore: report.aiConfidenceScore,
        recommendAmbulance: report.recommendAmbulance,
        status: report.status
      }
    });

  } catch (error) {
    console.error('❌ Submit emergency error:', error);

    // Cleanup uploaded files on error
    [imagePath, audioPath].forEach(p => {
      if (p && fs.existsSync(p)) {
        try { fs.unlinkSync(p); } catch (e) { /* swallow */ }
      }
    });

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: messages[0] || 'خطأ في البيانات'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في إرسال البلاغ'
    });
  }
};

// ============================================================================
// 2. GET MY EMERGENCY REPORTS (patient's history)
// ============================================================================

/**
 * @route   GET /api/emergency/mine
 * @desc    Patient's own emergency report history
 * @access  Private (patient)
 */
exports.getMyEmergencyReports = async (req, res) => {
  try {
    const patientRef = getPatientRefFromAccount(req.account);
    if (!patientRef) {
      return res.status(403).json({
        success: false,
        message: 'الحساب غير مرتبط بمريض'
      });
    }

    const { page = 1, limit = 20 } = req.query;
    const safePage = Math.max(parseInt(page, 10) || 1, 1);
    const safeLimit = Math.min(parseInt(limit, 10) || 20, 100);

    const [reports, total] = await Promise.all([
      EmergencyReport.find(patientRef)
        .sort({ reportedAt: -1 })
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit)
        .lean(),
      EmergencyReport.countDocuments(patientRef)
    ]);

    return res.json({
      success: true,
      count: total,
      page: safePage,
      pages: Math.ceil(total / safeLimit),
      reports
    });
  } catch (error) {
    console.error('Get my emergencies error:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في جلب البلاغات'
    });
  }
};

// ============================================================================
// 3. GET EMERGENCY REPORT BY ID
// ============================================================================

/**
 * @route   GET /api/emergency/:id
 * @desc    Single report detail
 * @access  Private (reporter, dispatcher/admin)
 */
exports.getEmergencyReportById = async (req, res) => {
  try {
    const { id } = req.params;

    const report = await EmergencyReport.findById(id)
      .populate('reporterPersonId', 'firstName lastName nationalId phoneNumber')
      .populate('reporterChildId', 'firstName lastName childRegistrationNumber phoneNumber')
      .lean();

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'البلاغ غير موجود'
      });
    }

    return res.json({
      success: true,
      report
    });
  } catch (error) {
    console.error('Get emergency error:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في جلب البلاغ'
    });
  }
};

// ============================================================================
// 4. CALL AMBULANCE
// ============================================================================

/**
 * @route   POST /api/emergency/:id/call-ambulance
 * @desc    Trigger ambulance dispatch for an emergency report. In production,
 *          this would integrate with the Syrian emergency services (133) via
 *          their dispatch API. For now, we just update the report status to
 *          'requested' and a dispatcher will pick it up manually.
 * @access  Private (reporter, dispatcher, admin)
 *
 * Body: { contactPhoneNumber?: string, additionalNotes?: string }
 */
exports.callAmbulance = async (req, res) => {
  console.log('🚑 ========== CALL AMBULANCE ==========');

  try {
    const { id } = req.params;
    const { contactPhoneNumber, additionalNotes } = req.body;

    const report = await EmergencyReport.findById(id);
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'البلاغ غير موجود'
      });
    }

    // Permission: reporter, dispatcher, or admin
    const isAdmin = req.user.roles?.includes('admin');
    const isOwner =
      (report.reporterPersonId
        && String(report.reporterPersonId) === String(req.user.personId))
      || (report.reporterChildId
        && String(report.reporterChildId) === String(req.user.childId));

    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        success: false,
        message: 'ليس لديك صلاحية لطلب الإسعاف لهذا البلاغ'
      });
    }

    if (report.ambulanceStatus !== 'not_requested') {
      return res.status(400).json({
        success: false,
        message: 'تم طلب الإسعاف لهذا البلاغ مسبقاً'
      });
    }

    // Use the model's callAmbulance method
    await report.callAmbulance({
      contactPhoneNumber: contactPhoneNumber?.trim(),
      additionalNotes: additionalNotes?.trim()
    });

    console.log('✅ Ambulance requested for report', report._id);

    AuditLog.record({
      userId: req.user._id,
      userEmail: req.user.email,
      action: 'AMBULANCE_REQUESTED',
      description: `Ambulance dispatch requested for emergency ${report._id}`,
      resourceType: 'emergency_report',
      resourceId: report._id,
      patientPersonId: report.reporterPersonId,
      patientChildId: report.reporterChildId,
      ipAddress: req.ip || 'unknown',
      success: true,
      metadata: {
        aiRiskLevel: report.aiRiskLevel,
        contactPhoneNumber
      }
    });

    return res.json({
      success: true,
      message: 'تم طلب الإسعاف. سيتم التواصل معك قريباً',
      report: {
        _id: report._id,
        ambulanceStatus: report.ambulanceStatus,
        ambulanceRequestedAt: report.ambulanceRequestedAt
      }
    });
  } catch (error) {
    console.error('❌ Call ambulance error:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في طلب الإسعاف'
    });
  }
};

// ============================================================================
// 5. RESOLVE EMERGENCY REPORT
// ============================================================================

/**
 * @route   POST /api/emergency/:id/resolve
 * @desc    Mark report as resolved (patient is OK, false alarm, ambulance arrived, etc.)
 * @access  Private (reporter, dispatcher, admin)
 *
 * Body: { resolution: string, resolutionNotes?: string }
 */
exports.resolveEmergencyReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolution, resolutionNotes } = req.body;

    if (!resolution) {
      return res.status(400).json({
        success: false,
        message: 'سبب الإغلاق مطلوب'
      });
    }

    const report = await EmergencyReport.findById(id);
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'البلاغ غير موجود'
      });
    }

    if (report.status === 'resolved') {
      return res.status(400).json({
        success: false,
        message: 'البلاغ مغلق بالفعل'
      });
    }

    await report.resolve({
      resolution: resolution.trim(),
      resolutionNotes: resolutionNotes?.trim(),
      resolvedBy: req.user._id
    });

    AuditLog.record({
      userId: req.user._id,
      userEmail: req.user.email,
      action: 'EMERGENCY_RESOLVED',
      description: `Resolved emergency ${report._id}`,
      resourceType: 'emergency_report',
      resourceId: report._id,
      patientPersonId: report.reporterPersonId,
      patientChildId: report.reporterChildId,
      ipAddress: req.ip || 'unknown',
      success: true,
      metadata: { resolution }
    });

    return res.json({
      success: true,
      message: 'تم إغلاق البلاغ',
      report
    });
  } catch (error) {
    console.error('Resolve emergency error:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في إغلاق البلاغ'
    });
  }
};

// ============================================================================
// 6. GET ACTIVE EMERGENCIES (dispatcher)
// ============================================================================

/**
 * @route   GET /api/emergency/active
 * @desc    All currently active emergency reports, sorted by severity then
 *          time. Used by dispatchers/admins for prioritization.
 * @access  Private (admin)
 *
 * Query: governorate?, riskLevel?, ambulanceStatus?
 */
exports.getActiveEmergencies = async (req, res) => {
  try {
    const { governorate, riskLevel, ambulanceStatus } = req.query;

    const query = { status: 'active' };
    if (governorate) query.governorate = governorate;
    if (riskLevel) query.aiRiskLevel = riskLevel;
    if (ambulanceStatus) query.ambulanceStatus = ambulanceStatus;

    const reports = await EmergencyReport.find(query)
      .populate('reporterPersonId', 'firstName lastName phoneNumber')
      .populate('reporterChildId', 'firstName lastName phoneNumber')
      .lean();

    // Sort by risk level (critical first) then by reportedAt (oldest first)
    const riskPriority = { critical: 1, high: 2, moderate: 3, low: 4 };
    reports.sort((a, b) => {
      const ap = riskPriority[a.aiRiskLevel] || 99;
      const bp = riskPriority[b.aiRiskLevel] || 99;
      if (ap !== bp) return ap - bp;
      return new Date(a.reportedAt) - new Date(b.reportedAt);
    });

    return res.json({
      success: true,
      count: reports.length,
      reports
    });
  } catch (error) {
    console.error('Get active emergencies error:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في جلب البلاغات النشطة'
    });
  }
};

// ============================================================================
// 7. GET NEARBY EMERGENCIES (geo query)
// ============================================================================

/**
 * @route   GET /api/emergency/nearby?lng=...&lat=...&radiusKm=...
 * @desc    Active emergencies within a geographic radius. Used by ambulance
 *          dispatchers to find calls near the closest available ambulance.
 * @access  Private (admin)
 */
exports.getNearbyEmergencies = async (req, res) => {
  try {
    const { lng, lat, radiusKm = 10 } = req.query;

    if (lng === undefined || lat === undefined) {
      return res.status(400).json({
        success: false,
        message: 'lng و lat مطلوبان'
      });
    }

    const longitude = parseFloat(lng);
    const latitude = parseFloat(lat);
    const radiusMeters = parseFloat(radiusKm) * 1000;

    const reports = await EmergencyReport.findActiveNearby(
      [longitude, latitude],
      radiusMeters
    );

    return res.json({
      success: true,
      count: reports.length,
      reports
    });
  } catch (error) {
    console.error('Get nearby emergencies error:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في البحث الجغرافي'
    });
  }
};