import client from './axiosClient';
const path = (id, admin, scheduleId) => scheduleId != null
  ? `/api/guide-workspace/trips/${scheduleId}/bookings/${id}/passengers`
  : `/api/${admin ? 'admin/' : ''}bookings/${id}/passengers`;
export const passengerService = {
  list: (id, admin = false, scheduleId = null) => client.get(path(id, admin, scheduleId)),
  save: (id, fullNames, revision, admin = false) => client.put(path(id, admin, null), { fullNames, revision }),
  mark: (scheduleId, id, passengerId, status, revision) => client.put(`${path(id, false, scheduleId)}/${passengerId}/attendance`, { status, revision }),
  history: (id, page, admin = false, scheduleId = null) => client.get(`${path(id, admin, scheduleId)}/history`, { params: { page } }),
};
