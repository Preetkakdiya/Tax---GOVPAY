const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, default: '' },
  designation: { type: String, default: 'System Administrator' },
  role: { type: String, enum: ['admin', 'company', 'employee'], required: true },
  isFirstLogin: { type: Boolean, default: true }
}, { timestamps: true });
module.exports = mongoose.model('User', userSchema);
