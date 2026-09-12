import { BookOpen, Check, Library, List, Share2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import type { AuthStatus } from "../../../context/AuthContext";
import { getStoryTextAttributes } from "../../../lib/story-language";
import type { Story } from "../../../types/story";

interface ReaderStoryOverviewProps {
  story: Story;
  publishedChapterCount: number;
  locale: string;
  authStatus: AuthStatus;
  isInLibrary: boolean | null;
  libraryPending: boolean;
  libraryMessage: string | null;
  shareMessage: string | null;
  tableOfContentsOpen: boolean;
  onToggleLibrary(): void;
  onToggleTableOfContents(): void;
  onShare(): void;
}

function getInitial(value: string): string {
  const normalized = value.trim();
  return normalized ? normalized.slice(0, 1).toUpperCase() : "?";
}

export default function ReaderStoryOverview({
  story,
  publishedChapterCount,
  locale,
  authStatus,
  isInLibrary,
  libraryPending,
  libraryMessage,
  shareMessage,
  tableOfContentsOpen,
  onToggleLibrary,
  onToggleTableOfContents,
  onShare,
}: ReaderStoryOverviewProps) {
  const { t } = useTranslation();
  const textAttributes = getStoryTextAttributes(story.language);
  const statusLabel = t(`reader.status.${story.status}`, {
    defaultValue: story.status,
  });

  return (
    <>
      <section className="reader-story" aria-labelledby="reader-story-title">
        <div className="reader-story__cover-column">
          <div className="reader-story__cover">
            {story.coverUrl ? (
              <img
                src={story.coverUrl}
                alt={t("reader.story.coverAlt", { title: story.title })}
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="reader-story__cover-placeholder" {...textAttributes}>
                <BookOpen aria-hidden="true" size={40} />
                <span>{story.title}</span>
              </div>
            )}
          </div>
        </div>

        <div className="reader-story__information">
          <div className="reader-story__badges">
            {story.genre ? (
              <Link
                className="reader-badge reader-badge--genre"
                to={`/browse/genres/${encodeURIComponent(story.genre.slug)}`}
              >
                {t(`genres.items.${story.genre.slug}`, {
                  defaultValue: story.genre.name,
                })}
              </Link>
            ) : null}
            <span className="reader-badge">{statusLabel}</span>
            <span className="reader-badge" dir="ltr">
              {story.language.toUpperCase()}
            </span>
            {story.isMature ? (
              <span className="reader-badge reader-badge--mature">
                {t("reader.story.mature")}
              </span>
            ) : null}
          </div>

          <h1
            id="reader-story-title"
            className="reader-story__title"
            {...textAttributes}
          >
            {story.title}
          </h1>
          <p className="reader-story__description" {...textAttributes}>
            {story.description}
          </p>

          <Link
            className="reader-story__author"
            to={`/users/${encodeURIComponent(story.author.username)}`}
          >
            <span className="reader-story__avatar">
              {story.author.avatarUrl ? (
                <img
                  src={story.author.avatarUrl}
                  alt=""
                  referrerPolicy="no-referrer"
                />
              ) : (
                getInitial(story.author.displayName)
              )}
            </span>
            <span>
              {t("reader.story.by")} <bdi>{story.author.displayName}</bdi>
            </span>
          </Link>

          <div className="reader-story__statistics">
            <span>
              <BookOpen aria-hidden="true" size={17} />
              {t("reader.story.chapterCount", {
                count: publishedChapterCount,
                value: publishedChapterCount.toLocaleString(locale),
              })}
            </span>
            {story.status === "COMPLETED" ? (
              <span>
                <Check aria-hidden="true" size={17} />
                {t("reader.status.COMPLETED")}
              </span>
            ) : null}
          </div>

          {story.tags.length > 0 ? (
            <ul
              className="reader-story__tags"
              aria-label={t("reader.story.tagsAriaLabel")}
              {...textAttributes}
            >
              {story.tags.map((tag) => (
                <li key={tag.slug}>
                  <Link to={`/browse/tags/${encodeURIComponent(tag.slug)}`}>
                    #{tag.name}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="reader-story__actions">
            {authStatus === "authenticated" ? (
              <button
                className={`reader-button ${
                  isInLibrary
                    ? "reader-button--primary"
                    : "reader-button--secondary"
                }`}
                type="button"
                disabled={libraryPending || isInLibrary === null}
                aria-pressed={isInLibrary === true}
                onClick={onToggleLibrary}
              >
                <Library aria-hidden="true" size={17} />
                {libraryPending
                  ? t("reader.library.pending")
                  : isInLibrary === null
                    ? t("reader.library.checking")
                    : isInLibrary
                      ? t("reader.library.remove")
                      : t("reader.library.add")}
              </button>
            ) : (
              <Link className="reader-button reader-button--secondary" to="/login">
                <Library aria-hidden="true" size={17} />
                {t("reader.library.add")}
              </Link>
            )}

            <button
              className="reader-button reader-button--secondary"
              type="button"
              aria-expanded={tableOfContentsOpen}
              aria-controls="reader-table-of-contents"
              onClick={onToggleTableOfContents}
            >
              <List aria-hidden="true" size={17} />
              {t("reader.toc.title")}
            </button>
            <button
              className="reader-button reader-button--secondary"
              type="button"
              onClick={onShare}
            >
              <Share2 aria-hidden="true" size={17} />
              {t("reader.actions.share")}
            </button>
          </div>

          {libraryMessage ? (
            <p className="reader-inline-message" aria-live="polite">
              {libraryMessage}
            </p>
          ) : null}
          {shareMessage ? (
            <p className="reader-inline-message" aria-live="polite">
              {shareMessage}
            </p>
          ) : null}
        </div>
      </section>

      {story.isMature ? (
        <div className="reader-warning">{t("reader.story.matureWarning")}</div>
      ) : null}
    </>
  );
}
