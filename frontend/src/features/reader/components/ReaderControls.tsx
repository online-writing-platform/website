import { BookOpen, List, Settings2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { getStoryTextAttributes } from "../../../lib/story-language";
import type { ReaderSettings, ReaderTheme } from "../types";

interface ReaderControlsProps {
  chapterTitle?: string;
  storyLanguage: string;
  locale: string;
  settings: ReaderSettings;
  tableOfContentsOpen: boolean;
  settingsOpen: boolean;
  onToggleTableOfContents(): void;
  onToggleSettings(): void;
  onUpdateSettings(value: Partial<ReaderSettings>): void;
}

export default function ReaderControls({
  chapterTitle,
  storyLanguage,
  locale,
  settings,
  tableOfContentsOpen,
  settingsOpen,
  onToggleTableOfContents,
  onToggleSettings,
  onUpdateSettings,
}: ReaderControlsProps) {
  const { t } = useTranslation();
  const textAttributes = getStoryTextAttributes(storyLanguage);

  return (
    <>
      <div className="reader__toolbar" aria-label={t("reader.toolbar.ariaLabel")}>
        <div className="reader__toolbar-chapter">
          <BookOpen aria-hidden="true" size={18} />
          <span {...textAttributes}>
            {chapterTitle ?? t("reader.chapter.fallbackTitle")}
          </span>
        </div>
        <div className="reader__toolbar-actions">
          <button
            className="reader-toolbar-button"
            type="button"
            aria-expanded={tableOfContentsOpen}
            onClick={onToggleTableOfContents}
          >
            <List aria-hidden="true" size={18} />
            <span>{t("reader.toolbar.chapters")}</span>
          </button>
          <button
            className="reader-toolbar-button"
            type="button"
            aria-expanded={settingsOpen}
            aria-controls="reader-settings"
            onClick={onToggleSettings}
          >
            <Settings2 aria-hidden="true" size={18} />
            <span>{t("reader.toolbar.settings")}</span>
          </button>
        </div>
      </div>

      {settingsOpen ? (
        <section
          id="reader-settings"
          className="reader-settings"
          aria-label={t("reader.settings.ariaLabel")}
        >
          <label className="reader-settings__field">
            <span>{t("reader.settings.theme")}</span>
            <select
              value={settings.theme}
              onChange={(event) =>
                onUpdateSettings({ theme: event.target.value as ReaderTheme })
              }
            >
              {(["SYSTEM", "LIGHT", "DARK", "SEPIA"] as const).map(
                (theme) => (
                  <option key={theme} value={theme}>
                    {t(`reader.settings.themes.${theme}`)}
                  </option>
                ),
              )}
            </select>
          </label>

          <label className="reader-settings__field">
            <span>
              {t("reader.settings.fontScale", {
                value: Math.round(settings.fontScale * 100).toLocaleString(locale),
              })}
            </span>
            <input
              type="range"
              min="0.8"
              max="1.5"
              step="0.05"
              value={settings.fontScale}
              onChange={(event) =>
                onUpdateSettings({ fontScale: Number(event.target.value) })
              }
            />
          </label>

          <label className="reader-settings__field">
            <span>
              {t("reader.settings.lineHeight", {
                value: settings.lineHeight.toLocaleString(locale),
              })}
            </span>
            <input
              type="range"
              min="1.3"
              max="2.2"
              step="0.05"
              value={settings.lineHeight}
              onChange={(event) =>
                onUpdateSettings({ lineHeight: Number(event.target.value) })
              }
            />
          </label>
        </section>
      ) : null}
    </>
  );
}
