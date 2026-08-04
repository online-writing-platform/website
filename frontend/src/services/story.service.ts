import { apiRequest } from "../lib/api";
import type { GetStoriesResponse } from "../types/story";

export function getStories({
  cursor,
  signal,
}: {
  cursor?: string | null;
  signal?: AbortSignal;
} = {}): Promise<GetStoriesResponse> {
  const searchParams = new URLSearchParams();
  const normalizedCursor = cursor?.trim();

  if (normalizedCursor) {
    searchParams.set("cursor", normalizedCursor);
  }

  const queryString = searchParams.toString();

  const path = queryString
    ? `/api/v1/stories?${queryString}`
    : "/api/v1/stories";

  return apiRequest<GetStoriesResponse>(path, {
    signal,
  });
}
