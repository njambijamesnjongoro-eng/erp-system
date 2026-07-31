const router = require('express').Router();
const controller = require('../../controllers/procurement/reportController');
const { authenticate, authorize } = require('../../middleware/auth');

router.get('/:type/pdf', authenticate, authorize('procurement_reports', 'read'), controller.download);

module.exports = router;
