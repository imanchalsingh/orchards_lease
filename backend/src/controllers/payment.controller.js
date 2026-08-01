import Payment from '../models/Payment.js';
import Booking from '../models/Booking.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import { ok, created } from '../utils/ApiResponse.js';
import { notify } from '../services/notification.service.js';
import { NOTIFICATION_TYPE, BOOKING_STATUS } from '../utils/constants.js';

export const initializePayment = asyncHandler(async (req, res) => {
  const { bookingId, paymentMethod = 'UPI' } = req.body;

  const booking = await Booking.findById(bookingId).populate('orchardId', 'gardenName');
  if (!booking) throw ApiError.notFound('Booking not found');

  if (String(booking.renterId) !== String(req.user._id)) {
    throw ApiError.forbidden('Only the renter can initialize payment for this lease');
  }

  const transactionId = `TXN_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
  const receiptNumber = `RCP_${Date.now()}`;

  const payment = await Payment.create({
    bookingId: booking._id,
    payerId: req.user._id,
    recipientId: booking.sellerId,
    amount: booking.totalAmount,
    currency: 'INR',
    paymentGateway: 'MockGateway',
    paymentMethod,
    transactionId,
    receiptNumber,
    status: 'PENDING',
  });

  return created(res, {
    paymentId: payment._id,
    transactionId: payment.transactionId,
    amount: payment.amount,
    currency: payment.currency,
    receiptNumber: payment.receiptNumber,
  }, 'Payment order initialized');
});

export const verifyAndCompletePayment = asyncHandler(async (req, res) => {
  const { paymentId, status = 'SUCCESS', failureReason } = req.body;

  const payment = await Payment.findById(paymentId);
  if (!payment) throw ApiError.notFound('Payment transaction record not found');

  if (String(payment.payerId) !== String(req.user._id)) {
    throw ApiError.forbidden('Unauthorized payment confirmation request');
  }

  if (payment.status === 'SUCCESS') {
    return ok(res, payment, 'Payment already processed successfully');
  }

  if (status === 'FAILED') {
    payment.status = 'FAILED';
    payment.failureReason = failureReason || 'Transaction declined or cancelled by user';
    await payment.save();

    return ok(res, payment, 'Payment recorded as failed');
  }

  payment.status = 'SUCCESS';
  payment.paidAt = new Date();
  await payment.save();

  // Update underlying booking status
  await Booking.findByIdAndUpdate(payment.bookingId, {
    paymentStatus: 'PAID',
    $push: {
      timeline: {
        status: 'PAYMENT_RECEIVED',
        note: `Online payment completed via ${payment.paymentMethod} (Txn: ${payment.transactionId})`,
        at: new Date(),
        by: req.user._id,
      },
    },
  });

  // Trigger Notifications
  await notify({
    user: payment.recipientId,
    type: NOTIFICATION_TYPE.BOOKING,
    title: 'Payment Received',
    message: `Payment of ₹${payment.amount} received for lease booking. Receipt: ${payment.receiptNumber}`,
    link: `/seller/bookings/${payment.bookingId}`,
    email: true,
  });

  return ok(res, payment, 'Payment confirmed successfully');
});

export const getPaymentReceipt = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id)
    .populate('bookingId', 'gardenName startDate endDate')
    .populate('payerId', 'name email phone')
    .populate('recipientId', 'name email');

  if (!payment) throw ApiError.notFound('Receipt not found');

  const userId = String(req.user._id);
  if (userId !== String(payment.payerId._id) && userId !== String(payment.recipientId._id) && req.user.role !== 'admin') {
    throw ApiError.forbidden('Access denied to this payment receipt');
  }

  return ok(res, payment, 'Payment receipt retrieved');
});
export const getUserPaymentHistory = asyncHandler(async (req, res) => {
  const { search, status, startDate, endDate, page = 1, limit = 10 } = req.query;

  const query = {
    $or: [{ payerId: req.user._id }, { recipientId: req.user._id }],
  };

  if (status) {
    query.status = status.toUpperCase();
  }

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  if (search) {
    query.$or = [
      { transactionId: { $regex: search, $options: 'i' } },
      { receiptNumber: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [payments, total] = await Promise.all([
    Payment.find(query)
      .populate('bookingId', 'gardenName startDate endDate')
      .populate('payerId', 'name email')
      .populate('recipientId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Payment.countDocuments(query),
  ]);

  return ok(
    res,
    {
      payments,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
      },
    },
    'Payment history retrieved'
  );
});
