import type { AuthContextValue, AuthStatus } from "../../context/AuthContext";
import { apiRequest } from "../../lib/api";
import type { ChapterResponse, StoryResponse } from "../../types/story";
import type {
  LibraryStatusResponse,
  PreferenceResponse,
  ReaderSettings,
} from "./types";

type AuthenticatedRequest = AuthContextValue["request"];

function getReaderResource<T>(
  status: AuthStatus,
  request: AuthenticatedRequest,
  path: string,
  signal?: AbortSignal,
): Promise<T> {
  const options = signal ? { signal } : undefined;

  return status === "authenticated"
    ? request<T>(path, options)
    : apiRequest<T>(path, options);
}

export function getReaderStory(
  status: AuthStatus,
  request: AuthenticatedRequest,
  slug: string,
  signal?: AbortSignal,
): Promise<StoryResponse> {
  return getReaderResource(
    status,
    request,
    `/api/v1/stories/${encodeURIComponent(slug)}`,
    signal,
  );
}

export function getReaderChapter(
  status: AuthStatus,
  request: AuthenticatedRequest,
  slug: string,
  chapterId: string,
  signal?: AbortSignal,
): Promise<ChapterResponse> {
  return getReaderResource(
    status,
    request,
    `/api/v1/stories/${encodeURIComponent(slug)}/chapters/${encodeURIComponent(
      chapterId,
    )}`,
    signal,
  );
}

export function getReaderPreferences(
  request: AuthenticatedRequest,
  signal?: AbortSignal,
): Promise<PreferenceResponse> {
  return request<PreferenceResponse>("/api/v1/preferences", { signal });
}

export async function updateReaderPreferences(
  request: AuthenticatedRequest,
  settings: ReaderSettings,
): Promise<void> {
  await request("/api/v1/preferences", {
    method: "PATCH",
    body: JSON.stringify({
      readerTheme: settings.theme,
      fontScale: settings.fontScale,
      lineHeight: settings.lineHeight,
    }),
  });
}

export function getLibraryStatus(
  request: AuthenticatedRequest,
  storyId: string,
  signal?: AbortSignal,
): Promise<LibraryStatusResponse> {
  return request<LibraryStatusResponse>(
    `/api/v1/library/${encodeURIComponent(storyId)}`,
    { signal },
  );
}

export async function setLibraryStatus(
  request: AuthenticatedRequest,
  storyId: string,
  shouldAdd: boolean,
): Promise<void> {
  await request(`/api/v1/library/${encodeURIComponent(storyId)}`, {
    method: shouldAdd ? "POST" : "DELETE",
  });
}

export async function recordReaderVisit(
  request: AuthenticatedRequest,
  storyId: string,
  chapterId: string,
): Promise<void> {
  await request("/api/v1/analytics/reads", {
    method: "POST",
    body: JSON.stringify({ storyId, chapterId }),
  });
}

export async function saveReadingProgress(
  request: AuthenticatedRequest,
  storyId: string,
  chapterId: string,
  progress: number,
): Promise<void> {
  await request("/api/v1/reading-progress", {
    method: "PUT",
    body: JSON.stringify({ storyId, chapterId, progress }),
  });
}
