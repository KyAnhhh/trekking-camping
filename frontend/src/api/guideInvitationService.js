import client from './axiosClient';
export const guideInvitationService = {
  status: id => client.get(`/api/admin/guides/${id}/invitation`),
  send: (id, email) => client.post(`/api/admin/guides/${id}/invitation`, { email }),
  revoke: id => client.delete(`/api/admin/guides/${id}/invitation`),
  preview: token => client.post('/api/guide-invitations/preview', { token }),
  accept: (token, password) => client.post('/api/guide-invitations/accept', { token, password }),
};
