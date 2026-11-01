import { apiClient, getApiUrl } from './client.js';

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

  uploadAvatar: async (file) => {
    const formData = new FormData();
    formData.append('avatar', file);

    const res = await fetch(getApiUrl('/me/avatar'), {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const error = new Error(data?.message || 'Failed to upload avatar');
      error.status = res.status;
      throw error;
    }
    return data;
  },

  changePassword: (currentPassword, newPassword) => {
    return apiClient('/me/password', {
      method: 'PUT',
      body: { currentPassword, newPassword },
    });
  },
};

