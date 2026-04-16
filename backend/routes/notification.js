/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  Notification Routes — Patient 360°
 *  ─────────────────────────────────────────────────────────────────────────
 *  Mounted at /api/notifications
 * ═══════════════════════════════════════════════════════════════════════════
 */

const express = require('express');
const router = express.Router();

const notificationController = require('../controllers/notificationController');
const { protect, authorize } = require('../middleware/auth');

// ── Notification list & unread count ────────────────────────────────────────
router.get('/', protect, notificationController.getMyNotifications);
router.get('/unread-count', protect, notificationController.getUnreadCount);

// ── Mark as read ────────────────────────────────────────────────────────────
router.post('/read-all', protect, notificationController.markAllAsRead);
router.post('/:id/read', protect, notificationController.markAsRead);

// ── FCM push token management ───────────────────────────────────────────────
router.post('/push-token', protect, notificationController.registerPushToken);
router.delete('/push-token', protect, notificationController.removePushToken);

// ── Manual dispatch (admin testing) ─────────────────────────────────────────
router.post('/dispatch/critical-labs',
  protect,
  authorize('admin'),
  notificationController.dispatchCriticalLabResults
);

module.exports = router;