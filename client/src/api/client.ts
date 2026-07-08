import axios from "axios";

// Vite's dev proxy forwards /api to the backend (see vite.config.ts), and in
// production the frontend is served from the same origin as the API (see
// README deployment notes) - so a relative base URL works in both cases.
export const api = axios.create({
  baseURL: "/api",
  withCredentials: true, // send the httpOnly auth cookies with every request
});

export interface ApiErrorShape {
  success: false;
  message: string;
}

export function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiErrorShape | undefined;
    if (data?.message) return data.message;
    if (error.message) return error.message;
  }
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}
