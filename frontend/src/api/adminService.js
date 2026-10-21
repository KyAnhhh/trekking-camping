import axiosClient from './axiosClient';

export const adminService = {
  syncTours: () => axiosClient.post('/api/chat/ingest-tours', null, { timeout: 120000 }),
  getUsers: () => axiosClient.get('/api/users'),
  updateUser: (id, payload) => axiosClient.put(`/api/users/${id}`, payload),
  setUserActive: (id, payload) => axiosClient.put(`/api/users/${id}/active`, payload),
  deleteUser: (id, updatedAt) => axiosClient.delete(`/api/users/${id}`, { params: { updatedAt } }),
  getFiles: () => {
    return axiosClient.get('/api/admin/knowledge/files');
  },

  uploadFile: (file, publicExcerpt = false) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('publicExcerpt', String(publicExcerpt));

    return axiosClient.post('/api/admin/knowledge/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  deleteFile: (fileName) => {
    return axiosClient.delete('/api/admin/knowledge/delete', {
      params: { fileName },
    });
  },
};
