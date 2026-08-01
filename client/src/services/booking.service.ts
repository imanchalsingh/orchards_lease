import apiClient from '@/lib/apiClient';
import type { ApiResponse, Booking } from '@/types';
import { generateLeaseAgreementPDF } from '@/lib/leaseAgreement';

export const bookingService = {
  list: async (params?: { role?: string; status?: string; page?: number }) => {
    const res = await apiClient.get<ApiResponse<Booking[]>>('/bookings', { params });
    return res.data;
  },

  async history(params: {
    role: 'renter' | 'seller';
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { data } = await apiClient.get<ApiResponse<Booking[]>>('/bookings', {
      params: {
        ...params,
        statuses: 'completed,cancelled,rejected',
        limit: params.limit ?? 50,
      },
    });
    return data;
  },

  async get(id: string) {
    const { data } = await apiClient.get<ApiResponse<Booking>>(`/bookings/${id}`);
    return data.data;
  },

  async downloadAgreement(id: string) {
    const booking = await this.get(id);
    generateLeaseAgreementPDF(booking);
  },

  create: async (data: { orchardId: string; startDate: string; endDate: string; message?: string; proposedPrice?: number }) => {
    const res = await apiClient.post<ApiResponse<Booking>>('/bookings', data);
    return res.data.data;
  },

  // Price Negotiation Methods (Issue #104)
  negotiate: async (bookingId: string, data: { amount: number; note?: string }) => {
    const res = await apiClient.post<ApiResponse<Booking>>(`/bookings/${bookingId}/negotiate`, data);
    return res.data.data;
  },

  acceptOffer: async (bookingId: string) => {
    const res = await apiClient.post<ApiResponse<Booking>>(`/bookings/${bookingId}/negotiate/accept`);
    return res.data.data;
  },

  rejectOffer: async (bookingId: string) => {
    const res = await apiClient.post<ApiResponse<Booking>>(`/bookings/${bookingId}/negotiate/reject`);
    return res.data.data;
  },

  // Lease Renewal Request Method (Issue #27)
  requestRenewal: async (bookingId: string, data: { newEndDate: string; message?: string }) => {
    const res = await apiClient.post<ApiResponse<Booking>>(`/bookings/${bookingId}/renew`, data);
    return res.data.data;
  },

  approve: async (bookingId: string) => {
    const res = await apiClient.post<ApiResponse<Booking>>(`/bookings/${bookingId}/approve`);
    return res.data.data;
  },

  reject: async (bookingId: string, reason?: string) => {
    const res = await apiClient.post<ApiResponse<Booking>>(`/bookings/${bookingId}/reject`, { reason });
    return res.data.data;
  },

  cancel: async (bookingId: string, reason?: string) => {
    const res = await apiClient.post<ApiResponse<Booking>>(`/bookings/${bookingId}/cancel`, { reason });
    return res.data.data;
  },

  complete: async (bookingId: string) => {
    const res = await apiClient.post<ApiResponse<Booking>>(`/bookings/${bookingId}/complete`);
    return res.data.data;
  },
};
