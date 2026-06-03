const router = require('express').Router();
const controller = require('../../controllers/assets/maintenanceController');
const { authenticate, authorize } = require('../../middleware/auth');

router.get('/', authenticate, authorize('maintenance', 'read'), controller.list);
router.get('/overdue', authenticate, authorize('maintenance', 'read'), controller.getOverdue);
router.get('/upcoming', authenticate, authorize('maintenance', 'read'), controller.getUpcoming);
router.get('/service-alerts', authenticate, authorize('maintenance', 'read'), controller.getServiceAlerts);
router.get('/costs', authenticate, authorize('maintenance', 'read'), controller.getCosts);
router.get('/:id', authenticate, authorize('maintenance', 'read'), controller.getById);
router.post('/', authenticate, authorize('maintenance', 'create'), controller.create);
router.put('/:id', authenticate, authorize('maintenance', 'update'), controller.update);
router.patch('/:id/status', authenticate, authorize('maintenance', 'update'), controller.updateStatus);
router.post('/:id/approve', authenticate, authorize('maintenance', 'approve'), controller.approve);

module.exports = router;
