const mongoose = require('mongoose');
require('dotenv').config();

const TaxSlab = require('./models/TaxSlab');
const Rebate = require('./models/Rebate');
const DeductionRule = require('./models/DeductionRule');

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to DB for Seeding'))
  .catch(err => {
    console.error('Connection error', err);
    process.exit(1);
  });

const seedData = async () => {
  try {
    await TaxSlab.deleteMany();
    await Rebate.deleteMany();
    await DeductionRule.deleteMany();

    // New Regime Slabs (simplified for demo)
    await TaxSlab.create([
      { regime: 'new', financial_year: '2024-25', min_income: 0, max_income: 300000, tax_rate: 0 },
      { regime: 'new', financial_year: '2024-25', min_income: 300001, max_income: 600000, tax_rate: 5 },
      { regime: 'new', financial_year: '2024-25', min_income: 600001, max_income: 900000, tax_rate: 10 },
      { regime: 'new', financial_year: '2024-25', min_income: 900001, max_income: 1200000, tax_rate: 15 },
      { regime: 'new', financial_year: '2024-25', min_income: 1200001, max_income: 1500000, tax_rate: 20 },
      { regime: 'new', financial_year: '2024-25', min_income: 1500001, max_income: null, tax_rate: 30 },
    ]);

    // Rebate 87A
    await Rebate.create([
      { section: '87A', regime: 'new', max_income: 700000, rebate_amount: 25000 },
      { section: '87A', regime: 'old', max_income: 500000, rebate_amount: 12500 },
    ]);

    // Standard Deduction
    await DeductionRule.create([
      { rule_name: 'Standard Deduction', type: 'standard', rate: 50000, applies_to: 'both' }
    ]);

    console.log('Seed data inserted successfully');
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
};

seedData();
