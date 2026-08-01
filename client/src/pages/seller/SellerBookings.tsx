import { useEffect, useState } from 'react';
import { CalendarDays, FileDown, X } from 'lucide-react';
import { bookingService } from '@/services/booking.service';
import { EmptyState, Badge, statusTone, Spinner } from '@/components/ui';
import { useToast } from '@/context/ToastContext';
import { formatCurrency, formatDate, titleCase } from '@/lib/format';
import { initialsOf } from '@/lib/avatar';
import { getErrorMessage } from '@/lib/apiClient';
import { cn } from '@/lib/cn';
import type { Booking, Orchard, User } from '@/types';

const TABS = [
  ['all', 'All'],
  ['requested', 'Pending'],
  ['approved', 'Approved'],
  ['rejected', 'Rejected'],
  ['completed', 'Completed'],
] as const;

export default function SellerBookings() {
  const toast = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // State for Rejection Modal
  const [rejectingBooking, setRejectingBooking] = useState<Booking | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [submittingReject, setSubmittingReject] = useState(false);

  const load = () => {
    setLoading(true);
    bookingService
      .list({ role: 'seller', status: tab === 'all' ? undefined : tab })
      .then((res) => setBookings(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, [tab]);

  const act = async (fn: () => Promise<unknown>, msg: string) => {
    try {
      await fn();
      toast.success(msg);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingBooking) return;

    if (!rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    setSubmittingReject(true);
    try {
      await bookingService.reject(rejectingBooking._id, rejectionReason.trim());
      toast.success('Lease request rejected and applicant notified');
      setRejectingBooking(null);
      setRejectionReason('');
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmittingReject(false);
    }
  };

  const downloadAgreement = async (id: string) => {
    setDownloadingId(id);
    try {
      await bookingService.downloadAgreement(id);
      toast.success('Lease agreement downloaded');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <main className="mx-auto max-w-[1000px] px-6 pb-16 pt-[26px]">
      <h1 className="mb-1 font-serif text-[27px] font-semibold">Booking requests</h1>
      <p className="mb-5 text-[13.5px] text-faint">Review and respond to lease requests on your orchards.</p>

      <div className="mb-5 flex flex-wrap gap-2">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'rounded-full border px-3.5 py-[7px] text-[12.5px] font-semibold transition-all',
              tab === key ? 'border-forest bg-forest text-cream' : 'border-sand text-sub hover:border-faint'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-7 w-7" />
        </div>
      ) : bookings.length === 0 ? (
        <EmptyState emoji="🧺" title="No bookings in this view" description="Try another tab." />
      ) : (
        <div className="flex flex-col gap-3">
          {bookings.map((b) => {
            const renter = b.renterId as User;
            const o = b.orchardId as Orchard;
            const isDownloading = downloadingId === b._id;
            return (
              <div key={b._id} className="flex flex-col gap-3 rounded-[15px] border border-sand bg-cream p-[17px]">
                <div className="flex flex-wrap items-center gap-3.5">
                  <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-forest-light text-sm font-bold text-cream">
                    {initialsOf(renter?.name)}
                  </span>
                  <div className="min-w-[180px] flex-1 basis-[200px]">
                    <div className="text-[14.5px] font-bold">{renter?.name}</div>
                    <div className="my-0.5 text-[12.5px] text-faint">{o?.gardenName}</div>
                    <div className="flex items-center gap-1.5 text-[12.5px] text-[#3a4632]">
                      <CalendarDays className="h-3 w-3 text-faint" />
                      {formatDate(b.startDate)} → {formatDate(b.endDate)}
                    </div>
                  </div>
                  <div className="flex-none text-right">
                    <Badge tone={statusTone[b.bookingStatus] || 'gray'}>{titleCase(b.bookingStatus)}</Badge>
                    <div className="mt-[7px] font-serif text-[17px] font-bold">{formatCurrency(b.totalAmount)}</div>
                  </div>
                  <div className="flex flex-none flex-wrap gap-2">
                    {b.bookingStatus === 'requested' && (
                      <>
                        <button
                          onClick={() => act(() => bookingService.approve(b._id), 'Booking approved — renter notified')}
                          className="rounded-[9px] bg-forest px-[15px] py-2.5 text-[12.5px] font-bold text-cream hover:bg-forest-dark transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => {
                            setRejectingBooking(b);
                            setRejectionReason('');
                          }}
                          className="rounded-[9px] bg-[#f3e7e1] px-[15px] py-2.5 text-[12.5px] font-semibold text-[#a05a45] hover:bg-[#ebd9d1] transition-colors"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {b.bookingStatus === 'approved' && (
                      <button
                        onClick={() => act(() => bookingService.complete(b._id), 'Marked complete')}
                        className="rounded-[9px] border border-sand bg-white px-[15px] py-2.5 text-[12.5px] font-semibold text-ink hover:bg-sand/20 transition-colors"
                      >
                        Mark complete
                      </button>
                    )}
                    {['approved', 'completed'].includes(b.bookingStatus) && (
                      <button
                        id={`seller-download-agreement-${b._id}`}
                        onClick={() => downloadAgreement(b._id)}
                        disabled={isDownloading}
                        className="flex items-center gap-1.5 rounded-[9px] bg-[#2a4e20] px-[15px] py-2.5 text-[12.5px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                      >
                        {isDownloading ? (
                          <Spinner className="h-3.5 w-3.5 text-white" />
                        ) : (
                          <FileDown className="h-3.5 w-3.5" />
                        )}
                        {isDownloading ? 'Generating…' : 'Download Agreement'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Show rejection reason if available */}
                {b.bookingStatus === 'rejected' && b.rejectionReason && (
                  <div className="mt-1 rounded-lg bg-rose-50/70 border border-rose-200 p-2.5 text-[12.5px] text-rose-800">
                    <span className="font-semibold">Rejection reason: </span>
                    {b.rejectionReason}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Rejection Modal */}
      {rejectingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-sand animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-sand">
              <h3 className="font-serif text-lg font-bold text-ink">Reject Lease Request</h3>
              <button
                onClick={() => setRejectingBooking(null)}
                className="rounded-full p-1 text-faint hover:bg-sand/30 hover:text-ink transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleRejectSubmit} className="mt-4 flex flex-col gap-4">
              <p className="text-[13px] text-sub">
                Please enter a reason for rejecting the lease request from{' '}
                <strong className="text-ink">{(rejectingBooking.renterId as User)?.name}</strong>. This will be automatically sent to the applicant.
              </p>

              <div>
                <label htmlFor="rejectionReason" className="mb-1 block text-[12px] font-semibold text-ink">
                  Reason for Rejection *
                </label>
                <textarea
                  id="rejectionReason"
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g., Dates overlap with maintenance, orchard temporarily unavailable..."
                  required
                  className="w-full rounded-xl border border-sand bg-cream p-3 text-[13px] text-ink placeholder:text-faint focus:border-forest focus:outline-none focus:ring-1 focus:ring-forest"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectingBooking(null)}
                  disabled={submittingReject}
                  className="rounded-xl border border-sand px-4 py-2 text-[12.5px] font-semibold text-sub hover:bg-sand/20 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReject || !rejectionReason.trim()}
                  className="flex items-center justify-center min-w-[100px] rounded-xl bg-[#a05a45] px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-[#884a37] transition-colors disabled:opacity-50"
                >
                  {submittingReject ? <Spinner className="h-4 w-4 text-white" /> : 'Confirm Reject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
