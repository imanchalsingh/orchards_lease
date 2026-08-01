import { Router } from 'express';
import * as refund from '../controllers/refund.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { restrictTo } from '../middleware/role.middleware.js';
import { ROLES } from '../utils/constants.js';

const router = Router();
router.use(requireAuth);

router.post('/request', refund.requestRefund);
router.get('/history', refund.listUserRefunds);
router.get('/:id', refund.getRefundStatus);

// Admin workflow
router.use(restrictTo(ROLES.ADMIN));
router.get('/admin/all', refund.listAdminRefunds);
router.patch('/:id/process', refund.processRefundAdmin);

export default router;
