import Refund from '../models/Refund.js';
import Booking from '../models/Booking.js';
import Payment from '../models/Payment.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import { ok, created } from '../utils/ApiResponse.js';
import { notify } from '../services/notification.service.js';
import { NOTIFICATION_TYPE } from '../utils/constants.js';

export const requestRefund = asyncHandler(async (req, res) => {
  const { bookingId, reason } = req.body;

  const booking = await Booking.findById(bookingId);
  if (!booking) throw ApiError.notFound('Booking not found');

  if (String(booking.renterId) !== String(req.user._id)) {
    throw ApiError.forbidden('Only the booking renter can request a refund');
  }

  const existingRefund = await Refund.findOne({ bookingId, status: { $ne: 'REJECTED' } });
  if (existingRefund) {
    throw ApiError.badRequest('A refund request for this booking is already active');
  }

  const payment = await Payment.findOne({ bookingId, status: 'SUCCESS' });

  const refund = await Refund.create({
    bookingId: booking._id,
    paymentId: payment ? payment._id : null,
    requesterId: req.user._id,
    amount: booking.totalAmount,
    reason,
    status: 'REQUESTED',
  });

  // Notify Admin
  await notify({
    user: booking.sellerId,
    type: NOTIFICATION_TYPE.BOOKING,
    title: 'Refund Request Submitted',
    message: `A refund of ₹${refund.amount} was requested for booking ${booking._id}`,
    link: `/refunds/${refund._id}`,
    email: true,
  });

  return created(res, refund, 'Refund request submitted successfully');
});

export const getRefundStatus = asyncHandler(async (req, res) => {
  const refund = await Refund.findById(req.params.id)
    .populate('bookingId', 'gardenName startDate endDate totalAmount')
    .populate('requesterId', 'name email');

  if (!refund) throw ApiError.notFound('Refund request not found');

  if (
    String(refund.requesterId._id) !== String(req.user._id) &&
    req.user.role !== 'admin'
  ) {
    throw ApiError.forbidden('Unauthorized access to this refund record');
  }

  return ok(res, refund, 'Refund details retrieved');
});

export const listUserRefunds = asyncHandler(async (req, res) => {
  const refunds = await Refund.find({ requesterId: req.user._id })
    .populate('bookingId', 'gardenName totalAmount')
    .sort({ createdAt: -1 });

  return ok(res, refunds, 'User refund history retrieved');
});

export const listAdminRefunds = asyncHandler(async (req, res) => {
  const refunds = await Refund.find()
    .populate('bookingId', 'gardenName totalAmount')
    .populate('requesterId', 'name email')
    .sort({ createdAt: -1 });

  return ok(res, refunds, 'All refund requests retrieved');
});

export const processRefundAdmin = asyncHandler(async (req, res) => {
  const { status, adminNotes } = req.body;
  const refund = await Refund.findById(req.params.id);

  if (!refund) throw ApiError.notFound('Refund record not found');

  refund.status = status;
  if (adminNotes) refund.adminNotes = adminNotes;
  if (status === 'APPROVED' || status === 'PROCESSED') {
    refund.processedAt = new Date();
  }

  await refund.save();

  // Notify Requester
  await notify({
    user: refund.requesterId,
    type: NOTIFICATION_TYPE.BOOKING,
    title: `Refund Request ${status}`,
    message: `Your refund request of ₹${refund.amount} has been updated to: ${status}`,
    link: `/refunds/${refund._id}`,
    email: true,
    sms: true,
  });

  return ok(res, refund, `Refund request status updated to ${status}`);
});
