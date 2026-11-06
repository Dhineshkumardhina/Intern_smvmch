/**
 * Notification Repository
 * Sri Manakula Vinayagar Engineering College (SMVEC)
 */

import { NotificationRecord, NotificationEventType, NotificationCategory } from './notificationTypes';
import { NotificationService, notificationService } from './notificationService';
import { getSupabaseClient } from '../../lib/supabase';

export interface NotificationFilterOptions {
  category?: NotificationCategory;
  eventType?: NotificationEventType;
  unreadOnly?: boolean;
  limit?: number;
}

export class NotificationRepository {
  private service: NotificationService;

  constructor(service: NotificationService = notificationService) {
    this.service = service;
  }

  public async getNotifications(
    recipientId: string,
    options: NotificationFilterOptions = {}
  ): Promise<NotificationRecord[]> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        let query = supabase
          .from('notifications')
          .select('*')
          .eq('recipient_id', recipientId);

        if (options.unreadOnly) {
          query = query.eq('is_read', false);
        }
        if (options.category) {
          query = query.eq('category', options.category);
        }
        if (options.eventType) {
          query = query.eq('notification_type', options.eventType);
        }

        const res = await query.order('created_at', { ascending: false }).limit(options.limit ?? 50);
        if (res.data) {
          return res.data as NotificationRecord[];
        }
      } catch (err) {
        console.warn('[NotificationRepository] Supabase query note:', err);
      }
    }

    return this.service.getNotificationHistory(recipientId, options);
  }

  public async markAsRead(notificationId: string, recipientId: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase
          .from('notifications')
          .update({ is_read: true, read_at: new Date().toISOString() })
          .eq('id', notificationId)
          .eq('recipient_id', recipientId);
      } catch (err) {
        console.warn('[NotificationRepository] Supabase update note:', err);
      }
    }

    return this.service.markAsRead(notificationId, recipientId);
  }

  public async markAllAsRead(recipientId: string): Promise<number> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase
          .from('notifications')
          .update({ is_read: true, read_at: new Date().toISOString() })
          .eq('recipient_id', recipientId)
          .eq('is_read', false);
      } catch (err) {
        console.warn('[NotificationRepository] Supabase update note:', err);
      }
    }

    return this.service.markAllAsRead(recipientId);
  }

  public async getUnreadCount(recipientId: string): Promise<number> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const res = await supabase
          .from('notifications')
          .select('id')
          .eq('recipient_id', recipientId)
          .eq('is_read', false);

        if (res.data) return res.data.length;
      } catch (err) {
        console.warn('[NotificationRepository] Supabase unread count note:', err);
      }
    }

    return this.service.getUnreadCount(recipientId);
  }
}

export const notificationRepository = new NotificationRepository();
