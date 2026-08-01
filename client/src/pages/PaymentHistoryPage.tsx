import { useEffect, useState } from 'react';
import { 
  Search, 
  Download, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  Clock 
} from 'lucide-react';
import { paymentService, type PaymentRecord } from '@/services/payment.service';
import { Spinner, Button, EmptyState, Badge } from '@/components/ui';
import { formatDate, formatCurrency } from '@/lib/format';
import { useToast } from '@/context/ToastContext';
import { getErrorMessage } from '@/lib/apiClient';

export default function PaymentHistoryPage() {
  const toast = useToast();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED' | ''>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchHistory = () => {
    setLoading(true);
    const params = {
      ...(search.trim() ? { search: search.trim() } : {}),
      status: status || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    } as any;

    paymentService
      .getHistory(params)
      .then((res) => setPayments(res.payments || []))
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchHistory();
  }, [status, startDate, endDate]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchHistory();
  };

  const downloadReceipt = async (payment: PaymentRecord) => {
    try {
      const fullPayment = await paymentService.getReceipt(payment._id);
      generatePaymentInvoicePDF((fullPayment as any).bookingId, {
        paymentId: fullPayment._id,
        transactionId: fullPayment.transactionId,
        receiptNumber: fullPayment.receiptNumber,
        paymentMethod: fullPayment.paymentMethod,
        paidAt: fullPayment.paidAt,
        amount: fullPayment.amount,
      });
      toast.success('Invoice downloaded successfully');
    } catch (err) {
      toast.error('Failed to download invoice receipt');
    }
  };

  return (
    <main className="mx-auto max-w-[1000px] px-6 pb-16 pt-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-[28px] font-bold text-ink">Payment History</h1>
          <p className="mt-1 text-xs text-sub">
            View, filter, and download receipts for all lease transactions on OrchardLease.
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-sand bg-cream p-4 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sub" />
          <input
            type="text"
            placeholder="Search by Txn ID or Receipt #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-sand bg-white py-2 pl-9 pr-3 text-xs text-ink placeholder:text-faint focus:border-forest focus:outline-none"
          />
        </form>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED' | '')}
          className="rounded-xl border border-sand bg-white py-2 px-3 text-xs text-ink focus:border-forest focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="SUCCESS">Success</option>
          <option value="PENDING">Pending</option>
          <option value="FAILED">Failed</option>
          <option value="REFUNDED">Refunded</option>
        </select>

        <div className="flex items-center gap-2 text-xs text-sub">
          <Calendar className="h-4 w-4 text-forest" />
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="rounded-xl border border-sand bg-white py-1.5 px-2.5 text-xs text-ink"
          />
          <span>to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="rounded-xl border border-sand bg-white py-1.5 px-2.5 text-xs text-ink"
          />
        </div>
      </div>

      {/* Payment Table */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner className="h-8 w-8 text-forest" />
        </div>
      ) : payments.length === 0 ? (
        <EmptyState
          emoji="💳"
          title="No transactions found"
          description="There are no payment records matching your current filter criteria."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-sand bg-cream shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-sand bg-sand/30 font-bold text-forest">
                <tr>
                  <th className="px-4 py-3">Receipt / Txn ID</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand/60 text-ink">
                {payments.map((p) => (
                  <tr key={p._id} className="hover:bg-sand/20 transition-colors">
                    <td className="px-4 py-3.5 font-mono">
                      <div className="font-bold">{p.receiptNumber || 'N/A'}</div>
                      <div className="text-[10px] text-faint">{p.transactionId}</div>
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-sub">{p.paymentMethod}</td>
                    <td className="px-4 py-3.5 font-serif font-bold text-forest text-sm">
                      {formatCurrency(p.amount)}
                    </td>
                    <td className="px-4 py-3.5">
                      {p.status === 'SUCCESS' ? (
                        <Badge tone="green" className="flex w-max items-center gap-1">
                          <CheckCircle className="h-3 w-3" /> Success
                        </Badge>
                      ) : p.status === 'FAILED' ? (
                        <Badge className="flex w-max items-center gap-1">
                          <XCircle className="h-3 w-3" /> Failed
                        </Badge>
                      ) : (
                        <Badge className="flex w-max items-center gap-1">
                          <Clock className="h-3 w-3" /> {p.status}
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-faint">
                      {formatDate(p.paidAt || p.createdAt)}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {p.status === 'SUCCESS' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => downloadReceipt(p)}
                          className="flex items-center gap-1 text-[11px] text-forest hover:bg-forest/10"
                        >
                          <Download className="h-3.5 w-3.5" /> Receipt
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}

function generatePaymentInvoicePDF(_bookingId: any, _arg1: { paymentId: string; transactionId: string; receiptNumber: string; paymentMethod: "UPI" | "CARD" | "NET_BANKING" | "WALLET" | "OTHER"; paidAt: string | undefined; amount: number; }) {
    throw new Error('Function not implemented.');
}
