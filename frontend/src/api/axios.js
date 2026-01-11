import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL;

if (!baseURL) {
  // This will help you immediately notice env issues during build/runtime
  console.warn("❌ VITE_API_URL is missing. Set it in Vercel Environment Variables.");
}

const axiosInstance = axios.create({
  baseURL,
  withCredentials: true,
});

axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default axiosInstance;