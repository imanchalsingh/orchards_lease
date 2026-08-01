import { Router } from 'express';
import * as booking from '../controllers/booking.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { restrictTo } from '../middleware/role.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { ROLES } from '../utils/constants.js';
import {
  createBookingSchema,
  rejectBookingSchema,
  cancelBookingSchema,
  bookingQuerySchema,
  offerSchema,
} from '../validators/booking.validator.js';
import { idParam } from '../validators/common.validator.js';

const router = Router();
router.use(requireAuth);

router.get('/', validate(bookingQuerySchema), booking.listBookings);
router.post('/', restrictTo(ROLES.RENTER), validate(createBookingSchema), booking.createBooking);
router.get('/:id', validate({ params: idParam }), booking.getBooking);

// seller actions
router.post('/:id/approve', restrictTo(ROLES.SELLER, ROLES.ADMIN), validate({ params: idParam }), booking.approveBooking);
router.post('/:id/reject', restrictTo(ROLES.SELLER, ROLES.ADMIN), validate({ params: idParam, ...rejectBookingSchema }), booking.rejectBooking);
router.post('/:id/complete', restrictTo(ROLES.SELLER, ROLES.ADMIN), validate({ params: idParam }), booking.completeBooking);

// renter action
router.post('/:id/cancel', restrictTo(ROLES.RENTER), validate({ params: idParam, ...cancelBookingSchema }), booking.cancelBooking);

// price negotiation routes (Issue #104)
router.post('/:id/negotiate', validate({ params: idParam, ...offerSchema }), booking.submitCounterOffer);
router.post('/:id/negotiate/accept', validate({ params: idParam }), booking.acceptCounterOffer);
router.post('/:id/negotiate/reject', validate({ params: idParam }), booking.rejectCounterOffer);

export default router;
