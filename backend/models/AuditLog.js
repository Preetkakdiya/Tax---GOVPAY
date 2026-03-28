const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action: { type: String, required: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  target_id: { type: mongoose.Schema.Types.ObjectId },
  details: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('AuditLog', auditLogSchema);
