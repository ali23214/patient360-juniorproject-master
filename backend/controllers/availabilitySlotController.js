/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  Availability Slot Controller — Patient 360°
 *  ─────────────────────────────────────────────────────────────────────────
 *  Time slot management for doctors, dentists, labs. Mounted at /api/slots.
 *
 *  Workflow:
 *    1. Doctor sets their weekly schedule (Doctor.availableDays)
 *    2. Doctor calls POST /api/slots/generate to create slots for next N days
 *       based on their availableDays + a daily time range
 *    3. Patient calls GET /api/slots/available?doctorId=...&date=... to see
 *       open slots
 *    4. Patient books → atomicReserve happens via the appointment controller
 *    5. Doctor can manually create individual slots, block slots (vacation),
 *       or unblock them
 *
 *  Functions:
 *    1. createSlot              — Create a single slot manually
 *    2. generateSlots           — Bulk-generate slots for next N days
 *    3. getAvailableSlots       — Patient-facing: available slots for a provider
 *    4. getMySlots              — Provider's own slot list
 *    5. blockSlot               — Doctor blocks a slot (vacation, sick day)
 *    6. unblockSlot             — Reverse blockSlot
 *    7. deleteSlot              — Delete a slot (only if no bookings)
 *
 *  Why bulk generation matters:
 *    A doctor seeing 8 patients/day Sunday-Thursday for a month would need
 *    8 × 5 × 4 = 160 slots. Manual creation is unrealistic — bulk gen with
 *    sensible defaults gets them up and running in one call.
 *
 *  Conventions kept:
 *    - Arabic error messages, emoji-marked console logs
 *    - Try/catch in every async function
 * ═══════════════════════════════════════════════════════════════════════════
 */

const {
  AvailabilitySlot, Doctor, Dentist, Laboratory, Hospital, AuditLog
} = require('../models');

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Resolve the slot owner from the request body. Exactly one of doctorId,
 * dentistId, laboratoryId, hospitalId must be set.
 */
function resolveOwner(body) {
  const owners = {};
  if (body.doctorId) owners.doctorId = body.doctorId;
  if (body.dentistId) owners.dentistId = body.dentistId;
  if (body.laboratoryId) owners.laboratoryId = body.laboratoryId;
  if (body.hospitalId) owners.hospitalId = body.hospitalId;

  const ownerKeys = Object.keys(owners);
  if (ownerKeys.length === 0) {
    throw new Error('يجب تحديد doctorId أو dentistId أو laboratoryId أو hospitalId');
  }
  if (ownerKeys.length > 1) {
    throw new Error('يمكن تحديد مالك واحد فقط للموعد');
  }
  return owners;
}

/**
 * Generate HH:MM time strings between start and end at the given step.
 * generateTimeRange('09:00', '17:00', 30) → ['09:00', '09:30', ..., '16:30']
 */
function generateTimeRange(startTime, endTime, stepMinutes) {
  const result = [];
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;

  for (let m = startMin; m + stepMinutes <= endMin; m += stepMinutes) {
    const hh = Math.floor(m / 60).toString().padStart(2, '0');
    const mm = (m % 60).toString().padStart(2, '0');
    result.push(`${hh}:${mm}`);
  }
  return result;
}

/**
 * Add minutes to an HH:MM string.
 * addMinutes('09:30', 30) → '10:00'
 */
