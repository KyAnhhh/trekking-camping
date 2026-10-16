import client from './axiosClient';
export const notificationService = {
  list: page => client.get('/api/notifications', { params: { page } }),
  count: signal => client.get('/api/notifications/unread-count', { signal }),
  read: id => client.put(`/api/notifications/${id}/read`),
  readAll: () => client.put('/api/notifications/read-all'),
};
