const mongoose = require('mongoose');
const employeeSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  pan: { type: String, required: true },
  ctc: { type: Number, required: true },
  phone: { type: String, default: '' },
  designation: { type: String, default: '' },
  bank_account: { type: String, default: '' },
  ifsc_code: { type: String, default: '' },
  address: { type: String, default: '' }
}, { timestamps: true });
module.exports = mongoose.model('Employee', employeeSchema);
