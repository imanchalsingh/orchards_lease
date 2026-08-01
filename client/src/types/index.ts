export type Role = 'seller' | 'renter' | 'admin';

export interface User {
  id: string;
  _id?: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string;
  bio?: string;
  phone?: string;
  language?: string;
  isBlocked?: boolean;
  accountStatus?: string;
  isEmailVerified?: boolean;
  notificationSettings?: NotificationSettings;
  lastLogin?: string;
  createdAt?: string;
}

export interface NotificationSettings {
  emailBookings: boolean;
  emailApprovals: boolean;
  emailMarketing: boolean;
  inAppBookings: boolean;
  inAppSystem: boolean;
}

export interface OrchardImage {
  url: string;
  publicId?: string;
  alt?: string;
}

export interface PricingRule {
  label: string;
  minDays: number;
  multiplier: number;
}

export interface SeasonalPricing {
  _id?: string;
  label: string;
  startMonth: number;
  endMonth: number;
  price: number;
}

export interface Treatment {
  date: string;
  method?: string;
  chemicals?: string[];
  notes?: string;
}

export interface HistoryEntry {
  _id?: string;
  incidentDate: string;
  season?: string;
  items?: string[];
  severity?: string;
  description?: string;
  treatments?: Treatment[];
}

export interface OrganicCertification {
  isCertified: boolean;
  expiryDate?: string | null;
  documentUrl?: string;
  certificateNumber?: string;
}

export type OrchardStatus =
  | 'draft'
  | 'pending'
  | 'published'
  | 'unpublished'
  | 'rejected'
  | 'archived';

export interface WaterSourcesInfo {
  primary: string;
  secondary?: string;
  availableYearRound: boolean;
  description?: string;
}

export interface Orchard {
  _id: string;
  sellerId: string | Pick<User, '_id' | 'name' | 'avatar' | 'bio' | 'createdAt'>;
  gardenName: string;
  slug: string;
  description: string;
  district: string;
  state: string;
  country: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  fruitTypes: string[];
  totalTrees: number;
  averageFruitPerTree: number;
  expectedYield: number;
  estimatedHarvestDate?: string;
  totalArea: number;
  areaUnit: string;
  rentType: string;
  price: number;
  pricingRules: PricingRule[];
  seasonalPricing?: SeasonalPricing[];
  images: OrchardImage[];
  thumbnail: string;
  amenities: string[];
  available: boolean;
  isFeatured: boolean;
  status: OrchardStatus;
  rejectionReason?: string;
  viewCount: number;
  favouriteCount: number;
  ratingAverage: number;
  ratingCount: number;

  waterSources?: WaterSourcesInfo;
  waterSource?: string;
  irrigationMethod?: string;
  irrigationFrequency?: string;

  organicCertification?: OrganicCertification;

  // Health fields (Issue #72)
  soilFertility?: 'High' | 'Medium' | 'Low' | 'Unknown';
  waterSourceQuality?: 'High' | 'Medium' | 'Low' | 'Unknown';
  pestHistory?: 'Low' | 'Medium' | 'High' | 'Unknown';
  diseaseHistory?: 'Low' | 'Medium' | 'High' | 'Unknown';
  pestIncidents?: HistoryEntry[];
  diseaseIncidents?: HistoryEntry[];
  maintenanceStatus?: 'Good' | 'Average' | 'Poor' | 'Unknown';
  orchardAge?: number;
  healthScore?: HealthScoreData;
  harvestSeasons?: HarvestSeason[];

  availabilityDates?: { startDate: string; endDate: string; note?: string }[];
  blockedDates?: BlockedDate[];

  seo?: { metaTitle?: string; metaDescription?: string; keywords?: string[] };
  createdAt: string;
  updatedAt: string;
}

export type BlockedDateReason = 'Maintenance' | 'Harvest' | 'Personal' | 'System';

export interface BlockedDate {
  _id?: string;
  startDate: string;
  endDate: string;
  reason: BlockedDateReason;
  note?: string;
  blockedBy?: string;
}

export interface BookedDate {
  _id: string;
  startDate: string;
  endDate: string;
  status: string;
}

export type OccupancyStatus = 'available' | 'reserved' | 'leased' | 'maintenance';

export interface OrchardAvailabilityResponse {
  orchardId: string;
  gardenName: string;
  available: boolean;
  occupancyStatus: OccupancyStatus;
  availabilityDates: { startDate: string; endDate: string; note?: string }[];
  blockedDates: BlockedDate[];
  bookedDates: BookedDate[];
  maintenancePeriods: BlockedDate[];
  harvestPeriods: BlockedDate[];
  personalPeriods?: BlockedDate[];
  systemPeriods?: BlockedDate[];
  harvestSeasons?: HarvestSeason[];
}

export type BookingStatus =
  | 'requested'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'completed';

export interface RenewalEntry {
  renewedAt: string;
  previousEndDate: string;
  newEndDate: string;
  additionalAmount: number;
}

