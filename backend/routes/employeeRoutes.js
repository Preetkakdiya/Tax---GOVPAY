const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { getMySalary, fileComplaint, getMyComplaints, updateProfile, getProfile, generateSalaryPDF, getEmployeeAnnouncements } = require('../controllers/employeeController');

router.get('/my-salary', protect, authorize('employee'), getMySalary);
router.get('/salary/:id/pdf', protect, authorize('employee'), generateSalaryPDF);
router.post('/complaint', protect, authorize('employee'), fileComplaint);
router.get('/complaints', protect, authorize('employee'), getMyComplaints);
router.get('/profile', protect, authorize('employee'), getProfile);
router.put('/profile', protect, authorize('employee'), updateProfile);

router.get('/announcements', protect, authorize('employee'), getEmployeeAnnouncements);

module.exports = router;
