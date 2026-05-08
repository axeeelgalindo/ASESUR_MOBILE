import axios from "axios";

export const BASE_URL = process.env.EXPO_PUBLIC_API_URL;
export const PUBLIC_URL = process.env.EXPO_PUBLIC_URL;

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,
});

export function setAuthToken(token) {
  if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`;
  else delete api.defaults.headers.common.Authorization;
}

api.interceptors.request.use((config) => {
  console.log("REQ", config.method?.toUpperCase(), config.url, "AUTH:", !!config.headers?.Authorization);
  return config;
});