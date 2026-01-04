const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
  personId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Person',
    required: [true, 'معرف الشخص مطلوب'],
    unique: true
  }
}, {
  timestamps: true,
  collection: 'admins'
});

// Indexes
adminSchema.index({ personId: 1 }, { unique: true });

module.exports = mongoose.model('Admin', adminSchema, 'admins');
