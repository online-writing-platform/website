import { useCallback, useEffect, useRef, useState } from "react";

import type { AuthContextValue } from "../../../context/AuthContext";
import { ApiError } from "../../../lib/api";
import { getErrorMessage } from "../../../lib/error-message";
import type { Chapter } from "../../../types/story";
import { setWriterChapterPublished, updateWriterChapter } from "../api";

export interface LocalChapterDraft {
  title: string;
  content: string;
  savedAt: string;
}

interface PendingChapterDraft {
  title: string;
  content: string;
  generation: number;
}

export interface ChapterConflict {
  currentVersion?: number;
  updatedAt?: string;
}

export type ChapterEditorStatus =
  | { type: "loading" }
  | { type: "loaded"; version: number }
  | { type: "local-pending" }
  | { type: "saving" }
  | { type: "saved"; version: number }
  | { type: "saving-newer" }
  | { type: "conflict" }
  | { type: "save-failed" }
  | { type: "recovered" }
  | { type: "published" }
  | { type: "unpublished" };

interface UseChapterAutosaveOptions {
  storyId: string;
  chapterId: string;
  request: AuthContextValue["request"];
  autosaveDelay?: number;
}

export interface ChapterAutosaveController {
  chapter: Chapter | null;
  title: string;
  content: string;
  wordCount: number;
  characterCount: number;
  status: ChapterEditorStatus;
  error: string | null;
  conflict: ChapterConflict | null;
  localDraft: LocalChapterDraft | null;
  isSaving: boolean;
  initializeChapter(chapter: Chapter): void;
  beginLoading(): void;
  changeTitle(title: string): void;
  changeContent(content: string): void;
  setWordCount(value: number): void;
  setCharacterCount(value: number): void;
  save(): Promise<boolean>;
  togglePublish(): Promise<void>;
  recoverLocalDraft(): void;
  discardLocalDraft(): void;
}

const DEFAULT_AUTOSAVE_DELAY = 900;

export function getChapterDraftKey(
  storyId: string,
  chapterId: string,
): string {
  return `writing-platform:draft:${storyId}:${chapterId}`;
}