export interface Negotiation {
  _id?: string;
  offeredBy: User | string;
  amount: number;
  note?: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt?: string;
}

export interface Booking {
  _id: string;
  orchardId: Orchard | string;
  renterId: User | string;
  sellerId: User | string;
  startDate: string;
  endDate: string;
  bookingStatus: BookingStatus;
  paymentStatus: string;
  totalAmount: number;
  originalAmount?: number;
  message?: string;
  rejectionReason?: string;
  cancellationReason?: string;

  // Price Negotiation (Issue #104)
  negotiations?: Negotiation[];

  // Lease Renewal Properties (Issue #27)
  isRenewal?: boolean;
  previousBookingId?: string;
  renewalHistory?: RenewalEntry[];

  timeline?: { status: string; note: string; at: string }[];
  createdAt: string;
}

export interface CategoryRatings {
  cleanliness: number;
  maintenance: number;
  accessibility: number;
  communication: number;
}

export interface ReviewSummary {
  ratingAverage: number;
  ratingCount: number;
  categoryAverages: CategoryRatings;
  distribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

export interface Review {
  _id: string;
  orchardId: string | { _id: string; gardenName: string; slug: string };
  bookingId?: string;
  renterId: Pick<User, '_id' | 'name' | 'avatar' | 'email'>;
  sellerId?: string | Pick<User, '_id' | 'name' | 'email'>;
  rating: number;
  cleanlinessRating?: number;
  maintenanceRating?: number;
  accessibilityRating?: number;
  communicationRating?: number;
  comment: string;
  status?: 'pending' | 'approved' | 'rejected';
  isReported?: boolean;
  isHidden?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface AppNotification {
  _id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export interface FollowedSeller {
  _id: string;
  seller: {
    _id: string;
    name: string;
    email?: string;
    avatar?: string;
    bio?: string;
    createdAt?: string;
  };
  followerCount: number;
  orchardCount: number;
  latestOrchard?: Orchard | null;
  createdAt: string;
}

export interface SellerFollowStats {
  sellerId: string;
  seller?: {
    _id: string;
    name: string;
    avatar?: string;
    bio?: string;
    createdAt?: string;
  };
  followerCount: number;
  orchardCount: number;
  isFollowing: boolean;
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  unreadCount?: number;
  roleInsights?: Record<string, number>;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: PageMeta;
}

export interface FilterOptions {
  fruitTypes: string[];
  availableFruitTypes: string[];
  amenities: string[];
  rentTypes: string[];
  areaUnits: string[];
  states: string[];
  availableRentTypes: string[];
  availableAmenities: string[];
  priceRange: { min: number; max: number };
  treeRange: { min: number; max: number };
}

export interface WeatherCurrent {
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  rainChance: number;
  condition: string;
  icon: string;
  sunrise: string;
  sunset: string;
}

export interface WeatherForecastDay {
  date: string;
  tempMax: number;
  tempMin: number;
  condition: string;
  icon: string;
  rainChance: number;
}

export interface WeatherData {
  current: WeatherCurrent;
  forecast: WeatherForecastDay[];
  alerts: string[];
}

export interface Question {
  _id: string;
  orchard: string | { _id: string; gardenName: string; slug: string };
  askedBy: { _id: string; name: string; avatar?: string; email?: string };
  question: string;
  answer?: string;
  answeredBy?: { _id: string; name: string; avatar?: string; email?: string } | null;
  isOfficialAnswer?: boolean;
  status: 'active' | 'reported' | 'hidden';
  createdAt: string;
  updatedAt: string;
}

export interface HealthScoreBreakdown {
  soil: number;
  irrigation: number;
  maintenance: number;
  production: number;
  certification: number;
  pestHistory: number;
  diseaseHistory?: number;
  waterSource?: number;
  orchardAge?: number;
}

export interface HealthScoreData {
  score: number;
  rating: 'Excellent' | 'Good' | 'Fair' | 'Needs Improvement';
  breakdown: HealthScoreBreakdown;
  updatedAt?: string;
}

export interface HarvestSeason {
  fruitName: string;
  startMonth: number;
  peakStartMonth: number;
  peakEndMonth: number;
  endMonth: number;
}

export interface HarvestInfo {
  harvestSeasons?: HarvestSeason[];
  fruits: {
    fruitName: string;
    startMonth: number;
    peakStart: number;
    peakEnd: number;
    endMonth: number;
  }[];
  currentStatus?: string;
  badge?: string | null;
  nextHarvest: {
    fruitName: string;
    startMonth: number;
    startMonthName?: string;
    monthsUntil: number;
    description?: string;
  } | null;
  isCurrentlyHarvesting: boolean;
}

export interface RecommendationItem {
  orchard: Orchard;
  score: number;
  reasons: string[];
}

export interface RecommendationResponse {
  recommendations: RecommendationItem[];
}
