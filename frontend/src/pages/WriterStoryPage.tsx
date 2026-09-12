import { Check, CircleAlert, LoaderCircle, Settings2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";

import StoryCoverPanel from "../features/writer/components/StoryCoverPanel";
import StoryMetadataForm from "../features/writer/components/StoryMetadataForm";
import WriterChaptersPanel from "../features/writer/components/WriterChaptersPanel";
import WriterStoryHeader from "../features/writer/components/WriterStoryHeader";
import useWriterStory from "../features/writer/hooks/useWriterStory";
import useAuth from "../hooks/useAuth";
import useInterfaceLocale from "../hooks/useInterfaceLocale";

import "./WriterStoryPage.css";

export default function WriterStoryPage() {
  const { storyId = "" } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { request } = useAuth();
  const { locale } = useInterfaceLocale();
  const writer = useWriterStory({ storyId, request, navigate });

  if (writer.pageLoading || !writer.story) {
    return (
      <main className="writer-loading-page">
        {writer.error ? (
          <div className="writer-status writer-status--error" role="alert">
            <CircleAlert aria-hidden="true" size={28} />
            <p>{writer.error}</p>
          </div>
        ) : (
          <div className="writer-loading-card">
            <LoaderCircle className="writer-spin" aria-hidden="true" size={34} />
            <p>{t("writer.loading.story")}</p>
          </div>
        )}
      </main>
    );
  }

  const story = writer.story;

  return (
    <main className="writer-page">
      <div className="writer-page__container">
        <WriterStoryHeader
          story={story}
          chapterCount={writer.chapters.length}
          locale={locale}
          busy={writer.metadataBusy}
          onTogglePublish={() => void writer.toggleStoryPublish()}
        />

        {writer.error ? (
          <div className="writer-status writer-status--error" role="alert">
            <CircleAlert aria-hidden="true" size={20} />
            <p>{writer.error}</p>
          </div>
        ) : null}

        {writer.message ? (
          <div className="writer-status writer-status--success" role="status">
            <Check aria-hidden="true" size={20} />
            <p>{t(`writer.messages.${writer.message}`)}</p>
          </div>
        ) : null}

        <section
          className="writer-card writer-story-settings"
          aria-labelledby="story-details-title"
        >
          <header className="writer-card__header">
            <div>
              <span className="writer-card__icon">
                <Settings2 aria-hidden="true" size={20} />
              </span>
              <div>
                <h2 id="story-details-title">{t("writer.details.title")}</h2>
                <p>{t("writer.details.description")}</p>
              </div>
            </div>
          </header>

          <div className="writer-story-settings__layout">
            <StoryMetadataForm
              title={writer.title}
              description={writer.description}
              language={writer.language}
              status={writer.storyStatus}
              genreSlug={writer.genreSlug}
              tags={writer.tags}
              rights={writer.rights}
              isMature={writer.isMature}
              genres={writer.genres}
              locale={locale}
              busy={writer.metadataBusy}
              onTitleChange={writer.setTitle}
              onDescriptionChange={writer.setDescription}
              onLanguageChange={writer.setLanguage}
              onStatusChange={writer.setStoryStatus}
              onGenreChange={writer.setGenreSlug}
              onTagsChange={writer.setTags}
              onRightsChange={writer.setRights}
              onMatureChange={writer.setIsMature}
              onSubmit={() => void writer.saveMetadata()}
            />

            <StoryCoverPanel
              storyTitle={story.title}
              coverUrl={story.coverUrl}
              previewUrl={writer.coverPreviewUrl}
              file={writer.cover}
              busy={writer.coverBusy}
              onSelect={writer.selectCover}
              onUpload={writer.uploadCover}
            />
          </div>
        </section>

        <WriterChaptersPanel
          storyId={storyId}
          chapters={writer.chapters}
          storyLanguage={writer.language}
          locale={locale}
          newChapterTitle={writer.newChapterTitle}
          busy={writer.chapterBusy}
          onTitleChange={writer.setNewChapterTitle}
          onCreate={() => void writer.createChapter()}
        />
      </div>
    </main>
  );
}
