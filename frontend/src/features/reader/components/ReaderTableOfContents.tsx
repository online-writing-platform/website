import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { getStoryTextAttributes } from "../../../lib/story-language";
import type { Chapter } from "../../../types/story";

interface ReaderTableOfContentsProps {
  chapters: Chapter[];
  currentChapterId: string;
  storyLanguage: string;
  locale: string;
  onClose(): void;
  onSelect(chapter: Chapter): void;
}

export default function ReaderTableOfContents({
  chapters,
  currentChapterId,
  storyLanguage,
  locale,
  onClose,
  onSelect,
}: ReaderTableOfContentsProps) {
  const { t } = useTranslation();
  const textAttributes = getStoryTextAttributes(storyLanguage);

  return (
    <section
      id="reader-table-of-contents"
      className="reader-toc"
      aria-labelledby="reader-toc-title"
    >
      <header className="reader-toc__header">
        <div>
          <span>{t("reader.toc.eyebrow")}</span>
          <h2 id="reader-toc-title">{t("reader.toc.title")}</h2>
        </div>
        <button
          className="reader-icon-button"
          type="button"
          aria-label={t("reader.toc.close")}
          onClick={onClose}
        >
          <X aria-hidden="true" size={20} />
        </button>
      </header>

      {chapters.length > 0 ? (
        <ol className="reader-toc__list">
          {chapters.map((chapter) => {
            const isCurrent = chapter.id === currentChapterId;

            return (
              <li key={chapter.id}>
                <button
                  className={
                    isCurrent
                      ? "reader-toc__item reader-toc__item--active"
                      : "reader-toc__item"
                  }
                  type="button"
                  aria-current={isCurrent ? "page" : undefined}
                  onClick={() => onSelect(chapter)}
                >
                  <span className="reader-toc__position" aria-hidden="true">
                    {chapter.position.toLocaleString(locale)}
                  </span>
                  <span className="reader-toc__title" {...textAttributes}>
                    {chapter.title}
                  </span>
                  <span className="reader-toc__words">
                    {t("reader.chapter.wordCount", {
                      value: chapter.wordCount.toLocaleString(locale),
                    })}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="reader-empty-message">{t("reader.toc.empty")}</p>
      )}
    </section>
  );
}
