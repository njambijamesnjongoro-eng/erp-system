const router = require('express').Router();
const controller = require('../../controllers/procurement/approvalController');
const { authenticate, authorize } = require('../../middleware/auth');

router.use(authenticate);

router.get('/', authorize('procurement_approvals', 'read'), controller.getMyApprovals);
router.get('/pending', authorize('procurement_approvals', 'read'), controller.getPending);
router.get('/history/:requestId', authorize('procurement_approvals', 'read'), controller.getHistory);
router.post('/:id/approve', authorize('procurement_approvals', 'approve'), controller.approve);
router.post('/:id/reject', authorize('procurement_approvals', 'approve'), controller.reject);

module.exports = router;
