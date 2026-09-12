import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleAlert,
  Cloud,
  CloudUpload,
  FileClock,
  Languages,
  LoaderCircle,
  RotateCcw,
  Save,
  Send,
  Trash2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { Link, useParams } from "react-router-dom";

import RichTextEditor from "../components/RichTextEditor";
import useChapterAutosave, {
  type ChapterEditorStatus,
} from "../features/writer/hooks/useChapterAutosave";
import { getWriterChapter, getWriterStory } from "../features/writer/api";
import useAuth from "../hooks/useAuth";
import useInterfaceLocale from "../hooks/useInterfaceLocale";
import { getErrorMessage } from "../lib/error-message";
import { getStoryTextAttributes } from "../lib/story-language";

import "./ChapterEditorPage.css";

function getStatusMessage(
  status: ChapterEditorStatus,
  t: TFunction,
): string {
  const version = "version" in status ? String(status.version) : undefined;

  switch (status.type) {
    case "loading":
      return t("writer.loading.chapter");

    case "loaded":
      return t("writer.editor.loadedVersion", { version });

    case "local-pending":
      return t("writer.editor.localSavedPending");

    case "saving":
      return t("writer.editor.savingServer");

    case "saved":
      return t("writer.editor.savedVersion", { version });

    case "saving-newer":
      return t("writer.editor.savingNewerChanges");

    case "conflict":
      return t("writer.editor.saveStoppedConflict");

    case "save-failed":
      return t("writer.editor.saveFailedLocalKept");

    case "recovered":
      return t("writer.editor.localRecovered");

    case "published":
      return t("writer.messages.chapterPublished");

    case "unpublished":
      return t("writer.messages.chapterUnpublished");
  }
}

function getStatusKind(status: ChapterEditorStatus): string {
  switch (status.type) {
    case "saved":
    case "published":
    case "unpublished":
      return "success";

    case "saving":
    case "saving-newer":
      return "saving";

    case "local-pending":
    case "recovered":
      return "local";

    case "conflict":
    case "save-failed":
      return "error";

    default:
      return "neutral";
  }
}

