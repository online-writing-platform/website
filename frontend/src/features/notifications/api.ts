import type { AuthContextValue } from "../../context/AuthContext";
import type { NotificationsResponse } from "./types";

type AuthenticatedRequest = AuthContextValue["request"];

export function getNotifications(
  request: AuthenticatedRequest,
  options: { limit: number; cursor?: string | null },
): Promise<NotificationsResponse> {
  const search = new URLSearchParams({ limit: String(options.limit) });

  if (options.cursor) {
    search.set("cursor", options.cursor);
  }

  return request<NotificationsResponse>(
    `/api/v1/notifications?${search.toString()}`,
  );
}

export async function markNotificationRead(
  request: AuthenticatedRequest,
  notificationId: string,
): Promise<void> {
  await request(`/api/v1/notifications/${encodeURIComponent(notificationId)}/read`, {
    method: "POST",
  });
}

export async function markEveryNotificationRead(
  request: AuthenticatedRequest,
): Promise<void> {
  await request("/api/v1/notifications/read-all", { method: "POST" });
}
