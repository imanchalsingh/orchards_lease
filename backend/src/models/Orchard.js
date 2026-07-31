import mongoose from 'mongoose';
import {
  ORCHARD_STATUS,
  RENT_TYPE,
  AREA_UNIT,
} from '../utils/constants.js';
import { calculateHealthScore } from '../services/healthScore.service.js';

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, default: '' }, // Cloudinary public id (placeholder)
    alt: { type: String, default: '' },
    videoTourUrl: { type: String, default: '' },
  },
  { _id: false }
);

const pricingRuleSchema = new mongoose.Schema(
  {
    label: { type: String, required: true }, // e.g. "Peak season"
    minDays: { type: Number, default: 0 },
    multiplier: { type: Number, default: 1 }, // applied to base price
  },
  { _id: false }
);

const seasonalPricingSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true }, // e.g. "Peak Season"
    startMonth: { type: Number, required: true, min: 1, max: 12 },
    endMonth: { type: Number, required: true, min: 1, max: 12 },
    price: { type: Number, required: true, min: 0 },
  },
  { _id: true }
);

const treatmentSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    method: { type: String, default: '' },
    chemicals: { type: [String], default: [] },
    notes: { type: String, default: '' },
  },
  { _id: false }
);

const historyEntrySchema = new mongoose.Schema(
  {
    incidentDate: { type: Date, required: true },
    season: { type: String, default: '' },
    items: { type: [String], default: [] },
    severity: { type: String, default: '' },
    description: { type: String, default: '' },
    treatments: { type: [treatmentSchema], default: [] },
  },
  { _id: true }
);

const dateRangeSchema = new mongoose.Schema(
  {
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    note: { type: String, default: '' },
  },
  { _id: false }
);

