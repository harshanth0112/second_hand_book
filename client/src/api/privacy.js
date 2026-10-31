import { apiClient } from './client.js';

export async function exportUserData() {
  const res = await apiClient.get('/api/me/export', { responseType: 'blob' });
  const blob = new Blob([JSON.stringify(res, null, 2)], { type: 'application/json' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'campus-book-exchange-data.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export async function deleteAccount({ confirm, password }) {
  return await apiClient.delete('/api/me', {
    confirm,
    password,
  });
}

