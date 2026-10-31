import { apiClient } from './client.js';

export async function createReview(payload) {
  return apiClient('/reviews', {
    method: 'POST',
    body: payload,
  });
}

export async function getUserProfile(userId) {
  return apiClient(`/users/${userId}`);
}

export async function getUserReviews(userId, params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.append('page', params.page);
  if (params.limit) query.append('limit', params.limit);
  const qs = query.toString();
  return apiClient(`/users/${userId}/reviews${qs ? `?${qs}` : ''}`);
}

export async function reportListing(listingId, payload) {
  return apiClient(`/listings/${listingId}/report`, {
    method: 'POST',
    body: payload,
  });
}

export async function reportUser(userId, payload) {
  return apiClient(`/users/${userId}/report`, {
    method: 'POST',
    body: payload,
  });
}

export async function blockUser(userId) {
  return apiClient(`/users/${userId}/block`, {
    method: 'POST',
  });
}

export async function unblockUser(userId) {
  return apiClient(`/users/${userId}/block`, {
    method: 'DELETE',
  });
}

export async function getSellerDashboard() {
  return apiClient('/me/dashboard');
}

