import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import { ok, created } from '../utils/ApiResponse.js';
import { getPagination, buildPageMeta } from '../utils/helpers.js';
import { BOOKING_STATUS, ORCHARD_STATUS, ROLES, NOTIFICATION_TYPE } from '../utils/constants.js';

import Booking from '../models/Booking.js';
import Orchard from '../models/Orchard.js';
import { notify } from '../services/notification.service.js';

/* ------------------------- Pricing helper -------------------------- */
const getSeasonalBasePrice = (orchard, startDate) => {
  const month = new Date(startDate).getMonth() + 1; // 1-12
  const season = (orchard.seasonalPricing || []).find((s) => {
    if (s.startMonth <= s.endMonth) {
      return month >= s.startMonth && month <= s.endMonth;
    }
    // handles seasons that wrap around the year, e.g. Nov-Feb
    return month >= s.startMonth || month <= s.endMonth;
  });
  return season ? season.price : orchard.price;
};

const computeTotal = (orchard, startDate, endDate) => {
  const days = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)));
  let total = getSeasonalBasePrice(orchard, startDate);

  // apply best-matching pricing rule by duration
  const rule = (orchard.pricingRules || [])
    .filter((r) => days >= (r.minDays || 0))
    .sort((a, b) => b.minDays - a.minDays)[0];
  if (rule) total *= rule.multiplier;

  return Math.round(total);
};

/* --------------------------- Create -------------------------------- */
export const createBooking = asyncHandler(async (req, res) => {
  const { orchardId, startDate, endDate, message, proposedPrice } = req.body;

  const orchard = await Orchard.findOne({ _id: orchardId, deletedAt: null });
  if (!orchard) throw ApiError.notFound('Orchard not found');
  if (orchard.status !== ORCHARD_STATUS.PUBLISHED || !orchard.available) {
    throw ApiError.badRequest('Orchard is not available for booking');
  }
  if (String(orchard.sellerId) === String(req.user._id)) {
    throw ApiError.badRequest('You cannot book your own orchard');
  }

  const reqStart = new Date(startDate);
  const reqEnd = new Date(endDate);

  // Check against orchard's blocked dates
  const isDateBlocked = (orchard.blockedDates || []).some((blocked) => {
    const bStart = new Date(blocked.startDate);
    const bEnd = new Date(blocked.endDate);
    return reqStart < bEnd && reqEnd > bStart;
  });

  if (isDateBlocked) {
    throw ApiError.badRequest('Selected dates fall within an owner-blocked period');
  }

  // overlapping active booking guard
  const overlap = await Booking.findOne({
    orchardId,
    bookingStatus: { $in: [BOOKING_STATUS.APPROVED, BOOKING_STATUS.REQUESTED] },
    startDate: { $lt: endDate },
    endDate: { $gt: startDate },
  });
  if (overlap) throw ApiError.conflict('Selected dates overlap an existing booking');

  const calculatedTotal = computeTotal(orchard, startDate, endDate);
  const initialAmount = proposedPrice && proposedPrice > 0 ? proposedPrice : calculatedTotal;

  const initialNegotiations = proposedPrice && proposedPrice !== calculatedTotal ? [{
    offeredBy: req.user._id,
    amount: proposedPrice,
    note: message || 'Initial price proposal',
    status: 'PENDING',
  }] : [];

  const booking = await Booking.create({
    orchardId,
    renterId: req.user._id,
    sellerId: orchard.sellerId,
    startDate,
    endDate,
    totalAmount: initialAmount,
    originalAmount: calculatedTotal,
    message,
    negotiations: initialNegotiations,
    timeline: [{ status: BOOKING_STATUS.REQUESTED, note: 'Booking requested', by: req.user._id }],
  });

  await notify({
    user: orchard.sellerId,
    type: NOTIFICATION_TYPE.BOOKING,
    title: 'New booking request',
    message: `${req.user.name} requested to lease "${orchard.gardenName}"`,
    link: `/seller/bookings/${booking._id}`,
    email: true,
  });

  return created(res, booking, 'Booking requested');
});

