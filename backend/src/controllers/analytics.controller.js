import Booking from '../models/Booking.js';
import Orchard from '../models/Orchard.js';
import Payment from '../models/Payment.js';
import asyncHandler from '../utils/asyncHandler.js';
import { ok } from '../utils/ApiResponse.js';

export const getSellerRevenueAnalytics = asyncHandler(async (req, res) => {
  const sellerId = req.user._id;

  // 1. Get seller's orchards
  const sellerOrchards = await Orchard.find({ sellerId }).select('_id gardenName');
  const orchardIds = sellerOrchards.map((o) => o._id);

  // 2. Aggregate Total Earnings & Completed Leases
  const totalStats = await Booking.aggregate([
    {
      $match: {
        sellerId,
        paymentStatus: 'PAID',
      },
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$totalAmount' },
        totalCompletedLeases: { $sum: 1 },
      },
    },
  ]);

  // 3. Monthly Revenue Trend (Last 12 Months)
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
  twelveMonthsAgo.setDate(1);

  const monthlyTrend = await Booking.aggregate([
    {
      $match: {
        sellerId,
        paymentStatus: 'PAID',
        createdAt: { $gte: twelveMonthsAgo },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
        },
        revenue: { $sum: '$totalAmount' },
        leasesCount: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  // Format monthly trend array
  const formattedMonthly = monthlyTrend.map((item) => ({
    period: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
    revenue: item.revenue,
    leasesCount: item.leasesCount,
  }));

  // 4. Yearly Revenue Trend
  const yearlyTrend = await Booking.aggregate([
    {
      $match: {
        sellerId,
        paymentStatus: 'PAID',
      },
    },
    {
      $group: {
        _id: { $year: '$createdAt' },
        revenue: { $sum: '$totalAmount' },
        leasesCount: { $sum: 1 },
      },
    },
    { $sort: { '_id': 1 } },
  ]);

  const formattedYearly = yearlyTrend.map((item) => ({
    year: String(item._id),
    revenue: item.revenue,
    leasesCount: item.leasesCount,
  }));

  // 5. Per-Orchard Revenue Breakdown
  const orchardBreakdown = await Booking.aggregate([
    {
      $match: {
        sellerId,
        paymentStatus: 'PAID',
      },
    },
    {
      $group: {
        _id: '$orchardId',
        revenue: { $sum: '$totalAmount' },
        totalLeases: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: 'orchards',
        localField: '_id',
        foreignField: '_id',
        as: 'orchard',
      },
    },
    { $unwind: '$orchard' },
    {
      $project: {
        _id: 1,
        gardenName: '$orchard.gardenName',
        revenue: 1,
        totalLeases: 1,
      },
    },
  ]);

  return ok(res, {
    summary: {
      totalRevenue: totalStats[0]?.totalRevenue || 0,
      totalCompletedLeases: totalStats[0]?.totalCompletedLeases || 0,
      totalOrchards: orchardIds.length,
    },
    monthlyTrend: formattedMonthly,
    yearlyTrend: formattedYearly,
    orchardBreakdown,
  }, 'Revenue analytics retrieved successfully');
});
