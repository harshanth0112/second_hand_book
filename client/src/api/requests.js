import { apiClient } from './client';

export async function createBookRequest(listingId, data) {
  return apiClient(`/listings/${listingId}/requests`, {
    method: 'POST',
    body: data,
  });
}

export async function getSentRequests(params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page);
  if (params.limit) query.set('limit', params.limit);
  if (params.status) query.set('status', params.status);

  const qs = query.toString();
  return apiClient(`/requests/sent${qs ? `?${qs}` : ''}`, {
    method: 'GET',
  });
}

export async function getReceivedRequests(params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page);
  if (params.limit) query.set('limit', params.limit);
  if (params.status) query.set('status', params.status);

  const qs = query.toString();
  return apiClient(`/requests/received${qs ? `?${qs}` : ''}`, {
    method: 'GET',
  });
}

export async function patchRequestAction(requestId, actionPayload) {
  return apiClient(`/requests/${requestId}`, {
    method: 'PATCH',
    body: actionPayload,
  });
}

export async function getMeetupPoints() {
  return apiClient('/meetup-points', {
    method: 'GET',
  });
}

