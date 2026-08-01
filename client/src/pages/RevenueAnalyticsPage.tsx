import { useEffect, useState } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  Calendar, 
  Download, 
  Trees, 
  BarChart3 
} from 'lucide-react';
import { analyticsService, type AnalyticsData } from '@/services/analytics.service';
import { Spinner, Button, EmptyState } from '@/components/ui';
import { formatCurrency } from '@/lib/format';
import { useToast } from '@/context/ToastContext';
import { getErrorMessage } from '@/lib/apiClient';

export default function RevenueAnalyticsPage() {
  const toast = useToast();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyticsService
      .getSellerRevenue()
      .then(setData)
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const exportReport = () => {
    if (!data) return;
    
    const rows = [
      ['Orchard Name', 'Total Leases', 'Total Revenue (INR)'],
      ...data.orchardBreakdown.map((item) => [
        item.gardenName,
        item.totalLeases,
        item.revenue,
      ]),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Revenue_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Revenue report CSV downloaded');
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="h-8 w-8 text-forest" />
      </div>
    );
  }

  if (!data) {
    return (
      <main className="mx-auto max-w-[1100px] px-6 py-12">
        <EmptyState
          emoji="📈"
          title="No Analytics Available"
          description="Revenue data will appear once your orchards receive completed lease payments."
        />
      </main>
    );
  }

  const { summary, monthlyTrend, orchardBreakdown } = data;

  return (
    <main className="mx-auto max-w-[1100px] px-6 pb-16 pt-8">
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-[28px] font-bold text-ink">Revenue Analytics</h1>
          <p className="mt-1 text-xs text-sub">
            Monitor earnings, lease performance, and financial trends across all your listed orchards.
          </p>
        </div>

        <Button onClick={exportReport} className="flex items-center gap-2">
          <Download className="h-4 w-4" /> Export CSV Report
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-sand bg-cream p-5 shadow-sm">
          <div className="flex items-center justify-between text-sub mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Revenue</span>
            <DollarSign className="h-5 w-5 text-forest" />
          </div>
          <div className="font-serif text-2xl font-bold text-forest">
            {formatCurrency(summary.totalRevenue)}
          </div>
          <p className="mt-1 text-[11px] text-faint">Lifetime earnings from completed leases</p>
        </div>

        <div className="rounded-2xl border border-sand bg-cream p-5 shadow-sm">
          <div className="flex items-center justify-between text-sub mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Completed Leases</span>
            <Calendar className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="font-serif text-2xl font-bold text-ink">
            {summary.totalCompletedLeases}
          </div>
          <p className="mt-1 text-[11px] text-faint">Successful lease agreements</p>
        </div>

        <div className="rounded-2xl border border-sand bg-cream p-5 shadow-sm">
          <div className="flex items-center justify-between text-sub mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Active Orchards</span>
            <Trees className="h-5 w-5 text-amber-600" />
          </div>
          <div className="font-serif text-2xl font-bold text-ink">
            {summary.totalOrchards}
          </div>
          <p className="mt-1 text-[11px] text-faint">Orchards earning revenue</p>
        </div>
      </div>

      {/* Monthly Trends */}
      <div className="mb-8 rounded-2xl border border-sand bg-cream p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2 border-b border-sand pb-3">
          <TrendingUp className="h-5 w-5 text-forest" />
          <h2 className="font-serif text-lg font-bold text-ink">Monthly Revenue Trend</h2>
        </div>

        {monthlyTrend.length === 0 ? (
          <p className="py-6 text-center text-xs text-faint">No monthly earnings data recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {monthlyTrend.map((m) => (
              <div key={m.period} className="flex items-center justify-between text-xs">
                <span className="font-mono font-semibold text-sub w-20">{m.period}</span>
                <div className="flex-1 mx-4 h-3 rounded-full bg-sand/30 overflow-hidden">
                  <div
                    className="h-full bg-forest rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, (m.revenue / (summary.totalRevenue || 1)) * 100)}%`,
                    }}
                  />
                </div>
                <span className="font-bold text-ink min-w-[80px] text-right">
                  {formatCurrency(m.revenue)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Orchard Performance Breakdown */}
      <div className="rounded-2xl border border-sand bg-cream p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2 border-b border-sand pb-3">
          <BarChart3 className="h-5 w-5 text-forest" />
          <h2 className="font-serif text-lg font-bold text-ink">Revenue Breakdown by Orchard</h2>
        </div>

        {orchardBreakdown.length === 0 ? (
          <p className="py-6 text-center text-xs text-faint">No orchard revenue records found.</p>
        ) : (
          <div className="divide-y divide-sand/60">
            {orchardBreakdown.map((item) => (
              <div key={item._id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <h3 className="font-bold text-ink text-sm">{item.gardenName}</h3>
                  <span className="text-faint">{item.totalLeases} leases completed</span>
                </div>
                <div className="font-serif font-bold text-forest text-base">
                  {formatCurrency(item.revenue)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
