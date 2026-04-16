/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  Notification Controller — Patient 360°
 *  ─────────────────────────────────────────────────────────────────────────
 *  In-app notifications + FCM push token management.
 *  Mounted at /api/notifications.
 *
 *  Architecture:
 *    - Notifications are persisted in the `notifications` collection
 *    - Each notification has channels: push, in_app, sms
 *    - "in_app" delivery happens by the client polling/WebSocket-ing this API
 *    - "push" delivery requires firebase-admin SDK + FCM tokens stored on
 *      the Account document. The FCM dispatch step is stubbed here — wire
 *      up firebase-admin in a separate step when ready.
 *    - "sms" delivery requires a Twilio/local SMS gateway integration —
 *      also stubbed here.
 *
 *  Dispatcher pattern:
 *    A separate service function `dispatchCriticalLabResults()` is exposed
 *    that any cron job, controller, or webhook can call. It scans for
 *    completed-but-unviewed critical lab tests and creates notifications
 *    for the doctors who ordered them. This decouples "what triggered the
 *    notification" from "creating the notification record."
 *
 *  Functions:
 *    1. getMyNotifications         — List notifications for current user
 *    2. getUnreadCount             — Quick badge count
 *    3. markAsRead                 — Single notification → read
 *    4. markAllAsRead              — All for current user → read
 *    5. registerPushToken          — Add FCM token to account
 *    6. removePushToken            — Remove FCM token
 *    7. dispatchCriticalLabResults — Service function (also exposed as endpoint for testing)
 *
 *  Conventions kept:
 *    - Arabic error messages, emoji-marked console logs
 *    - { success, message, [data] } response shape
 *    - Try/catch in every async function
 * ═══════════════════════════════════════════════════════════════════════════
 */

const {
  Notification, Account, LabTest, Doctor, AuditLog
} = require('../models');

// ============================================================================
// HELPER: Build the "recipient" query for the current user
// ============================================================================

/**
 * Notifications can target patients OR clinical staff. The recipient is
 * identified by either accountId or by personId/childId.
 */
function buildRecipientQuery(account) {
  // Prefer accountId targeting
  return {
    $or: [
      { recipientAccountId: account._id },
      { recipientPersonId: account.personId },
      { recipientChildId: account.childId }
    ].filter(clause => Object.values(clause)[0] !== undefined)
  };
}

// ============================================================================
// 1. GET MY NOTIFICATIONS
// ============================================================================

/**
 * @route   GET /api/notifications
 * @desc    List notifications for current user, paginated
 * @access  Private (any authenticated user)
 *
 * Query: page, limit, unreadOnly (true/false), type
 */
exports.getMyNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly, type } = req.query;
    const safePage = Math.max(parseInt(page, 10) || 1, 1);
    const safeLimit = Math.min(parseInt(limit, 10) || 20, 100);

    const recipientQuery = buildRecipientQuery(req.account);
    const query = { ...recipientQuery };
    if (unreadOnly === 'true') query.status = { $ne: 'read' };
    if (type) query.notificationType = type;

    const [notifications, total] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit)
        .lean(),
      Notification.countDocuments(query)
    ]);

    return res.json({
      success: true,
      count: total,
      page: safePage,
      pages: Math.ceil(total / safeLimit),
      notifications
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في جلب الإشعارات'
    });
  }
};

// ============================================================================
// 2. GET UNREAD COUNT (badge)
// ============================================================================

/**
 * @route   GET /api/notifications/unread-count
 * @desc    Quick count for showing a notification badge
 * @access  Private
 */
exports.getUnreadCount = async (req, res) => {
  try {
    const recipientQuery = buildRecipientQuery(req.account);
    const count = await Notification.countDocuments({
      ...recipientQuery,
      status: { $ne: 'read' }
    });

    return res.json({
      success: true,
      unreadCount: count
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ'
    });
  }
};

// ============================================================================
// 3. MARK AS READ (single)
// ============================================================================

/**
 * @route   POST /api/notifications/:id/read
 * @desc    Mark a single notification as read
 * @access  Private (recipient only)
 */
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'الإشعار غير موجود'
      });
    }

    // Permission check — recipient only
    const isRecipient =
      (notification.recipientAccountId
        && String(notification.recipientAccountId) === String(req.account._id))
      || (notification.recipientPersonId
        && String(notification.recipientPersonId) === String(req.account.personId))
      || (notification.recipientChildId
        && String(notification.recipientChildId) === String(req.account.childId));

    if (!isRecipient) {
      return res.status(403).json({
        success: false,
        message: 'ليس لديك صلاحية لقراءة هذا الإشعار'
      });
    }

    await notification.markRead();

    return res.json({
      success: true,
      message: 'تم تحديد الإشعار كمقروء'
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ'
    });
  }
};

// ============================================================================
// 4. MARK ALL AS READ
// ============================================================================

/**
 * @route   POST /api/notifications/read-all
 * @desc    Mark all unread notifications for current user as read
 * @access  Private
 */
