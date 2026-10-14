import client from "./axiosClient";
export const plannerService = {
  generate: (data) => client.post("/api/plans", data, { timeout: 110000 }),
  list: () => client.get("/api/plans"),
  get: (id) => client.get(`/api/plans/${id}`),
  remove: (id) => client.delete(`/api/plans/${id}`),
};
