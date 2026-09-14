import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import type { RefObject } from "react";

import ReaderInteractions from "../../../components/ReaderInteractions";
import ReportForm from "../../../components/ReportForm";
import RichTextContent from "../../../components/RichTextContent";
import { getStoryTextAttributes } from "../../../lib/story-language";
import type { Chapter, Story } from "../../../types/story";
import { getChapterPath } from "../routes";

interface ReaderChapterContentProps {
  story: Story;
  chapter: Chapter;
  previous?: Chapter;
  next?: Chapter;
  currentIndex: number;
  chapterCount: number;
  locale: string;
  contentRef: RefObject<HTMLElement | null>;
}

export default function ReaderChapterContent({
  story,
  chapter,
  previous,
  next,
  currentIndex,
  chapterCount,
  locale,
  contentRef,
}: ReaderChapterContentProps) {
  const { t } = useTranslation();
  const textAttributes = getStoryTextAttributes(story.language);
  const scrollToTop = () =>
    window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <>
      <article ref={contentRef} className="reader__paper" {...textAttributes}>
        <header className="reader__heading">
          <p className="reader__story-name">{story.title}</p>
          <h2>{chapter.title}</h2>
          <div className="reader__chapter-meta">
            <span>
              {t("reader.chapter.position", {
                current: (currentIndex + 1).toLocaleString(locale),
                total: chapterCount.toLocaleString(locale),
              })}
            </span>
            <span aria-hidden="true">•</span>
            <span>
              {t("reader.chapter.wordCount", {
                value: chapter.wordCount.toLocaleString(locale),
              })}
            </span>
          </div>
        </header>
        <RichTextContent className="reader__content" content={chapter.content ?? ""} />
      </article>

      <nav className="reader__navigation" aria-label={t("reader.navigation.ariaLabel")}>
        {previous ? (
          <Link
            className="reader-chapter-link"
            to={getChapterPath(story.slug, previous.id)}
            onClick={scrollToTop}
          >
            <ChevronRight
              className="reader-chapter-link__icon reader-chapter-link__icon--previous"
              aria-hidden="true"
              size={20}
            />
            <span>
              <small>{t("reader.navigation.previous")}</small>
              <bdi {...textAttributes}>{previous.title}</bdi>
            </span>
          </Link>
        ) : (
          <span />
        )}

        {next ? (
          <Link
            className="reader-chapter-link reader-chapter-link--next"
            to={getChapterPath(story.slug, next.id)}
            onClick={scrollToTop}
          >
            <span>
              <small>{t("reader.navigation.next")}</small>
              <bdi {...textAttributes}>{next.title}</bdi>
            </span>
            <ChevronLeft
              className="reader-chapter-link__icon reader-chapter-link__icon--next"
              aria-hidden="true"
              size={20}
            />
          </Link>
        ) : (
          <span />
        )}
      </nav>

      <section className="reader__report">
        <ReportForm targetType="STORY" targetId={story.id} />
      </section>
      <div className="reader__discussion">
        <ReaderInteractions key={chapter.id} chapterId={chapter.id} />
      </div>
    </>
  );
}
