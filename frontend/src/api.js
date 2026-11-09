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

// Response interceptor: handle session expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Only clear and redirect if we're not already on the login page
      if (window.location.pathname !== "/login") {
        localStorage.removeItem("dhmUser");
        sessionStorage.removeItem("dhmUser");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
