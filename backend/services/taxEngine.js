const TaxSlab = require('../models/TaxSlab');
const Rebate = require('../models/Rebate');
const DeductionRule = require('../models/DeductionRule');

const calculateTax = async (employee) => {
  const { gross_salary, tax_regime } = employee;
  const annual_income = gross_salary * 12;
  
  let taxable_income = annual_income;

  // Apply Deductions
  const deductions = await DeductionRule.find({ applies_to: { $in: [tax_regime, 'both'] } });
  let total_deduction = 0;
  for (let rule of deductions) {
    total_deduction += rule.rate;
  }
  
  taxable_income -= total_deduction;
  if (taxable_income < 0) taxable_income = 0;

  // Apply Slabs
  const slabs = await TaxSlab.find({ regime: tax_regime }).sort('min_income');
  let total_tax = 0;

  for (let slab of slabs) {
    if (taxable_income > slab.min_income) {
      let taxable_amount_in_slab = slab.max_income 
        ? Math.min(taxable_income - slab.min_income, slab.max_income - slab.min_income)
        : (taxable_income - slab.min_income);
        
      total_tax += (taxable_amount_in_slab * slab.tax_rate) / 100;
    }
  }

  // Apply Rebate
  const rebates = await Rebate.find({ regime: tax_regime });
  for (let rebate of rebates) {
    if (taxable_income <= rebate.max_income) {
      total_tax -= rebate.rebate_amount;
    }
  }

  if (total_tax < 0) total_tax = 0;

  // Cess (4%)
  const cess = total_tax * 0.04;
  total_tax += cess;

  const monthly_tax = total_tax / 12;

  return {
    annual_income,
    taxable_income,
    total_tax,
    cess,
    monthly_tax,
    net_salary_monthly: gross_salary - monthly_tax
  };
};

module.exports = { calculateTax };
