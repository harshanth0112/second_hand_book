const API_BASE = '/api';

export async function apiClient(endpoint, options = {}) {
  const { body, headers = {}, ...customConfig } = options;

  const config = {
    method: body ? 'POST' : 'GET',
    credentials: 'include', // Non-negotiable requirement: credentials: "include"
    headers: {
      ...headers,
    },
    ...customConfig,
  };

  if (body) {
    config.headers['Content-Type'] = 'application/json';
    config.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, config);

  if (response.status === 204) {
    return null;
  }

  let data;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const error = new Error(data?.message || 'Request failed');
    error.status = response.status;
    error.errors = data?.errors || [];
    throw error;
  }

  return data;
}
