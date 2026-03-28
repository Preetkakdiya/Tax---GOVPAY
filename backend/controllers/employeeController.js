const User = require('../models/User');
const Employee = require('../models/Employee');
const SalaryRecord = require('../models/SalaryRecord');
const Complaint = require('../models/Complaint');
const PDFDocument = require('pdfkit');
const Announcement = require('../models/Announcement');

const getMySalary = async (req, res) => {
  try {
    const employee = await Employee.findOne({ user_id: req.user.id });
    if (!employee) return res.status(404).json({ message: 'Employee not found' });
    
    const records = await SalaryRecord.find({ employee_id: employee._id }).populate('company_id').sort({ createdAt: -1 });
    res.json(records);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const fileComplaint = async (req, res) => {
  try {
    const { message } = req.body;
    const employee = await Employee.findOne({ user_id: req.user.id });
    if (!employee) return res.status(404).json({ message: 'Employee not found' });
    
    const complaint = await Complaint.create({
      employee_id: employee._id,
      message,
      status: 'open'
    });
    
    res.status(201).json(complaint);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const getMyComplaints = async (req, res) => {
  try {
    const employee = await Employee.findOne({ user_id: req.user.id });
    if (!employee) return res.status(404).json({ message: 'Employee not found' });
    
    const complaints = await Complaint.find({ employee_id: employee._id }).sort({ createdAt: -1 });
    res.json(complaints);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const updateProfile = async (req, res) => {
  try {
    const { name, pan, phone, designation, bank_account, ifsc_code, address } = req.body;
    if (name) await User.findByIdAndUpdate(req.user.id, { name });
    const employee = await Employee.findOne({ user_id: req.user.id });
    if (name) employee.name = name;
    if (pan) employee.pan = pan;
    if (phone !== undefined) employee.phone = phone;
    if (designation !== undefined) employee.designation = designation;
    if (bank_account !== undefined) employee.bank_account = bank_account;
    if (ifsc_code !== undefined) employee.ifsc_code = ifsc_code;
    if (address !== undefined) employee.address = address;
    await employee.save();
    res.json({ message: 'Profile updated' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const getProfile = async (req, res) => {
  try {
    const employee = await Employee.findOne({ user_id: req.user.id });
    res.json({ name: employee.name, email: employee.email, pan: employee.pan, phone: employee.phone, designation: employee.designation, bank_account: employee.bank_account, ifsc_code: employee.ifsc_code, address: employee.address });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const generateSalaryPDF = async (req, res) => {
  try {
    const employee = await Employee.findOne({ user_id: req.user.id });
    if (!employee) return res.status(404).json({ message: 'Employee not found' });
    
    const record = await SalaryRecord.findOne({ _id: req.params.id, employee_id: employee._id }).populate('company_id');
    if (!record) return res.status(404).json({ message: 'Salary record not found' });
    
    if (record.status !== 'approved') return res.status(400).json({ message: 'Can only generate PDF for approved salaries' });
    
    const doc = new PDFDocument({ margin: 50 });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=GovPay_Salary_${record.month}_${record.year}.pdf`);
    
    doc.pipe(res);
    
    doc.fontSize(22).font('Helvetica-Bold').text('GOVPAY+ OFFICIAL SALARY SLIP', { align: 'center' });
    doc.moveDown(2);
    
    doc.fontSize(14).font('Helvetica').text(`Company: ${record.company_id?.name || 'GovPay+ Registered Entity'}`);
    doc.fontSize(12).text(`Employee Name: ${employee.name}`);
    doc.text(`Gov Tax ID (PAN): ${employee.pan}`);
    doc.text(`Billing Period: ${record.month} ${record.year}`);
    doc.moveDown(1.5);
    
    const pfDeduction = Math.round((record.monthly_salary || 0) * 0.02);
    const finalNet = record.net_salary - pfDeduction;
    
    doc.font('Helvetica-Bold').text('FINANCIAL BREAKDOWN:');
    doc.font('Helvetica').text('---------------------------------------------------------');
    doc.text(`Annual CTC: INR ${record.ctc || 0}`);
    doc.text(`Monthly Base Salary: INR ${record.monthly_salary || 0}`);
    doc.text(`Income Tax Deducted (TDS): INR ${record.monthly_tds || 0}`);
    doc.text(`Provident Fund (PF): INR ${pfDeduction}`);
    doc.text('---------------------------------------------------------');
    doc.moveDown();
    
    doc.fontSize(16).font('Helvetica-Bold').fillColor('green').text(`NET TAKE-HOME PAY: INR ${finalNet}`);
    
    doc.moveDown(4);
    doc.fontSize(10).fillColor('gray').text('This is an auto-generated salary slip validated by the GovPay+ Network.', { align: 'center' });
    
    doc.end();
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const getEmployeeAnnouncements = async (req, res) => {
  try {
    const announcements = await Announcement.find({ target_audience: { $in: ['all', 'employee'] } }).sort({ createdAt: -1 });
    res.json(announcements);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

module.exports = { getMySalary, fileComplaint, getMyComplaints, updateProfile, getProfile, generateSalaryPDF, getEmployeeAnnouncements };
