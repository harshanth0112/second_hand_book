import { apiClient } from './client.js';

export async function getAdminReports(params = {}) {
  const query = new URLSearchParams(params).toString();
  return await apiClient.get(`/api/admin/reports${query ? `?${query}` : ''}`);
}

export async function updateReportStatus(reportId, status) {
  return await apiClient.patch(`/api/admin/reports/${reportId}`, { status });
}

export async function removeAdminListing(listingId) {
  return await apiClient.delete(`/api/admin/listings/${listingId}`);
}

export async function setAdminUserBan(userId, banned) {
  return await apiClient.patch(`/api/admin/users/${userId}/ban`, { banned });
}

export async function getAdminMeetupPoints() {
  return await apiClient.get('/api/admin/meetup-points');
}

export async function createAdminMeetupPoint(data) {
  return await apiClient.post('/api/admin/meetup-points', data);
}

export async function updateAdminMeetupPoint(id, data) {
  return await apiClient.patch(`/api/admin/meetup-points/${id}`, data);
}
