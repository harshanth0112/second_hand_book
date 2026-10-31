import { apiClient } from './client';

export async function startConversation(listingId) {
  return apiClient('/conversations', {
    method: 'POST',
    body: { listingId },
  });
}

export async function getInbox() {
  return apiClient('/conversations', {
    method: 'GET',
  });
}

export async function getMessages(conversationId, params = {}) {
  const query = new URLSearchParams();
  if (params.before) query.set('before', params.before);
  if (params.limit) query.set('limit', params.limit);

  const qs = query.toString();
  return apiClient(`/conversations/${conversationId}/messages${qs ? `?${qs}` : ''}`, {
    method: 'GET',
  });
}

export async function markConversationRead(conversationId) {
  return apiClient(`/conversations/${conversationId}/read`, {
    method: 'PATCH',
  });
}

export async function handleOfferAction(messageId, action) {
  return apiClient(`/messages/${messageId}/offer`, {
    method: 'PATCH',
    body: { action },
  });
}

