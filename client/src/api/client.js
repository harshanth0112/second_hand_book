const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api`
  : '/api';

if (!API_BASE && import.meta.env.PROD) {
  console.warn(
    '[api/client] VITE_API_URL is not set in production. ' +
    'API calls will fall back to relative paths, which will fail if frontend and backend are hosted on different domains.'
  );
}

export const getApiUrl = (path = '') => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${normalizedPath}`;
};

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
