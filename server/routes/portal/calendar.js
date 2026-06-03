const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../middleware/auth');
const calendarController = require('../../controllers/portal/calendarController');

router.get('/', authenticate, authorize('calendar', 'read'), calendarController.getAll);
router.get('/upcoming', authenticate, authorize('calendar', 'read'), calendarController.getUpcoming);
router.get('/stats', authenticate, authorize('calendar', 'read'), calendarController.getStats);
router.get('/:id', authenticate, authorize('calendar', 'read'), calendarController.getById);
router.post('/', authenticate, authorize('calendar', 'create'), calendarController.create);
router.put('/:id', authenticate, authorize('calendar', 'update'), calendarController.update);
router.delete('/:id', authenticate, authorize('calendar', 'delete'), calendarController.delete);
router.post('/:id/participants', authenticate, authorize('calendar', 'create'), calendarController.addParticipant);
router.put('/:id/participants/:participantId', authenticate, authorize('calendar', 'update'), calendarController.updateParticipantResponse);
router.delete('/:id/participants/:participantId', authenticate, authorize('calendar', 'delete'), calendarController.removeParticipant);

module.exports = router;
