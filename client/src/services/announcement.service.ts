import apiClient from '@/lib/apiClient';
import type { ApiResponse } from '@/types';

export interface AnnouncementItem {
  _id: string;
  title: string;
  content: string;
  targetRole: 'ALL' | 'seller' | 'renter' | 'admin';
  isPinned: boolean;
  isArchived: boolean;
  scheduledAt: string;
  createdBy?: { name: string; avatar?: string; email?: string };
  createdAt: string;
}

export const announcementService = {
  async list() {
    const { data } = await apiClient.get<ApiResponse<AnnouncementItem[]>>('/announcements');
    return data.data;
  },

  async listAdmin() {
    const { data } = await apiClient.get<ApiResponse<AnnouncementItem[]>>('/announcements/admin/all');
    return data.data;
  },

  async create(payload: {
    title: string;
    content: string;
    targetRole?: string;
    isPinned?: boolean;
    scheduledAt?: string;
  }) {
    const { data } = await apiClient.post<ApiResponse<AnnouncementItem>>('/announcements', payload);
    return data.data;
  },

  async togglePin(id: string) {
    const { data } = await apiClient.patch<ApiResponse<AnnouncementItem>>(`/announcements/${id}/pin`);
    return data.data;
  },

  async archive(id: string) {
    const { data } = await apiClient.patch<ApiResponse<AnnouncementItem>>(`/announcements/${id}/archive`);
    return data.data;
  },
};
