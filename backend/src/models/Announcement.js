import mongoose from 'mongoose';
import { ROLES } from '../utils/constants.js';

const announcementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    targetRole: {
      type: String,
      enum: ['ALL', ROLES.RENTER, ROLES.SELLER, ROLES.ADMIN],
      default: 'ALL',
    },
    isPinned: { type: Boolean, default: false },
    isArchived: { type: Boolean, default: false },
    scheduledAt: { type: Date, default: Date.now },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

announcementSchema.index({ targetRole: 1, isArchived: 1, isPinned: -1, scheduledAt: -1 });

const Announcement = mongoose.model('Announcement', announcementSchema);
export default Announcement;
