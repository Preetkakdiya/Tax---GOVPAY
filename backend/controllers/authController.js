const User = require('../models/User');
const Company = require('../models/Company');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

const register = async (req, res) => {
  try {
    const { name, email, password, role, company_name, gstin, pan } = req.body;
    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: 'User already exists using that email' });
    
    if (role === 'employee') {
      if (!pan) return res.status(400).json({ message: 'Employee PAN is required' });
    }
    
    // Proceed building identity
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    let user;
    try {
      user = await User.create({ name, email, password: hashedPassword, role });
    } catch (e) {
      if (e.code === 11000) return res.status(400).json({ message: 'Email already registered' });
      throw e;
    }
    
    if (role === 'company') {
      if (!company_name || !gstin) {
        await User.findByIdAndDelete(user._id);
        return res.status(400).json({ message: 'Company Name and GSTIN required' });
      }
      try {
        await Company.create({ name: company_name, gstin, owner_user_id: user._id });
      } catch (e) {
        await User.findByIdAndDelete(user._id);
        if (e.code === 11000) return res.status(400).json({ message: 'GSTIN already registered to another company!' });
        throw e;
      }
    }
    
    if (role === 'employee') {
      try {
        const Employee = require('../models/Employee');
        await Employee.create({ name, email, pan, salary_details: 0, user_id: user._id });
      } catch (e) {
        await User.findByIdAndDelete(user._id);
        throw e;
      }
    }
    
    res.status(201).json({
      _id: user.id, name: user.name, email: user.email, role: user.role, isFirstLogin: user.isFirstLogin, token: generateToken(user._id, user.role)
    });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (user && (await bcrypt.compare(password, user.password))) {
      res.json({ _id: user.id, name: user.name, email: user.email, role: user.role, isFirstLogin: user.isFirstLogin, token: generateToken(user._id, user.role) });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const resetFirstPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'Identity not found' });
    
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.isFirstLogin = false;
    await user.save();
    
    res.json({ _id: user.id, name: user.name, email: user.email, role: user.role, isFirstLogin: false, token: generateToken(user._id, user.role) });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const resetPasswordWithPan = async (req, res) => {
  try {
    const { email, pan, newPassword } = req.body;
    if (!email || !pan || !newPassword) return res.status(400).json({ message: 'Email, PAN, and new password are required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'No registered user matched that email.' });
    if (user.role !== 'employee') return res.status(400).json({ message: 'Only Employees can reset via PAN verification.' });

    const Employee = require('../models/Employee');
    const employeeProfile = await Employee.findOne({ user_id: user._id, pan: new RegExp(`^${pan}$`, 'i') });
    if (!employeeProfile) return res.status(401).json({ message: 'Identity verification failed. Invalid PAN record mapping.' });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ message: 'Password recovery successful. You may now login.' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

module.exports = { register, login, resetFirstPassword, resetPasswordWithPan };
