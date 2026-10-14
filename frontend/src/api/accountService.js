import client from "./axiosClient";
export const accountService = {
  me: () => client.get("/api/account"),
  update: (data) => client.put("/api/account", data),
  changePassword: (data) => client.post("/api/account/password", data),
};
