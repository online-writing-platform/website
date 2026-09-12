import { FileText, LoaderCircle, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { getStoryTextAttributes } from "../../../lib/story-language";
import type { Chapter } from "../../../types/story";

interface WriterChaptersPanelProps {
  storyId: string;
  chapters: Chapter[];
  storyLanguage: string;
  locale: string;
  newChapterTitle: string;
  busy: boolean;
  onTitleChange(value: string): void;
  onCreate(): void;
}

export default function WriterChaptersPanel({
  storyId,
  chapters,
  storyLanguage,
  locale,
  newChapterTitle,
  busy,
  onTitleChange,
  onCreate,
}: WriterChaptersPanelProps) {
  const { t } = useTranslation();
  const textAttributes = getStoryTextAttributes(storyLanguage);

  return (
    <section
      className="writer-card writer-chapters"
      aria-labelledby="chapters-title"
    >
      <header className="writer-card__header">
        <div>
          <span className="writer-card__icon">
            <FileText aria-hidden="true" size={20} />
          </span>
          <div>
            <h2 id="chapters-title">{t("writer.chapters.title")}</h2>
            <p>{t("writer.chapters.description")}</p>
          </div>
        </div>
        <span className="writer-count-badge">
          {chapters.length.toLocaleString(locale)}
        </span>
      </header>

      <form
        className="writer-new-chapter"
        onSubmit={(event) => {
          event.preventDefault();
          onCreate();
        }}
      >
        <label className="sr-only" htmlFor="new-chapter-title">
          {t("writer.chapters.newTitleLabel")}
        </label>
        <input
          id="new-chapter-title"
          value={newChapterTitle}
          maxLength={200}
          placeholder={t("writer.chapters.newTitlePlaceholder")}
          {...textAttributes}
          onChange={(event) => onTitleChange(event.target.value)}
        />
        <button
          className="writer-button writer-button--primary"
          disabled={busy || !newChapterTitle.trim()}
          type="submit"
        >
          {busy ? (
            <LoaderCircle className="writer-spin" aria-hidden="true" size={17} />
          ) : (
            <Plus aria-hidden="true" size={17} />
          )}
          {t("writer.chapters.create")}
        </button>
      </form>

      {chapters.length > 0 ? (
        <ol className="writer-chapter-list">
          {chapters.map((chapter) => (
            <li key={chapter.id}>
              <Link
                className="writer-chapter-item"
                to={`/write/${storyId}/chapters/${chapter.id}`}
              >
                <span className="writer-chapter-item__position">
                  {chapter.position.toLocaleString(locale)}
                </span>
                <span className="writer-chapter-item__content">
                  <strong {...textAttributes}>{chapter.title}</strong>
                  <small>
                    {t(`writer.chapterStatus.${chapter.status}`)}
                    {" · "}
                    {t("writer.chapters.wordCount", {
                      value: chapter.wordCount.toLocaleString(locale),
                    })}
                    {" · "}
                    {t("writer.chapters.version", {
                      value: chapter.version.toLocaleString(locale),
                    })}
                  </small>
                </span>
                <span className="writer-chapter-item__action">
                  {t("writer.chapters.edit")}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      ) : (
        <div className="writer-empty-chapters">
          <FileText aria-hidden="true" size={38} />
          <h3>{t("writer.chapters.emptyTitle")}</h3>
          <p>{t("writer.chapters.emptyDescription")}</p>
        </div>
      )}
    </section>
  );
}
