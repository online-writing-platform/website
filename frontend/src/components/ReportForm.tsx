import { useState, type FormEvent } from "react";

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

export default function ReportForm({ targetType, targetId }: ReportFormProps) {
  const { status, request } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<Reason>("SPAM");
  const [details, setDetails] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  if (status !== "authenticated") return null;

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setMessage(null);
    try {
      await request("/api/v1/reports", {
        method: "POST",
        body: JSON.stringify({
          targetType,
          targetId,
          reason,
          ...(details.trim() ? { details: details.trim() } : {}),
        }),
      });
      setMessage("گزارش ثبت شد و برای بررسی در صف مدیریت قرار گرفت.");
      setDetails("");
    } catch (cause) {
      setMessage(getErrorMessage(cause));
    }
  }

  return (
    <div className="report-control">
      <button className="button button--quiet" type="button" onClick={() => setOpen((value) => !value)}>
        گزارش محتوا
      </button>
      {open && (
        <form className="report-form surface" onSubmit={(event) => void submit(event)}>
          <label>
            دلیل
            <select value={reason} onChange={(event) => setReason(event.target.value as Reason)}>
              <option value="SPAM">هرزنامه</option>
              <option value="HARASSMENT">آزار و مزاحمت</option>
              <option value="HATE_OR_ABUSE">نفرت یا سوءاستفاده</option>
              <option value="SEXUAL_CONTENT">محتوای جنسی</option>
              <option value="VIOLENCE">خشونت</option>
              <option value="COPYRIGHT">نقض حق نشر</option>
              <option value="IMPERSONATION">جعل هویت</option>
              <option value="OTHER">سایر</option>
            </select>
          </label>
          <label>
            توضیح تکمیلی
            <textarea value={details} maxLength={2000} rows={3} onChange={(event) => setDetails(event.target.value)} />
          </label>
          <button className="button button--secondary" type="submit">ثبت گزارش</button>
          {message && <p aria-live="polite">{message}</p>}
        </form>
      )}
    </div>
  );
}
