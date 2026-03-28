const User = require('../models/User');
const Company = require('../models/Company');
const Employee = require('../models/Employee');
const SalaryRecord = require('../models/SalaryRecord');
const Complaint = require('../models/Complaint');
const TaxConfig = require('../models/TaxConfig');
const AuditLog = require('../models/AuditLog');
const Announcement = require('../models/Announcement');
const bcrypt = require('bcryptjs');
const { calculateTax, processSalary } = require('../utils/taxEngine');

const getDashboardStats = async (req, res) => {
  try {
    const companies = await Company.countDocuments();
    const employees = await Employee.countDocuments();

    const approvedSalaries = await SalaryRecord.find({ status: 'approved' });
    const totalTax = approvedSalaries.reduce((acc, curr) => acc + (curr.monthly_tds || 0), 0);

    const pendingSalaries = await SalaryRecord.countDocuments({ status: 'pending' });
    const complaints = await Complaint.countDocuments({ status: 'open' });

    res.json({ companies, employees, totalTax, pendingSalaries, complaints });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const getAllSalaries = async (req, res) => {
  try {
    const records = await SalaryRecord.find().populate('employee_id').populate('company_id').sort({ createdAt: -1 });
    res.json(records);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const approveSalary = async (req, res) => {
  try {
    const record = await SalaryRecord.findById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Salary not found' });
    if (record.status !== 'pending') return res.status(400).json({ message: 'Salary is not pending' });

    let config = await TaxConfig.findOne();
    if (!config) config = await TaxConfig.create({});

    const salaryData = processSalary(record.ctc, config);

    record.monthly_salary = salaryData.monthly_salary;
    record.annual_tax = salaryData.annual_tax;
    record.monthly_tds = salaryData.monthly_tds;
    record.net_salary = salaryData.net_salary;
    record.status = 'approved';
    await record.save();

    await AuditLog.create({ action: 'APPROVED_SALARY', user_id: req.user.id, target_id: record._id, details: `Approved salary payload evaluating to Net: ₹${record.net_salary}` });
    
    if (global.io) global.io.emit('salary_updated');

    res.json(record);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const rejectSalary = async (req, res) => {
  try {
    const record = await SalaryRecord.findById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Salary not found' });
    if (record.status !== 'pending') return res.status(400).json({ message: 'Salary is not pending' });

    record.status = 'rejected';
    record.annual_tax = 0;
    record.monthly_tds = 0;
    record.net_salary = 0;
    await record.save();

    await AuditLog.create({ action: 'REJECTED_SALARY', user_id: req.user.id, target_id: record._id, details: `Rejected pending salary payout` });

    if (global.io) global.io.emit('salary_updated');

    res.json(record);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const getComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find().populate('employee_id').sort({ createdAt: -1 });
    res.json(complaints);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const resolveComplaint = async (req, res) => {
  try {
    const { response_message, fine_amount } = req.body;
    const complaint = await Complaint.findByIdAndUpdate(req.params.id, {
      status: 'resolved', response_message, fine_amount
    }, { new: true });
    
    await AuditLog.create({ action: 'RESOLVED_GRIEVANCE', user_id: req.user.id, target_id: complaint._id, details: `Levied fine of ₹${fine_amount} and closed grievance ticket` });
    
    res.json(complaint);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const editAdminSalary = async (req, res) => {
  try {
    const { net_salary, monthly_tds, ctc } = req.body;
    const record = await SalaryRecord.findById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Salary not found' });

    if (ctc !== undefined) {
      record.ctc = Number(ctc);
      let config = await TaxConfig.findOne();
      if (!config) config = await TaxConfig.create({});

      const salaryData = processSalary(record.ctc, config);

      record.monthly_salary = salaryData.monthly_salary;
      record.annual_tax = salaryData.annual_tax;
      record.monthly_tds = salaryData.monthly_tds;
      record.net_salary = salaryData.net_salary;
    }

    if (net_salary !== undefined) record.net_salary = net_salary;
    if (monthly_tds !== undefined) record.monthly_tds = monthly_tds;

    await record.save();
    res.json(record);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const getTaxConfig = async (req, res) => {
  try {
    let config = await TaxConfig.findOne();
    if (!config) config = await TaxConfig.create({});

    if (!config.slabs || config.slabs.length === 0) {
      config.slabs = [
        { limit: 0, rate: config.tier1_rate || 0 },
        { limit: config.tier1_limit || 500000, rate: config.tier2_rate || 10 },
        { limit: config.tier2_limit || 1000000, rate: config.tier3_rate || 20 }
      ];
      await config.save();
    }

    res.json(config);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const updateTaxConfig = async (req, res) => {
  try {
    let config = await TaxConfig.findOne();
    if (!config) config = await TaxConfig.create({});

    const { slabs, additional_cess_rate, additional_surcharge_rate } = req.body;

    if (slabs) config.slabs = slabs;
    config.additional_cess_rate = Number(additional_cess_rate);
    config.additional_surcharge_rate = Number(additional_surcharge_rate);

    await config.save();
    res.json(config);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const getMonthlyReports = async (req, res) => {
  try {
    const salaries = await SalaryRecord.find({ status: 'approved' }).populate('company_id').populate('employee_id');

    let totalTaxCollected = 0;
    const companyWiseReports = {};
    const employeeSummaries = [];
    const trendsMap = {};

    salaries.forEach(sal => {
      totalTaxCollected += sal.monthly_tds || 0;

      const cName = sal.company_id?.name || 'Archived Company';
      if (!companyWiseReports[cName]) companyWiseReports[cName] = { totalGrossPaid: 0, totalTaxRemitted: 0, totalNetPaid: 0 };

      companyWiseReports[cName].totalGrossPaid += (sal.monthly_salary || 0);
      companyWiseReports[cName].totalTaxRemitted += sal.monthly_tds || 0;
      companyWiseReports[cName].totalNetPaid += sal.net_salary || 0;

      const timeKey = `${sal.month} ${sal.year}`;
      if (!trendsMap[timeKey]) trendsMap[timeKey] = { period: timeKey, taxCollected: 0, salaryDisbursed: 0 };
      trendsMap[timeKey].taxCollected += sal.monthly_tds || 0;
      trendsMap[timeKey].salaryDisbursed += (sal.monthly_salary || 0);

      employeeSummaries.push({
        name: sal.employee_id?.name || 'Unknown',
        period: timeKey,
        gross: sal.monthly_salary,
        tax: sal.monthly_tds,
        net: sal.net_salary
      });
    });

    const monthlyTrends = Object.values(trendsMap);

    res.json({
      period: 'All Time',
      totalTaxCollected,
      companyWiseReports,
      employeeSummaries,
      monthlyTrends
    });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const getAdminProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const updateAdminProfile = async (req, res) => {
  try {
    const { name, phone, designation } = req.body;
    const user = await User.findByIdAndUpdate(req.user.id, { name, phone, designation }, { new: true }).select('-password');
    res.json(user);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const verifyAdminPassword = async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ message: 'Password required for access verification.' });
    
    const user = await User.findById(req.user.id);
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Authentication failed. Invalid password.' });
    
    res.json({ success: true, message: 'Access granted' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const getAuditLogs = async (req, res) => {
  try {
    const logs = await AuditLog.find().populate('user_id', 'name role email').sort({ createdAt: -1 }).limit(100);
    res.json(logs);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const createAnnouncement = async (req, res) => {
  try {
    const { title, message, target_audience } = req.body;
    const announcement = await Announcement.create({ title, message, target_audience, author_id: req.user.id });
    
    if (global.io) {
      global.io.emit('new_announcement', announcement);
    }
    
    res.status(201).json(announcement);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const getAdminAnnouncements = async (req, res) => {
  try {
    const announcements = await Announcement.find().sort({ createdAt: -1 });
    res.json(announcements);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const deleteAnnouncement = async (req, res) => {
  try {
    await Announcement.findByIdAndDelete(req.params.id);
    res.json({ message: 'Announcement deleted successfully' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

module.exports = { getDashboardStats, getAllSalaries, approveSalary, rejectSalary, getComplaints, resolveComplaint, editAdminSalary, getTaxConfig, updateTaxConfig, getMonthlyReports, getAdminProfile, updateAdminProfile, verifyAdminPassword, getAuditLogs, createAnnouncement, getAdminAnnouncements, deleteAnnouncement };
