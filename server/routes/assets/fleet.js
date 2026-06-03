const router = require('express').Router();
const controller = require('../../controllers/assets/fleetController');
const { authenticate, authorize } = require('../../middleware/auth');

router.get('/', authenticate, authorize('fleet_vehicles', 'read'), controller.listVehicles);
router.get('/fuel', authenticate, authorize('fuel_logs', 'read'), controller.getFuelLogs);
router.get('/trips', authenticate, authorize('trip_logs', 'read'), controller.getTrips);
router.get('/analytics/fuel', authenticate, authorize('fleet_vehicles', 'read'), controller.getFuelAnalytics);
router.get('/analytics/mileage', authenticate, authorize('fleet_vehicles', 'read'), controller.getMileageAnalytics);
router.get('/:id', authenticate, authorize('fleet_vehicles', 'read'), controller.getVehicleById);
router.post('/', authenticate, authorize('fleet_vehicles', 'create'), controller.createVehicle);
router.put('/:id', authenticate, authorize('fleet_vehicles', 'update'), controller.updateVehicle);
router.post('/:id/fuel', authenticate, authorize('fuel_logs', 'create'), controller.addFuelLog);
router.post('/:id/trips', authenticate, authorize('trip_logs', 'create'), controller.addTrip);

module.exports = router;
