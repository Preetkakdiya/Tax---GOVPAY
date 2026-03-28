const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { addEmployee, getEmployees, submitSalary, getSalaryHistory, removeEmployee, editPendingSalary, updateProfile, getProfile, addEmployeesBulk, editEmployeeDetails, autoGenerateSalaries, getCompanyStats, getCompanyAnnouncements } = require('../controllers/companyController');

router.post('/employees/bulk', protect, authorize('company'), addEmployeesBulk);
router.post('/employees', protect, authorize('company'), addEmployee);
router.get('/employees', protect, authorize('company'), getEmployees);
router.put('/employees/:id', protect, authorize('company'), editEmployeeDetails);
router.delete('/employees/:id', protect, authorize('company'), removeEmployee);
router.post('/submit-salary', protect, authorize('company'), submitSalary);
router.post('/auto-generate', protect, authorize('company'), autoGenerateSalaries);
router.get('/stats', protect, authorize('company'), getCompanyStats);
router.get('/salary-history', protect, authorize('company'), getSalaryHistory);
router.put('/salary/:id', protect, authorize('company'), editPendingSalary);
router.get('/profile', protect, authorize('company'), getProfile);
router.put('/profile', protect, authorize('company'), updateProfile);

router.get('/announcements', protect, authorize('company'), getCompanyAnnouncements);

module.exports = router;
