import { useCallback, useEffect, useMemo, useState } from "react";
import type { NavigateFunction } from "react-router-dom";

import type { AuthContextValue } from "../../../context/AuthContext";
import { getErrorMessage } from "../../../lib/error-message";
import type { Story, StoryRights } from "../../../types/story";
import {
  createWriterChapter,
  getStoryGenres,
  getWriterStory,
  setWriterStoryPublished,
  updateWriterStory,
  uploadWriterCover,
  type GenreOption,
} from "../api";

export type WriterSuccessMessage =
  | "metadataSaved"
  | "coverSaved"
  | "storyPublished"
  | "storyUnpublished";

interface UseWriterStoryOptions {
  storyId: string;
  request: AuthContextValue["request"];
  navigate: NavigateFunction;
}

export default function useWriterStory({
  storyId,
  request,
  navigate,
}: UseWriterStoryOptions) {
  const [story, setStory] = useState<Story | null>(null);
  const [genres, setGenres] = useState<GenreOption[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState("fa");
  const [storyStatus, setStoryStatus] = useState<Story["status"]>("DRAFT");
  const [genreSlug, setGenreSlug] = useState("");
  const [tags, setTags] = useState("");
  const [rights, setRights] = useState<StoryRights>("ALL_RIGHTS_RESERVED");
  const [isMature, setIsMature] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState("");
  const [cover, setCover] = useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [metadataBusy, setMetadataBusy] = useState(false);
  const [coverBusy, setCoverBusy] = useState(false);
  const [chapterBusy, setChapterBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<WriterSuccessMessage | null>(null);

  const chapters = useMemo(
    () =>
      [...(story?.chapters ?? [])].sort(
        (first, second) => first.position - second.position,
      ),
    [story?.chapters],
  );

  const applyStory = useCallback((value: Story): void => {
    setStory(value);
    setTitle(value.title);
    setDescription(value.description);
    setLanguage(value.language);
    setStoryStatus(value.status);
    setGenreSlug(value.genre?.slug ?? "");
    setTags(value.tags.map((tag) => tag.name).join(", "));
    setRights(value.rights);
    setIsMature(value.isMature);
  }, []);

  const loadStory = useCallback(
    async (signal?: AbortSignal): Promise<void> => {
      const [storyResponse, genreResponse] = await Promise.all([
        getWriterStory(request, storyId, signal),
        getStoryGenres(request, signal),
      ]);

      if (signal?.aborted) {
        return;
      }

      applyStory(storyResponse.data.story);
      setGenres(genreResponse.data.genres);
    },
    [applyStory, request, storyId],
  );

  useEffect(() => {
    const controller = new AbortController();

    async function load(): Promise<void> {
      setPageLoading(true);
      setError(null);

      try {
        await loadStory(controller.signal);
      } catch (cause) {
        if (!controller.signal.aborted) {
          setError(getErrorMessage(cause));
        }
      } finally {
        if (!controller.signal.aborted) {
          setPageLoading(false);
        }
      }
    }

    void load();
    return () => controller.abort();
  }, [loadStory]);

  useEffect(
    () => () => {
      if (coverPreviewUrl) {
        URL.revokeObjectURL(coverPreviewUrl);
      }
    },
    [coverPreviewUrl],
  );

  const saveMetadata = useCallback(async (): Promise<void> => {
    if (metadataBusy) {
      return;
    }

    setMetadataBusy(true);
    setError(null);
    setMessage(null);

    try {
      const editableStatus =
        storyStatus === "ONGOING" ||
        storyStatus === "COMPLETED" ||
        storyStatus === "HIATUS"
          ? storyStatus
          : undefined;
      const response = await updateWriterStory(request, storyId, {
        title: title.trim(),
        description: description.trim(),
        language: language.trim(),
        ...(editableStatus ? { status: editableStatus } : {}),
        genreSlug: genreSlug || null,
        tags: tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        rights,
        isMature,
      });

      setStory(response.data.story);
      setMessage("metadataSaved");
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setMetadataBusy(false);
    }
  }, [
    description,
    genreSlug,
    isMature,
    language,
    metadataBusy,
    request,
    rights,
    storyId,
    storyStatus,
    tags,
    title,
  ]);

  const selectCover = useCallback((file: File | null): void => {
    setCover(file);
    setCoverPreviewUrl(file ? URL.createObjectURL(file) : null);
    setError(null);
    setMessage(null);
  }, []);

  const uploadCover = useCallback(async (): Promise<boolean> => {
    if (!cover || coverBusy) {
      return false;
    }

    setCoverBusy(true);
    setError(null);
    setMessage(null);

    try {
      const response = await uploadWriterCover(request, storyId, cover);

      setStory((current) =>
        current
          ? { ...current, coverUrl: response.data.media.url }
          : current,
      );
      setCover(null);
      setCoverPreviewUrl(null);
      setMessage("coverSaved");
      return true;
    } catch (cause) {
      setError(getErrorMessage(cause));
      return false;
    } finally {
      setCoverBusy(false);
    }
  }, [cover, coverBusy, request, storyId]);

  const createChapter = useCallback(async (): Promise<void> => {
    const normalizedTitle = newChapterTitle.trim();

    if (!normalizedTitle || chapterBusy) {
      return;
    }

    setChapterBusy(true);
    setError(null);
    setMessage(null);

    try {
      const response = await createWriterChapter(
        request,
        storyId,
        normalizedTitle,
      );
      const chapter = response.data.chapter;

      setStory((current) =>
        current
          ? {
              ...current,
              chapters: [...(current.chapters ?? []), chapter],
            }
          : current,
      );
      setNewChapterTitle("");
      navigate(`/write/${storyId}/chapters/${chapter.id}`);
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setChapterBusy(false);
    }
  }, [chapterBusy, navigate, newChapterTitle, request, storyId]);

  const toggleStoryPublish = useCallback(async (): Promise<void> => {
    if (!story || metadataBusy) {
      return;
    }

    const isPublic = story.visibility === "PUBLIC";

    setMetadataBusy(true);
    setError(null);
    setMessage(null);

    try {
      await setWriterStoryPublished(request, storyId, !isPublic);
      await loadStory();
      setMessage(isPublic ? "storyUnpublished" : "storyPublished");
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setMetadataBusy(false);
    }
  }, [loadStory, metadataBusy, request, story, storyId]);

  return {
    story,
    genres,
    chapters,
    title,
    setTitle,
    description,
    setDescription,
    language,
    setLanguage,
    storyStatus,
    setStoryStatus,
    genreSlug,
    setGenreSlug,
    tags,
    setTags,
    rights,
    setRights,
    isMature,
    setIsMature,
    newChapterTitle,
    setNewChapterTitle,
    cover,
    coverPreviewUrl,
    pageLoading,
    metadataBusy,
    coverBusy,
    chapterBusy,
    error,
    message,
    saveMetadata,
    selectCover,
    uploadCover,
    createChapter,
    toggleStoryPublish,
  };
}
