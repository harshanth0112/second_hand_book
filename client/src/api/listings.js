import { apiClient } from './client';

export async function createListing(data) {
  return apiClient('/listings', {
    method: 'POST',
    body: data,
  });
}

export async function updateListing(id, data) {
  return apiClient(`/listings/${id}`, {
    method: 'PUT',
    body: data,
  });
}

export async function deleteListing(id) {
  return apiClient(`/listings/${id}`, {
    method: 'DELETE',
  });
}

export async function getListing(id) {
  return apiClient(`/listings/${id}`, {
    method: 'GET',
  });
}

export async function getMyListings(params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page);
  if (params.limit) query.set('limit', params.limit);
  if (params.status) query.set('status', params.status);

  const qs = query.toString();
  return apiClient(`/me/listings${qs ? `?${qs}` : ''}`, {
    method: 'GET',
  });
}

export async function relistListing(id) {
  return apiClient(`/listings/${id}/relist`, {
    method: 'POST',
  });
}

export async function uploadListingImages(id, files) {
  const formData = new FormData();
  for (const file of files) {
    formData.append('images', file);
  }

  const res = await fetch(`/api/listings/${id}/images`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const error = new Error(data?.message || 'Failed to upload images');
    error.status = res.status;
    throw error;
  }

  return data;
}

export async function removeListingImage(id, index) {
  return apiClient(`/listings/${id}/images/${index}`, {
    method: 'DELETE',
  });
}

