import axios from "axios";

// Environment variable or fallback to production Render backend
const baseURL = import.meta.env.VITE_API_URL || "https://dhm-backend.onrender.com";

const api = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 45000, // 45 seconds to accommodate cloud free-tier cold starts
});

// Request interceptor: attach Token and User header to every request
api.interceptors.request.use(
  (config) => {
    try {
      const stored = localStorage.getItem("dhmUser") || sessionStorage.getItem("dhmUser");
      if (stored) {
        const user = JSON.parse(stored);
        if (user.token) {
          config.headers["Authorization"] = `Bearer ${user.token}`;
          config.headers["X-Auth-Token"] = user.token;
        }
        if (user.username) {
          config.headers["X-Dhm-User"] = user.username;
        }
      }
    } catch (e) {
      // Ignore JSON parse error
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle session expiration and authorization issues
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const data = error?.response?.data;
    const message = typeof data === "string" ? data : data?.error || data?.message || "";

    if (status === 401) {
      if (window.location.pathname !== "/login") {
        localStorage.removeItem("dhmUser");
        sessionStorage.removeItem("dhmUser");
        window.location.href = "/login";
      }
    } else if (status === 403) {
      const lower = String(message).toLowerCase();
      const isAuthStateIssue =
        lower.includes("deactivated") ||
        lower.includes("not authenticated") ||
        lower.includes("access denied");

      if (isAuthStateIssue && window.location.pathname !== "/login") {
        localStorage.removeItem("dhmUser");
        sessionStorage.removeItem("dhmUser");
        window.alert(message || "Your session is no longer valid. Please sign in again.");
        window.location.href = "/login";
      } else if (lower.includes("permission to access this module")) {
        // Client/module permission denial: keep session, notify and return to dashboard
        window.alert(message || "You do not have permission to access this module.");
        if (window.location.pathname !== "/dashboard") {
          window.location.href = "/dashboard";
        }
      }
      // Other 403s (e.g. supervisor edit restrictions) are handled by page-level UI.
    }

    return Promise.reject(error);
  }
);

export default api;
