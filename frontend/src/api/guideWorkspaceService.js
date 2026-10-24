import client from './axiosClient';
export const guideWorkspaceService = {
  respond: (id, assignmentId, decision, reason) => client.put(`/api/guide-workspace/trips/${id}/response`, { assignmentId, decision, reason }),
  trips: page => client.get('/api/guide-workspace/trips', { params: { page } }),
  roster: (id, page) => client.get(`/api/guide-workspace/trips/${id}`, { params: { page } }),
  checkIn: (id, bookingId, presentCount, revision) => client.put(`/api/guide-workspace/trips/${id}/bookings/${bookingId}/attendance`, { presentCount, revision }),
  account: id => client.get(`/api/admin/guides/${id}/account`),
  link: (id, email) => client.put(`/api/admin/guides/${id}/account`, { email }),
};
