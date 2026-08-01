import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  Heart, 
  GitCompareArrows, 
  Star, 
  MapPin, 
  Calendar, 
  DollarSign,
} from 'lucide-react';
import { orchardService } from '@/services/orchard.service';
import { bookingService } from '@/services/booking.service';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useMarketplace } from '@/context/MarketplaceContext';
import { Button, EmptyState, Badge } from '@/components/ui';
import { BookingModal } from '@/components/orchard/BookingModal';
import { OrchardQA } from '@/components/orchard/OrchardQA';
import { AvailabilityCalendar } from '@/components/orchard/AvailabilityCalendar';
import { OrchardMap } from '@/components/orchard/OrchardMap';
import { WeatherCard } from '@/components/orchard/WeatherCard';
import { OrchardHealthScore } from '@/components/orchard/OrchardHealthScore';
import { HarvestTimeline } from '@/components/orchard/HarvestTimeline';
import { formatCurrency, formatDate } from '@/lib/format';
import { orchardSurface } from '@/lib/gradients';
import { getErrorMessage } from '@/lib/apiClient';
import { cn } from '@/lib/cn';
import { reviewService } from '@/services/review.service';
import { recommendationService } from '@/services/recommendation.service';
import { ReviewList } from '@/components/orchard/ReviewList';
import { RecommendedSection } from '@/components/recommendation/RecommendedSection';
import type { Orchard, Review, PageMeta, RecommendationItem } from '@/types';

