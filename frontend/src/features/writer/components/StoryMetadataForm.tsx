import { LoaderCircle, Save } from "lucide-react";
import { useTranslation } from "react-i18next";

import { getStoryTextAttributes } from "../../../lib/story-language";
import type { Story, StoryRights } from "../../../types/story";
import type { GenreOption } from "../api";

const STORY_RIGHTS: StoryRights[] = [
  "ALL_RIGHTS_RESERVED",
  "CREATIVE_COMMONS",
  "PUBLIC_DOMAIN",
];

interface StoryMetadataFormProps {
  title: string;
  description: string;
  language: string;
  status: Story["status"];
  genreSlug: string;
  tags: string;
  rights: StoryRights;
  isMature: boolean;
  genres: GenreOption[];
  locale: string;
  busy: boolean;
  onTitleChange(value: string): void;
  onDescriptionChange(value: string): void;
  onLanguageChange(value: string): void;
  onStatusChange(value: Story["status"]): void;
  onGenreChange(value: string): void;
  onTagsChange(value: string): void;
  onRightsChange(value: StoryRights): void;
  onMatureChange(value: boolean): void;
  onSubmit(): void;
}

export default function StoryMetadataForm({
  title,
  description,
  language,
  status,
  genreSlug,
  tags,
  rights,
  isMature,
  genres,
  locale,
  busy,
  onTitleChange,
  onDescriptionChange,
  onLanguageChange,
  onStatusChange,
  onGenreChange,
  onTagsChange,
  onRightsChange,
  onMatureChange,
  onSubmit,
}: StoryMetadataFormProps) {
  const { t, i18n } = useTranslation();
  const textAttributes = getStoryTextAttributes(language);

  return (
    <form
      className="writer-metadata-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="writer-form-grid writer-form-grid--two">
        <label className="writer-field">
          <span>{t("writer.fields.storyTitle")}</span>
          <input
            value={title}
            minLength={1}
            maxLength={200}
            required
            {...textAttributes}
            onChange={(event) => onTitleChange(event.target.value)}
          />
        </label>
        <label className="writer-field">
          <span>{t("writer.fields.language")}</span>
          <select
            value={language}
            dir={i18n.dir()}
            onChange={(event) => onLanguageChange(event.target.value)}
          >
            <option value="fa">{t("writer.languages.fa")}</option>
            <option value="en">{t("writer.languages.en")}</option>
          </select>
        </label>
      </div>

      <label className="writer-field">
        <span>{t("writer.fields.description")}</span>
        <textarea
          value={description}
          rows={5}
          minLength={1}
          maxLength={5000}
          required
          {...textAttributes}
          onChange={(event) => onDescriptionChange(event.target.value)}
        />
        <small>
          {t("writer.fields.descriptionCount", {
            value: description.length.toLocaleString(locale),
          })}
        </small>
      </label>

      <div className="writer-form-grid writer-form-grid--three">
        <label className="writer-field">
          <span>{t("writer.fields.genre")}</span>
          <select
            value={genreSlug}
            onChange={(event) => onGenreChange(event.target.value)}
          >
            <option value="">{t("writer.genres.none")}</option>
            {genres.map((genre) => (
              <option key={genre.slug} value={genre.slug}>
                {t(`genres.items.${genre.slug}`, { defaultValue: genre.name })}
              </option>
            ))}
          </select>
        </label>

        <label className="writer-field">
          <span>{t("writer.fields.status")}</span>
          <select
            value={status}
            onChange={(event) =>
              onStatusChange(event.target.value as Story["status"])
            }
          >
            <option value="DRAFT" disabled>
              {t("writer.status.DRAFT")}
            </option>
            {status === "SCHEDULED" ? (
              <option value="SCHEDULED" disabled>
                {t("writer.status.SCHEDULED")}
              </option>
            ) : null}
            <option value="ONGOING">{t("writer.status.ONGOING")}</option>
            <option value="COMPLETED">{t("writer.status.COMPLETED")}</option>
            <option value="HIATUS">{t("writer.status.HIATUS")}</option>
          </select>
        </label>

        <label className="writer-field">
          <span>{t("writer.fields.rights")}</span>
          <select
            value={rights}
            onChange={(event) =>
              onRightsChange(event.target.value as StoryRights)
            }
          >
            {STORY_RIGHTS.map((value) => (
              <option key={value} value={value}>
                {t(`writer.rights.${value}`)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="writer-field">
        <span>{t("writer.fields.tags")}</span>
        <input
          value={tags}
          maxLength={500}
          placeholder={t("writer.fields.tagsPlaceholder")}
          {...textAttributes}
          onChange={(event) => onTagsChange(event.target.value)}
        />
        <small>{t("writer.fields.tagsHelp")}</small>
      </label>

      <label className="writer-checkbox">
        <input
          type="checkbox"
          checked={isMature}
          onChange={(event) => onMatureChange(event.target.checked)}
        />
        <span>
          <strong>{t("writer.mature.title")}</strong>
          <small>{t("writer.mature.description")}</small>
        </span>
      </label>

      <button
        className="writer-button writer-button--primary"
        disabled={busy || !title.trim() || !description.trim()}
        type="submit"
      >
        {busy ? (
          <LoaderCircle className="writer-spin" aria-hidden="true" size={17} />
        ) : (
          <Save aria-hidden="true" size={17} />
        )}
        {busy ? t("writer.actions.saving") : t("writer.actions.saveMetadata")}
      </button>
    </form>
  );
}
