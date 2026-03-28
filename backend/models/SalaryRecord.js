const mongoose = require('mongoose');
const salaryRecordSchema = new mongoose.Schema({
  employee_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  month: { type: String, required: true },
  year: { type: Number, required: true },
  ctc: { type: Number, required: true },
  monthly_salary: { type: Number, required: true },
  annual_tax: { type: Number, default: 0 },
  monthly_tds: { type: Number, default: 0 },
  net_salary: { type: Number, default: 0 },
  status: { type: String, enum: ['pending', 'approved', 'paid'], default: 'pending' }
}, { timestamps: true });
module.exports = mongoose.model('SalaryRecord', salaryRecordSchema);
