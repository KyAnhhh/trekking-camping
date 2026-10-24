import React, { createContext, useState, useEffect } from "react";
import { authService } from "../api/authService";
import { expireSession, isTokenExpired } from "../api/authSession.js";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    const username = localStorage.getItem("username");

    if (token && isTokenExpired(token)) {
      expireSession(token);
    } else if (token && token !== "undefined" && token !== "null" && role) {
      setUser({ token, role, username, email: username });
    }
    setLoading(false);
    const onExpired = () => setUser(null);
    window.addEventListener("auth:expired", onExpired);
    const onStorage = (event) => {
      if (event.key === "token" || event.key === null) {
        setUser(null);
        window.dispatchEvent(new Event("auth:changed"));
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("auth:expired", onExpired);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const login = (authData) => {
    if (!authData?.token || !authData?.role)
      throw new Error("Phản hồi đăng nhập không hợp lệ.");
    localStorage.setItem("token", authData.token);
    localStorage.setItem("role", authData.role);
    localStorage.setItem("username", authData.username || "Traveler");
    setUser(authData);
    setLogoutError("");
    window.dispatchEvent(new Event("auth:changed"));
  };

  const updateProfile = (profile) =>
    setUser((current) => (current ? { ...current, ...profile } : current));
  const clearSession = () => {
    ["token", "role", "username"].forEach((key) =>
      localStorage.removeItem(key),
    );
    setUser(null);
    window.dispatchEvent(new Event("auth:changed"));
  };

  const logout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    setLogoutError("");
    try {
      await authService.logout();
    } catch (error) {
      if (error.response?.status !== 401) {
        setLogoutError(
          "Chưa đăng xuất được ở máy chủ. Kiểm tra kết nối rồi thử lại.",
        );
        return;
      }
    } finally {
      setLoggingOut(false);
    }
    ["token", "role", "username"].forEach((key) =>
      localStorage.removeItem(key),
    );
    setUser(null);
    window.dispatchEvent(new Event("auth:changed"));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        loading,
        loggingOut,
        logoutError,
        updateProfile,
        clearSession,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};
