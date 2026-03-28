const calculateTax = (grossSalary, config) => {
  if (!config || !config.slabs || config.slabs.length === 0) return 0;
  
  // Sort descending by limit to find the highest threshold the salary breaches
  const sortedSlabs = [...config.slabs].sort((a, b) => b.limit - a.limit);
  
  let applicableRate = 0;
  for (const slab of sortedSlabs) {
    if (grossSalary > slab.limit) {
      applicableRate = slab.rate;
      break;
    }
  }
  
  const baseTax = grossSalary * (applicableRate / 100);
  const surcharge = baseTax * (config.additional_surcharge_rate / 100);
  const cess = (baseTax + surcharge) * (config.additional_cess_rate / 100);
  
  return Math.round(baseTax + surcharge + cess);
};

const processSalary = (ctc, config) => {
  const basic_salary = ctc * 0.40;
  const hra = ctc * 0.20;
  const allowances = ctc * 0.40;
  
  const monthly_salary = Math.round(ctc / 12);
  const annual_tax = calculateTax(ctc, config);
  const monthly_tds = Math.round(annual_tax / 12);
  const net_salary = monthly_salary - monthly_tds;
  
  return { basic_salary, hra, allowances, monthly_salary, annual_tax, monthly_tds, net_salary };
};

module.exports = { calculateTax, processSalary };