exports.markAllAsRead = async (req, res) => {
  try {
    const recipientQuery = buildRecipientQuery(req.account);

    const result = await Notification.updateMany(
      { ...recipientQuery, status: { $ne: 'read' } },
      {
        $set: {
          status: 'read',
          readAt: new Date()
        }
      }
    );

    return res.json({
      success: true,
      message: `تم تحديد ${result.modifiedCount} إشعار كمقروء`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Mark all read error:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ'
    });
  }
};

// ============================================================================
// 5. REGISTER FCM PUSH TOKEN
// ============================================================================

/**
 * @route   POST /api/notifications/push-token
 * @desc    Mobile app calls this on login to register its FCM device token
 * @access  Private
 *
 * Body: { token: string, platform?: 'ios' | 'android' | 'web' }
 */
exports.registerPushToken = async (req, res) => {
  try {
    const { token, platform } = req.body;

    if (!token || token.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'token مطلوب'
      });
    }

    const account = await Account.findById(req.account._id);
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'الحساب غير موجود'
      });
    }

    await account.addPushToken(token.trim(), platform);

    console.log('✅ Push token registered for account', account._id);

    return res.json({
      success: true,
      message: 'تم تسجيل رمز الإشعارات'
    });
  } catch (error) {
    console.error('Register push token error:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في تسجيل رمز الإشعارات'
    });
  }
};

// ============================================================================
// 6. REMOVE FCM PUSH TOKEN
// ============================================================================

/**
 * @route   DELETE /api/notifications/push-token
 * @desc    Mobile app calls this on logout or when FCM rotates the token
 * @access  Private
 *
 * Body: { token: string }
 */
exports.removePushToken = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'token مطلوب'
      });
    }

    const account = await Account.findById(req.account._id);
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'الحساب غير موجود'
      });
    }

    // Filter token out of pushNotificationTokens array
    const before = account.pushNotificationTokens?.length || 0;
    account.pushNotificationTokens = (account.pushNotificationTokens || [])
      .filter(t => t.token !== token);
    await account.save();
    const after = account.pushNotificationTokens.length;

    return res.json({
      success: true,
      message: 'تم حذف رمز الإشعارات',
      removed: before - after
    });
  } catch (error) {
    console.error('Remove push token error:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ'
    });
  }
};

// ============================================================================
// 7. DISPATCHER: critical lab results
// ============================================================================

/**
 * Service function: scan for completed-but-unviewed critical lab tests and
 * create notifications for the doctors who ordered them.
 *
 * Idempotent: uses notification.relatedId to avoid duplicate notifications
 * for the same test.
 *
 * Can be called by:
 *   - A cron job (e.g., every 5 minutes)
 *   - Right after labTestController.completeLabTest fires
 *   - Manually via POST /api/notifications/dispatch/critical-labs (for testing)
 *
 * @returns {Promise<{ created: number, skipped: number }>}
 */
async function dispatchCriticalLabResults() {
  console.log('🔄 Dispatching critical lab result notifications...');

  // Find completed critical tests not yet viewed by doctor
  const tests = await LabTest.find({
    status: 'completed',
    isCritical: true,
    isViewedByDoctor: false
  })
    .populate('orderedBy', 'personId')
    .lean();

  let created = 0;
  let skipped = 0;

  for (const test of tests) {
    if (!test.orderedBy?.personId) {
      skipped += 1;
      continue;
    }

    // Idempotency check: have we already notified for this test?
    const existing = await Notification.findOne({
      notificationType: 'lab_results_critical',
      relatedType: 'lab_test',
      relatedId: test._id
    });
    if (existing) {
      skipped += 1;
      continue;
    }

    // Find the ordering doctor's account
    const doctorAccount = await Account.findOne({
      personId: test.orderedBy.personId
    }).lean();

    if (!doctorAccount) {
      skipped += 1;
      continue;
    }

    await Notification.create({
      recipientAccountId: doctorAccount._id,
      recipientPersonId: doctorAccount.personId,
      recipientType: 'doctor',
      notificationType: 'lab_results_critical',
      title: 'نتيجة فحص حرجة',
      titleArabic: 'نتيجة فحص حرجة',
      body: `يوجد نتيجة فحص حرجة للمراجعة — رقم الفحص ${test.testNumber}`,
      channels: ['push', 'in_app'],
      status: 'pending',
      relatedType: 'lab_test',
      relatedId: test._id,
      priority: 'urgent'
    });

    created += 1;
  }

  console.log(`✅ Dispatch done: ${created} created, ${skipped} skipped`);
  return { created, skipped };
}

// Expose the service function as a controller for manual triggering
exports.dispatchCriticalLabResults = async (req, res) => {
  try {
    const result = await dispatchCriticalLabResults();
    return res.json({
      success: true,
      message: `تم إرسال ${result.created} إشعار`,
      ...result
    });
  } catch (error) {
    console.error('Dispatch error:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في إرسال الإشعارات'
    });
  }
};

// Also export the raw service function so other controllers can call it
exports._dispatchCriticalLabResults = dispatchCriticalLabResults;