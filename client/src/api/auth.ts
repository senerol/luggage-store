import { api } from "./client";
import { ApiEnvelope, Role, User } from "@/types";

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: "CUSTOMER" | "PARTNER";
  businessName?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export async function register(input: RegisterInput): Promise<User> {
  const res = await api.post<ApiEnvelope<{ user: User }>>("/auth/register", input);
  return res.data.data.user;
}

export async function login(input: LoginInput): Promise<User> {
  const res = await api.post<ApiEnvelope<{ user: User }>>("/auth/login", input);
  return res.data.data.user;
}

export async function logout(): Promise<void> {
  await api.post("/auth/logout");
}

export async function fetchMe(): Promise<User> {
  const res = await api.get<ApiEnvelope<{ user: User }>>("/auth/me");
  return res.data.data.user;
}

export type { Role };
