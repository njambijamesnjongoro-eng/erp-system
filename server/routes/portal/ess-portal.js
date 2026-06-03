const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../middleware/auth');
const essPortalController = require('../../controllers/portal/essPortalController');

router.get('/profile', authenticate, authorize('employee_portal', 'read'), essPortalController.getProfile);
router.put('/profile', authenticate, authorize('employee_portal', 'update'), essPortalController.updateProfile);
router.get('/payslips', authenticate, authorize('employee_portal', 'read'), essPortalController.getPayslips);
router.get('/leave-balances', authenticate, authorize('employee_portal', 'read'), essPortalController.getLeaveBalances);
router.get('/assets', authenticate, authorize('employee_portal', 'read'), essPortalController.getAssets);
router.get('/attendance', authenticate, authorize('employee_portal', 'read'), essPortalController.getAttendance);
router.get('/trainings', authenticate, authorize('employee_portal', 'read'), essPortalController.getTrainings);
router.get('/notifications', authenticate, authorize('employee_portal', 'read'), essPortalController.getNotifications);
router.put('/notifications/:id/read', authenticate, authorize('employee_portal', 'update'), essPortalController.markNotificationRead);

module.exports = router;
