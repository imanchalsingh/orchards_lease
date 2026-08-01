import { Router } from 'express';
import * as announcement from '../controllers/announcement.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { restrictTo } from '../middleware/role.middleware.js';
import { ROLES } from '../utils/constants.js';

const router = Router();
router.use(requireAuth);

router.get('/', announcement.listAnnouncements);

// Admin-only endpoints
router.use(restrictTo(ROLES.ADMIN));
router.get('/admin/all', announcement.listAdminAnnouncements);
router.post('/', announcement.createAnnouncement);
router.patch('/:id/pin', announcement.togglePinAnnouncement);
router.patch('/:id/archive', announcement.archiveAnnouncement);

export default router;
