import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";

import useAuth from "../hooks/useAuth";
import { getErrorMessage } from "../lib/error-message";

type TargetType = "USER" | "STORY" | "CHAPTER" | "COMMENT";

type Reason =
  | "SPAM"
  | "HARASSMENT"
  | "HATE_OR_ABUSE"
  | "SEXUAL_CONTENT"
  | "VIOLENCE"
  | "COPYRIGHT"
  | "IMPERSONATION"
  | "OTHER";

interface ReportFormProps {
  targetType: TargetType;
  targetId: string;
}

const REPORT_REASONS: Reason[] = [
  "SPAM",
  "HARASSMENT",
  "HATE_OR_ABUSE",
  "SEXUAL_CONTENT",
  "VIOLENCE",
  "COPYRIGHT",
  "IMPERSONATION",
  "OTHER",
];

export default function ReportForm({ targetType, targetId }: ReportFormProps) {
  const { t } = useTranslation();
  const { status, request } = useAuth();

  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<Reason>("SPAM");
  const [details, setDetails] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (status !== "authenticated") {
    return null;
  }

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (busy) {
      return;
    }

    setBusy(true);
    setMessage(null);

    try {
      await request("/api/v1/reports", {
        method: "POST",
        body: JSON.stringify({
          targetType,
          targetId,
          reason,

          ...(details.trim()
            ? {
                details: details.trim(),
              }
            : {}),
        }),
      });

      setMessage(t("report.messages.submitted"));
      setDetails("");
    } catch (cause) {
      setMessage(getErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="report-control">
      <button
        className="button button--quiet"
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? t("report.actions.close") : t("report.actions.open")}
      </button>

      {open ? (
        <form
          className="report-form surface"
          onSubmit={(event) => void submit(event)}
        >
          <label>
            {t("report.fields.reason")}

            <select
              value={reason}
              onChange={(event) => setReason(event.target.value as Reason)}
            >
              {REPORT_REASONS.map((reportReason) => (
                <option key={reportReason} value={reportReason}>
                  {t(`report.reasons.${reportReason}`)}
                </option>
              ))}
            </select>
          </label>

          <label>
            {t("report.fields.details")}

            <textarea
              value={details}
              maxLength={2000}
              rows={3}
              placeholder={t("report.fields.detailsPlaceholder")}
              onChange={(event) => setDetails(event.target.value)}
            />
          </label>

          <button
            className="button button--secondary"
            type="submit"
            disabled={busy}
          >
            {busy ? t("report.actions.submitting") : t("report.actions.submit")}
          </button>

          {message ? <p aria-live="polite">{message}</p> : null}
        </form>
      ) : null}
    </div>
  );
}
