import api from './axiosClient';
export const favoriteService = {
  ids: (signal) => api.get('/api/me/favorite-tours/ids', { signal }),
  list: (page, signal) => api.get('/api/me/favorite-tours', { params: { page, size: 12 }, signal }),
  save: (id) => api.put(`/api/me/favorite-tours/${id}`),
  remove: (id) => api.delete(`/api/me/favorite-tours/${id}`),
};
