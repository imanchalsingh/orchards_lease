import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  Heart, 
  GitCompareArrows, 
  Star, 
  MapPin, 
  Calendar, 
  Check, 
  BadgeCheck,
  Store,        // For Markets
  Milestone,    // For Highways / Connectivity
  Warehouse,    // For Warehouses
  Fuel,         // For Petrol Pumps
  Activity,     // For Hospitals
  ShoppingBag,  // For Agricultural Stores
  Navigation,
  ExternalLink,
  Compass,
  Sprout,       // For Organic Badge
  FileText,     // For Certificate Document
} from 'lucide-react';
import { orchardService } from '@/services/orchard.service';
import { bookingService } from '@/services/booking.service';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useMarketplace } from '@/context/MarketplaceContext';
import { useLocation } from '@/context/LocationContext';
import { getOrchardCoordinates } from '@/lib/distance';
import { Button, EmptyState, Badge } from '@/components/ui';
import { BookingModal } from '@/components/orchard/BookingModal';
import { OrchardQA } from '@/components/orchard/OrchardQA';
import { AvailabilityCalendar } from '@/components/orchard/AvailabilityCalendar';
import { OrchardMap } from '@/components/orchard/OrchardMap';
import { WeatherCard } from '@/components/orchard/WeatherCard';
import { OrchardHealthScore } from '@/components/orchard/OrchardHealthScore';
import { HarvestTimeline } from '@/components/orchard/HarvestTimeline';
import { formatCurrency, formatDate, titleCase } from '@/lib/format';
import { orchardSurface } from '@/lib/gradients';
import { getErrorMessage } from '@/lib/apiClient';
import { cn } from '@/lib/cn';
import { followService } from '@/services/follow.service';
import { FollowButton } from '@/components/follow/FollowButton';
import { reviewService } from '@/services/review.service';
import { recommendationService } from '@/services/recommendation.service';
import { RatingBreakdown } from '@/components/orchard/RatingBreakdown';
import { ReviewList } from '@/components/orchard/ReviewList';
import { WriteReviewModal } from '@/components/orchard/WriteReviewModal';
import { RecommendedSection } from '@/components/recommendation/RecommendedSection';
import type { Orchard, Review, ReviewSummary, PageMeta, Booking, SellerFollowStats, RecommendationItem } from '@/types';



