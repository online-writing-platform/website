import { useCallback, useEffect, useState } from "react";

import useAuth from "../hooks/useAuth";
import { getErrorMessage } from "../lib/error-message";

type TargetType = "USER" | "STORY" | "CHAPTER" | "COMMENT";
type ReportStatus = "OPEN" | "REVIEWING" | "RESOLVED" | "DISMISSED";

interface Report {
  id: string;
  targetType: TargetType;
  targetId: string;
  reason: string;
  details: string | null;
  status: ReportStatus;
  resolution: string | null;
  createdAt: string;
  updatedAt: string;
  reporter: { username: string; displayName: string };
  assignedTo: { id: string; username: string } | null;
}

interface ReportsResponse {
  data: {
    reports: Report[];
    pagination: { hasMore: boolean; nextCursor: string | null };
  };
}

const ACTIONS: Record<TargetType, Array<{ value: string; label: string }>> = {
  USER: [
    { value: "SUSPEND_USER", label: "تعلیق کاربر" },
    { value: "RESTORE_USER", label: "بازگردانی کاربر" },
  ],
  STORY: [
    { value: "HIDE_STORY", label: "پنهان‌کردن داستان" },
    { value: "RESTORE_STORY", label: "بازگردانی داستان" },
  ],
  CHAPTER: [
    { value: "HIDE_CHAPTER", label: "پنهان‌کردن فصل" },
    { value: "RESTORE_CHAPTER", label: "بازگردانی فصل" },
  ],
  COMMENT: [
    { value: "HIDE_COMMENT", label: "پنهان‌کردن نظر" },
    { value: "RESTORE_COMMENT", label: "بازگردانی نظر" },
  ],
};

export default function ModerationPage() {
  const { request } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [status, setStatus] = useState<ReportStatus | "">("OPEN");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    const query = status ? `?status=${status}&limit=50` : "?limit=50";
    const response = await request<ReportsResponse>(`/api/v1/moderation/reports${query}`);
    setReports(response.data.reports);
  }, [request, status]);

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      void load().catch((cause) => setError(getErrorMessage(cause)));
    }, 0);

    return () => {
    window.clearTimeout(loadTimer);
    };
  }, [load]);

  async function updateReport(
    reportId: string,
    input: { status?: ReportStatus; assignToSelf?: boolean; resolution?: string | null },
  ): Promise<void> {
    setError(null);
    try {
      await request(`/api/v1/moderation/reports/${reportId}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      });
      await load();
    } catch (cause) {
      setError(getErrorMessage(cause));
    }
  }

  async function act(report: Report, action: string): Promise<void> {
    setError(null);
    try {
      await request(
        `/api/v1/moderation/targets/${report.targetType}/${report.targetId}/actions`,
        {
          method: "POST",
          body: JSON.stringify({
            action,
            reason: `Action from report ${report.id}: ${report.reason}`,
          }),
        },
      );
      await updateReport(report.id, {
        status: "RESOLVED",
        resolution: `Applied ${action}`,
      });
    } catch (cause) {
      setError(getErrorMessage(cause));
    }
  }

  return (
    <main className="page-shell">
      <header className="page-heading">
        <div><p className="eyebrow">مدیریت محتوا</p><h1>گزارش‌ها</h1></div>
        <label>
          وضعیت
          <select value={status} onChange={(event) => setStatus(event.target.value as ReportStatus | "")}>
            <option value="">همه</option>
            <option value="OPEN">باز</option>
            <option value="REVIEWING">در حال بررسی</option>
            <option value="RESOLVED">حل‌شده</option>
            <option value="DISMISSED">ردشده</option>
          </select>
        </label>
      </header>

      {error && <p className="status-message status-message--error">{error}</p>}

      <div className="moderation-list">
        {reports.length === 0 ? <p className="empty-state">گزارشی با این فیلتر وجود ندارد.</p> : reports.map((report) => (
          <article className="surface moderation-card" key={report.id}>
            <header>
              <div>
                <strong>{report.targetType} · {report.reason}</strong>
                <p>گزارش‌دهنده: @{report.reporter.username}</p>
              </div>
              <span className="status-badge">{report.status}</span>
            </header>
            <code>{report.targetId}</code>
            {report.details && <p>{report.details}</p>}
            {report.resolution && <p><strong>نتیجه:</strong> {report.resolution}</p>}
            <div className="button-row">
              {report.status === "OPEN" && (
                <button className="button button--secondary" type="button" onClick={() => void updateReport(report.id, { status: "REVIEWING", assignToSelf: true })}>
                  قبول بررسی
                </button>
              )}
              {(report.status === "OPEN" || report.status === "REVIEWING") && ACTIONS[report.targetType].map((action) => (
                <button className="button" key={action.value} type="button" onClick={() => void act(report, action.value)}>
                  {action.label}
                </button>
              ))}
              {(report.status === "OPEN" || report.status === "REVIEWING") && (
                <button className="button button--quiet" type="button" onClick={() => void updateReport(report.id, { status: "DISMISSED", resolution: "No policy action required." })}>
                  رد گزارش
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
