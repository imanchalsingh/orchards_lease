import { useEffect, useState } from 'react';
import { 
  ShieldAlert, 
  EyeOff, 
  Eye, 
  Trash2, 
  CheckCircle, 
  Star} from 'lucide-react';
import { reviewService } from '@/services/review.service';
import { EmptyState, Badge, Spinner, Button } from '@/components/ui';
import { useToast } from '@/context/ToastContext';
import { formatDate } from '@/lib/format';
import { getErrorMessage } from '@/lib/apiClient';
import { cn } from '@/lib/cn';
import type { Review } from '@/types';

export default function AdminReviewModerationPage() {
  const toast = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'reported' | 'hidden'>('reported');

  const fetchReportedReviews = () => {
    setLoading(true);
    reviewService
      .getAdminReportedReviews(1, 20, filter === 'all' ? undefined : filter)
      .then((res) => {
        setReviews(res.data || []);
      })
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchReportedReviews();
  }, [filter]);

  const handleModerateAction = async (
    reviewId: string, 
    action: 'hide' | 'unhide' | 'dismiss' | 'delete'
  ) => {
    try {
      await reviewService.moderateReview(reviewId, action);
      toast.success(`Action '${action}' applied to review`);
      fetchReportedReviews();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <main className="mx-auto max-w-[1000px] px-6 pb-16 pt-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-serif text-[28px] font-bold text-ink">Review Moderation</h1>
            <Badge className="flex items-center gap-1 font-bold">
              <ShieldAlert className="h-3.5 w-3.5" /> Moderation Active
            </Badge>
          </div>
          <p className="mt-1 text-xs text-sub">
            Review reported, misleading, or offensive feedback and moderate platform content.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-2 border-b border-sand pb-3">
        {(['reported', 'hidden', 'all'] as const).map((key) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={cn(
              'rounded-full px-4 py-1.5 text-xs font-semibold capitalize transition-all',
              filter === key
                ? 'bg-forest text-cream shadow-sm'
                : 'bg-cream text-sub border border-sand hover:border-faint'
            )}
          >
            {key} Reviews
          </button>
        ))}
      </div>

      {/* Moderation List */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner className="h-8 w-8 text-forest" />
        </div>
      ) : reviews.length === 0 ? (
        <EmptyState
          emoji="🛡️"
          title="No reported reviews"
          description="There are currently no flagged or violating reviews requiring administrative action."
        />
      ) : (
        <div className="flex flex-col gap-4">
          {reviews.map((rev) => (
            <div
              key={rev._id}
              className={cn(
                'rounded-2xl border p-5 transition-all bg-cream/80',
                rev.isHidden ? 'border-amber-300 bg-amber-50/20' : 'border-sand'
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex items-center text-amber-500 font-bold text-sm">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400 mr-1" />
                    {rev.rating} / 5
                  </div>
                  {rev.isReported && (
                    <Badge className="text-[10px] font-semibold bg-rose-50 text-rose-600">
                      Flagged by Users
                    </Badge>
                  )}
                  {rev.isHidden && (
                    <Badge className="text-[10px] font-semibold bg-amber-50 text-amber-700">
                      Hidden from Public
                    </Badge>
                  )}
                </div>

                <span className="text-[11px] text-faint">{formatDate(rev.createdAt)}</span>
              </div>

              {/* Review Content */}
              <p className="mt-3 text-sm text-ink leading-relaxed italic">
                "{rev.comment || 'No textual comment provided.'}"
              </p>

              {/* Action Buttons */}
              <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-sand/60 pt-3">
                {rev.isReported && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleModerateAction(rev._id, 'dismiss')}
                    className="flex items-center gap-1.5 text-xs text-sub hover:text-ink"
                  >
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                    Dismiss Report
                  </Button>
                )}

                {rev.isHidden ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleModerateAction(rev._id, 'unhide')}
                    className="flex items-center gap-1.5 text-xs text-forest hover:bg-forest/10"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Unhide Review
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleModerateAction(rev._id, 'hide')}
                    className="flex items-center gap-1.5 text-xs text-amber-700 hover:bg-amber-100/50"
                  >
                    <EyeOff className="h-3.5 w-3.5" />
                    Hide Review
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleModerateAction(rev._id, 'delete')}
                  className="flex items-center gap-1.5 text-xs text-rose-600 hover:bg-rose-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete Permanently
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
