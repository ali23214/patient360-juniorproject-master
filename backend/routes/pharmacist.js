/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  Pharmacist Routes — Patient 360°
 *  ─────────────────────────────────────────────────────────────────────────
 *  Mounted at /api/pharmacist
 *
 *  All routes require pharmacist role (or admin).
 * ═══════════════════════════════════════════════════════════════════════════
 */

const express = require('express');
const router = express.Router();

const pharmacistController = require('../controllers/pharmacistController');
const { protect, authorize } = require('../middleware/auth');

// All routes require pharmacist or admin
const pharmacistOnly = [protect, authorize('pharmacist', 'admin')];

// ── Profile & dashboard ─────────────────────────────────────────────────────
router.get('/me', pharmacistOnly, pharmacistController.getMyProfile);
router.get('/dashboard-stats', pharmacistOnly, pharmacistController.getMyDashboardStats);

// ── Inventory ───────────────────────────────────────────────────────────────
router.get('/inventory', pharmacistOnly, pharmacistController.getMyPharmacyInventory);
router.get('/alerts/low-stock', pharmacistOnly, pharmacistController.getLowStockAlerts);
router.get('/alerts/expiry', pharmacistOnly, pharmacistController.getExpiryAlerts);

// ── Dispensing history ──────────────────────────────────────────────────────
router.get('/dispensing-history', pharmacistOnly, pharmacistController.getMyDispensingHistory);

// ── Medication catalog search (for OTC) ─────────────────────────────────────
router.get('/medications/search', pharmacistOnly, pharmacistController.searchMedications);

module.exports = router;