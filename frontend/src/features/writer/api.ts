import type { AuthContextValue } from "../../context/AuthContext";
import type {
  Chapter,
  ChapterResponse,
  StoryResponse,
  StoryRights,
  StoryStatus,
} from "../../types/story";

type AuthenticatedRequest = AuthContextValue["request"];

export interface GenreOption {
  slug: string;
  name: string;
}

interface GenresResponse {
  data: {
    genres: GenreOption[];
  };
}

interface MediaResponse {
  data: {
    media: {
      assetId: string;
      url: string;
      width: number;
      height: number;
    };
  };
}

export interface StoryMetadataInput {
  title: string;
  description: string;
  language: string;
  status?: Extract<StoryStatus, "ONGOING" | "COMPLETED" | "HIATUS">;
  genreSlug: string | null;
  tags: string[];
  rights: StoryRights;
  isMature: boolean;
}

export function getWriterStory(
  request: AuthenticatedRequest,
  storyId: string,
  signal?: AbortSignal,
): Promise<StoryResponse> {
  return request<StoryResponse>(
    `/api/v1/stories/mine/${encodeURIComponent(storyId)}`,
    { signal },
  );
}

export function getStoryGenres(
  request: AuthenticatedRequest,
  signal?: AbortSignal,
): Promise<GenresResponse> {
  return request<GenresResponse>("/api/v1/stories/genres", { signal });
}

export function updateWriterStory(
  request: AuthenticatedRequest,
  storyId: string,
  input: StoryMetadataInput,
): Promise<StoryResponse> {
  return request<StoryResponse>(
    `/api/v1/stories/${encodeURIComponent(storyId)}`,
    { method: "PATCH", body: JSON.stringify(input) },
  );
}

export function uploadWriterCover(
  request: AuthenticatedRequest,
  storyId: string,
  file: File,
): Promise<MediaResponse> {
  const form = new FormData();
  form.append("file", file);

  return request<MediaResponse>(
    `/api/v1/media/story-covers/${encodeURIComponent(storyId)}`,
    { method: "POST", body: form },
  );
}

export function createWriterChapter(
  request: AuthenticatedRequest,
  storyId: string,
  title: string,
): Promise<ChapterResponse> {
  return request<ChapterResponse>(
    `/api/v1/stories/${encodeURIComponent(storyId)}/chapters`,
    {
      method: "POST",
      body: JSON.stringify({ title, content: "" }),
    },
  );
}

export async function setWriterStoryPublished(
  request: AuthenticatedRequest,
  storyId: string,
  published: boolean,
): Promise<void> {
  await request(
    `/api/v1/stories/${encodeURIComponent(storyId)}/${
      published ? "publish" : "unpublish"
    }`,
    { method: "POST" },
  );
}

export function getWriterChapter(
  request: AuthenticatedRequest,
  storyId: string,
  chapterId: string,
  signal?: AbortSignal,
): Promise<ChapterResponse> {
  return request<ChapterResponse>(
    `/api/v1/stories/mine/${encodeURIComponent(
      storyId,
    )}/chapters/${encodeURIComponent(chapterId)}`,
    { signal },
  );
}

export function updateWriterChapter(
  request: AuthenticatedRequest,
  storyId: string,
  chapterId: string,
  input: {
    title: string;
    content: string;
    expectedVersion: number;
  },
): Promise<ChapterResponse> {
  return request<ChapterResponse>(
    `/api/v1/stories/${encodeURIComponent(
      storyId,
    )}/chapters/${encodeURIComponent(chapterId)}`,
    { method: "PATCH", body: JSON.stringify(input) },
  );
}

export function setWriterChapterPublished(
  request: AuthenticatedRequest,
  storyId: string,
  chapter: Pick<Chapter, "id" | "status">,
): Promise<ChapterResponse> {
  return request<ChapterResponse>(
    `/api/v1/stories/${encodeURIComponent(
      storyId,
    )}/chapters/${encodeURIComponent(chapter.id)}/${
      chapter.status === "PUBLISHED" ? "unpublish" : "publish"
    }`,
    { method: "POST" },
  );
}
