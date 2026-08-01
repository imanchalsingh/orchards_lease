import apiClient from '@/lib/apiClient';
import type { ApiResponse } from '@/types';

export interface ChatUser {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
  role: string;
}

export interface ChatMessage {
  _id: string;
  senderId: string;
  text: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export interface ConversationItem {
  _id: string;
  participants: ChatUser[];
  orchardId?: { _id: string; gardenName: string };
  messages: ChatMessage[];
  lastMessage?: {
    text: string;
    senderId: string;
    updatedAt: string;
  };
  createdAt: string;
  updatedAt: string;
}

export const chatService = {
  async listConversations() {
    const { data } = await apiClient.get<ApiResponse<ConversationItem[]>>('/chat/conversations');
    return data.data;
  },

  async getOrCreate(recipientId: string, orchardId?: string) {
    const { data } = await apiClient.post<ApiResponse<ConversationItem>>('/chat/conversations', {
      recipientId,
      orchardId,
    });
    return data.data;
  },

  async sendMessage(conversationId: string, text: string) {
    const { data } = await apiClient.post<ApiResponse<ChatMessage>>(
      `/chat/conversations/${conversationId}/messages`,
      { text }
    );
    return data.data;
  },

  async markAsRead(conversationId: string) {
    const { data } = await apiClient.patch<ApiResponse<{ updatedCount: number }>>(
      `/chat/conversations/${conversationId}/read`
    );
    return data.data;
  },
};