/* ------------------------- List bookings --------------------------- */
export const listBookings = asyncHandler(async (req, res) => {
  const q = req.validatedQuery || req.query;
  const { page, limit, skip } = getPagination(q);

  const asSeller = q.role === 'seller' || req.user.role === ROLES.SELLER;
  const filter = asSeller ? { sellerId: req.user._id } : { renterId: req.user._id };
  if (q.role === 'renter') {
    delete filter.sellerId;
    filter.renterId = req.user._id;
  }

  // Single status filter (existing behaviour)
  if (q.status) filter.bookingStatus = q.status;

  // Multi-status filter for lease history (e.g. "completed,cancelled,rejected")
  if (q.statuses && !q.status) {
    const statusList = q.statuses.split(',').map((s) => s.trim()).filter(Boolean);
    if (statusList.length) filter.bookingStatus = { $in: statusList };
  }

  const [items, total] = await Promise.all([
    Booking.find(filter)
      .populate('orchardId', 'gardenName slug thumbnail state district fruitTypes price rentType totalArea areaUnit totalTrees expectedYield')
      .populate('renterId', 'name avatar email phone')
      .populate('sellerId', 'name avatar email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Booking.countDocuments(filter),
  ]);

  let results = items;
  if (q.search) {
    const re = new RegExp(q.search.trim(), 'i');
    results = items.filter((b) => {
      const o = b.orchardId;
      return (
        re.test(o?.gardenName || '') ||
        re.test(o?.district   || '') ||
        re.test(o?.state      || '')
      );
    });
  }

  return ok(res, results, 'Bookings', buildPageMeta({ page, limit, total }));
});

/* --------------------------- Get one ------------------------------- */
export const getBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id)
    .populate('orchardId', 'gardenName slug thumbnail state district price')
    .populate('renterId', 'name avatar email phone')
    .populate('sellerId', 'name avatar email phone')
    .populate('negotiations.offeredBy', 'name avatar role');

  if (!booking) throw ApiError.notFound('Booking not found');

  const uid = String(req.user._id);
  if (
    req.user.role !== ROLES.ADMIN &&
    uid !== String(booking.renterId._id) &&
    uid !== String(booking.sellerId._id)
  ) {
    throw ApiError.forbidden('You cannot view this booking');
  }

  return ok(res, booking);
});

/* ------------------ Seller: approve / reject ----------------------- */
const requireSellerOf = (booking, user) => {
  if (String(booking.sellerId) !== String(user._id)) {
    throw ApiError.forbidden('Only the orchard owner can perform this action');
  }
};

export const approveBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) throw ApiError.notFound('Booking not found');
  requireSellerOf(booking, req.user);
  if (booking.bookingStatus !== BOOKING_STATUS.REQUESTED) {
    throw ApiError.badRequest('Only requested bookings can be approved');
  }

  booking.bookingStatus = BOOKING_STATUS.APPROVED;
  booking.addTimeline(BOOKING_STATUS.APPROVED, 'Booking approved by seller', req.user._id);
  await booking.save();

  // Auto-block the dates on the Orchard availability calendar
  await Orchard.findByIdAndUpdate(booking.orchardId, {
    $push: {
      blockedDates: {
        startDate: booking.startDate,
        endDate: booking.endDate,
        reason: 'System',
        note: `Lease Approved (Booking ID: ${booking._id})`,
      },
    },
  });

  await notify({
    user: booking.renterId,
    type: NOTIFICATION_TYPE.BOOKING,
    title: 'Booking approved',
    message: 'Your booking request has been approved.',
    link: `/bookings/${booking._id}`,
    email: true,
  });

  return ok(res, booking, 'Booking approved');
});

export const rejectBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) throw ApiError.notFound('Booking not found');
  requireSellerOf(booking, req.user);
  if (booking.bookingStatus !== BOOKING_STATUS.REQUESTED) {
    throw ApiError.badRequest('Only requested bookings can be rejected');
  }

  booking.bookingStatus = BOOKING_STATUS.REJECTED;
  booking.rejectionReason = req.body.reason || '';
  booking.addTimeline(BOOKING_STATUS.REJECTED, req.body.reason || 'Rejected by seller', req.user._id);
  await booking.save();

  await notify({
    user: booking.renterId,
    type: NOTIFICATION_TYPE.BOOKING,
    title: 'Booking rejected',
    message: req.body.reason || 'Your booking request was rejected.',
    link: `/bookings/${booking._id}`,
    email: true,
  });

  return ok(res, booking, 'Booking rejected');
});

/* ------------------------ Price Negotiation ------------------------ */
export const submitCounterOffer = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) throw ApiError.notFound('Booking not found');

  const uid = String(req.user._id);
  const isRenter = uid === String(booking.renterId);
  const isSeller = uid === String(booking.sellerId);

  if (!isRenter && !isSeller) {
    throw ApiError.forbidden('You are not authorized to negotiate this booking');
  }

  if (booking.bookingStatus !== BOOKING_STATUS.REQUESTED) {
    throw ApiError.badRequest('Negotiations are only allowed on pending requests');
  }

  const { amount, note } = req.body;

  // Mark previous pending negotiations as REJECTED
  (booking.negotiations || []).forEach((neg) => {
    if (neg.status === 'PENDING') neg.status = 'REJECTED';
  });

  booking.negotiations.push({
    offeredBy: req.user._id,
    amount,
    note: note || '',
    status: 'PENDING',
  });

  booking.addTimeline('COUNTER_OFFER', `New counter offer: ${amount}`, req.user._id);
  await booking.save();

  const recipientId = isRenter ? booking.sellerId : booking.renterId;
  await notify({
    user: recipientId,
    type: NOTIFICATION_TYPE.BOOKING,
    title: 'New price offer',
    message: `${req.user.name} submitted a new offer of ${amount}`,
    link: isRenter ? `/seller/bookings/${booking._id}` : `/bookings/${booking._id}`,
  });

  return ok(res, booking, 'Counter offer submitted successfully');
});