export default function ChapterEditorPage() {
  const { storyId = "", chapterId = "" } = useParams();

  const { t } = useTranslation();
  const { request } = useAuth();
  const {
    language: interfaceLanguage,
    direction,
    locale,
  } = useInterfaceLocale();

  const [storyLanguage, setStoryLanguage] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);

  const autosave = useChapterAutosave({
    storyId,
    chapterId,
    request,
  });

  const {
    chapter,
    title,
    content,
    wordCount,
    characterCount,
    status: editorStatus,
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
    save: saveToServer,
    togglePublish,
    recoverLocalDraft,
    discardLocalDraft,
  } = autosave;

  const load = useCallback(async (signal?: AbortSignal): Promise<void> => {
    setLoadError(null);

    try {
      const [response, storyResponse] = await Promise.all([
        getWriterChapter(request, storyId, chapterId, signal),
        getWriterStory(request, storyId, signal),
      ]);

      if (signal?.aborted) {
        return;
      }

      setStoryLanguage(storyResponse.data.story.language);
      initializeChapter(response.data.chapter);
    } catch (cause) {
      if (signal?.aborted) {
        return;
      }

      setLoadError(getErrorMessage(cause));
    }
  }, [chapterId, initializeChapter, request, storyId]);

  useEffect(() => {
    const controller = new AbortController();

    const loadTimer = window.setTimeout(() => {
      void load(controller.signal);
    }, 0);

    return () => {
      controller.abort();
      window.clearTimeout(loadTimer);
    };
  }, [load]);

  const statusMessage = getStatusMessage(editorStatus, t);

  const statusKind = getStatusKind(editorStatus);

  if (!chapter) {
    return (
      <main
        className="chapter-write-loading"
        dir={direction}
        lang={interfaceLanguage}
        aria-busy={!loadError}
      >
        <div
          className={
            loadError
              ? "chapter-write-loading__card chapter-write-loading__card--error"
              : "chapter-write-loading__card"
          }
        >
          {loadError ? (
            <>
              <CircleAlert aria-hidden="true" size={30} />

              <p role="alert">{loadError}</p>
            </>
          ) : (
            <>
              <LoaderCircle
                className="chapter-write-spin"
                aria-hidden="true"
                size={34}
              />

              <p aria-live="polite">{statusMessage}</p>
            </>
          )}
        </div>
      </main>
    );
  }

  const storyTextAttributes = getStoryTextAttributes(storyLanguage);

  const storyLanguageLabel =
    storyTextAttributes.lang === "fa"
      ? t("writer.languages.fa")
      : storyTextAttributes.lang === "en"
        ? t("writer.languages.en")
        : t("writer.languages.automatic");

  const storyDirectionLabel = storyTextAttributes.dir.toUpperCase();

  const formattedRecoveryDate = localDraft
    ? new Date(localDraft.savedAt).toLocaleString(locale)
    : "";

  const BackIcon = direction === "rtl" ? ArrowRight : ArrowLeft;

  return (
    <main
      className="chapter-write-page"
      dir={direction}
      lang={interfaceLanguage}
      aria-busy={isSaving}
    >
      <div className="chapter-write-page__decoration" aria-hidden="true" />

      <div className="chapter-write-page__container">
        <header className="chapter-write-toolbar">
          <div className="chapter-write-toolbar__identity">
            <Link
              className="chapter-write-toolbar__back"
              to={`/write/${storyId}`}
            >
              <BackIcon aria-hidden="true" size={18} />

              <span>{t("writer.editor.back")}</span>
            </Link>
          </div>

          <div
            className="chapter-write-status"
            data-kind={statusKind}
            aria-live="polite"
          >
            {isSaving ? (
              <LoaderCircle
                className="chapter-write-spin"
                aria-hidden="true"
                size={16}
              />
            ) : statusKind === "success" ? (
              <Check aria-hidden="true" size={16} />
            ) : statusKind === "error" ? (
              <CircleAlert aria-hidden="true" size={16} />
            ) : statusKind === "local" ? (
              <CloudUpload aria-hidden="true" size={16} />
            ) : (
              <Cloud aria-hidden="true" size={16} />
            )}

            <span>{statusMessage}</span>
          </div>

          <div className="chapter-write-toolbar__actions">
            <button
              className="chapter-write-button chapter-write-button--secondary"
              type="button"
              disabled={isSaving || Boolean(conflict)}
              onClick={() => {
                void saveToServer();
              }}
            >
              {isSaving ? (
                <LoaderCircle
                  className="chapter-write-spin"
                  aria-hidden="true"
                  size={17}
                />
              ) : (
                <Save aria-hidden="true" size={17} />
              )}

              <span>
                {isSaving ? t("writer.actions.saving") : t("writer.actions.save")}
              </span>
            </button>

            <button
              className="chapter-write-button chapter-write-button--publish"
              type="button"
              disabled={isSaving || Boolean(conflict)}
              onClick={() => {
                void togglePublish();
              }}
            >
              <Send aria-hidden="true" size={17} />

              <span>
                {chapter.status === "PUBLISHED"
                  ? t("writer.actions.unpublishChapter")
                  : t("writer.actions.publishChapter")}
              </span>
            </button>
          </div>
        </header>

        {error ? (
          <div
            className="chapter-write-alert chapter-write-alert--error"
            role="alert"
          >
            <CircleAlert aria-hidden="true" size={22} />

            <p>{error}</p>
          </div>
        ) : null}

        {localDraft && !conflict ? (
          <aside className="chapter-write-alert chapter-write-alert--recovery">
            <FileClock aria-hidden="true" size={23} />

            <div className="chapter-write-alert__content">
              <strong>{t("writer.recovery.title")}</strong>

              <p>{t("writer.recovery.description", { date: formattedRecoveryDate })}</p>
            </div>

            <div className="chapter-write-alert__actions">
              <button
                className="chapter-write-button chapter-write-button--secondary"
                type="button"
                onClick={recoverLocalDraft}
              >
                <RotateCcw aria-hidden="true" size={16} />

                <span>{t("writer.recovery.restore")}</span>
              </button>

              <button
                className="chapter-write-button chapter-write-button--quiet"
                type="button"
                onClick={discardLocalDraft}
              >
                <Trash2 aria-hidden="true" size={16} />

                <span>{t("writer.recovery.discard")}</span>
              </button>
            </div>
          </aside>
        ) : null}

        {conflict ? (
          <aside
            className="chapter-write-alert chapter-write-alert--conflict"
            role="alert"
          >
            <CircleAlert aria-hidden="true" size={24} />

            <div className="chapter-write-alert__content">
              <strong>{t("writer.conflict.title")}</strong>

              <p>{t("writer.conflict.description")}</p>

              {conflict.currentVersion ? (
                <small>
                  {t("writer.conflict.serverVersion", {
                    version: conflict.currentVersion,
                  })}
                </small>
              ) : null}
            </div>

            <div className="chapter-write-alert__actions">
              <button
                className="chapter-write-button chapter-write-button--secondary"
                type="button"
                onClick={() => {
                  beginLoading();
                  void load();
                }}
              >
                <RotateCcw aria-hidden="true" size={16} />

                <span>{t("writer.conflict.loadServer")}</span>
              </button>
            </div>
          </aside>
        ) : null}

        <section
          className="chapter-writing-paper"
          aria-labelledby="chapter-writing-heading"
        >
          <div className="chapter-writing-paper__fields">
            <label className="chapter-writing-field" htmlFor="chapter-title">
              <span>{t("writer.editor.titleLabel")}</span>

              <input
                id="chapter-title"
                className="chapter-writing-field__title"
                value={title}
                maxLength={200}
                {...storyTextAttributes}
                onChange={(event) => changeTitle(event.target.value)}
              />
            </label>

            <div className="chapter-writing-field">
              <div className="chapter-writing-field__heading">
                <span
                  className="chapter-writing-field__direction"
                  aria-label={`${storyLanguageLabel} · ${storyDirectionLabel}`}
                >
                  <Languages aria-hidden="true" size={14} />

                  <span>{storyLanguageLabel}</span>

                  <bdi dir="ltr">{storyDirectionLabel}</bdi>
                </span>
              </div>

              <RichTextEditor
                id="chapter-content"
                label={t("writer.editor.contentLabel")}
                value={content}
                direction={storyTextAttributes.dir}
                language={storyTextAttributes.lang}
                placeholder={t("writer.editor.contentPlaceholder")}
                onCharacterCountChange={setCharacterCount}
                onWordCountChange={setWordCount}
                onChange={changeContent}
              />
            </div>
          </div>

          <footer className="chapter-writing-paper__footer">
            <div className="chapter-writing-paper__stats">
              <span>
                {t("writer.editor.wordCount", {
                  value: wordCount.toLocaleString(locale),
                })}
              </span>

              <span>
                {t("writer.editor.characterCount", {
                  value: characterCount.toLocaleString(locale),
                })}
              </span>

              <span>
                {t("writer.editor.version", {
                  value: chapter.version.toLocaleString(locale),
                })}
              </span>
            </div>

            <span className="chapter-writing-paper__autosave">
              <Cloud aria-hidden="true" size={14} />

              {t("writer.editor.autosave")}
            </span>
          </footer>
        </section>
      </div>
    </main>
  );
}
