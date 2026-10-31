import { apiClient } from './client.js';

export const authApi = {
  register: (userData) => {
    return apiClient('/auth/register', {
      method: 'POST',
      body: userData,
    });
  },

  login: (credentials) => {
    return apiClient('/auth/login', {
      method: 'POST',
      body: credentials,
    });
  },

  logout: () => {
    return apiClient('/auth/logout', {
      method: 'POST',
    });
  },

  getMe: () => {
    return apiClient('/auth/me', {
      method: 'GET',
    });
  },

  verifyEmail: (token) => {
    return apiClient(`/auth/verify-email/${encodeURIComponent(token)}`, {
      method: 'GET',
    });
  },

  resendVerification: () => {
    return apiClient('/auth/resend-verification', {
      method: 'POST',
    });
  },

  forgotPassword: (email) => {
    return apiClient('/auth/forgot-password', {
      method: 'POST',
      body: { email },
    });
  },

  resetPassword: (token, password) => {
    return apiClient('/auth/reset-password', {
      method: 'POST',
      body: { token, password },
    });
  },
};
