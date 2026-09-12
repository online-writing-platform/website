import { useRef, useState, type CSSProperties } from "react";
import { BookOpen } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router-dom";

import ReportForm from "../components/ReportForm";
import ReaderChapterContent from "../features/reader/components/ReaderChapterContent";
import ReaderControls from "../features/reader/components/ReaderControls";
import ReaderStoryOverview from "../features/reader/components/ReaderStoryOverview";
import ReaderTableOfContents from "../features/reader/components/ReaderTableOfContents";
import useReaderContent from "../features/reader/hooks/useReaderContent";
import useReaderLibrary from "../features/reader/hooks/useReaderLibrary";
import useReaderPreferences from "../features/reader/hooks/useReaderPreferences";
import useReadingProgress from "../features/reader/hooks/useReadingProgress";
import { getChapterPath } from "../features/reader/routes";
import useAuth from "../hooks/useAuth";
import { useDocumentMeta } from "../hooks/useDocumentMeta";
import useInterfaceLocale from "../hooks/useInterfaceLocale";
import type { Chapter } from "../types/story";

import "./ReaderPage.css";

interface ShareState {
  storyId: string;
  message: string;
}

export default function ReaderPage() {
  const { slug = "", chapterId } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { status, request, user } = useAuth();
  const { locale } = useInterfaceLocale();
  const [showTableOfContents, setShowTableOfContents] = useState(false);
  const [showReaderSettings, setShowReaderSettings] = useState(false);
  const [shareState, setShareState] = useState<ShareState | null>(null);
  const chapterContentRef = useRef<HTMLElement | null>(null);

  const {
    story,
    chapter,
    publishedChapters,
    requestedChapterId,
    currentChapterIndex,
    navigation,
    storyLoading,
    chapterLoading,
    error,
  } = useReaderContent({ slug, chapterId, status, request, navigate });

  const { settings, updateSettings } = useReaderPreferences({
    status,
    userId: user?.id,
    request,
  });

  const {
    isInLibrary,
    pending: libraryPending,
    message: libraryMessage,
    toggleLibrary,
  } = useReaderLibrary({
    status,
    userId: user?.id,
    storyId: story?.id,
    request,
    addedMessage: t("reader.library.added"),
    removedMessage: t("reader.library.removed"),
  });

  useReadingProgress({
    status,
    storyId: story?.id,
    chapterId: chapter?.id,
    request,
    contentRef: chapterContentRef,
  });

  const shareMessage =
    story && shareState?.storyId === story.id ? shareState.message : null;

  useDocumentMeta({
    title:
      story && chapter
        ? t("reader.document.chapterTitle", {
            chapter: chapter.title,
            story: story.title,
          })
        : story
          ? story.title
          : t("reader.document.defaultTitle"),
    description: story?.description.slice(0, 160),
    canonicalPath:
      story && chapter
        ? getChapterPath(story.slug, chapter.id)
        : `/stories/${slug}`,
    image: story?.coverUrl ?? undefined,
  });

  async function shareStory(): Promise<void> {
    if (!story) {
      return;
    }

    const shareUrl = chapter
      ? `${window.location.origin}${getChapterPath(story.slug, chapter.id)}`
      : `${window.location.origin}/stories/${encodeURIComponent(story.slug)}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: story.title,
          text: story.description,
          url: shareUrl,
        });
        setShareState({ storyId: story.id, message: t("reader.share.shared") });
        return;
      }

      await navigator.clipboard.writeText(shareUrl);
      setShareState({ storyId: story.id, message: t("reader.share.copied") });
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") {
        return;
      }

      setShareState({ storyId: story.id, message: t("reader.share.failed") });
    }
  }

  function selectChapter(selectedChapter: Chapter): void {
    if (!story) {
      return;
    }

    setShowTableOfContents(false);
    navigate(getChapterPath(story.slug, selectedChapter.id));
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  if (error && !story) {
    return (
      <main className="reader-status-page">
        <div className="reader-status-card" role="alert">
          <BookOpen aria-hidden="true" size={40} />
          <h1>{t("reader.errors.loadStoryTitle")}</h1>
          <p>{error}</p>
          <Link className="reader-button reader-button--primary" to="/">
            {t("reader.actions.backHome")}
          </Link>
        </div>
      </main>
    );
  }

  if (storyLoading || !story) {
    return (
      <main className="reader-status-page">
        <div className="reader-status-card">
          <BookOpen className="reader-loading-icon" aria-hidden="true" size={40} />
          <p>{t("reader.loading.story")}</p>
        </div>
      </main>
    );
  }

  return (
    <main
      className={`reader reader--${settings.theme.toLowerCase()}`}
      style={
        {
          "--reader-font-scale": String(settings.fontScale),
          "--reader-line-height": String(settings.lineHeight),
        } as CSSProperties
      }
    >
      <div className="reader__container">
        <Link className="reader__back-link" to="/">
          <span aria-hidden="true">{i18n.dir() === "rtl" ? "→" : "←"}</span>
          {t("reader.actions.back")}
        </Link>

        <ReaderStoryOverview
          story={story}
          publishedChapterCount={publishedChapters.length}
          locale={locale}
          authStatus={status}
          isInLibrary={isInLibrary}
          libraryPending={libraryPending}
          libraryMessage={libraryMessage}
          shareMessage={shareMessage}
          tableOfContentsOpen={showTableOfContents}
          onToggleLibrary={() => void toggleLibrary()}
          onToggleTableOfContents={() =>
            setShowTableOfContents((current) => !current)
          }
          onShare={() => void shareStory()}
        />

        {showTableOfContents ? (
          <ReaderTableOfContents
            chapters={publishedChapters}
            currentChapterId={requestedChapterId}
            storyLanguage={story.language}
            locale={locale}
            onClose={() => setShowTableOfContents(false)}
            onSelect={selectChapter}
          />
        ) : null}

        <ReaderControls
          chapterTitle={chapter?.title}
          storyLanguage={story.language}
          locale={locale}
          settings={settings}
          tableOfContentsOpen={showTableOfContents}
          settingsOpen={showReaderSettings}
          onToggleTableOfContents={() =>
            setShowTableOfContents((current) => !current)
          }
          onToggleSettings={() => setShowReaderSettings((current) => !current)}
          onUpdateSettings={(value) => void updateSettings(value)}
        />

        {error ? (
          <p className="reader-error-message" role="alert">
            {error}
          </p>
        ) : null}

        {publishedChapters.length === 0 ? (
          <section className="reader-empty-chapter">
            <BookOpen aria-hidden="true" size={42} />
            <h2>{t("reader.chapter.emptyTitle")}</h2>
            <p>{t("reader.chapter.emptyDescription")}</p>
            <ReportForm targetType="STORY" targetId={story.id} />
          </section>
        ) : chapterLoading || !chapter ? (
          <section className="reader-empty-chapter">
            <BookOpen
              className="reader-loading-icon"
              aria-hidden="true"
              size={42}
            />
            <p>{t("reader.loading.chapter")}</p>
          </section>
        ) : (
          <ReaderChapterContent
            story={story}
            chapter={chapter}
            previous={navigation.previous}
            next={navigation.next}
            currentIndex={currentChapterIndex}
            chapterCount={publishedChapters.length}
            locale={locale}
            contentRef={chapterContentRef}
          />
        )}
      </div>
    </main>
  );
}
