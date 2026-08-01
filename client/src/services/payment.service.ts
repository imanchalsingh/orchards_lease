import apiClient from '@/lib/apiClient';
import type { ApiResponse } from '@/types';

export interface PaymentRecord {
  _id: string;
  bookingId: string;
  payerId: string;
  recipientId: string;
  amount: number;
  currency: string;
  paymentGateway: string;
  paymentMethod: 'CARD' | 'UPI' | 'NET_BANKING' | 'WALLET' | 'OTHER';
  transactionId: string;
  receiptNumber: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
  failureReason?: string;
  paidAt?: string;
  createdAt: string;
}

export interface PaymentHistoryParams {
  page?: number;
  limit?: number;
  bookingId?: string;
  payerId?: string;
  recipientId?: string;
  status?: 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
}

export const paymentService = {
  async initialize(bookingId: string, paymentMethod: string = 'UPI') {
    const { data } = await apiClient.post<ApiResponse<{
      paymentId: string;
      transactionId: string;
      amount: number;
      currency: string;
      receiptNumber: string;
    }>>('/payments/initialize', { bookingId, paymentMethod });
    return data.data;
  },

  async getHistory(params?: PaymentHistoryParams) {
    const { data } = await apiClient.get<
      ApiResponse<{
        payments: PaymentRecord[];
        pagination: { total: number; page: number; pages: number };
      }>
    >('/payments/history', { params });
    return data.data;
  },

  async verify(paymentId: string, status: 'SUCCESS' | 'FAILED' = 'SUCCESS', failureReason?: string) {
    const { data } = await apiClient.post<ApiResponse<PaymentRecord>>('/payments/verify', {
      paymentId,
      status,
      failureReason,
    });
    return data.data;
  },

  async getReceipt(paymentId: string) {
    const { data } = await apiClient.get<ApiResponse<PaymentRecord>>(`/payments/${paymentId}/receipt`);
    return data.data;
  },
};