import { useRef } from "react";
import { ImagePlus, LoaderCircle, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";

interface StoryCoverPanelProps {
  storyTitle: string;
  coverUrl: string | null;
  previewUrl: string | null;
  file: File | null;
  busy: boolean;
  onSelect(file: File | null): void;
  onUpload(): Promise<boolean>;
}

export default function StoryCoverPanel({
  storyTitle,
  coverUrl,
  previewUrl,
  file,
  busy,
  onSelect,
  onUpload,
}: StoryCoverPanelProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const displayedUrl = previewUrl ?? coverUrl;

  return (
    <aside className="writer-cover-panel">
      <h3>{t("writer.cover.title")}</h3>
      <div className="writer-cover-preview">
        {displayedUrl ? (
          <img
            src={displayedUrl}
            alt={t("writer.cover.alt", { title: storyTitle })}
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="writer-cover-placeholder">
            <ImagePlus aria-hidden="true" size={38} />
            <span>{t("writer.cover.empty")}</span>
          </div>
        )}
        {previewUrl ? (
          <span className="writer-cover-preview__badge">
            {t("writer.cover.preview")}
          </span>
        ) : null}
      </div>

      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        accept="image/jpeg,image/png"
        onChange={(event) => onSelect(event.target.files?.[0] ?? null)}
      />
      <button
        className="writer-button writer-button--secondary"
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        <ImagePlus aria-hidden="true" size={17} />
        {t("writer.cover.select")}
      </button>

      {file ? (
        <>
          <p className="writer-cover-panel__filename">
            {t("writer.cover.selectedFile", { name: file.name })}
          </p>
          <button
            className="writer-button writer-button--primary"
            type="button"
            disabled={busy}
            onClick={() => {
              void onUpload().then((uploaded) => {
                if (uploaded && inputRef.current) {
                  inputRef.current.value = "";
                }
              });
            }}
          >
            {busy ? (
              <LoaderCircle className="writer-spin" aria-hidden="true" size={17} />
            ) : (
              <Upload aria-hidden="true" size={17} />
            )}
            {busy ? t("writer.cover.uploading") : t("writer.cover.upload")}
          </button>
        </>
      ) : (
        <p className="writer-cover-panel__help">{t("writer.cover.help")}</p>
      )}
    </aside>
  );
}