export default function OrchardDetailPage() {

  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const { isSaved, isCompared, toggleSave, toggleCompare, refreshBookingCount } = useMarketplace();
  const { userLocation, getDistanceTo, requestLocation } = useLocation();

  const [orchard, setOrchard] = useState<Orchard | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewSummary, setReviewSummary] = useState<ReviewSummary | null>(null);
  const [reviewMeta, setReviewMeta] = useState<PageMeta | undefined>(undefined);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewSort, setReviewSort] = useState<'newest' | 'highest' | 'lowest'>('newest');
  const [reviewPage, setReviewPage] = useState(1);

  const [reviewableBooking, setReviewableBooking] = useState<Booking | null>(null);
  const [canReview, setCanReview] = useState(false);
  const [writeReviewOpen, setWriteReviewOpen] = useState(false);
  const [editingReview, setEditingReview] = useState<Review | null>(null);

  const [sellerStats, setSellerStats] = useState<SellerFollowStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Crop season dictionary mapping layout rules
  const cropSeasons: Record<string, string> = {
    apple: 'August - October (Autumn Peak)',
    mango: 'April - July (Summer Peak)',
    orange: 'November - January (Winter Peak)',
    banana: 'Year-round Availability',
    grapes: 'January - April (Spring Harvest)',
    pomegranate: 'September - February (Winter Harvest)'
  };

  const loadReviews = (orchardId: string, page = 1, sort: 'newest' | 'highest' | 'lowest' = 'newest') => {
    setReviewsLoading(true);
    reviewService
      .getOrchardReviews(orchardId, page, 5, sort)
      .then((res) => {
        setReviews(res.reviews);
        if (res.summary) setReviewSummary(res.summary);
        if (res.meta) setReviewMeta(res.meta);
      })
      .catch(() => {})
      .finally(() => setReviewsLoading(false));
  };

  const checkReviewableBooking = (orchardId: string) => {
    if (!user || user.role !== 'renter') {
      setCanReview(false);
      setReviewableBooking(null);
      return;
    }
    reviewService
      .getReviewableBooking(orchardId)
      .then((res) => {
        setCanReview(res.canReview);
        setReviewableBooking(res.booking);
      })
      .catch(() => {
        setCanReview(false);
        setReviewableBooking(null);
      });
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!window.confirm('Are you sure you want to delete your review?')) return;
    try {
      await reviewService.deleteReview(reviewId);
      toast.success('Review deleted');
      if (orchard) {
        loadReviews(orchard._id, reviewPage, reviewSort);
        checkReviewableBooking(orchard._id);
        orchardService.getBySlug(slug).then(setOrchard).catch(() => {});
      }
    } catch {
      toast.error('Failed to delete review');
    }
  };

  useEffect(() => {
    setLoading(true);
    window.scrollTo(0, 0);
    orchardService
      .getBySlug(slug)
      .then((o) => {
        setOrchard(o);
        setGalleryIndex(0);
        loadReviews(o._id, 1, 'newest');
        checkReviewableBooking(o._id);
        const sId = typeof o.sellerId === 'object' ? o.sellerId?._id : (o.sellerId as string);
        if (sId) {
          followService.getSellerFollowersStats(sId).then(setSellerStats).catch(() => {});
        }
      })
      .catch(() => setOrchard(null))
      .finally(() => setLoading(false));
  }, [slug, user]);


  const requestBooking = () => {
    if (!user) {
      navigate('/login', { state: { from: `/orchards/${slug}` } });
      return;
    }
    if (user.role !== 'renter') {
      toast.info('Only renters can book orchards');
      return;
    }
    setBookingOpen(true);
  };

  const confirmBooking = async (startDate: string, endDate: string) => {
    if (!orchard) return;
    setSubmitting(true);
    try {
      await bookingService.create({ orchardId: orchard._id, startDate, endDate });
      toast.success('Booking request sent to seller');
      setBookingOpen(false);
      refreshBookingCount();
      navigate('/bookings');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <DetailSkeleton />;
  if (!orchard)
    return (
      <main className="container-page py-16">
        <EmptyState
          emoji="🌳"
          title="Orchard not found"
          description="This orchard may have been removed or unpublished."
          action={<Button onClick={() => navigate('/explore')}>Browse orchards</Button>}
        />
      </main>
    );

  const seller = typeof orchard.sellerId === 'object' ? orchard.sellerId : null;
  
  const hasRealImages = orchard.images && orchard.images.length > 0 && orchard.images.some(img => img?.url);
  const galleryItems = hasRealImages 
    ? orchard.images.filter(img => img?.url).map(img => img.url)
    : Array.from({ length: 4 }).map((_, i) => orchard.thumbnail || '');
    
  const currentImageUrl = hasRealImages
    ? (galleryItems[galleryIndex] || galleryItems[0] || orchard.thumbnail)
    : orchard.thumbnail;
    
  const surface = orchardSurface(currentImageUrl, orchard.fruitTypes, orchard._id);
  const rent = orchard.rentType?.startsWith('per') ? orchard.rentType : `per ${orchard.rentType}`;
  const fee = Math.round(orchard.price * 0.08);
  const dep = Math.round(orchard.price * 0.15);
  const saved = isSaved(orchard._id);
  const plantationYear = (orchard as any).plantationYear || 2020;
  const calculatedAge = 2026 - plantationYear;
  const organicCert = (orchard as any).organicCertification;
  const waterInfo = (orchard as any).waterSources;

 const productionEstimate = (orchard as any).productionEstimate;

  const stats = [
    { k: 'Total trees', v: orchard.totalTrees.toLocaleString() },
    { k: 'Avg yield / tree', v: `${orchard.averageFruitPerTree} fruits` },
    { k: 'Expected yield', v: `${orchard.expectedYield.toLocaleString()} kg` },
    ...(productionEstimate?.value
      ? [{ k: 'Est. annual production', v: `${productionEstimate.value.toLocaleString()} ${productionEstimate.unit}` }]
      : []),
    { k: 'Plot area', v: `${orchard.totalArea} ${orchard.areaUnit}` },
    { k: 'Harvest window', v: formatDate(orchard.estimatedHarvestDate) },
    { k: 'Orchard Maturity', v: `${calculatedAge > 0 ? calculatedAge : 0} years old (Est. ${plantationYear})` },
  ];
  // Dynamic nearby facilities matching issue specifications
  const nearbyFacilities = [
    { name: `${orchard.district} Wholesalers`, type: 'Local Market', distance: '2.4 km', icon: Store },
    { name: 'State Highway Connect', type: 'Transport Link', distance: '4.1 km', icon: Milestone },
    { name: 'Agro Cold Storage Vaults', type: 'Warehouse Facility', distance: '1.8 km', icon: Warehouse },
    { name: 'National Fuel Station', type: 'Petrol Pump', distance: '3.5 km', icon: Fuel },
    { name: 'District Civil Hospital', type: 'Medical Care', distance: '5.2 km', icon: Activity },
    { name: 'Kisan Supply Emporium', type: 'Agricultural Store', distance: '0.9 km', icon: ShoppingBag },
  ];

  return (
    <main className="mx-auto max-w-[1180px] px-6 pb-16 pt-5">
      <button
        onClick={() => navigate('/explore')}
        className="mb-4 flex items-center gap-1.5 py-1 text-[13.5px] font-semibold text-sub"
      >
        <ChevronLeft className="h-[17px] w-[17px]" /> Back to explore
      </button>

      {/* Header */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-1.5 flex flex-wrap items-center gap-2.5">
            <Badge tone={orchard.available ? 'green' : 'gray'}>
              {orchard.available ? 'Available now' : 'Booked out'}
            </Badge>
            {organicCert?.isCertified && (
              <Badge tone="green" className="flex items-center gap-1 bg-emerald-100 text-emerald-800 border-emerald-300">
                <Sprout className="h-3.5 w-3.5 text-emerald-600" />
                Organically Certified
              </Badge>
            )}
            <span className="eyebrow">{orchard.fruitTypes[0]}</span>
          </div>
          <h1 className="font-serif text-[clamp(24px,3vw,33px)] font-semibold leading-[1.1]">
            {orchard.gardenName}
          </h1>
          <p className="mt-1.5 flex flex-wrap items-center gap-3.5 text-sm text-sub">
            {orchard.ratingCount > 0 && (
              <span className="flex items-center gap-1.5 font-bold text-ink">
                <Star className="h-3.5 w-3.5 fill-gold text-gold" />
                {orchard.ratingAverage.toFixed(1)} · {orchard.ratingCount} reviews
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-faint" />
              {orchard.district}, {orchard.state}
            </span>
          </p>
        </div>
        <div className="flex gap-2.5">
          <button
            onClick={() => toggleSave(orchard._id)}
            className="flex items-center gap-1.5 rounded-xl border border-sand bg-cream px-4 py-2.5 text-[13px] font-semibold text-ink"
          >
            <Heart className={cn('h-[15px] w-[15px]', saved ? 'fill-terra text-terra' : 'text-sub')} />
            {saved ? 'Saved' : 'Save'}
          </button>
          <button
            onClick={() => toggleCompare(orchard._id)}
            className={cn(
              'flex items-center gap-1.5 rounded-xl border px-4 py-2.5 text-[13px] font-semibold',
              isCompared(orchard._id) ? 'border-forest bg-forest text-cream' : 'border-sand bg-cream text-ink'
            )}
          >
            <GitCompareArrows className="h-[15px] w-[15px]" />
            Compare
          </button>
        </div>
      </div>

      {/* Hero + gallery */}
      {/* Hero + gallery */}
      <div className="mb-7 flex items-stretch gap-2.5">
        <div className="relative flex-1 overflow-hidden rounded-[18px]" style={{ height: 'clamp(260px,38vw,420px)', ...surface }}>
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg,transparent 55%,rgba(20,30,15,.4))' }} />
          <div className="absolute bottom-3.5 left-4 text-[11px] font-bold uppercase tracking-[.1em] text-cream/80">
            Orchard photo · {orchard.district}, {orchard.state}
          </div>
        </div>
        <div className="flex w-[84px] flex-none flex-col gap-2.5 overflow-y-auto max-h-[420px] scrollbar-none pr-1">
          {galleryItems.map((url, i) => {
            const itemSurface = orchardSurface(url, orchard.fruitTypes, orchard._id);
            return (
              <button
                key={i}
                onClick={() => setGalleryIndex(i)}
                className="h-[70px] w-full rounded-[10px] flex-none"
                style={{
                  ...itemSurface,
                  filter: !hasRealImages ? `hue-rotate(${i * 14}deg) brightness(${i === galleryIndex ? 1 : 0.86})` : `brightness(${i === galleryIndex ? 1 : 0.86})`,
                  outline: i === galleryIndex ? '2px solid #2f5d3a' : '2px solid transparent',
                  outlineOffset: '2px',
                }}
              />
            );
          })}
        </div>
      </div>

      {(orchard as any).videoTourUrl && (
        <div className="mb-7">
          <p className="mb-2 text-sm font-semibold">Video Tour</p>
          <video src={(orchard as any).videoTourUrl} controls className="w-full rounded-2xl max-h-96" />
        </div>
      )}

      {(orchard as any).documents?.length > 0 && (
        <div className="mb-7">
          <p className="mb-2 text-sm font-semibold">Orchard Documents</p>
          <div className="space-y-2">
            {(orchard as any).documents.map((doc: any, i: number) => (
              <a
                key={i}
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between rounded-xl border border-sand bg-cream/60 px-4 py-3 hover:bg-cream transition-colors"
              >
                <div>
                  <p className="text-sm font-semibold text-ink">{doc.name}</p>
                  <p className="text-xs text-faint">{doc.type}</p>
                </div>
                <span className="text-xs font-semibold text-forest">View / Download</span>
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-start gap-[30px]">
        {/* Left */}
        <div className="min-w-[300px] flex-[2_1_480px]">
          <p className="mb-6 max-w-[64ch] text-[15.5px] leading-[1.65] text-[#3a4632]">{orchard.description}</p>

          {/* Organic Certification Highlight Section (Issue #46) */}
          {organicCert?.isCertified && (
            <div className="mb-7 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3 border-b border-emerald-200/60 pb-3 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
                    <Sprout className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-serif text-[17px] font-bold text-emerald-950">Organic Certification Verified</h3>
                    {organicCert.certificateNumber && (
                      <p className="text-xs font-mono font-medium text-emerald-800">
                        Cert No: {organicCert.certificateNumber}
                      </p>
                    )}
                  </div>
                </div>
                <span className="rounded-full bg-emerald-200/70 px-3 py-1 text-xs font-bold text-emerald-900">
                  Certified Organic
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-emerald-900">
                <div>
                  <span className="text-emerald-700 font-medium">Valid Until: </span>
                  <span className="font-semibold">
                    {organicCert.expiryDate ? formatDate(organicCert.expiryDate) : 'Not specified'}
                  </span>
                </div>

                {organicCert.documentUrl && (
                  <a
                    href={organicCert.documentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-800"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    View Certificate Document
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          )}

          <h2 className="mb-3.5 font-serif text-[19px] font-semibold">Orchard at a glance</h2>
          <div className="mb-7 grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-px overflow-hidden rounded-xl border border-sand bg-sand">
            {stats.map((st) => (
              <div key={st.k} className="bg-cream px-4 py-4">
                <div className="mb-1.5 text-[11.5px] font-bold uppercase tracking-[.05em] text-faint">{st.k}</div>
                <div className="font-serif text-[18px] font-semibold text-ink">{st.v}</div>
              </div>
            ))}
          </div>

          <h2 className="mb-3.5 font-serif text-[19px] font-semibold">Crop Variety &amp; Seasonal Info</h2>
          <div className="mb-7 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {orchard.fruitTypes.map((f) => (
              <div key={f} className="flex flex-col rounded-xl border border-sand bg-cream p-3.5">
                <div className="text-sm font-bold text-ink">{titleCase(f)}</div>
                <div className="mt-1 flex items-center gap-1.5 text-xs text-forest font-semibold">
                  <span className="inline-block h-2 w-2 rounded-full bg-forest animate-pulse" />
                  {cropSeasons[f.toLowerCase()] || 'Check with owner for specific harvest schedules'}
                </div>
              </div>
            ))}
          </div>

          {/* Orchard Availability Calendar Component (Issue #68) */}
          <div className="mb-8">
            <AvailabilityCalendar orchardId={orchard._id} />
          </div>

          <div className="mb-7">
            <HarvestTimeline harvestSeasons={orchard.harvestSeasons} />
          </div>
          
          {/* Health Score Dashboard Card (Issue #72) */}
          <div className="mb-8">
            <OrchardHealthScore orchardId={orchard._id} />
          </div>

          {/* Interactive Map Component Section (Issue #33) */}
          <h2 className="mb-3.5 font-serif text-[19px] font-semibold">Interactive Location Map</h2>
          <div className="mb-8">
            <OrchardMap
              latitude={orchard.latitude}
              longitude={orchard.longitude}
              gardenName={orchard.gardenName}
              district={orchard.district}
              state={orchard.state}
              address={orchard.address}
              orchard={orchard}
            />
          </div>

          {/* Soil Composition Details Block */}
          <h2 className="mb-3.5 font-serif text-[19px] font-semibold">Soil &amp; Land Quality</h2>
          <div className="mb-7 rounded-xl border border-sand bg-cream p-4">
            <div className="flex flex-wrap justify-between items-center gap-3 border-b border-chip pb-3 mb-3">
              <span className="text-sm font-bold text-ink">Soil Classification</span>
              <span className="rounded-full bg-avail px-3 py-1 text-xs font-bold text-forest">
                {(orchard as any).soilType || 'Loamy'}
              </span>
            </div>
            <p className="text-sm leading-relaxed text-[#3a4632]">
              {(orchard as any).soilDescription || 'No secondary nutritional details provided by owner yet. This classification represents general soil compositions typical to the regional district area.'}
            </p>
          </div>

          {/* Water & Irrigation Systems Component Block (Issue #43) */}
          <h2 className="mb-3.5 font-serif text-[19px] font-semibold">Water &amp; Irrigation Systems</h2>
          <div className="mb-7 rounded-xl border border-sand bg-cream p-5 space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <div className="rounded-lg bg-chip/60 p-3 text-center">
                <div className="text-[11px] font-bold uppercase tracking-wider text-faint mb-1">Primary Source</div>
                <div className="text-sm font-bold text-forest">
                  {waterInfo?.primary || (orchard as any).waterSource || 'Borewell'}
                </div>
              </div>

              <div className="rounded-lg bg-chip/60 p-3 text-center">
                <div className="text-[11px] font-bold uppercase tracking-wider text-faint mb-1">Secondary Source</div>
                <div className="text-sm font-bold text-ink">
                  {waterInfo?.secondary || 'None'}
                </div>
              </div>

              <div className="rounded-lg bg-chip/60 p-3 text-center">
                <div className="text-[11px] font-bold uppercase tracking-wider text-faint mb-1">Method</div>
                <div className="text-sm font-bold text-forest">{(orchard as any).irrigationMethod || 'Drip'}</div>
              </div>

              <div className="rounded-lg bg-chip/60 p-3 text-center">
                <div className="text-[11px] font-bold uppercase tracking-wider text-faint mb-1">Frequency</div>
                <div className="text-sm font-bold text-ink">{(orchard as any).irrigationFrequency || 'Weekly'}</div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1 text-sm">
              <span className={cn(
                "inline-block h-2.5 w-2.5 rounded-full",
                waterInfo?.availableYearRound ?? true ? "bg-emerald-500" : "bg-amber-500"
              )} />
              <span className="font-semibold text-ink">
                {waterInfo?.availableYearRound ?? true
                  ? "Year-Round Water Supply Available (12 Months)"
                  : "Seasonal Water Supply / Restricted Summer Availability"}
              </span>
            </div>

            {waterInfo?.description && (
              <p className="text-xs leading-relaxed text-sub border-t border-sand/60 pt-3">
                {waterInfo.description}
              </p>
            )}
          </div>

          {/* Weather Insights Section (Issue #74) */}
          <h2 className="mb-3.5 font-serif text-[19px] font-semibold">Weather Insights</h2>
          <div className="mb-8">
            <WeatherCard orchardId={orchard._id} />
          </div>

          {orchard.amenities.length > 0 && (
            <>
              <h2 className="mb-3.5 font-serif text-[19px] font-semibold">Amenities &amp; infrastructure</h2>
              <div className="mb-7 grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-2.5">
                {orchard.amenities.map((a) => (
                  <div key={a} className="flex items-center gap-2.5 text-sm text-[#3a4632]">
                    <span className="flex h-6 w-6 flex-none items-center justify-center rounded-[7px] bg-avail">
                      <Check className="h-3 w-3 text-forest" strokeWidth={2.4} />
                    </span>
                    {titleCase(a)}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Distance & Geolocation Block */}
          {(() => {
            const distInfo = getDistanceTo(orchard);
            const coords = getOrchardCoordinates(orchard);
            const mapsUrl = coords
              ? `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}`
              : '#';

            return (
              <>
                <h2 className="mb-3.5 font-serif text-[19px] font-semibold">Location &amp; Distance</h2>
                <div className="mb-7 rounded-xl border border-sand bg-cream p-4">
                  {distInfo ? (
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        <div className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-forest text-cream">
                          <Navigation className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-baseline gap-2">
                            <span className="font-serif text-lg font-bold text-forest">{distInfo.formattedDistance} straight-line</span>
                            <span className="text-xs font-semibold text-sub">({distInfo.formattedRoadDistance} road trip)</span>
                          </div>
                          <div className="text-xs text-faint">
                            Estimated travel time: <strong className="text-ink">{distInfo.formattedTravelTime}</strong> from {userLocation?.name || 'your location'}
                          </div>
                        </div>
                      </div>
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-xl bg-forest px-4 py-2.5 text-xs font-bold text-cream hover:bg-forest-dark transition-colors"
                      >
                        <Compass className="h-4 w-4" /> Get Directions <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-bold text-ink flex items-center gap-1.5">
                          <MapPin className="h-4 w-4 text-forest" />
                          {orchard.district}, {orchard.state}
                        </div>
                        <div className="text-xs text-faint mt-0.5">
                          Enable your browser location to calculate exact travel distance &amp; time.
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={requestLocation}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-forest bg-avail px-4 py-2 text-xs font-bold text-forest hover:bg-forest hover:text-cream transition-colors"
                      >
                        <Navigation className="h-3.5 w-3.5" /> Enable Location
                      </button>
                    </div>
                  )}
                </div>
              </>
            );
          })()}

          {/* New Nearby Infrastructure Section */}
          <h2 className="mb-3.5 font-serif text-[19px] font-semibold">Nearby Facilities</h2>
          <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {nearbyFacilities.map((fac, idx) => {
              const IconComp = fac.icon;
              return (
                <div key={idx} className="flex items-center justify-between rounded-xl border border-sand bg-cream p-3.5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-chip text-forest">
                      <IconComp className="h-[18px] w-[18px]" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-ink">{fac.name}</div>
                      <div className="text-xs text-faint">{fac.type}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="rounded-full bg-avail px-2.5 py-1 text-xs font-bold text-forest">
                      {fac.distance}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Orchard Ratings & Reviews System */}
          <div className="mb-10 mt-10 border-t border-sand pt-8">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="font-serif text-[21px] font-semibold text-ink">Ratings &amp; Reviews</h2>
                <p className="text-xs text-sub mt-0.5">Verified renter feedback and category assessments</p>
              </div>
              {canReview && (
                <Button
                  onClick={() => {
                    setEditingReview(null);
                    setWriteReviewOpen(true);
                  }}
                  className="flex items-center gap-1.5"
                >
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  Write a Review
                </Button>
              )}
            </div>

            {reviewSummary && reviewSummary.ratingCount > 0 && (
              <div className="mb-6">
                <RatingBreakdown summary={reviewSummary} />
              </div>
            )}

            <ReviewList
              reviews={reviews}
              meta={reviewMeta}
              loading={reviewsLoading}
              sort={reviewSort}
              onSortChange={(s) => {
                setReviewSort(s);
                if (orchard) loadReviews(orchard._id, 1, s);
              }}
              onPageChange={(p) => {
                setReviewPage(p);
                if (orchard) loadReviews(orchard._id, p, reviewSort);
              }}
              onEditReview={(r) => {
                setEditingReview(r);
                setWriteReviewOpen(true);
              }}
              onDeleteReview={handleDeleteReview}
            />
          </div>


          {/* Q&A Section */}
          <h2 className="mb-3.5 font-serif text-[19px] font-semibold mt-10">Questions &amp; Answers</h2>
          <OrchardQA 
            orchardId={orchard._id} 
            sellerId={typeof orchard.sellerId === 'object' && orchard.sellerId ? (orchard.sellerId._id || '') : (orchard.sellerId as string)} 
          />
        </div>

        {/* Right booking card */}
        <aside className="min-w-[300px] flex-1 basis-[320px] lg:sticky lg:top-[84px]">
          <div className="rounded-[18px] border border-sand bg-cream p-[22px] shadow-soft">
            <div className="mb-1 flex items-baseline gap-1.5">
              <span className="font-serif text-[28px] font-bold text-terra">{formatCurrency(orchard.price)}</span>
              <span className="text-[13px] text-faint">{rent}</span>
            </div>
            <p className="mb-4 text-[12.5px] text-faint">
              Harvest window · {formatDate(orchard.estimatedHarvestDate)}
            </p>

            <button
              onClick={requestBooking}
              className="mb-3.5 w-full rounded-xl border border-sand px-4 py-3 text-left"
            >
              <div className="mb-0.5 text-[11px] font-bold uppercase tracking-[.06em] text-faint">Lease dates</div>
              <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                <Calendar className="h-[15px] w-[15px] text-forest" />
                Select harvest dates
              </div>
            </button>

            <div className="mb-3.5 text-[13px] text-sub">
              <Row label={`Lease (${rent})`} value={formatCurrency(orchard.price)} />
              <Row label="Platform fee (8%)" value={formatCurrency(fee)} />
              <Row label="Refundable deposit" value={formatCurrency(dep)} />
              <div className="mt-1.5 flex justify-between border-t border-chip pt-3 text-[15px] font-bold text-ink">
                <span>Total</span>
                <span>{formatCurrency(orchard.price + fee + dep)}</span>
              </div>
            </div>

            <Button className="w-full" size="lg" disabled={!orchard.available} onClick={requestBooking}>
              {orchard.available ? 'Request to book' : 'Currently unavailable'}
            </Button>
            <p className="mt-2.5 text-center text-xs text-faint">
              You won't be charged until the seller approves.
            </p>

            {seller && (
              <div className="mt-[18px] border-t border-chip pt-[18px] space-y-3">
                <div className="flex items-center gap-2.5">
                  <span
                    onClick={() => navigate(`/sellers/${seller._id}`)}
                    className="flex h-[42px] w-[42px] flex-none items-center justify-center rounded-full bg-forest-light text-sm font-bold text-cream cursor-pointer hover:opacity-90 transition-opacity"
                  >
                    {seller.avatar ? (
                      <img src={seller.avatar} alt="" className="h-[42px] w-[42px] rounded-full object-cover" />
                    ) : (
                      seller.name?.slice(0, 2).toUpperCase()
                    )}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div
                      onClick={() => navigate(`/sellers/${seller._id}`)}
                      className="flex items-center gap-1.5 text-sm font-bold text-ink hover:text-forest transition-colors cursor-pointer truncate"
                    >
                      <span>{seller.name}</span>
                      <BadgeCheck className="h-3.5 w-3.5 text-forest flex-none" />
                    </div>
                    <div className="text-xs text-faint truncate">
                      {sellerStats ? `${sellerStats.followerCount} followers` : `Member since ${formatDate(seller.createdAt)}`}
                    </div>
                  </div>
                </div>

                <FollowButton
                  sellerId={seller._id || ''}
                  sellerName={seller.name}
                  isFollowing={sellerStats?.isFollowing || false}
                  followerCount={sellerStats?.followerCount}
                  onFollowChange={(isFollowing, newCount) => {
                    setSellerStats((prev) =>
                      prev
                        ? { ...prev, isFollowing, followerCount: newCount !== undefined ? newCount : prev.followerCount }
                        : null
                    );
                  }}
                  variant="outline"
                  size="sm"
                  className="w-full"
                />
              </div>
            )}
          </div>
        </aside>
      </div>

      {bookingOpen && (
        <BookingModal
          orchard={orchard}
          submitting={submitting}
          onClose={() => setBookingOpen(false)}
          onConfirm={confirmBooking}
        />
      )}

      {writeReviewOpen && orchard && (
        <WriteReviewModal
          orchardId={orchard._id}
          gardenName={orchard.gardenName}
          booking={reviewableBooking}
          existingReview={editingReview}
          onClose={() => {
            setWriteReviewOpen(false);
            setEditingReview(null);
          }}
          onSuccess={() => {
            if (orchard) {
              loadReviews(orchard._id, 1, reviewSort);
              checkReviewableBooking(orchard._id);
              orchardService.getBySlug(slug).then(setOrchard).catch(() => {});
            }
          }}
        />
      )}


      {/* You May Also Like / Similar Orchards */}
      {orchard && <SimilarOrchardsSection orchardId={orchard._id} />}
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-[5px]">
      <span>{label}</span>
      <span className="font-semibold text-ink">{value}</span>
    </div>
  );
}

function SimilarOrchardsSection({ orchardId }: { orchardId: string }) {
  const [similar, setSimilar] = useState<RecommendationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSimilar = () => {
    setLoading(true);
    recommendationService
      .getSimilar(orchardId, 4)
      .then((res) => setSimilar(res.recommendations))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (orchardId) fetchSimilar();
  }, [orchardId]);

  if (!loading && similar.length === 0) return null;

  return (
    <div className="mt-14 border-t border-sand pt-8">
      <RecommendedSection
        title="You May Also Like — Similar Orchards"
        subtitle="Orchards matching similar fruit varieties, region, price range, and guest ratings."
        items={similar}
        isLoading={loading}
        onRetry={fetchSimilar}
        maxItems={4}
        badgeText="Smart Similar Match"
      />
    </div>
  );
}


function DetailSkeleton() {
  return (
    <main className="mx-auto max-w-[1180px] px-6 pb-16 pt-5">
      <div className="sk mb-5 h-4 w-32 rounded" />
      <div className="sk mb-3 h-8 w-[55%] rounded-lg" />
      <div className="sk mb-6 h-4 w-[35%] rounded-lg" />
      <div className="sk mb-6 rounded-[18px]" style={{ height: 'clamp(260px,38vw,420px)' }} />
      <div className="flex flex-wrap gap-7">
        <div className="flex-[2_1_460px]">
          <div className="sk h-[230px] rounded-xl" />
        </div>
        <div className="flex-1 basis-[320px]">
          <div className="sk h-[330px] rounded-xl" />
        </div>
      </div>
    </main>
  );
}
