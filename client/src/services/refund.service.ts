import apiClient from '@/lib/apiClient';
import type { ApiResponse } from '@/types';

export interface RefundItem {
  _id: string;
  bookingId: { _id: string; gardenName: string; totalAmount: number };
  paymentId?: string;
  requesterId: { _id: string; name: string; email: string };
  amount: number;
  reason: string;
  status: 'REQUESTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'PROCESSED';
  adminNotes?: string;
  processedAt?: string;
  createdAt: string;
}

export const refundService = {
  async requestRefund(bookingId: string, reason: string) {
    const { data } = await apiClient.post<ApiResponse<RefundItem>>('/refunds/request', {
      bookingId,
      reason,
    });
    return data.data;
  },

  async getUserRefunds() {
    const { data } = await apiClient.get<ApiResponse<RefundItem[]>>('/refunds/history');
    return data.data;
  },

  async getRefundStatus(refundId: string) {
    const { data } = await apiClient.get<ApiResponse<RefundItem>>(`/refunds/${refundId}`);
    return data.data;
  },

  async listAdminRefunds() {
    const { data } = await apiClient.get<ApiResponse<RefundItem[]>>('/refunds/admin/all');
    return data.data;
  },

  async processRefund(refundId: string, status: string, adminNotes?: string) {
    const { data } = await apiClient.patch<ApiResponse<RefundItem>>(`/refunds/${refundId}/process`, {
      status,
      adminNotes,
    });
    return data.data;
  },
};
