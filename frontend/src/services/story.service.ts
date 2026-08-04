import { apiRequest } from "../lib/api";

import type { StoryListResponse } from "../types/story";

interface GetStoriesOptions {
  limit?: number;

  cursor?: string;

  sort?: "latest" | "popular" | "recommended";
}

export async function getStories({
  limit = 12,
  cursor,
  sort = "latest",
}: GetStoriesOptions): Promise<StoryListResponse> {
  const params = new URLSearchParams();

  params.set("limit", String(limit));

  params.set("sort", sort);

  if (cursor) {
    params.set("cursor", cursor);
  }

  const response = await apiRequest<{
    data: StoryListResponse;
  }>(`/api/v1/stories?${params.toString()}`);

  return response.data;
}
