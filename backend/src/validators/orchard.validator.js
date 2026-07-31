import { z } from 'zod';
import {
  RENT_TYPE,
  AREA_UNIT,
  ORCHARD_STATUS,
} from '../utils/constants.js';

const imageSchema = z.object({
  url: z.string().min(1, 'Image URL is required'),
  publicId: z.string().optional().default(''),
  alt: z.string().optional().default(''),
});

const pricingRuleSchema = z.object({
  label: z.string().min(1),
  minDays: z.number().min(0).optional().default(0),
  multiplier: z.number().min(0).optional().default(1),
});

const seasonalPricingSchema = z.object({
  label: z.string().min(1),
  startMonth: z.number().int().min(1).max(12),
  endMonth: z.number().int().min(1).max(12),
  price: z.number().min(0, 'Seasonal price must be positive'),
});

const treatmentSchema = z.object({
  date: z.coerce.date(),
  method: z.string().optional().default(''),
  chemicals: z.array(z.string()).optional().default([]),
  notes: z.string().optional().default(''),
});

const historyEntrySchema = z.object({
  incidentDate: z.coerce.date(),
  season: z.string().optional().default(''),
  items: z.array(z.string()).optional().default([]),
  severity: z.string().optional().default(''),
  description: z.string().optional().default(''),
  treatments: z.array(treatmentSchema).optional().default([]),
});

const baseOrchard = {
  gardenName: z.string().min(3, 'Garden name is too short').max(120),
  description: z.string().max(5000).optional().default(''),
  district: z.string().min(1, 'District is required'),
  state: z.string().min(1, 'State is required'),
  country: z.string().optional().default('India'),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  address: z.string().max(500).optional().default(''),
  fruitTypes: z.array(z.string()).min(1, 'Select at least one fruit type'),
  totalTrees: z.number().int().min(0).optional().default(0),
  averageFruitPerTree: z.number().min(0).optional().default(0),
  expectedYield: z.number().min(0).optional().default(0),
  estimatedHarvestDate: z.coerce.date().optional(),
  totalArea: z.number().min(0).optional().default(0),
  areaUnit: z.nativeEnum(AREA_UNIT).optional().default(AREA_UNIT.ACRE),
  soilFertility: z.enum(['High', 'Medium', 'Low', 'Unknown']).optional().default('Unknown'),
  productionEstimate: z.object({
  value: z.number().min(0).nullable().optional(),
  unit: z.enum(['kg', 'tonnes', 'quintals', 'boxes']).optional().default('kg'),
}).optional(),
  waterSourceQuality: z.enum(['High', 'Medium', 'Low', 'Unknown']).optional().default('Unknown'),
  pestHistory: z.enum(['Low', 'Medium', 'High', 'Unknown']).optional().default('Unknown'),
  diseaseHistory: z.enum(['Low', 'Medium', 'High', 'Unknown']).optional().default('Unknown'),
  maintenanceStatus: z.enum(['Good', 'Average', 'Poor', 'Unknown']).optional().default('Unknown'),
  orchardAge: z.number().int().min(0).optional().default(0),
  rentType: z.nativeEnum(RENT_TYPE).optional().default(RENT_TYPE.SEASON),
  price: z.number().min(0, 'Price must be positive'),
  pricingRules: z.array(pricingRuleSchema).optional().default([]),
  seasonalPricing: z.array(seasonalPricingSchema).optional().default([]),
  images: z.array(imageSchema).optional().default([]),
  images: z.array(imageSchema).optional().default([]),
      documents: z
        .array(
          z.object({
            name: z.string().min(1),
            url: z.string().url(),
            type: z.enum(['Ownership Proof', 'Land Record', 'Soil Report', 'Certification', 'Other']).optional().default('Other'),
          })
        )
        .optional()
        .default([]),
  thumbnail: z.string().url().optional().or(z.literal('')),
  amenities: z.array(z.string()).optional().default([]),
  pestIncidents: z.array(historyEntrySchema).optional().default([]),
  diseaseIncidents: z.array(historyEntrySchema).optional().default([]),
  available: z.boolean().optional().default(true),
  seo: z
    .object({
      metaTitle: z.string().max(160).optional().default(''),
      metaDescription: z.string().max(320).optional().default(''),
      keywords: z.array(z.string()).optional().default([]),
    })
    .optional(),
};

export const harvestSeasonSchema = z.object({
  fruitName: z.string().min(1, 'Fruit name is required').trim(),
  startMonth: z.number().int().min(1).max(12),
  peakStartMonth: z.number().int().min(1).max(12),
  peakEndMonth: z.number().int().min(1).max(12),
  endMonth: z.number().int().min(1).max(12),
});

