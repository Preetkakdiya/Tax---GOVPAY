const mongoose = require('mongoose');
const companySchema = new mongoose.Schema({
  owner_user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  gstin: { type: String, required: true },
  industry: { type: String, default: '' },
  phone: { type: String, default: '' },
  website: { type: String, default: '' },
  address: { type: String, default: '' }
}, { timestamps: true });
module.exports = mongoose.model('Company', companySchema);
