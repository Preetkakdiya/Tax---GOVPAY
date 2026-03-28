const Employee = require('../models/Employee');
const Company = require('../models/Company');
const SalaryRecord = require('../models/SalaryRecord');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const Announcement = require('../models/Announcement');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const addEmployee = async (req, res) => {
  try {
    const { name, email, password, pan, ctc, bank_account, ifsc_code } = req.body;
    const company = await Company.findOne({ owner_user_id: req.user.id });
    if (!company) return res.status(404).json({ message: 'Company not found' });
    
    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'User already exists' });
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashedPassword, role: 'employee' });
    
    const employee = await Employee.create({
      user_id: user._id, company_id: company._id, name, email, pan, ctc, bank_account, ifsc_code
    });
    
    res.status(201).json(employee);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const getEmployees = async (req, res) => {
  try {
    const company = await Company.findOne({ owner_user_id: req.user.id });
    if (!company) return res.status(404).json({ message: 'Company not found' });
    
    const employees = await Employee.find({ company_id: company._id });
    res.json(employees);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const submitSalary = async (req, res) => {
  try {
    const { employee_id, month, year, ctc } = req.body;
    const company = await Company.findOne({ owner_user_id: req.user.id });
    
    const record = await SalaryRecord.create({
      employee_id, company_id: company._id, month, year, ctc: Number(ctc), monthly_salary: Math.round(Number(ctc)/12), status: 'pending'
    });
    
    res.status(201).json(record);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const getSalaryHistory = async (req, res) => {
  try {
    const company = await Company.findOne({ owner_user_id: req.user.id });
    const records = await SalaryRecord.find({ company_id: company._id }).populate('employee_id').sort({ createdAt: -1 });
    res.json(records);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const removeEmployee = async (req, res) => {
  try {
    const company = await Company.findOne({ owner_user_id: req.user.id });
    const employee = await Employee.findOne({ _id: req.params.id, company_id: company._id });
    if (!employee) return res.status(404).json({ message: 'Employee not found' });
    
    await User.findByIdAndDelete(employee.user_id);
    await Employee.findByIdAndDelete(employee._id);
    await SalaryRecord.deleteMany({ employee_id: employee._id });
    
    res.json({ message: 'Employee removed' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const editPendingSalary = async (req, res) => {
  try {
    const company = await Company.findOne({ owner_user_id: req.user.id });
    const record = await SalaryRecord.findOne({ _id: req.params.id, company_id: company._id });
    
    if (!record) return res.status(404).json({ message: 'Salary not found' });
    if (record.status !== 'pending') return res.status(400).json({ message: 'Can only edit pending salaries' });
    
    if (req.body.ctc) {
      record.ctc = Number(req.body.ctc);
      record.monthly_salary = Math.round(record.ctc / 12);
    }
    if (req.body.month) record.month = req.body.month;
    if (req.body.year) record.year = req.body.year;
    
    await record.save();
    res.json(record);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const updateProfile = async (req, res) => {
  try {
    const { name, company_name, gstin, industry, phone, website, address } = req.body;
    
    if (name) await User.findByIdAndUpdate(req.user.id, { name });
    
    const company = await Company.findOne({ owner_user_id: req.user.id });
    if (company_name) company.name = company_name;
    if (gstin) company.gstin = gstin;
    if (industry !== undefined) company.industry = industry;
    if (phone !== undefined) company.phone = phone;
    if (website !== undefined) company.website = website;
    if (address !== undefined) company.address = address;
    await company.save();
    
    res.json({ message: 'Profile updated' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const getProfile = async (req, res) => {
  try {
    const company = await Company.findOne({ owner_user_id: req.user.id }).populate('owner_user_id');
    res.json({ name: company.owner_user_id.name, email: company.owner_user_id.email, company_name: company.name, gstin: company.gstin, industry: company.industry, phone: company.phone, website: company.website, address: company.address });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const addEmployeesBulk = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { employees } = req.body;
    const company = await Company.findOne({ owner_user_id: req.user.id });
    if (!company) throw new Error('Company not found');

    const added = [];
    for (let emp of employees) {
      const { name, email, password, pan, ctc, bank_account, ifsc_code } = emp;
      const parsedCTC = Number(ctc);
      if (!name || !email || !password || !pan || !parsedCTC) continue;
      
      const existingUser = await User.findOne({ email });
      if (existingUser) continue;
      
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = new User({ name, email, password: hashedPassword, role: 'employee' });
      await user.save({ session });
      
      const employee = new Employee({
        user_id: user._id, company_id: company._id, name, email, pan, ctc: parsedCTC, bank_account, ifsc_code
      });
      await employee.save({ session });
      added.push(employee);
    }
    
    await session.commitTransaction();
    session.endSession();
    
    await AuditLog.create({ action: 'BULK_REGISTERED_EMPLOYEES', user_id: req.user.id, details: `Company successfully registered ${added.length} employees from CSV data.` });
    
    res.json({ message: `Successfully registered ${added.length} employees from CSV.`, count: added.length });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ message: error.message });
  }
};

const editEmployeeDetails = async (req, res) => {
  try {
    const { ctc } = req.body;
    const company = await Company.findOne({ owner_user_id: req.user.id });
    if (!company) return res.status(404).json({ message: 'Company not found' });
    
    const employee = await Employee.findOne({ _id: req.params.id, company_id: company._id });
    if (!employee) return res.status(404).json({ message: 'Employee not found in your roster' });
    
    if (ctc) employee.ctc = ctc;
    await employee.save();
    
    res.json({ message: 'Employee details updated successfully', employee });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const autoGenerateSalaries = async (req, res) => {
  try {
    const { month, year } = req.body;
    if (!month || !year) return res.status(400).json({ message: 'Month and year are required.' });
    
    const company = await Company.findOne({ owner_user_id: req.user.id });
    if (!company) return res.status(404).json({ message: 'Company not found.' });
    
    const employees = await Employee.find({ company_id: company._id });
    if (!employees || employees.length === 0) return res.status(400).json({ message: 'No employees found to generate payroll for.' });
    
    let generatedCount = 0;
    
    for (const emp of employees) {
      const existing = await SalaryRecord.findOne({ employee_id: emp._id, month, year });
      if (!existing) {
        await SalaryRecord.create({
          employee_id: emp._id,
          company_id: company._id,
          month,
          year,
          ctc: emp.ctc,
          monthly_salary: Math.round(emp.ctc / 12),
          status: 'pending'
        });
        generatedCount++;
      }
    }
    
    if (generatedCount > 0) {
      await AuditLog.create({ action: 'AUTO_GENERATED_SALARIES', user_id: req.user.id, details: `System auto-generated automated salary entries for ${generatedCount} employees.` });
    }
    
    res.json({ message: `Successfully generated automated salary entries for ${generatedCount} employees.`, count: generatedCount });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const getCompanyStats = async (req, res) => {
  try {
    const company = await Company.findOne({ owner_user_id: req.user.id });
    if (!company) return res.status(404).json({ message: 'Company not found' });
    
    const totalEmployees = await Employee.countDocuments({ company_id: company._id });
    
    const totalSalaryAg = await SalaryRecord.aggregate([
      { $match: { company_id: company._id, status: 'approved' } },
      { $group: { _id: null, total: { $sum: "$monthly_salary" }, net: { $sum: "$net_salary" }, tax: { $sum: "$monthly_tds" } } }
    ]);
    
    res.json({
      totalEmployees,
      totalSalary: totalSalaryAg[0]?.total || 0,
      totalNetPaid: totalSalaryAg[0]?.net || 0,
      totalTaxRemitted: totalSalaryAg[0]?.tax || 0
    });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const getCompanyAnnouncements = async (req, res) => {
  try {
    const announcements = await Announcement.find({ target_audience: { $in: ['all', 'company'] } }).sort({ createdAt: -1 });
    res.json(announcements);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

module.exports = { addEmployee, getEmployees, submitSalary, getSalaryHistory, removeEmployee, editPendingSalary, updateProfile, getProfile, addEmployeesBulk, editEmployeeDetails, autoGenerateSalaries, getCompanyStats, getCompanyAnnouncements };
