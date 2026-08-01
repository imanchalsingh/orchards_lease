import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCheck,
  Trash2,
  Calendar,
  CreditCard,
  MessageSquare,
  Star,
  Info,
} from 'lucide-react';
import { notificationService } from '@/services/notification.service';
import { EmptyState, Badge, Spinner } from '@/components/ui';
import { useToast } from '@/context/ToastContext';
import { formatDate } from '@/lib/format';
import { getErrorMessage } from '@/lib/apiClient';
import { cn } from '@/lib/cn';
import type { AppNotification } from '@/types';

const CATEGORY_TABS = [
  ['all', 'All Alerts'],
  ['unread', 'Unread'],
  ['booking', 'Leases & Requests'],
  ['payment', 'Payments'],
  ['review', 'Reviews'],
] as const;

export default function NotificationCenterPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<string>('all');

  const fetchNotifications = () => {
    setLoading(true);
    const unreadOnly = tab === 'unread';
    notificationService
      .list({ unread: unreadOnly ? true : undefined })
      .then((res) => {
        let items = res.data || [];
        if (tab === 'booking') {
          items = items.filter((n) => n.type === 'booking' || n.type === 'lease');
        } else if (tab === 'payment') {
          items = items.filter((n) => n.type === 'payment');
        } else if (tab === 'review') {
          items = items.filter((n) => n.type === 'review');
        }
        setNotifications(items);
      })
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchNotifications();
  }, [tab]);

  const handleMarkRead = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await notificationService.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllRead();
      toast.success('All notifications marked as read');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleRemove = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await notificationService.remove(id);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      toast.success('Notification removed');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleNotificationClick = (item: AppNotification) => {
    if (!item.isRead) {
      handleMarkRead(item._id);
    }
    if (item.link) {
      navigate(item.link);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'booking':
      case 'lease':
        return <Calendar className="h-5 w-5 text-forest" />;
      case 'payment':
        return <CreditCard className="h-5 w-5 text-emerald-600" />;
      case 'chat':
        return <MessageSquare className="h-5 w-5 text-blue-600" />;
      case 'review':
        return <Star className="h-5 w-5 text-amber-500" />;
      default:
        return <Info className="h-5 w-5 text-faint" />;
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <main className="mx-auto max-w-[900px] px-6 pb-16 pt-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-serif text-[28px] font-bold text-ink">Notification Center</h1>
            {unreadCount > 0 && (
              <Badge tone="green" className="bg-forest text-cream font-bold">
                {unreadCount} unread
              </Badge>
            )}
          </div>
          <p className="mt-1 text-xs text-faint">
            Stay updated on your orchard lease requests, approvals, payments, and reviews.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-1.5 rounded-xl border border-sand bg-cream px-3.5 py-2 text-xs font-semibold text-ink hover:bg-sand/30 transition-colors"
          >
            <CheckCheck className="h-4 w-4 text-forest" />
            Mark all as read
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-6 flex flex-wrap gap-2 border-b border-sand pb-3">
        {CATEGORY_TABS.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'rounded-full px-4 py-1.5 text-xs font-semibold transition-all',
              tab === key
                ? 'bg-forest text-cream shadow-sm'
                : 'bg-cream text-sub border border-sand hover:border-faint'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner className="h-8 w-8 text-forest" />
        </div>
      ) : notifications.length === 0 ? (
        <EmptyState
          emoji="🔔"
          title="No notifications"
          description="You are all caught up! Important lease updates and activity alerts will appear here."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {notifications.map((item) => (
            <div
              key={item._id}
              onClick={() => handleNotificationClick(item)}
              className={cn(
                'group relative flex items-start gap-4 rounded-2xl border p-4 transition-all cursor-pointer',
                !item.isRead
                  ? 'border-forest/30 bg-avail/40 shadow-sm hover:border-forest/60'
                  : 'border-sand bg-cream/70 hover:bg-cream hover:border-faint'
              )}
            >
              {/* Icon Container */}
              <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-white shadow-sm border border-sand">
                {getNotificationIcon(item.type)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pr-12">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-ink">{item.title}</h3>
                  {!item.isRead && (
                    <span className="h-2 w-2 rounded-full bg-forest animate-pulse flex-none" />
                  )}
                </div>
                <p className="mt-1 text-xs leading-relaxed text-sub line-clamp-2">
                  {item.message}
                </p>
                <span className="mt-2 block text-[11px] font-medium text-faint">
                  {formatDate(item.createdAt)}
                </span>
              </div>

              {/* Actions */}
              <div className="absolute right-3 top-3 flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                {!item.isRead && (
                  <button
                    onClick={(e) => handleMarkRead(item._id, e)}
                    title="Mark as read"
                    className="rounded-lg p-1.5 text-faint hover:bg-forest/10 hover:text-forest transition-colors"
                  >
                    <CheckCheck className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={(e) => handleRemove(item._id, e)}
                  title="Remove notification"
                  className="rounded-lg p-1.5 text-faint hover:bg-rose-50 hover:text-rose-600 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
