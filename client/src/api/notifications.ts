import { api } from "./client";
import { ApiEnvelope } from "@/types";

export interface Notification {
  id: string;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export async function listNotifications(): Promise<Notification[]> {
  const res = await api.get<ApiEnvelope<{ notifications: Notification[] }>>("/notifications");
  return res.data.data.notifications;
}

export async function markRead(id: string) {
  await api.patch(`/notifications/${id}/read`);
}

export async function markAllRead() {
  await api.patch("/notifications/read-all");
}
