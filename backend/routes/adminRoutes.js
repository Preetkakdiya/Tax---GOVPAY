const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { getDashboardStats, getAllSalaries, approveSalary, rejectSalary, getComplaints, resolveComplaint, editAdminSalary, getTaxConfig, updateTaxConfig, getMonthlyReports, getAdminProfile, updateAdminProfile, verifyAdminPassword, getAuditLogs, createAnnouncement, getAdminAnnouncements, deleteAnnouncement } = require('../controllers/adminController');

router.get('/stats', protect, authorize('admin'), getDashboardStats);
router.get('/report/monthly', protect, authorize('admin'), getMonthlyReports);
router.get('/all-salaries', protect, authorize('admin'), getAllSalaries);
router.post('/approve-salary/:id', protect, authorize('admin'), approveSalary);
router.post('/reject-salary/:id', protect, authorize('admin'), rejectSalary);
router.get('/complaints', protect, authorize('admin'), getComplaints);
router.put('/resolve-complaint/:id', protect, authorize('admin'), resolveComplaint);
router.put('/edit-salary/:id', protect, authorize('admin'), editAdminSalary);
router.get('/tax-config', protect, authorize('admin'), getTaxConfig);
router.put('/tax-config', protect, authorize('admin'), updateTaxConfig);
router.get('/profile', protect, authorize('admin'), getAdminProfile);
router.put('/profile', protect, authorize('admin'), updateAdminProfile);
router.post('/verify-password', protect, authorize('admin'), verifyAdminPassword);
router.get('/audit-logs', protect, authorize('admin'), getAuditLogs);

router.post('/announcements', protect, authorize('admin'), createAnnouncement);
router.get('/announcements', protect, authorize('admin'), getAdminAnnouncements);
router.delete('/announcements/:id', protect, authorize('admin'), deleteAnnouncement);

module.exports = router;
