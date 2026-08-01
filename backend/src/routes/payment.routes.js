import { Router } from 'express';
import * as payment from '../controllers/payment.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();
router.use(requireAuth);

router.post('/initialize', payment.initializePayment);
router.post('/verify', payment.verifyAndCompletePayment);
router.get('/:id/receipt', payment.getPaymentReceipt);

export default router;
