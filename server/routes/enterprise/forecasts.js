const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../middleware/auth');
const ctrl = require('../../controllers/enterprise/forecastsController');

router.get('/stats', authenticate, authorize('forecast_records', 'read'), ctrl.getStats);
router.get('/', authenticate, authorize('forecast_records', 'read'), ctrl.getAll);
router.get('/:id', authenticate, authorize('forecast_records', 'read'), ctrl.getById);
router.post('/', authenticate, authorize('forecast_records', 'create'), ctrl.create);
router.post('/:id/record-actual', authenticate, authorize('forecast_records', 'update'), ctrl.recordActual);

module.exports = router;
