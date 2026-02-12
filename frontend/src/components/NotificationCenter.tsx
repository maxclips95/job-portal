'use client';

import { useState, useEffect } from 'react';
import { collaborationService } from '@/services/collaboration.service';
import {
  Bell,
  MessageSquare,
  Zap,
  Users,
  CheckCircle,
  AlertCircle,
  Clock,
  Trash2,
  Settings,
} from 'lucide-react';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  status: string;
  actor_id?: string;
  actor?: { name: string; avatar_url?: string };
  created_at: string;
  read_at?: string;
}

interface NotificationCenterProps {
  teamId: string;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ teamId }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 10000);
    return () => clearInterval(interval);
  }, [teamId]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const [data, count] = await Promise.all([
        collaborationService.getNotifications(),
        collaborationService.getUnreadCount(),
      ]);
      setNotifications(data || []);
      setUnreadCount(count || 0);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await collaborationService.markAsRead(notificationId);
      await loadNotifications();
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await collaborationService.markAllAsRead();
      await loadNotifications();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleDelete = async (notificationId: string) => {
    if (!confirm('Delete this notification?')) return;

    try {
      await collaborationService.deleteNotification(notificationId);
      await loadNotifications();
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'mention':
        return <AlertCircle size={18} className="text-orange-600" />;
      case 'message':
        return <MessageSquare size={18} className="text-blue-600" />;
      case 'task_assigned':
        return <CheckCircle size={18} className="text-green-600" />;
      case 'task_updated':
        return <Zap size={18} className="text-yellow-600" />;
      case 'deadline_approaching':
        return <Clock size={18} className="text-red-600" />;
      case 'team_member_joined':
        return <Users size={18} className="text-purple-600" />;
      default:
        return <Bell size={18} className="text-gray-600" />;
    }
  };

  const getNotificationTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      mention: 'Mention',
      message: 'Message',
      task_assigned: 'Task Assigned',
      task_updated: 'Task Updated',
      deadline_approaching: 'Deadline',
      team_member_joined: 'Team Member',
      team_invite: 'Team Invite',
      project_update: 'Project Update',
      comment_reply: 'Comment Reply',
    };
    return labels[type] || type;
  };

  const formatRelativeTime = (date: string) => {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return then.toLocaleDateString();
  };

  const filteredNotifications =
    filter === 'all'
      ? notifications
      : filter === 'unread'
        ? notifications.filter((n) => n.status === 'unread')
        : notifications.filter((n) => n.type === filter);

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 bg-gray-200 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-gray-900">Notifications</h2>
          {unreadCount > 0 && (
            <span className="bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>

        <div className="flex gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Mark all as read
            </button>
          )}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Notification preferences"
          >
            <Settings size={20} className="text-gray-600" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {['all', 'unread', 'mention', 'task_assigned', 'message'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full whitespace-nowrap font-medium transition-colors ${
              filter === f
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {f === 'all' ? 'All' : f === 'unread' ? 'Unread' : getNotificationTypeLabel(f)}
          </button>
        ))}
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <h3 className="font-semibold text-gray-900 mb-3">Notification Settings</h3>
          <div className="space-y-2 text-sm">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" defaultChecked className="w-4 h-4 rounded" />
              <span>Mention notifications</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" defaultChecked className="w-4 h-4 rounded" />
              <span>Message notifications</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" defaultChecked className="w-4 h-4 rounded" />
              <span>Task notifications</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" defaultChecked className="w-4 h-4 rounded" />
              <span>Email notifications</span>
            </label>
          </div>
          <button
            onClick={() => setShowSettings(false)}
            className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Close
          </button>
        </div>
      )}

      {/* Notifications List */}
      <div className="space-y-2">
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-12">
            <Bell size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-600 font-medium">No notifications</p>
            <p className="text-gray-500 text-sm">
              {filter === 'unread' ? 'All caught up!' : 'Check back later'}
            </p>
          </div>
        ) : (
          filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 rounded-lg border transition-colors ${
                notification.status === 'unread'
                  ? 'bg-blue-50 border-blue-200'
                  : 'bg-white border-gray-200 opacity-75'
              }`}
            >
              <div className="flex gap-4">
                {/* Icon */}
                <div className="flex-shrink-0 mt-1">{getNotificationIcon(notification.type)}</div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-gray-900">{notification.title}</h3>
                      <p className="text-sm text-gray-600 mt-1 break-words">{notification.message}</p>

                      <div className="flex items-center gap-3 mt-2">
                        <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                          {getNotificationTypeLabel(notification.type)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatRelativeTime(notification.created_at)}
                        </span>
                      </div>

                      {/* Actor */}
                      {notification.actor && (
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-200">
                          <div className="w-6 h-6 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                            {notification.actor.name?.[0] || 'U'}
                          </div>
                          <span className="text-sm text-gray-700">{notification.actor.name}</span>
                        </div>
                      )}
                    </div>

                    {/* Unread Badge */}
                    {notification.status === 'unread' && (
                      <div className="w-2.5 h-2.5 bg-blue-600 rounded-full flex-shrink-0 mt-1" />
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 flex-shrink-0">
                  {notification.status === 'unread' && (
                    <button
                      onClick={() => handleMarkAsRead(notification.id)}
                      className="p-2 hover:bg-gray-100 rounded transition-colors text-xs"
                      title="Mark as read"
                    >
                      ✓
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(notification.id)}
                    className="p-2 hover:bg-red-100 rounded transition-colors text-red-600"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Load More */}
      {filteredNotifications.length > 0 && filteredNotifications.length % 50 === 0 && (
        <button className="w-full py-3 text-center text-blue-600 hover:text-blue-700 font-medium hover:bg-gray-50 rounded-lg transition-colors">
          Load more notifications
        </button>
      )}
    </div>
  );
};