function addMinutes(hhmm, minutes) {
  const [h, m] = hhmm.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const hh = Math.floor(total / 60).toString().padStart(2, '0');
  const mm = (total % 60).toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

// ============================================================================
// 1. CREATE SLOT (single)
// ============================================================================

/**
 * @route   POST /api/slots
 * @desc    Create a single availability slot
 * @access  Private (doctor, dentist, lab_technician, admin)
 *
 * Body:
 *   doctorId | dentistId | laboratoryId | hospitalId (one required)
 *   date          — date string (YYYY-MM-DD or ISO)
 *   startTime     — HH:MM
 *   endTime       — HH:MM
 *   slotDuration? — minutes (default 30)
 *   maxBookings?  — default 1
 */
exports.createSlot = async (req, res) => {
  try {
    const owners = resolveOwner(req.body);

    const { date, startTime, endTime, slotDuration, maxBookings } = req.body;

    if (!date || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'date, startTime, endTime مطلوبة'
      });
    }

    const slot = await AvailabilitySlot.create({
      ...owners,
      date: new Date(date),
      startTime: startTime.trim(),
      endTime: endTime.trim(),
      slotDuration: slotDuration || 30,
      maxBookings: maxBookings || 1,
      currentBookings: 0,
      isAvailable: true
    });

    return res.status(201).json({
      success: true,
      message: 'تم إنشاء الموعد بنجاح',
      slot
    });
  } catch (error) {
    console.error('Create slot error:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: messages[0] || 'خطأ في البيانات'
      });
    }
    return res.status(400).json({
      success: false,
      message: error.message || 'حدث خطأ في إنشاء الموعد'
    });
  }
};

// ============================================================================
// 2. GENERATE SLOTS (bulk for next N days)
// ============================================================================

/**
 * @route   POST /api/slots/generate
 * @desc    Bulk-generate slots for the next N days based on availableDays.
 *          For each day in the range that matches availableDays, creates
 *          a series of slots from startTime to endTime at slotDuration intervals.
 *
 *          Skips days that already have slots to avoid duplicates.
 * @access  Private (doctor, dentist, lab_technician, admin)
 *
 * Body:
 *   doctorId | dentistId | laboratoryId | hospitalId (one required)
 *   startTime         — HH:MM (e.g. "09:00")
 *   endTime           — HH:MM (e.g. "17:00")
 *   slotDuration      — minutes (e.g. 30 → 30-min slots)
 *   daysAhead?        — how many days to generate ahead (default 30, max 90)
 *   availableDays?    — override array; if not provided, reads from Doctor doc
 *   maxBookings?      — default 1
 *   skipExisting?     — default true; skips days that already have slots
 */
exports.generateSlots = async (req, res) => {
  console.log('🔵 ========== GENERATE SLOTS ==========');

  try {
    const owners = resolveOwner(req.body);

    const {
      startTime, endTime, slotDuration,
      daysAhead = 30,
      availableDays: overrideDays,
      maxBookings = 1,
      skipExisting = true
    } = req.body;

    if (!startTime || !endTime || !slotDuration) {
      return res.status(400).json({
        success: false,
        message: 'startTime, endTime, slotDuration مطلوبة'
      });
    }

    const safeDaysAhead = Math.min(Math.max(parseInt(daysAhead, 10) || 30, 1), 90);

    // ── Resolve availableDays (from owner doc or override) ────────────────
    let availableDays = overrideDays;
    if (!availableDays) {
      let owner = null;
      if (owners.doctorId) owner = await Doctor.findById(owners.doctorId).lean();
      else if (owners.dentistId) owner = await Dentist.findById(owners.dentistId).lean();

      if (!owner) {
        return res.status(404).json({
          success: false,
          message: 'لم يتم العثور على المالك'
        });
      }

      availableDays = owner.availableDays || [];
    }

    if (!Array.isArray(availableDays) || availableDays.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'لم يتم تحديد أيام العمل (availableDays)'
      });
    }

    // ── Generate the time slots within a day ──────────────────────────────
    const timesOfDay = generateTimeRange(startTime, endTime, slotDuration);
    if (timesOfDay.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'مدة الموعد أكبر من نطاق الوقت'
      });
    }
    console.log(`📋 Will create ${timesOfDay.length} slots per matching day`);

    // ── Walk through each day in range ────────────────────────────────────
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const slotsToCreate = [];
    let skippedDays = 0;

    for (let dayOffset = 0; dayOffset < safeDaysAhead; dayOffset += 1) {
      const date = new Date(today);
      date.setDate(date.getDate() + dayOffset);

      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
      if (!availableDays.includes(dayName)) {
        continue;
      }

      // Skip if this day already has slots for this owner
      if (skipExisting) {
        const existingCount = await AvailabilitySlot.countDocuments({
          ...owners,
          date: {
            $gte: new Date(date.setHours(0, 0, 0, 0)),
            $lt: new Date(date.setHours(23, 59, 59, 999))
          }
        });
        if (existingCount > 0) {
          skippedDays += 1;
          continue;
        }
      }

      // Reset to start of day
      date.setHours(0, 0, 0, 0);

      for (const startHHMM of timesOfDay) {
        const endHHMM = addMinutes(startHHMM, slotDuration);
        slotsToCreate.push({
          ...owners,
          date: new Date(date),
          startTime: startHHMM,
          endTime: endHHMM,
          slotDuration,
          maxBookings,
          currentBookings: 0,
          isAvailable: true,
          status: 'available'
        });
      }
    }

    if (slotsToCreate.length === 0) {
      return res.json({
        success: true,
        message: 'لا توجد مواعيد جديدة للإنشاء (الأيام المتاحة لديها مواعيد بالفعل)',
        created: 0,
        skipped: skippedDays
      });
    }

    // ── Bulk insert ───────────────────────────────────────────────────────
    const created = await AvailabilitySlot.insertMany(slotsToCreate, {
      ordered: false // continue on individual failures
    });

    console.log(`✅ Created ${created.length} slots, skipped ${skippedDays} days`);

    AuditLog.record({
      userId: req.user._id,
      userEmail: req.user.email,
      action: 'GENERATE_SLOTS',
      description: `Generated ${created.length} availability slots`,
      ipAddress: req.ip || 'unknown',
      success: true,
      metadata: {
        ...owners,
        daysAhead: safeDaysAhead,
        slotDuration,
        created: created.length,
        skippedDays
      }
    });

    return res.status(201).json({
      success: true,
      message: `تم إنشاء ${created.length} موعد`,
      created: created.length,
      skipped: skippedDays
    });

  } catch (error) {
    console.error('❌ Generate slots error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'حدث خطأ في إنشاء المواعيد'
    });
  }
};

