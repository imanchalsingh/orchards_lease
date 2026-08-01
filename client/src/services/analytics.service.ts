import apiClient from '@/lib/apiClient';
import type { ApiResponse } from '@/types';

export interface RevenueSummary {
  totalRevenue: number;
  totalCompletedLeases: number;
  totalOrchards: number;
}

export interface MonthlyTrendItem {
  period: string;
  revenue: number;
  leasesCount: number;
}

export interface YearlyTrendItem {
  year: string;
  revenue: number;
  leasesCount: number;
}

export interface OrchardBreakdownItem {
  _id: string;
  gardenName: string;
  revenue: number;
  totalLeases: number;
}

export interface AnalyticsData {
  summary: RevenueSummary;
  monthlyTrend: MonthlyTrendItem[];
  yearlyTrend: YearlyTrendItem[];
  orchardBreakdown: OrchardBreakdownItem[];
}

export const analyticsService = {
  async getSellerRevenue(): Promise<AnalyticsData> {
    const { data } = await apiClient.get<ApiResponse<AnalyticsData>>('/analytics/seller/revenue');
    return data.data;
  },
};