export const acceptCounterOffer = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) throw ApiError.notFound('Booking not found');

  const uid = String(req.user._id);
  const isRenter = uid === String(booking.renterId);
  const isSeller = uid === String(booking.sellerId);

  if (!isRenter && !isSeller) {
    throw ApiError.forbidden('Not authorized');
  }

  const latestNegotiation = booking.negotiations[booking.negotiations.length - 1];
  if (!latestNegotiation || latestNegotiation.status !== 'PENDING') {
    throw ApiError.badRequest('No pending offer to accept');
  }

  if (String(latestNegotiation.offeredBy) === uid) {
    throw ApiError.badRequest('You cannot accept your own offer');
  }

  latestNegotiation.status = 'ACCEPTED';
  booking.totalAmount = latestNegotiation.amount;
  booking.addTimeline('OFFER_ACCEPTED', `Accepted price: ${latestNegotiation.amount}`, req.user._id);
  await booking.save();

  await notify({
    user: latestNegotiation.offeredBy,
    type: NOTIFICATION_TYPE.BOOKING,
    title: 'Price offer accepted',
    message: `${req.user.name} accepted your offer of ${latestNegotiation.amount}`,
    link: isRenter ? `/seller/bookings/${booking._id}` : `/bookings/${booking._id}`,
  });

  return ok(res, booking, 'Counter offer accepted');
});

export const rejectCounterOffer = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) throw ApiError.notFound('Booking not found');

  const uid = String(req.user._id);
  const isRenter = uid === String(booking.renterId);
  const isSeller = uid === String(booking.sellerId);

  if (!isRenter && !isSeller) {
    throw ApiError.forbidden('Not authorized');
  }

  const latestNegotiation = booking.negotiations[booking.negotiations.length - 1];
  if (!latestNegotiation || latestNegotiation.status !== 'PENDING') {
    throw ApiError.badRequest('No pending offer to reject');
  }

  if (String(latestNegotiation.offeredBy) === uid) {
    throw ApiError.badRequest('You cannot reject your own offer');
  }

  latestNegotiation.status = 'REJECTED';
  booking.addTimeline('OFFER_REJECTED', `Rejected offer: ${latestNegotiation.amount}`, req.user._id);
  await booking.save();

  await notify({
    user: latestNegotiation.offeredBy,
    type: NOTIFICATION_TYPE.BOOKING,
    title: 'Price offer declined',
    message: `${req.user.name} declined your offer of ${latestNegotiation.amount}`,
    link: isRenter ? `/seller/bookings/${booking._id}` : `/bookings/${booking._id}`,
  });

  return ok(res, booking, 'Counter offer rejected');
});

/* ------------------------ Renter: cancel --------------------------- */
export const cancelBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) throw ApiError.notFound('Booking not found');
  if (String(booking.renterId) !== String(req.user._id)) {
    throw ApiError.forbidden('Only the renter can cancel this booking');
  }
  if ([BOOKING_STATUS.CANCELLED, BOOKING_STATUS.COMPLETED, BOOKING_STATUS.REJECTED].includes(booking.bookingStatus)) {
    throw ApiError.badRequest(`Cannot cancel a ${booking.bookingStatus} booking`);
  }

  booking.bookingStatus = BOOKING_STATUS.CANCELLED;
  booking.cancellationReason = req.body.reason || '';
  booking.addTimeline(BOOKING_STATUS.CANCELLED, req.body.reason || 'Cancelled by renter', req.user._id);
  await booking.save();

  // Remove corresponding System block on Orchard availability calendar if present
  await Orchard.findByIdAndUpdate(booking.orchardId, {
    $pull: {
      blockedDates: {
        note: `Lease Approved (Booking ID: ${booking._id})`,
      },
    },
  });

  await notify({
    user: booking.sellerId,
    type: NOTIFICATION_TYPE.BOOKING,
    title: 'Booking cancelled',
    message: 'A renter cancelled their booking.',
    link: `/seller/bookings/${booking._id}`,
  });

  return ok(res, booking, 'Booking cancelled');
});

/* ------------------------ Mark completed --------------------------- */
export const completeBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) throw ApiError.notFound('Booking not found');
  requireSellerOf(booking, req.user);
  if (booking.bookingStatus !== BOOKING_STATUS.APPROVED) {
    throw ApiError.badRequest('Only approved bookings can be completed');
  }
  booking.bookingStatus = BOOKING_STATUS.COMPLETED;
  booking.addTimeline(BOOKING_STATUS.COMPLETED, 'Lease completed', req.user._id);
  await booking.save();
  return ok(res, booking, 'Booking completed');
});
