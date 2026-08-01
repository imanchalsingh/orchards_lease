import { Router } from 'express';
import * as analytics from '../controllers/analytics.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { restrictTo } from '../middleware/role.middleware.js';
import { ROLES } from '../utils/constants.js';

const router = Router();
router.use(requireAuth);
router.use(restrictTo(ROLES.SELLER, ROLES.ADMIN));

router.get('/seller/revenue', analytics.getSellerRevenueAnalytics);

export default router;
