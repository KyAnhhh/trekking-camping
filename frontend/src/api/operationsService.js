import client from './axiosClient';
export const operationsService = {
  overview: () => client.get('/api/admin/operations/overview'),
  bookings: (queue, page) => client.get('/api/admin/operations/bookings', { params: { queue, page } }),
  payments: (status, page) => client.get('/api/admin/operations/payments', { params: { status, page } }),
  reconcile: (id) => client.post(`/api/admin/operations/payments/${id}/reconcile`, null, { timeout: 60000 }),
  resolve: (id, status, note) => client.post(`/api/admin/operations/payments/${id}/resolve`, { status, note }, { timeout: 60000 }),
  reviews: (visibility, page) => client.get('/api/admin/operations/reviews', { params: { visibility, page } }),
  moderate: (id, expectedApproved, approved) => client.put(`/api/admin/operations/reviews/${id}/visibility`, { expectedApproved, approved }),
};
