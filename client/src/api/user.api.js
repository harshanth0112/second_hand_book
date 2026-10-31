import { apiClient } from './client.js';

export const userApi = {
  getProfile: () => {
    return apiClient('/me', {
      method: 'GET',
    });
  },

  updateProfile: (data) => {
    return apiClient('/me', {
      method: 'PUT',
      body: data,
    });
  },

  changePassword: (currentPassword, newPassword) => {
    return apiClient('/me/password', {
      method: 'PUT',
      body: { currentPassword, newPassword },
    });
  },
};

