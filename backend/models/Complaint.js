const mongoose = require('mongoose');
const complaintSchema = new mongoose.Schema({
  employee_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  message: { type: String, required: true },
  status: { type: String, enum: ['open', 'resolved'], default: 'open' },
  response_message: { type: String },
  fine_amount: { type: Number, default: 0 }
}, { timestamps: true });
module.exports = mongoose.model('Complaint', complaintSchema);
