import axios from "axios";

export const BASE_URL = "http://192.168.50.208:3002/api";
export const PUBLIC_URL = "http://192.168.50.208:3002"; 

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