const mongoose = require('mongoose');

const taxConfigSchema = new mongoose.Schema({
  slabs: {
    type: [{
      limit: { type: Number, required: true },
      rate: { type: Number, required: true }
    }],
    default: [
      { limit: 0, rate: 0 },
      { limit: 500000, rate: 10 },
      { limit: 1000000, rate: 20 }
    ]
  },
  additional_cess_rate: { type: Number, default: 0 },
  additional_surcharge_rate: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('TaxConfig', taxConfigSchema);