// ============================================================================
// 3. GET AVAILABLE SLOTS (patient-facing)
// ============================================================================

/**
 * @route   GET /api/slots/available
 * @desc    List available slots for a specific provider on a date or range.
 * @access  Public (patient browsing, no auth required for read-only)
 *
 * Query:
 *   doctorId | dentistId | laboratoryId | hospitalId (one required)
 *   date?         — specific date YYYY-MM-DD
 *   from? + to?   — date range
 */
exports.getAvailableSlots = async (req, res) => {
  try {
    const owners = {};
    if (req.query.doctorId) owners.doctorId = req.query.doctorId;
    if (req.query.dentistId) owners.dentistId = req.query.dentistId;
    if (req.query.laboratoryId) owners.laboratoryId = req.query.laboratoryId;
    if (req.query.hospitalId) owners.hospitalId = req.query.hospitalId;

    if (Object.keys(owners).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'يجب تحديد المالك (doctorId / dentistId / ...)'
      });
    }

    const { date, from, to } = req.query;

    const dateFilter = {};
    if (date) {
      const d = new Date(date);
      const startOfDay = new Date(d.setHours(0, 0, 0, 0));
      const endOfDay = new Date(d.setHours(23, 59, 59, 999));
      dateFilter.$gte = startOfDay;
      dateFilter.$lte = endOfDay;
    } else if (from || to) {
      if (from) dateFilter.$gte = new Date(from);
      if (to) dateFilter.$lte = new Date(to);
    } else {
      // Default: from today onwards
      dateFilter.$gte = new Date();
    }

    const slots = await AvailabilitySlot.find({
      ...owners,
      date: dateFilter,
      isAvailable: true,
      status: 'available',
      $expr: { $lt: ['$currentBookings', '$maxBookings'] }
    })
      .sort({ date: 1, startTime: 1 })
      .lean();

    return res.json({
      success: true,
      count: slots.length,
      slots
    });
  } catch (error) {
    console.error('Get available slots error:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في جلب المواعيد المتاحة'
    });
  }
};

// ============================================================================
// 4. GET MY SLOTS (provider view)
// ============================================================================