export default function OrchardDetailPage() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const { isSaved, isCompared, toggleSave, toggleCompare, refreshBookingCount } = useMarketplace();

  const [orchard, setOrchard] = useState<Orchard | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewMeta, setReviewMeta] = useState<PageMeta | undefined>(undefined);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewSort, setReviewSort] = useState<'newest' | 'highest' | 'lowest'>('newest');

  const [loading, setLoading] = useState(true);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Price Negotiation state (Issue #104)
  const [customPrice, setCustomPrice] = useState<string>('');

  const loadReviews = (orchardId: string, page = 1, sort: 'newest' | 'highest' | 'lowest' = 'newest') => {
    setReviewsLoading(true);
    reviewService
      .getOrchardReviews(orchardId, page, 5, sort)
      .then((res) => {
        setReviews(res.reviews);
        if (res.meta) setReviewMeta(res.meta);
      })
      .catch(() => {})
      .finally(() => setReviewsLoading(false));
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!window.confirm('Are you sure you want to delete your review?')) return;
    try {
      await reviewService.deleteReview(reviewId);
      toast.success('Review deleted');
      if (orchard) {
        loadReviews(orchard._id, 1, reviewSort);
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

  const confirmBooking = async (startDate: string, endDate: string, message?: string) => {
    if (!orchard) return;
    setSubmitting(true);
    try {
      const parsedProposedPrice = customPrice ? parseFloat(customPrice) : undefined;
      await bookingService.create({ 
        orchardId: orchard._id, 
        startDate, 
        endDate, 
        message, 
        proposedPrice: parsedProposedPrice 
      });
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

  const hasRealImages = orchard.images && orchard.images.length > 0 && orchard.images.some(img => img?.url);
  const galleryItems = hasRealImages 
    ? orchard.images.filter(img => img?.url).map(img => img.url)
    : Array.from({ length: 4 }).map(() => orchard.thumbnail || '');
    
  const currentImageUrl = hasRealImages
    ? (galleryItems[galleryIndex] || galleryItems[0] || orchard.thumbnail)
    : orchard.thumbnail;
    
  const surface = orchardSurface(currentImageUrl, orchard.fruitTypes, orchard._id);
  const rent = orchard.rentType?.startsWith('per') ? orchard.rentType : `per ${orchard.rentType}`;
  const effectivePrice = customPrice && !isNaN(parseFloat(customPrice)) ? parseFloat(customPrice) : orchard.price;
  const fee = Math.round(effectivePrice * 0.08);
  const dep = Math.round(effectivePrice * 0.15);
  const saved = isSaved(orchard._id);
  const plantationYear = (orchard as any).plantationYear || 2020;
  const calculatedAge = 2026 - plantationYear;
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
      <div className="mb-7 flex items-stretch gap-2.5">
        <div className="relative flex-1 overflow-hidden rounded-[18px]" style={{ height: 'clamp(260px,38vw,420px)', ...surface }}>
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg,transparent 55%,rgba(20,30,15,.4))' }} />
          <div className="absolute bottom-3.5 left-4 text-[11px] font-bold uppercase tracking-[.1em] text-cream/80">
            Orchard photo · {orchard.district}, {orchard.state}
          </div>
        </div>
        <div className="flex w-[84px] flex-none flex-col gap-2.5 overflow-y-auto max-h-[420px] scrollbar-none pr-1">
          {galleryItems.map((url, idx) => {
            const itemSurface = orchardSurface(url, orchard.fruitTypes, orchard._id);
            return (
              <button
                key={idx}
                onClick={() => setGalleryIndex(idx)}
                className="h-[70px] w-full rounded-[10px] flex-none"
                style={{
                  ...itemSurface,
                  filter: !hasRealImages ? `hue-rotate(${idx * 14}deg) brightness(${idx === galleryIndex ? 1 : 0.86})` : `brightness(${idx === galleryIndex ? 1 : 0.86})`,
                  outline: idx === galleryIndex ? '2px solid #2f5d3a' : '2px solid transparent',
                  outlineOffset: '2px',
                }}
              />
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-start gap-[30px]">
        {/* Left column */}
        <div className="min-w-[300px] flex-[2_1_480px]">
          <p className="mb-6 max-w-[64ch] text-[15.5px] leading-[1.65] text-[#3a4632]">{orchard.description}</p>

          <h2 className="mb-3.5 font-serif text-[19px] font-semibold">Orchard at a glance</h2>
          <div className="mb-7 grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-px overflow-hidden rounded-xl border border-sand bg-sand">
            {stats.map((st) => (
              <div key={st.k} className="bg-cream px-4 py-4">
                <div className="mb-1.5 text-[11.5px] font-bold uppercase tracking-[.05em] text-faint">{st.k}</div>
                <div className="font-serif text-[18px] font-semibold text-ink">{st.v}</div>
              </div>
            ))}
          </div>

          <div className="mb-8">
            <AvailabilityCalendar orchardId={orchard._id} />
          </div>

          <div className="mb-7">
            <HarvestTimeline harvestSeasons={orchard.harvestSeasons} />
          </div>

          <div className="mb-8">
            <OrchardHealthScore orchardId={orchard._id} />
          </div>

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

          <h2 className="mb-3.5 font-serif text-[19px] font-semibold">Weather Insights</h2>
          <div className="mb-8">
            <WeatherCard orchardId={orchard._id} />
          </div>

          <div className="mb-10 mt-10 border-t border-sand pt-8">
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
                if (orchard) loadReviews(orchard._id, p, reviewSort);
              }}
              onEditReview={() => {}}
              onDeleteReview={handleDeleteReview}
            />
          </div>

          <h2 className="mb-3.5 font-serif text-[19px] font-semibold mt-10">Questions &amp; Answers</h2>
          <OrchardQA 
            orchardId={orchard._id} 
            sellerId={typeof orchard.sellerId === 'object' && orchard.sellerId ? (orchard.sellerId._id || '') : (orchard.sellerId as string)} 
          />
        </div>

        {/* Right booking & negotiation card */}
        <aside className="min-w-[300px] flex-1 basis-[320px] lg:sticky lg:top-[84px]">
          <div className="rounded-[18px] border border-sand bg-cream p-[22px] shadow-soft">
            <div className="mb-1 flex items-baseline gap-1.5">
              <span className="font-serif text-[28px] font-bold text-terra">{formatCurrency(effectivePrice)}</span>
              <span className="text-[13px] text-faint">{rent}</span>
            </div>
            {customPrice && parseFloat(customPrice) !== orchard.price && (
              <p className="text-[11px] text-forest font-semibold mb-2">
                Proposed price (Listed: {formatCurrency(orchard.price)})
              </p>
            )}

            <button
              onClick={requestBooking}
              className="mb-3.5 w-full rounded-xl border border-sand px-4 py-3 text-left hover:bg-sand/20 transition-colors"
            >
              <div className="mb-0.5 text-[11px] font-bold uppercase tracking-[.06em] text-faint">Lease dates</div>
              <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                <Calendar className="h-[15px] w-[15px] text-forest" />
                Select harvest dates
              </div>
            </button>

            {/* Price Negotiation Input Field */}
            <div className="mb-4 rounded-xl border border-sand bg-white p-3">
              <label htmlFor="customPriceInput" className="mb-1 flex items-center justify-between text-[11px] font-bold uppercase tracking-[.06em] text-faint">
                <span>Negotiate Price (Optional)</span>
                <DollarSign className="h-3.5 w-3.5 text-forest" />
              </label>
              <input
                id="customPriceInput"
                type="number"
                placeholder={`Default: ${orchard.price}`}
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
                className="w-full rounded-lg border border-sand bg-cream px-3 py-1.5 text-sm text-ink placeholder:text-faint focus:border-forest focus:outline-none"
              />
            </div>

            <div className="mb-3.5 text-[13px] text-sub">
              <Row label={`Lease (${rent})`} value={formatCurrency(effectivePrice)} />
              <Row label="Platform fee (8%)" value={formatCurrency(fee)} />
              <Row label="Refundable deposit" value={formatCurrency(dep)} />
              <div className="mt-1.5 flex justify-between border-t border-chip pt-3 text-[15px] font-bold text-ink">
                <span>Total</span>
                <span>{formatCurrency(effectivePrice + fee + dep)}</span>
              </div>
            </div>

            <Button className="w-full" size="lg" disabled={!orchard.available} onClick={requestBooking}>
              {orchard.available ? 'Request to book' : 'Currently unavailable'}
            </Button>
            <p className="mt-2.5 text-center text-xs text-faint">
              You won't be charged until the seller approves your offer.
            </p>
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