const blockedDateSchema = new mongoose.Schema(
  {
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    reason: {
      type: String,
      enum: ['Maintenance', 'Harvest', 'Personal', 'System'],
      default: 'Personal',
    },
    note: { type: String, default: '' },
    blockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { _id: true }
);


// Structured Water Source Schema (Issue #43)
const waterSourcesSchema = new mongoose.Schema(
  {
    primary: {
      type: String,
      default: 'Borewell',
      trim: true,
    },
    secondary: {
      type: String,
      default: 'None',
      trim: true,
    },
    availableYearRound: {
      type: Boolean,
      default: true,
    },
    description: {
      type: String,
      default: '',
      maxlength: 1000,
    },
  },
  { _id: false }
);

const orchardSchema = new mongoose.Schema(
  {
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    gardenName: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, unique: true, index: true },
    description: { type: String, default: '', maxlength: 5000 },

    // location
    district: { type: String, required: true, trim: true, index: true },
    state: { type: String, required: true, trim: true, index: true },
    country: { type: String, default: 'India', trim: true },
    latitude: { type: Number },
    longitude: { type: Number },
    address: { type: String, default: '' },

    // orchard characteristics
    fruitTypes: { type: [String], default: [], index: true },
    totalTrees: { type: Number, default: 0, min: 0 },
    averageFruitPerTree: { type: Number, default: 0, min: 0 },
    expectedYield: { type: Number, default: 0, min: 0 }, // kg
    estimatedHarvestDate: { type: Date },
    totalArea: { type: Number, default: 0, min: 0 },
    areaUnit: { type: String, enum: Object.values(AREA_UNIT), default: AREA_UNIT.ACRE },

    // water & irrigation details (Issue #43)
    waterSources: {
      type: waterSourcesSchema,
      default: () => ({}),
    },
    waterSource: { type: String, default: 'Borewell' }, // Legacy/fallback field
    irrigationMethod: { type: String, default: 'Drip' },
    irrigationFrequency: { type: String, default: 'Weekly' },

    // organic certification (Issue #46)
    organicCertification: {
      isCertified: { type: Boolean, default: false, index: true },
      expiryDate: { type: Date, default: null },
      documentUrl: { type: String, default: '' },
      certificateNumber: { type: String, default: '', trim: true },
    },
    documents: {
  type: [
    {
      name: { type: String, required: true },
      url: { type: String, required: true },
      type: { type: String, enum: ['Ownership Proof', 'Land Record', 'Soil Report', 'Certification', 'Other'], default: 'Other' },
      uploadedAt: { type: Date, default: Date.now },
    },
  ],
  default: [],
},

    // pricing
    rentType: { type: String, enum: Object.values(RENT_TYPE), default: RENT_TYPE.SEASON },
    price: { type: Number, required: true, min: 0, index: true },
    pricingRules: { type: [pricingRuleSchema], default: [] },
    seasonalPricing: { type: [seasonalPricingSchema], default: [] },

    // media
    images: { type: [imageSchema], default: [] },
    thumbnail: { type: String, default: '' },

    amenities: { type: [String], default: [] },

    // availability management (Issue #23)
    availabilityDates: { type: [dateRangeSchema], default: [] },
    blockedDates: { type: [blockedDateSchema], default: [] },

    // marketplace state
    available: { type: Boolean, default: true, index: true },
    isFeatured: { type: Boolean, default: false, index: true },
    status: {
      type: String,
      enum: Object.values(ORCHARD_STATUS),
      default: ORCHARD_STATUS.DRAFT,
      index: true,
    },
    rejectionReason: { type: String, default: '' },

    // engagement
    viewCount: { type: Number, default: 0 },
    favouriteCount: { type: Number, default: 0 },
    ratingAverage: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0 },

    // SEO
    seo: {
      metaTitle: { type: String, default: '' },
      metaDescription: { type: String, default: '' },
      keywords: { type: [String], default: [] },
    },

    publishedAt: { type: Date },
    archivedAt: { type: Date },
    deletedAt: { type: Date, default: null },

    // Health Score Fields (Issue #72)
    soilFertility: {
      type: String,
      enum: ['High', 'Medium', 'Low', 'Unknown'],
      default: 'Unknown',
    },
    productionEstimate: {
  value: { type: Number, min: 0, default: null },
  unit: { type: String, enum: ['kg', 'tonnes', 'quintals', 'boxes'], default: 'kg' },
  updatedAt: { type: Date, default: null },
},
    waterSourceQuality: {
      type: String,
      enum: ['High', 'Medium', 'Low', 'Unknown'],
      default: 'Unknown',
    },
    pestHistory: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Unknown'],
      default: 'Unknown',
    },
    diseaseHistory: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Unknown'],
      default: 'Unknown',
    },
    pestIncidents: { type: [historyEntrySchema], default: [] },
    diseaseIncidents: { type: [historyEntrySchema], default: [] },
    maintenanceStatus: {
      type: String,
      enum: ['Good', 'Average', 'Poor', 'Unknown'],
      default: 'Unknown',
    },
    orchardAge: {
      type: Number,
      default: 0,
      min: 0,
    },
    healthScore: {
      score: { type: Number, default: 0, min: 0, max: 100 },
      rating: { type: String, default: 'Needs Improvement' },
      breakdown: {
        soil: { type: Number, default: 0 },
        irrigation: { type: Number, default: 0 },
        maintenance: { type: Number, default: 0 },
        production: { type: Number, default: 0 },
        certification: { type: Number, default: 0 },
        pestHistory: { type: Number, default: 0 },
        diseaseHistory: { type: Number, default: 0 },
        waterSource: { type: Number, default: 0 },
        orchardAge: { type: Number, default: 0 },
      },
    },
    harvestSeasons: {
      type: [
        new mongoose.Schema(
          {
            fruitName: { type: String, required: true, trim: true },
            startMonth: { type: Number, required: true, min: 1, max: 12 },
            peakStartMonth: { type: Number, required: true, min: 1, max: 12 },
            peakEndMonth: { type: Number, required: true, min: 1, max: 12 },
            endMonth: { type: Number, required: true, min: 1, max: 12 },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Text index for search-everywhere
orchardSchema.index({
  gardenName: 'text',
  description: 'text',
  district: 'text',
  state: 'text',
});

// Geospatial-ready compound for map/region queries
orchardSchema.index({ state: 1, district: 1, status: 1 });

orchardSchema.virtual('seller', {
  ref: 'User',
  localField: 'sellerId',
  foreignField: '_id',
  justOne: true,
});

// Pre-save hook to calculate/cache health score
orchardSchema.pre('save', function (next) {
  this.healthScore = calculateHealthScore(this);
  next();
});

const Orchard = mongoose.model('Orchard', orchardSchema);
export default Orchard;
