import { apiClient } from './client.js';

export async function getNotifications(params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.append('page', params.page);
  if (params.limit) query.append('limit', params.limit);
  if (params.unread !== undefined) query.append('unread', params.unread);

  const qs = query.toString();
  return apiClient(`/notifications${qs ? `?${qs}` : ''}`);
}

export async function markNotificationRead(id) {
  return apiClient(`/notifications/${id}`, {
    method: 'PATCH',
    body: { read: true }
  });
}

export async function markAllNotificationsRead() {
  return apiClient('/notifications/mark-all-read', {
    method: 'POST'
  });
}
