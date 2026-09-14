import { useId, useState, type FormEvent } from "react";
import { LoaderCircle, Send, X } from "lucide-react";

import useInterfaceLocale from "../../../hooks/useInterfaceLocale";

interface CommentComposerProps {
  label: string;
  submitLabel: string;
  submittingLabel: string;
  placeholder?: string;
  initialValue?: string;
  compact?: boolean;
  autoFocus?: boolean;
  cancelLabel?: string;
  error?: string | null;
  onClearError?(): void;
  onCancel?(): void;
  onSubmit(content: string): Promise<boolean>;
}

export default function CommentComposer({
  label,
  submitLabel,
  submittingLabel,
  placeholder,
  initialValue = "",
  compact = false,
  autoFocus = false,
  cancelLabel,
  error,
  onClearError,
  onCancel,
  onSubmit,
}: CommentComposerProps) {
  const fieldId = useId();
  const errorId = `${fieldId}-error`;
  const { locale } = useInterfaceLocale();
  const [content, setContent] = useState(initialValue);
  const [submitting, setSubmitting] = useState(false);
  const trimmedContent = content.trim();

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (!trimmedContent || submitting) return;

    setSubmitting(true);
    const succeeded = await onSubmit(trimmedContent);
    setSubmitting(false);

    if (succeeded) {
      setContent("");
    }
  }

  return (
    <form
      className={`comment-composer${compact ? " comment-composer--compact" : ""}`}
      onSubmit={(event) => void submit(event)}
    >
      <label htmlFor={fieldId}>{label}</label>
      <textarea
        id={fieldId}
        value={content}
        rows={compact ? 3 : 4}
        maxLength={2000}
        placeholder={placeholder}
        autoFocus={autoFocus}
        disabled={submitting}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => {
          setContent(event.target.value);
          if (error) onClearError?.();
        }}
      />

      {error ? (
        <p id={errorId} className="comment-composer__error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="comment-composer__footer">
        <small aria-live="polite">
          {content.length.toLocaleString(locale)} / {(2000).toLocaleString(locale)}
        </small>

        <div className="comment-composer__actions">
          {onCancel && cancelLabel ? (
            <button
              className="button button--quiet"
              type="button"
              disabled={submitting}
              onClick={() => {
                onClearError?.();
                onCancel();
              }}
            >
              <X aria-hidden="true" />
              {cancelLabel}
            </button>
          ) : null}

          <button
            className="button button--primary"
            type="submit"
            disabled={submitting || !trimmedContent}
          >
            {submitting ? (
              <LoaderCircle className="is-spinning" aria-hidden="true" />
            ) : (
              <Send aria-hidden="true" />
            )}
            {submitting ? submittingLabel : submitLabel}
          </button>
        </div>
      </div>
    </form>
  );
}
