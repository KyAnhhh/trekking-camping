import axiosClient from './axiosClient';

export const adminService = {
  syncTours: () => axiosClient.post('/api/chat/ingest-tours', null, { timeout: 120000 }),
  getUsers: () => axiosClient.get('/api/users'),
  getFiles: () => {
    return axiosClient.get('/api/admin/knowledge/files');
  },

  uploadFile: (file) => {
    const formData = new FormData();
    formData.append('file', file);

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
