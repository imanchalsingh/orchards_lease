import { z } from 'zod';
import { objectId } from './common.validator.js';

export const createBookingSchema = {
  body: z
    .object({
      orchardId: objectId,
      startDate: z.coerce.date(),
      endDate: z.coerce.date(),
      message: z.string().max(1000).optional().default(''),
      proposedPrice: z.number().min(0).optional(),
    })
    .refine((data) => data.endDate > data.startDate, {
      message: 'End date must be after start date',
      path: ['endDate'],
    })
    .refine((data) => data.startDate >= new Date(new Date().setHours(0, 0, 0, 0)), {
      message: 'Start date cannot be in the past',
      path: ['startDate'],
    }),
};

export const rejectBookingSchema = {
  body: z.object({ reason: z.string().max(500).optional().default('') }),
};

export const cancelBookingSchema = {
  body: z.object({ reason: z.string().max(500).optional().default('') }),
};

export const offerSchema = {
  body: z.object({
    amount: z.number().positive('Offer amount must be positive'),
    note: z.string().max(500).optional().default(''),
  }),
};

export const bookingQuerySchema = {
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    status: z.string().optional(),
    // Comma-separated list of statuses, e.g. "completed,cancelled,rejected"
    statuses: z.string().optional(),
    // Orchard name / location search term
    search: z.string().max(200).optional(),
    role: z.enum(['renter', 'seller']).optional(),
  }),
};
