import { apiClient, getApiUrl } from './client';

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

export async function searchListings(params = {}, signal) {
  const query = new URLSearchParams();
  for (const [key, val] of Object.entries(params)) {
    if (val !== undefined && val !== null && val !== '') {
      query.set(key, val);
    }
  }
  const qs = query.toString();
  return apiClient(`/listings${qs ? `?${qs}` : ''}`, {
    method: 'GET',
    signal,
  });
}

export async function getPriceHint(params = {}) {
  const query = new URLSearchParams();
  if (params.isbn) query.set('isbn', params.isbn);
  if (params.title) query.set('title', params.title);
  const qs = query.toString();
  return apiClient(`/listings/price-hint${qs ? `?${qs}` : ''}`, {
    method: 'GET',
  });
}

export async function lookupIsbn(isbn) {
  return apiClient(`/listings/isbn/${encodeURIComponent(isbn)}`, {
    method: 'GET',
  });
}

export async function uploadListingImages(id, files) {
  const formData = new FormData();
  for (const file of files) {
    formData.append('images', file);
  }

  const res = await fetch(getApiUrl(`/listings/${id}/images`), {
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

