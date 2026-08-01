import Announcement from '../models/Announcement.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import { ok, created } from '../utils/ApiResponse.js';

export const createAnnouncement = asyncHandler(async (req, res) => {
  const { title, content, targetRole, isPinned, scheduledAt } = req.body;

  const announcement = await Announcement.create({
    title,
    content,
    targetRole: targetRole || 'ALL',
    isPinned: isPinned || false,
    scheduledAt: scheduledAt || new Date(),
    createdBy: req.user._id,
  });

  return created(res, announcement, 'Announcement created successfully');
});

export const listAnnouncements = asyncHandler(async (req, res) => {
  const userRole = req.user.role;
  const filter = {
    isArchived: false,
    scheduledAt: { $lte: new Date() },
    targetRole: { $in: ['ALL', userRole] },
  };

  const announcements = await Announcement.find(filter)
    .populate('createdBy', 'name avatar')
    .sort({ isPinned: -1, scheduledAt: -1 });

  return ok(res, announcements, 'Announcements retrieved');
});

export const listAdminAnnouncements = asyncHandler(async (req, res) => {
  const announcements = await Announcement.find()
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 });

  return ok(res, announcements, 'All announcements retrieved');
});

export const togglePinAnnouncement = asyncHandler(async (req, res) => {
  const announcement = await Announcement.findById(req.params.id);
  if (!announcement) throw ApiError.notFound('Announcement not found');

  announcement.isPinned = !announcement.isPinned;
  await announcement.save();

  return ok(res, announcement, `Announcement ${announcement.isPinned ? 'pinned' : 'unpinned'}`);
});

export const archiveAnnouncement = asyncHandler(async (req, res) => {
  const announcement = await Announcement.findById(req.params.id);
  if (!announcement) throw ApiError.notFound('Announcement not found');

  announcement.isArchived = true;
  await announcement.save();

  return ok(res, announcement, 'Announcement archived successfully');
});