export default function useChapterAutosave({
  storyId,
  chapterId,
  request,
  autosaveDelay = DEFAULT_AUTOSAVE_DELAY,
}: UseChapterAutosaveOptions): ChapterAutosaveController {
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [wordCount, setWordCount] = useState(0);
  const [characterCount, setCharacterCount] = useState(0);
  const [status, setStatus] = useState<ChapterEditorStatus>({
    type: "loading",
  });
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<ChapterConflict | null>(null);
  const [localDraft, setLocalDraft] = useState<LocalChapterDraft | null>(null);

  const saveTimerRef = useRef<number | undefined>(undefined);
  const dirtyRef = useRef(false);
  const chapterRef = useRef<Chapter | null>(null);
  const titleRef = useRef("");
  const contentRef = useRef("");
  const latestDraftRef = useRef<PendingChapterDraft | null>(null);
  const editGenerationRef = useRef(0);
  const saveLoopRef = useRef<Promise<boolean> | null>(null);
  const conflictRef = useRef<ChapterConflict | null>(null);
  const scopeRef = useRef(`${storyId}:${chapterId}`);

  useEffect(() => {
    scopeRef.current = `${storyId}:${chapterId}`;
    window.clearTimeout(saveTimerRef.current);
  }, [chapterId, storyId]);

  useEffect(
    () => () => {
      window.clearTimeout(saveTimerRef.current);
    },
    [],
  );

  const persistRecoveryDraft = useCallback(
    (nextTitle: string, nextContent: string): void => {
      localStorage.setItem(
        getChapterDraftKey(storyId, chapterId),
        JSON.stringify({
          title: nextTitle,
          content: nextContent,
          savedAt: new Date().toISOString(),
        }),
      );
    },
    [chapterId, storyId],
  );

  const initializeChapter = useCallback(
    (value: Chapter): void => {
      window.clearTimeout(saveTimerRef.current);

      const serverContent = value.content ?? "";

      chapterRef.current = value;
      titleRef.current = value.title;
      contentRef.current = serverContent;
      conflictRef.current = null;
      editGenerationRef.current = 0;
      latestDraftRef.current = {
        title: value.title,
        content: serverContent,
        generation: 0,
      };
      dirtyRef.current = false;
      saveLoopRef.current = null;

      setChapter(value);
      setTitle(value.title);
      setContent(serverContent);
      setWordCount(value.wordCount);
      setCharacterCount(0);
      setConflict(null);
      setError(null);
      setStatus({
        type: "loaded",
        version: value.version,
      });

      const storageKey = getChapterDraftKey(storyId, chapterId);
      const raw = localStorage.getItem(storageKey);

      if (!raw) {
        setLocalDraft(null);
        return;
      }

      try {
        const parsed = JSON.parse(raw) as LocalChapterDraft;
        const differsFromServer =
          parsed.title !== value.title || parsed.content !== serverContent;

        if (differsFromServer) {
          setLocalDraft(parsed);
        } else {
          localStorage.removeItem(storageKey);
          setLocalDraft(null);
        }
      } catch {
        localStorage.removeItem(storageKey);
        setLocalDraft(null);
      }
    },
    [chapterId, storyId],
  );

  const beginLoading = useCallback((): void => {
    setError(null);
    setStatus({ type: "loading" });
  }, []);

  const runSaveLoop = useCallback(async (): Promise<boolean> => {
    const saveScope = scopeRef.current;

    while (dirtyRef.current && !conflictRef.current) {
      const currentChapter = chapterRef.current;
      const draft = latestDraftRef.current;

      if (!currentChapter || !draft) {
        return false;
      }

      const sentGeneration = draft.generation;
      const expectedVersion = currentChapter.version;

      setStatus({ type: "saving" });
      setError(null);

      try {
        const response = await updateWriterChapter(
          request,
          storyId,
          chapterId,
          {
            title: draft.title.trim() || currentChapter.title,
            content: draft.content,
            expectedVersion,
          },
        );

        if (scopeRef.current !== saveScope) {
          return false;
        }

        const value = response.data.chapter;

        chapterRef.current = value;
        setChapter(value);

        const latestDraft = latestDraftRef.current;

        if (!latestDraft || latestDraft.generation === sentGeneration) {
          dirtyRef.current = false;
          localStorage.removeItem(getChapterDraftKey(storyId, chapterId));
          setLocalDraft(null);
          setStatus({ type: "saved", version: value.version });
          return true;
        }

        setStatus({ type: "saving-newer" });
      } catch (cause) {
        if (scopeRef.current !== saveScope) {
          return false;
        }

        if (
          cause instanceof ApiError &&
          cause.status === 409 &&
          cause.code === "CHAPTER_EDIT_CONFLICT"
        ) {
          const nextConflict =
            (cause.details as ChapterConflict | undefined) ?? {};

          conflictRef.current = nextConflict;
          setConflict(nextConflict);
          setStatus({ type: "conflict" });
          return false;
        }

        setError(getErrorMessage(cause));
        setStatus({ type: "save-failed" });
        return false;
      }
    }

    return !dirtyRef.current && !conflictRef.current;
  }, [chapterId, request, storyId]);

  const save = useCallback((): Promise<boolean> => {
    if (saveLoopRef.current) {
      return saveLoopRef.current;
    }

    window.clearTimeout(saveTimerRef.current);

    const savePromise = runSaveLoop();

    saveLoopRef.current = savePromise;

    void savePromise.finally(() => {
      if (saveLoopRef.current === savePromise) {
        saveLoopRef.current = null;
      }
    });

    return savePromise;
  }, [runSaveLoop]);

  const scheduleSave = useCallback(
    (nextTitle: string, nextContent: string): void => {
      if (!chapterRef.current || conflictRef.current) {
        return;
      }

      const nextGeneration = editGenerationRef.current + 1;

      editGenerationRef.current = nextGeneration;
      latestDraftRef.current = {
        title: nextTitle,
        content: nextContent,
        generation: nextGeneration,
      };
      dirtyRef.current = true;

      persistRecoveryDraft(nextTitle, nextContent);
      setStatus({ type: "local-pending" });

      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = window.setTimeout(() => {
        void save();
      }, autosaveDelay);
    },
    [autosaveDelay, persistRecoveryDraft, save],
  );

  const changeTitle = useCallback(
    (nextTitle: string): void => {
      titleRef.current = nextTitle;
      setTitle(nextTitle);
      scheduleSave(nextTitle, contentRef.current);
    },
    [scheduleSave],
  );

  const changeContent = useCallback(
    (nextContent: string): void => {
      contentRef.current = nextContent;
      setContent(nextContent);
      scheduleSave(titleRef.current, nextContent);
    },
    [scheduleSave],
  );

  const togglePublish = useCallback(async (): Promise<void> => {
    if (!chapterRef.current) {
      return;
    }

    setError(null);

    try {
      const saved = await save();

      if (!saved || dirtyRef.current || conflictRef.current) {
        return;
      }

      const currentChapter = chapterRef.current;

      if (!currentChapter) {
        return;
      }

      const response = await setWriterChapterPublished(
        request,
        storyId,
        currentChapter,
      );

      if (scopeRef.current !== `${storyId}:${chapterId}`) {
        return;
      }

      const value = response.data.chapter;

      chapterRef.current = value;
      setChapter(value);
      setStatus({
        type: value.status === "PUBLISHED" ? "published" : "unpublished",
      });
    } catch (cause) {
      setError(getErrorMessage(cause));
      setStatus({ type: "save-failed" });
    }
  }, [chapterId, request, save, storyId]);

  const recoverLocalDraft = useCallback((): void => {
    if (!localDraft) {
      return;
    }

    const nextGeneration = editGenerationRef.current + 1;

    editGenerationRef.current = nextGeneration;
    latestDraftRef.current = {
      title: localDraft.title,
      content: localDraft.content,
      generation: nextGeneration,
    };
    titleRef.current = localDraft.title;
    contentRef.current = localDraft.content;
    dirtyRef.current = true;

    setTitle(localDraft.title);
    setContent(localDraft.content);
    setLocalDraft(null);
    setStatus({ type: "recovered" });
    persistRecoveryDraft(localDraft.title, localDraft.content);
  }, [localDraft, persistRecoveryDraft]);

  const discardLocalDraft = useCallback((): void => {
    localStorage.removeItem(getChapterDraftKey(storyId, chapterId));
    setLocalDraft(null);
  }, [chapterId, storyId]);

  const isSaving = status.type === "saving" || status.type === "saving-newer";

  return {
    chapter,
    title,
    content,
    wordCount,
    characterCount,
    status,
    error,
    conflict,
    localDraft,
    isSaving,
    initializeChapter,
    beginLoading,
    changeTitle,
    changeContent,
    setWordCount,
    setCharacterCount,
    save,
    togglePublish,
    recoverLocalDraft,
    discardLocalDraft,
  };
}