/**
 * @route   GET /api/slots/mine
 * @desc    Provider sees ALL their slots (available + booked + blocked)
 * @access  Private (doctor, dentist, lab_technician)
 *
 * Query: from?, to?, status?
 */
exports.getMySlots = async (req, res) => {
  try {
    let ownerQuery = null;

    if (req.user.roles.includes('doctor')) {
      const doctor = await Doctor.findOne({ personId: req.user.personId }).lean();
      if (doctor) ownerQuery = { doctorId: doctor._id };
    } else if (req.user.roles.includes('dentist')) {
      const dentist = await Dentist.findOne({ personId: req.user.personId }).lean();
      if (dentist) ownerQuery = { dentistId: dentist._id };
    }

    if (!ownerQuery) {
      return res.status(403).json({
        success: false,
        message: 'الحساب غير مرتبط بطبيب أو طبيب أسنان'
      });
    }

    const { from, to, status } = req.query;
    const dateFilter = {};
    if (from) dateFilter.$gte = new Date(from);
    if (to) dateFilter.$lte = new Date(to);

    const query = { ...ownerQuery };
    if (Object.keys(dateFilter).length > 0) query.date = dateFilter;
    if (status) query.status = status;

    const slots = await AvailabilitySlot.find(query)
      .sort({ date: 1, startTime: 1 })
      .lean();

    return res.json({
      success: true,
      count: slots.length,
      slots
    });
  } catch (error) {
    console.error('Get my slots error:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في جلب المواعيد'
    });
  }
};

// ============================================================================
// 5. BLOCK SLOT
// ============================================================================

/**
 * @route   POST /api/slots/:id/block
 * @desc    Doctor blocks a slot (e.g. vacation, sick day). Only allowed if
 *          no patient has already booked it.
 * @access  Private (doctor, dentist, admin)
 *
 * Body: { reason?: string }
 */
exports.blockSlot = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const slot = await AvailabilitySlot.findById(id);
    if (!slot) {
      return res.status(404).json({
        success: false,
        message: 'الموعد غير موجود'
      });
    }

    try {
      await slot.block(reason);
    } catch (modelError) {
      return res.status(400).json({
        success: false,
        message: modelError.message
      });
    }

    return res.json({
      success: true,
      message: 'تم حجب الموعد',
      slot
    });
  } catch (error) {
    console.error('Block slot error:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في حجب الموعد'
    });
  }
};

// ============================================================================
// 6. UNBLOCK SLOT
// ============================================================================

/**
 * @route   POST /api/slots/:id/unblock
 * @desc    Reverse a block — slot becomes available again
 * @access  Private (doctor, dentist, admin)
 */
exports.unblockSlot = async (req, res) => {
  try {
    const { id } = req.params;

    const slot = await AvailabilitySlot.findById(id);
    if (!slot) {
      return res.status(404).json({
        success: false,
        message: 'الموعد غير موجود'
      });
    }

    try {
      await slot.unblock();
    } catch (modelError) {
      return res.status(400).json({
        success: false,
        message: modelError.message
      });
    }

    return res.json({
      success: true,
      message: 'تم إلغاء حجب الموعد',
      slot
    });
  } catch (error) {
    console.error('Unblock slot error:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في إلغاء الحجب'
    });
  }
};

// ============================================================================
// 7. DELETE SLOT
// ============================================================================

/**
 * @route   DELETE /api/slots/:id
 * @desc    Delete a slot — only allowed if no current bookings
 * @access  Private (doctor, dentist, admin)
 */
exports.deleteSlot = async (req, res) => {
  try {
    const { id } = req.params;

    const slot = await AvailabilitySlot.findById(id);
    if (!slot) {
      return res.status(404).json({
        success: false,
        message: 'الموعد غير موجود'
      });
    }

    if (slot.currentBookings > 0) {
      return res.status(400).json({
        success: false,
        message: 'لا يمكن حذف موعد لديه حجوزات قائمة'
      });
    }

    await slot.deleteOne();

    return res.json({
      success: true,
      message: 'تم حذف الموعد'
    });
  } catch (error) {
    console.error('Delete slot error:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في حذف الموعد'
    });
  }
};