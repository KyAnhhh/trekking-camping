import axiosClient from "./axiosClient";

export const authService = {
  login: (credentials) => axiosClient.post("/api/auth/login", credentials),
  register: (data) => axiosClient.post("/api/auth/register", data),
  logout: () => axiosClient.post("/api/auth/logout"),
  forgotPassword: (email) =>
    axiosClient.post("/api/auth/forgot-password", { email }),
  resetPassword: (token, password) =>
    axiosClient.post("/api/auth/reset-password", { token, password }),
};
