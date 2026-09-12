import { ArrowRight, BookOpen, Eye, Send } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { getStoryTextAttributes } from "../../../lib/story-language";
import type { Story } from "../../../types/story";

interface WriterStoryHeaderProps {
  story: Story;
  chapterCount: number;
  locale: string;
  busy: boolean;
  onTogglePublish(): void;
}

export default function WriterStoryHeader({
  story,
  chapterCount,
  locale,
  busy,
  onTogglePublish,
}: WriterStoryHeaderProps) {
  const { t } = useTranslation();
  const textAttributes = getStoryTextAttributes(story.language);
  const statusLabel = t(`writer.status.${story.status}`, {
    defaultValue: story.status,
  });

  return (
    <header className="writer-header">
      <div className="writer-header__identity">
        <Link className="writer-back-link" to="/write">
          <ArrowRight aria-hidden="true" size={18} />
          {t("writer.actions.backToStories")}
        </Link>

        <div className="writer-header__title-row">
          <div className="writer-header__icon">
            <BookOpen aria-hidden="true" size={27} />
          </div>
          <div>
            <p className="writer-eyebrow">{t("writer.header.eyebrow")}</p>
            <h1 {...textAttributes}>{story.title}</h1>
            <div className="writer-header__meta">
              <span>{statusLabel}</span>
              <span aria-hidden="true">•</span>
              <span>
                {story.visibility === "PUBLIC"
                  ? t("writer.visibility.public")
                  : t("writer.visibility.private")}
              </span>
              <span aria-hidden="true">•</span>
              <span>
                {t("writer.chapters.count", {
                  count: chapterCount,
                  value: chapterCount.toLocaleString(locale),
                })}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="writer-header__actions">
        {story.visibility !== "PRIVATE" ? (
          <Link
            className="writer-button writer-button--secondary"
            to={`/stories/${encodeURIComponent(story.slug)}`}
            target="_blank"
            rel="noreferrer"
          >
            <Eye aria-hidden="true" size={17} />
            {t("writer.actions.preview")}
          </Link>
        ) : null}
        <button
          className="writer-button writer-button--publish"
          type="button"
          disabled={busy}
          onClick={onTogglePublish}
        >
          <Send aria-hidden="true" size={17} />
          {story.visibility === "PUBLIC"
            ? t("writer.actions.unpublishStory")
            : t("writer.actions.publishStory")}
        </button>
      </div>
    </header>
  );
}
