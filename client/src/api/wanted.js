import { apiClient } from './client.js';

export async function getWishlist(params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.append('page', params.page);
  if (params.limit) query.append('limit', params.limit);

  const qs = query.toString();
  return apiClient(`/me/wishlist${qs ? `?${qs}` : ''}`);
}

export async function addToWishlist(listingId) {
  return apiClient(`/me/wishlist/${listingId}`, {
    method: 'POST'
  });
}

export async function removeFromWishlist(listingId) {
  return apiClient(`/me/wishlist/${listingId}`, {
    method: 'DELETE'
  });
}

export async function getWanted() {
  return apiClient('/wanted');
}

export async function createWanted(payload) {
  return apiClient('/wanted', {
    method: 'POST',
    body: payload
  });
}

export async function deleteWanted(id) {
  return apiClient(`/wanted/${id}`, {
    method: 'DELETE'
  });
}