export const updateHarvestSchema = {
  body: z.object({
    harvestSeasons: z
      .array(harvestSeasonSchema)
      .refine(
        (seasons) => {
          const names = seasons.map((s) => s.fruitName.trim().toLowerCase());
          return names.length === new Set(names).size;
        },
        { message: 'Duplicate fruits are not allowed in harvest schedule' }
      )
      .refine(
        (seasons) => {
          const inRange = (m, start, end) => {
            if (start <= end) {
              return m >= start && m <= end;
            } else {
              return m >= start || m <= end;
            }
          };

          for (const season of seasons) {
            const { startMonth, peakStartMonth, peakEndMonth, endMonth } = season;

            // Check if peakStartMonth is in harvest season
            if (!inRange(peakStartMonth, startMonth, endMonth)) {
              return false;
            }
            // Check if peakEndMonth is in harvest season
            if (!inRange(peakEndMonth, startMonth, endMonth)) {
              return false;
            }

            // Check all months in peak range to ensure they are inside harvest season
            const peakMonths = [];
            let current = peakStartMonth;
            let iterations = 0;
            while (iterations < 12) {
              peakMonths.push(current);
              if (current === peakEndMonth) break;
              current = (current % 12) + 1;
              iterations++;
            }

            for (const pm of peakMonths) {
              if (!inRange(pm, startMonth, endMonth)) {
                return false;
              }
            }
          }
          return true;
        },
        { message: 'Peak harvest months must fall within the overall harvest season range' }
      ),
  }),
};

export const patchHarvestSchema = {
  body: z.object({
    harvestSeasons: z
      .array(harvestSeasonSchema)
      .optional()
      .refine(
        (seasons) => {
          if (!seasons) return true;
          const names = seasons.map((s) => s.fruitName.trim().toLowerCase());
          return names.length === new Set(names).size;
        },
        { message: 'Duplicate fruits are not allowed in harvest schedule' }
      )
      .refine(
        (seasons) => {
          if (!seasons) return true;
          const inRange = (m, start, end) => {
            if (start <= end) {
              return m >= start && m <= end;
            } else {
              return m >= start || m <= end;
            }
          };

          for (const season of seasons) {
            const { startMonth, peakStartMonth, peakEndMonth, endMonth } = season;

            if (!inRange(peakStartMonth, startMonth, endMonth)) {
              return false;
            }
            if (!inRange(peakEndMonth, startMonth, endMonth)) {
              return false;
            }

            const peakMonths = [];
            let current = peakStartMonth;
            let iterations = 0;
            while (iterations < 12) {
              peakMonths.push(current);
              if (current === peakEndMonth) break;
              current = (current % 12) + 1;
              iterations++;
            }

            for (const pm of peakMonths) {
              if (!inRange(pm, startMonth, endMonth)) {
                return false;
              }
            }
          }
          return true;
        },
        { message: 'Peak harvest months must fall within the overall harvest season range' }
      ),
  }),
};

export const createOrchardSchema = {
  body: z.object({
    ...baseOrchard,
    harvestSeasons: z.array(harvestSeasonSchema).optional(),
    status: z
      .enum([ORCHARD_STATUS.DRAFT, ORCHARD_STATUS.PENDING])
      .optional()
      .default(ORCHARD_STATUS.DRAFT),
  }),
};

export const updateOrchardSchema = {
  body: z.object({
    ...baseOrchard,
    harvestSeasons: z.array(harvestSeasonSchema).optional(),
  }).partial(),
};

export const orchardQuerySchema = {
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    sort: z.string().optional(),
    search: z.string().optional(),
    fruit: z.string().optional(),
    state: z.string().optional(),
    district: z.string().optional(),
    // Rent type filter: "season" | "month" | "year" | "harvest"
    rentType: z.string().optional(),
    // Comma-separated amenities: "irrigation,fencing,storage"
    amenities: z.string().optional(),
    minPrice: z.coerce.number().optional(),
    maxPrice: z.coerce.number().optional(),
    minTrees: z.coerce.number().optional(),
    maxTrees: z.coerce.number().optional(),
    minArea: z.coerce.number().optional(),
    maxArea: z.coerce.number().optional(),
    minYield: z.coerce.number().optional(),
    rating: z.coerce.number().min(0).max(5).optional(),
    available: z
      .enum(['true', 'false'])
      .optional()
      .transform((v) => (v === undefined ? undefined : v === 'true')),
    featured: z
      .enum(['true', 'false'])
      .optional()
      .transform((v) => (v === undefined ? undefined : v === 'true')),
    harvestThisMonth: z
      .enum(['true', 'false'])
      .optional()
      .transform((v) => (v === undefined ? undefined : v === 'true')),
    upcomingHarvest: z
      .enum(['true', 'false'])
      .optional()
      .transform((v) => (v === undefined ? undefined : v === 'true')),
    peakSeason: z
      .enum(['true', 'false'])
      .optional()
      .transform((v) => (v === undefined ? undefined : v === 'true')),
  }),
};


export const moderateOrchardSchema = {
  body: z.object({
    action: z.enum(['approve', 'reject', 'feature', 'unfeature']),
    reason: z.string().max(500).optional(),
  }),
};
