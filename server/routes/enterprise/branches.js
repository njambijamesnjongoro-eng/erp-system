const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../middleware/auth');
const ctrl = require('../../controllers/enterprise/branchesController');

router.get('/', authenticate, authorize('branches', 'read'), ctrl.getBranches);
router.get('/:id', authenticate, authorize('branches', 'read'), ctrl.getBranchById);
router.post('/', authenticate, authorize('branches', 'create'), ctrl.createBranch);
router.put('/:id', authenticate, authorize('branches', 'update'), ctrl.updateBranch);
router.patch('/:id/assign-manager', authenticate, authorize('branches', 'update'), ctrl.assignManager);
router.delete('/:id', authenticate, authorize('branches', 'delete'), ctrl.deleteBranch);

module.exports = router;
