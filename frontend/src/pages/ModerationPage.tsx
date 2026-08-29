import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  BookOpen,
  CheckCircle2,
  Clock3,
  FileText,
  Gavel,
  Inbox,
  LoaderCircle,
  MessageSquare,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Undo2,
  UserCheck,
  UserMinus,
  UserRound,
  X,
  XCircle,
  type LucideIcon,
} from "lucide-react";

import useAuth from "../hooks/useAuth";
import { getErrorMessage } from "../lib/error-message";

import "./ModerationPage.css";

type TargetType = "USER" | "STORY" | "CHAPTER" | "COMMENT";
type ReportStatus = "OPEN" | "REVIEWING" | "RESOLVED" | "DISMISSED";
type ReportReason =
  | "SPAM"
  | "HARASSMENT"
  | "HATE_OR_ABUSE"
  | "SEXUAL_CONTENT"
  | "VIOLENCE"
  | "COPYRIGHT"
  | "IMPERSONATION"
  | "OTHER";

type ModerationAction =
  | "SUSPEND_USER"
  | "RESTORE_USER"
  | "HIDE_STORY"
  | "RESTORE_STORY"
  | "HIDE_CHAPTER"
  | "RESTORE_CHAPTER"
  | "HIDE_COMMENT"
  | "RESTORE_COMMENT";

type StatusFilter = ReportStatus | "";
type TargetFilter = TargetType | "";

interface Report {
  id: string;
  targetType: TargetType;
  targetId: string;
  reason: ReportReason;
  details: string | null;
  status: ReportStatus;
  resolution: string | null;
  createdAt: string;
  updatedAt: string;
  reporter: {
    username: string;
    displayName: string;
  };
  assignedTo: {
    id: string;
    username: string;
  } | null;
}

interface ReportsResponse {
  data: {
    reports: Report[];
    pagination: {
      hasMore: boolean;
      nextCursor: string | null;
    };
  };
}

interface PendingDecision {
  report: Report;
  kind: "action" | "dismiss";
  action?: ModerationAction;
}

const ACTIONS: Record<TargetType, ModerationAction[]> = {
  USER: ["SUSPEND_USER", "RESTORE_USER"],
  STORY: ["HIDE_STORY", "RESTORE_STORY"],
  CHAPTER: ["HIDE_CHAPTER", "RESTORE_CHAPTER"],
  COMMENT: ["HIDE_COMMENT", "RESTORE_COMMENT"],
};

const RESTRICTIVE_ACTIONS = new Set<ModerationAction>([
  "SUSPEND_USER",
  "HIDE_STORY",
  "HIDE_CHAPTER",
  "HIDE_COMMENT",
]);

const TARGET_ICONS: Record<TargetType, LucideIcon> = {
  USER: UserRound,
  STORY: BookOpen,
  CHAPTER: FileText,
  COMMENT: MessageSquare,
};

const COPY = {
  fa: {
    locale: "fa-IR",
    eyebrow: "مدیریت محتوا",
    title: "مرکز بررسی گزارش‌ها",
    description:
      "گزارش‌های کاربران را بررسی کنید، مسئول رسیدگی را مشخص کنید و همهٔ تصمیم‌ها را با توضیح ثبت کنید.",
    refresh: "به‌روزرسانی",
    refreshing: "در حال به‌روزرسانی…",
    loaded: "گزارش بارگذاری‌شده",
    actionable: "نیازمند تصمیم",
    unassigned: "بدون مسئول",
    statusFilterLabel: "فیلتر وضعیت گزارش‌ها",
    allStatuses: "همه",
    statuses: {
      OPEN: "باز",
      REVIEWING: "در حال بررسی",
      RESOLVED: "حل‌شده",
      DISMISSED: "ردشده",
    },
    targetFilterLabel: "نوع محتوای گزارش‌شده",
    allTargets: "همهٔ موارد",
    targets: {
      USER: "کاربر",
      STORY: "داستان",
      CHAPTER: "فصل",
      COMMENT: "نظر",
    },
    reasons: {
      SPAM: "هرزنامه",
      HARASSMENT: "آزار و اذیت",
      HATE_OR_ABUSE: "نفرت‌پراکنی یا توهین",
      SEXUAL_CONTENT: "محتوای جنسی",
      VIOLENCE: "خشونت",
      COPYRIGHT: "نقض حق نشر",
      IMPERSONATION: "جعل هویت",
      OTHER: "سایر موارد",
    },
    actions: {
      SUSPEND_USER: "تعلیق کاربر",
      RESTORE_USER: "بازگردانی کاربر",
      HIDE_STORY: "پنهان‌کردن داستان",
      RESTORE_STORY: "بازگردانی داستان",
      HIDE_CHAPTER: "پنهان‌کردن فصل",
      RESTORE_CHAPTER: "بازگردانی فصل",
      HIDE_COMMENT: "پنهان‌کردن نظر",
      RESTORE_COMMENT: "بازگردانی نظر",
    },
    searchLabel: "جست‌وجو در گزارش‌های بارگذاری‌شده",
    searchPlaceholder: "شناسه، دلیل یا نام گزارش‌دهنده…",
    reporter: "گزارش‌دهنده",
    targetId: "شناسهٔ هدف",
    submittedAt: "ثبت‌شده در",
    assignedTo: (username: string) => `مسئول: @${username}`,
    notAssigned: "هنوز به کسی واگذار نشده",
    details: "توضیحات گزارش",
    noDetails: "گزارش‌دهنده توضیح بیشتری ثبت نکرده است.",
    resolution: "نتیجهٔ بررسی",
    takeReview: "پذیرفتن بررسی",
    releaseReview: "واگذاری بررسی",
    dismiss: "رد گزارش",
    reopen: "بازگشایی گزارش",
    loading: "در حال دریافت گزارش‌ها…",
    loadError: "دریافت گزارش‌ها ناموفق بود.",
    actionError: "ثبت تصمیم مدیریت ناموفق بود.",
    retry: "تلاش دوباره",
    emptyTitle: "گزارشی با این فیلتر وجود ندارد",
    emptyDescription:
      "با تغییر وضعیت یا نوع محتوا، گزارش‌های دیگری را بررسی کنید.",
    searchEmptyTitle: "گزارش منطبقی پیدا نشد",
    searchEmptyDescription:
      "عبارت جست‌وجو را کوتاه‌تر کنید یا فیلترها را تغییر دهید.",
    loadMore: "نمایش گزارش‌های بیشتر",
    loadingMore: "در حال بارگذاری…",
    decisionEyebrow: "ثبت تصمیم مدیریت",
    actionDialogTitle: (action: string) => `تأیید «${action}»`,
    dismissDialogTitle: "رد این گزارش؟",
    actionDialogDescription:
      "این اقدام روی حساب یا محتوای هدف اعمال و در گزارش ممیزی ثبت می‌شود.",
    dismissDialogDescription:
      "گزارش بدون اقدام روی محتوای هدف بسته می‌شود. بهتر است دلیل تصمیم را ثبت کنید.",
    moderatorNote: "یادداشت مدیر",
    moderatorNotePlaceholder: "دلیل تصمیم یا نکته‌ای برای مدیران دیگر بنویسید…",
    noteHelp:
      "این توضیح حداکثر ۲۰۰۰ کاراکتر است و در نتیجهٔ گزارش ذخیره می‌شود.",
    cancel: "انصراف",
    confirmAction: "تأیید و اعمال اقدام",
    confirmDismiss: "تأیید رد گزارش",
    applying: "در حال ثبت…",
    dismissDefault: "پس از بررسی، نیازی به اقدام مدیریتی تشخیص داده نشد.",
    actionResolution: (action: string) => `اقدام «${action}» اعمال شد.`,
  },
  en: {
    locale: "en-US",
    eyebrow: "Content moderation",
    title: "Report review center",
    description:
      "Review user reports, assign ownership, and record the reasoning behind every moderation decision.",
    refresh: "Refresh",
    refreshing: "Refreshing…",
    loaded: "Reports loaded",
    actionable: "Awaiting decision",
    unassigned: "Unassigned",
    statusFilterLabel: "Report status filter",
    allStatuses: "All",
    statuses: {
      OPEN: "Open",
      REVIEWING: "Reviewing",
      RESOLVED: "Resolved",
      DISMISSED: "Dismissed",
    },
    targetFilterLabel: "Reported content type",
    allTargets: "All targets",
    targets: {
      USER: "User",
      STORY: "Story",
      CHAPTER: "Chapter",
      COMMENT: "Comment",
    },
    reasons: {
      SPAM: "Spam",
      HARASSMENT: "Harassment",
      HATE_OR_ABUSE: "Hate or abuse",
      SEXUAL_CONTENT: "Sexual content",
      VIOLENCE: "Violence",
      COPYRIGHT: "Copyright",
      IMPERSONATION: "Impersonation",
      OTHER: "Other",
    },
    actions: {
      SUSPEND_USER: "Suspend user",
      RESTORE_USER: "Restore user",
      HIDE_STORY: "Hide story",
      RESTORE_STORY: "Restore story",
      HIDE_CHAPTER: "Hide chapter",
      RESTORE_CHAPTER: "Restore chapter",
      HIDE_COMMENT: "Hide comment",
      RESTORE_COMMENT: "Restore comment",
    },
    searchLabel: "Search loaded reports",
    searchPlaceholder: "ID, reason, or reporter name…",
    reporter: "Reporter",
    targetId: "Target ID",
    submittedAt: "Submitted",
    assignedTo: (username: string) => `Assigned to @${username}`,
    notAssigned: "Not assigned yet",
    details: "Report details",
    noDetails: "The reporter did not provide additional details.",
    resolution: "Review outcome",
    takeReview: "Take review",
    releaseReview: "Release review",
    dismiss: "Dismiss report",
    reopen: "Reopen report",
    loading: "Loading reports…",
    loadError: "Reports could not be loaded.",
    actionError: "The moderation decision could not be saved.",
    retry: "Try again",
    emptyTitle: "No reports match these filters",
    emptyDescription:
      "Change the status or target type to review other reports.",
    searchEmptyTitle: "No matching reports found",
    searchEmptyDescription:
      "Try a shorter search term or change the selected filters.",
    loadMore: "Load more reports",
    loadingMore: "Loading…",
    decisionEyebrow: "Record moderation decision",
    actionDialogTitle: (action: string) => `Confirm “${action}”`,
    dismissDialogTitle: "Dismiss this report?",
    actionDialogDescription:
      "This action affects the target account or content and will be recorded in the audit log.",
    dismissDialogDescription:
      "The report will close without changing the target. Recording the reason is recommended.",
    moderatorNote: "Moderator note",
    moderatorNotePlaceholder:
      "Explain the decision or leave context for other moderators…",
    noteHelp:
      "Up to 2,000 characters. This note is saved as the report outcome.",
    cancel: "Cancel",
    confirmAction: "Confirm and apply action",
    confirmDismiss: "Confirm dismissal",
    applying: "Saving…",
    dismissDefault: "No policy action was required after review.",
    actionResolution: (action: string) => `Applied “${action}”.`,
  },
} as const;

const PAGE_SIZE = 20;

export default function ModerationPage() {
  const { i18n } = useTranslation();
  const { request, user } = useAuth();

  const language = i18n.resolvedLanguage?.startsWith("en") ? "en" : "fa";
  const direction = language === "fa" ? "rtl" : "ltr";
  const copy = COPY[language];

  const [reports, setReports] = useState<Report[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("OPEN");
  const [targetFilter, setTargetFilter] = useState<TargetFilter>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [pagination, setPagination] = useState({
    hasMore: false,
    nextCursor: null as string | null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyReportId, setBusyReportId] = useState<string | null>(null);
  const [pendingDecision, setPendingDecision] =
    useState<PendingDecision | null>(null);
  const [moderatorNote, setModeratorNote] = useState("");

  const buildReportsPath = useCallback(
    (cursor?: string): string => {
      const query = new URLSearchParams({
        limit: String(PAGE_SIZE),
      });

      if (statusFilter) {
        query.set("status", statusFilter);
      }

      if (targetFilter) {
        query.set("targetType", targetFilter);
      }

      if (cursor) {
        query.set("cursor", cursor);
      }

      return `/api/v1/moderation/reports?${query.toString()}`;
    },
    [statusFilter, targetFilter],
  );

  const fetchReports = useCallback(
    (cursor?: string): Promise<ReportsResponse> =>
      request<ReportsResponse>(buildReportsPath(cursor)),
    [buildReportsPath, request],
  );

  useEffect(() => {
    let active = true;

    const timer = window.setTimeout(() => {
      void fetchReports()
        .then((response) => {
          if (!active) {
            return;
          }

          setReports(response.data.reports);
          setPagination(response.data.pagination);
          setLoadError(null);
          setIsLoading(false);
        })
        .catch((cause: unknown) => {
          if (!active) {
            return;
          }

          setReports([]);
          setPagination({
            hasMore: false,
            nextCursor: null,
          });
          setLoadError(getErrorMessage(cause));
          setIsLoading(false);
        });
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [fetchReports, reloadKey]);

  useEffect(() => {
    if (!pendingDecision) {
      return;
    }

    function closeOnEscape(event: KeyboardEvent): void {
      if (event.key === "Escape" && !busyReportId) {
        setPendingDecision(null);
        setModeratorNote("");
      }
    }

    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [busyReportId, pendingDecision]);

  const visibleReports = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase();

    if (!normalizedQuery) {
      return reports;
    }

    return reports.filter((report) =>
      [
        report.id,
        report.targetId,
        report.reason,
        report.details,
        report.resolution,
        report.reporter.username,
        report.reporter.displayName,
        report.assignedTo?.username,
      ]
        .filter((value): value is string => typeof value === "string")
        .some((value) => value.toLocaleLowerCase().includes(normalizedQuery)),
    );
  }, [reports, searchQuery]);

  const actionableCount = reports.filter(
    (report) => report.status === "OPEN" || report.status === "REVIEWING",
  ).length;

  const unassignedCount = reports.filter(
    (report) =>
      (report.status === "OPEN" || report.status === "REVIEWING") &&
      !report.assignedTo,
  ).length;

  function formatDate(value: string): string {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat(copy.locale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  }

  function changeStatusFilter(nextStatus: StatusFilter): void {
    setStatusFilter(nextStatus);
    setReports([]);
    setPagination({
      hasMore: false,
      nextCursor: null,
    });
    setLoadError(null);
    setActionError(null);
    setIsLoading(true);
  }

  function changeTargetFilter(nextTarget: TargetFilter): void {
    setTargetFilter(nextTarget);
    setReports([]);
    setPagination({
      hasMore: false,
      nextCursor: null,
    });
    setLoadError(null);
    setActionError(null);
    setIsLoading(true);
  }

  function refresh(): void {
    setIsLoading(true);
    setLoadError(null);
    setActionError(null);
    setReloadKey((current) => current + 1);
  }

  async function refreshAfterMutation(): Promise<void> {
    const response = await fetchReports();

    setReports(response.data.reports);
    setPagination(response.data.pagination);
    setLoadError(null);
  }

  async function loadMore(): Promise<void> {
    if (!pagination.nextCursor || isLoadingMore) {
      return;
    }

    setIsLoadingMore(true);
    setLoadError(null);

    try {
      const response = await fetchReports(pagination.nextCursor);

      setReports((currentReports) => {
        const knownIds = new Set(currentReports.map((report) => report.id));

        const newReports = response.data.reports.filter(
          (report) => !knownIds.has(report.id),
        );

        return [...currentReports, ...newReports];
      });

      setPagination(response.data.pagination);
    } catch (cause) {
      setLoadError(getErrorMessage(cause));
    } finally {
      setIsLoadingMore(false);
    }
  }

  async function updateAssignment(
    report: Report,
    assignToSelf: boolean,
  ): Promise<void> {
    if (busyReportId) {
      return;
    }

    setBusyReportId(report.id);
    setActionError(null);

    try {
      await request(
        `/api/v1/moderation/reports/${encodeURIComponent(report.id)}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            ...(assignToSelf ? { status: "REVIEWING" as const } : {}),
            assignToSelf,
          }),
        },
      );

      await refreshAfterMutation();
    } catch (cause) {
      setActionError(getErrorMessage(cause));
    } finally {
      setBusyReportId(null);
    }
  }

  async function reopenReport(report: Report): Promise<void> {
    if (busyReportId) {
      return;
    }

    setBusyReportId(report.id);
    setActionError(null);

    try {
      await request(
        `/api/v1/moderation/reports/${encodeURIComponent(report.id)}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            status: "OPEN",
            resolution: null,
            assignToSelf: false,
          }),
        },
      );

      await refreshAfterMutation();
    } catch (cause) {
      setActionError(getErrorMessage(cause));
    } finally {
      setBusyReportId(null);
    }
  }

  function openActionDialog(report: Report, action: ModerationAction): void {
    setActionError(null);
    setModeratorNote("");
    setPendingDecision({
      report,
      kind: "action",
      action,
    });
  }

  function openDismissDialog(report: Report): void {
    setActionError(null);
    setModeratorNote("");
    setPendingDecision({
      report,
      kind: "dismiss",
    });
  }

  function closeDecisionDialog(): void {
    if (busyReportId) {
      return;
    }

    setPendingDecision(null);
    setModeratorNote("");
  }

  async function confirmDecision(): Promise<void> {
    if (!pendingDecision || busyReportId) {
      return;
    }

    const { report } = pendingDecision;
    const note = moderatorNote.trim();

    setBusyReportId(report.id);
    setActionError(null);

    try {
      if (pendingDecision.kind === "dismiss") {
        await request(
          `/api/v1/moderation/reports/${encodeURIComponent(report.id)}`,
          {
            method: "PATCH",
            body: JSON.stringify({
              status: "DISMISSED",
              resolution: note || copy.dismissDefault,
            }),
          },
        );
      } else if (pendingDecision.action) {
        const actionLabel = copy.actions[pendingDecision.action];

        await request(
          `/api/v1/moderation/targets/${report.targetType}/${encodeURIComponent(
            report.targetId,
          )}/actions`,
          {
            method: "POST",
            body: JSON.stringify({
              action: pendingDecision.action,
              reason:
                note ||
                `Moderation action from report ${report.id}: ${report.reason}`,
            }),
          },
        );

        await request(
          `/api/v1/moderation/reports/${encodeURIComponent(report.id)}`,
          {
            method: "PATCH",
            body: JSON.stringify({
              status: "RESOLVED",
              resolution: note || copy.actionResolution(actionLabel),
            }),
          },
        );
      }

      await refreshAfterMutation();
      setPendingDecision(null);
      setModeratorNote("");
    } catch (cause) {
      setActionError(getErrorMessage(cause));
    } finally {
      setBusyReportId(null);
    }
  }

  const pendingAction = pendingDecision?.action;
  const pendingActionLabel = pendingAction ? copy.actions[pendingAction] : "";

  const pendingIsRestrictive = pendingAction
    ? RESTRICTIVE_ACTIONS.has(pendingAction)
    : false;

  return (
    <main className="moderation-page" dir={direction} lang={language}>
      <section
        className="moderation-page__hero"
        aria-labelledby="moderation-title"
      >
        <div className="moderation-page__hero-copy">
          <span className="moderation-page__hero-icon" aria-hidden="true">
            <ShieldCheck />
          </span>

          <div>
            <p>{copy.eyebrow}</p>
            <h1 id="moderation-title">{copy.title}</h1>
            <span>{copy.description}</span>
          </div>
        </div>

        <button
          className="button button--secondary"
          type="button"
          disabled={isLoading}
          onClick={refresh}
        >
          {isLoading ? (
            <LoaderCircle
              className="moderation-page__spinner"
              aria-hidden="true"
            />
          ) : (
            <RefreshCw aria-hidden="true" />
          )}

          {isLoading ? copy.refreshing : copy.refresh}
        </button>
      </section>

      <section className="moderation-page__summary" aria-label={copy.title}>
        <article>
          <span>{copy.loaded}</span>
          <strong>{reports.length.toLocaleString(copy.locale)}</strong>
        </article>

        <article className="moderation-page__summary--warning">
          <span>{copy.actionable}</span>
          <strong>{actionableCount.toLocaleString(copy.locale)}</strong>
        </article>

        <article className="moderation-page__summary--accent">
          <span>{copy.unassigned}</span>
          <strong>{unassignedCount.toLocaleString(copy.locale)}</strong>
        </article>
      </section>

      <section
        className="moderation-page__controls"
        aria-label={copy.statusFilterLabel}
      >
        <div
          className="moderation-page__status-tabs"
          role="group"
          aria-label={copy.statusFilterLabel}
        >
          {(
            ["", "OPEN", "REVIEWING", "RESOLVED", "DISMISSED"] as StatusFilter[]
          ).map((value) => (
            <button
              key={value || "ALL"}
              type="button"
              aria-pressed={statusFilter === value}
              onClick={() => changeStatusFilter(value)}
            >
              {value ? copy.statuses[value] : copy.allStatuses}
            </button>
          ))}
        </div>

        <div className="moderation-page__control-row">
          <label className="moderation-page__search">
            <span className="sr-only">{copy.searchLabel}</span>

            <Search aria-hidden="true" />

            <input
              type="search"
              value={searchQuery}
              placeholder={copy.searchPlaceholder}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </label>

          <label className="moderation-page__target-filter">
            <span>{copy.targetFilterLabel}</span>

            <select
              value={targetFilter}
              onChange={(event) =>
                changeTargetFilter(event.target.value as TargetFilter)
              }
            >
              <option value="">{copy.allTargets}</option>
              <option value="USER">{copy.targets.USER}</option>
              <option value="STORY">{copy.targets.STORY}</option>
              <option value="CHAPTER">{copy.targets.CHAPTER}</option>
              <option value="COMMENT">{copy.targets.COMMENT}</option>
            </select>
          </label>
        </div>
      </section>

      {actionError && (
        <div
          className="moderation-page__alert moderation-page__alert--error"
          role="alert"
        >
          <ShieldAlert aria-hidden="true" />

          <div>
            <strong>{copy.actionError}</strong>
            <p>{actionError}</p>
          </div>

          <button
            type="button"
            aria-label={copy.cancel}
            onClick={() => setActionError(null)}
          >
            <X aria-hidden="true" />
          </button>
        </div>
      )}

      {loadError && (
        <div
          className="moderation-page__alert moderation-page__alert--error"
          role="alert"
        >
          <ShieldAlert aria-hidden="true" />

          <div>
            <strong>{copy.loadError}</strong>
            <p>{loadError}</p>
          </div>

          <button
            className="button button--secondary"
            type="button"
            onClick={refresh}
          >
            <RefreshCw aria-hidden="true" />
            {copy.retry}
          </button>
        </div>
      )}

      {isLoading ? (
        <section className="moderation-page__loading" aria-live="polite">
          <LoaderCircle
            className="moderation-page__spinner"
            aria-hidden="true"
          />
          <p>{copy.loading}</p>
        </section>
      ) : loadError && reports.length === 0 ? null : reports.length === 0 ? (
        <section className="moderation-page__empty">
          <Inbox aria-hidden="true" />
          <h2>{copy.emptyTitle}</h2>
          <p>{copy.emptyDescription}</p>
        </section>
      ) : visibleReports.length === 0 ? (
        <section className="moderation-page__empty">
          <Search aria-hidden="true" />
          <h2>{copy.searchEmptyTitle}</h2>
          <p>{copy.searchEmptyDescription}</p>
        </section>
      ) : (
        <section
          className="moderation-page__list"
          aria-busy={Boolean(busyReportId)}
        >
          {visibleReports.map((report) => {
            const TargetIcon = TARGET_ICONS[report.targetType];

            const isBusy = busyReportId === report.id;

            const isActionable =
              report.status === "OPEN" || report.status === "REVIEWING";

            const isAssignedToCurrentUser = report.assignedTo?.id === user?.id;

            return (
              <article className="moderation-page__card" key={report.id}>
                <header>
                  <div className="moderation-page__card-identity">
                    <span data-target={report.targetType} aria-hidden="true">
                      <TargetIcon />
                    </span>

                    <div>
                      <div className="moderation-page__card-title-row">
                        <strong>{copy.targets[report.targetType]}</strong>
                        <span aria-hidden="true">•</span>
                        <strong>{copy.reasons[report.reason]}</strong>
                      </div>

                      <time dateTime={report.createdAt}>
                        <Clock3 aria-hidden="true" />
                        {copy.submittedAt} {formatDate(report.createdAt)}
                      </time>
                    </div>
                  </div>

                  <span
                    className="moderation-page__status"
                    data-status={report.status}
                  >
                    {copy.statuses[report.status]}
                  </span>
                </header>

                <div className="moderation-page__meta">
                  <div>
                    <span>{copy.reporter}</span>

                    <Link
                      to={`/users/${encodeURIComponent(
                        report.reporter.username,
                      )}`}
                    >
                      <UserRound aria-hidden="true" />
                      <span dir="auto">{report.reporter.displayName}</span>
                      <small>@{report.reporter.username}</small>
                    </Link>
                  </div>

                  <div>
                    <span>{copy.targetId}</span>
                    <code title={report.targetId}>{report.targetId}</code>
                  </div>

                  <div>
                    <span>{copy.actionable}</span>

                    <p
                      className={
                        report.assignedTo
                          ? "moderation-page__assignment--active"
                          : ""
                      }
                    >
                      <UserCheck aria-hidden="true" />

                      {report.assignedTo
                        ? copy.assignedTo(report.assignedTo.username)
                        : copy.notAssigned}
                    </p>
                  </div>
                </div>

                <div className="moderation-page__details">
                  <span>{copy.details}</span>

                  <p dir={report.details ? "auto" : undefined}>
                    {report.details || copy.noDetails}
                  </p>
                </div>

                {report.resolution && (
                  <div className="moderation-page__resolution">
                    <CheckCircle2 aria-hidden="true" />

                    <div>
                      <strong>{copy.resolution}</strong>
                      <p dir="auto">{report.resolution}</p>
                    </div>
                  </div>
                )}

                <footer>
                  {isActionable ? (
                    <>
                      {!isAssignedToCurrentUser ? (
                        <button
                          className="button button--secondary"
                          type="button"
                          disabled={Boolean(busyReportId)}
                          onClick={() => void updateAssignment(report, true)}
                        >
                          {isBusy ? (
                            <LoaderCircle
                              className="moderation-page__spinner"
                              aria-hidden="true"
                            />
                          ) : (
                            <UserCheck aria-hidden="true" />
                          )}

                          {copy.takeReview}
                        </button>
                      ) : (
                        <button
                          className="button button--quiet"
                          type="button"
                          disabled={Boolean(busyReportId)}
                          onClick={() => void updateAssignment(report, false)}
                        >
                          {isBusy ? (
                            <LoaderCircle
                              className="moderation-page__spinner"
                              aria-hidden="true"
                            />
                          ) : (
                            <UserMinus aria-hidden="true" />
                          )}

                          {copy.releaseReview}
                        </button>
                      )}

                      {ACTIONS[report.targetType].map((action) => (
                        <button
                          className={`button ${
                            RESTRICTIVE_ACTIONS.has(action)
                              ? "moderation-page__action--danger"
                              : "moderation-page__action--restore"
                          }`}
                          key={action}
                          type="button"
                          disabled={Boolean(busyReportId)}
                          onClick={() => openActionDialog(report, action)}
                        >
                          {RESTRICTIVE_ACTIONS.has(action) ? (
                            <Gavel aria-hidden="true" />
                          ) : (
                            <Undo2 aria-hidden="true" />
                          )}

                          {copy.actions[action]}
                        </button>
                      ))}

                      <button
                        className="button button--quiet"
                        type="button"
                        disabled={Boolean(busyReportId)}
                        onClick={() => openDismissDialog(report)}
                      >
                        <XCircle aria-hidden="true" />
                        {copy.dismiss}
                      </button>
                    </>
                  ) : (
                    <button
                      className="button button--secondary"
                      type="button"
                      disabled={Boolean(busyReportId)}
                      onClick={() => void reopenReport(report)}
                    >
                      {isBusy ? (
                        <LoaderCircle
                          className="moderation-page__spinner"
                          aria-hidden="true"
                        />
                      ) : (
                        <Undo2 aria-hidden="true" />
                      )}

                      {copy.reopen}
                    </button>
                  )}
                </footer>
              </article>
            );
          })}
        </section>
      )}

      {!isLoading && pagination.hasMore && !searchQuery.trim() && (
        <div className="moderation-page__load-more">
          <button
            className="button button--secondary"
            type="button"
            disabled={isLoadingMore}
            onClick={() => void loadMore()}
          >
            {isLoadingMore ? (
              <LoaderCircle
                className="moderation-page__spinner"
                aria-hidden="true"
              />
            ) : (
              <RefreshCw aria-hidden="true" />
            )}

            {isLoadingMore ? copy.loadingMore : copy.loadMore}
          </button>
        </div>
      )}

      {pendingDecision && (
        <div
          className="moderation-page__dialog-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeDecisionDialog();
            }
          }}
        >
          <section
            className="moderation-page__dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="moderation-decision-title"
          >
            <header>
              <span
                className={
                  pendingIsRestrictive
                    ? "moderation-page__dialog-icon--danger"
                    : ""
                }
                aria-hidden="true"
              >
                {pendingDecision.kind === "dismiss" ? <XCircle /> : <Gavel />}
              </span>

              <div>
                <p>{copy.decisionEyebrow}</p>

                <h2 id="moderation-decision-title">
                  {pendingDecision.kind === "dismiss"
                    ? copy.dismissDialogTitle
                    : copy.actionDialogTitle(pendingActionLabel)}
                </h2>
              </div>

              <button
                type="button"
                aria-label={copy.cancel}
                disabled={Boolean(busyReportId)}
                onClick={closeDecisionDialog}
              >
                <X aria-hidden="true" />
              </button>
            </header>

            <p className="moderation-page__dialog-description">
              {pendingDecision.kind === "dismiss"
                ? copy.dismissDialogDescription
                : copy.actionDialogDescription}
            </p>

            {actionError && (
              <div className="moderation-page__dialog-error" role="alert">
                <ShieldAlert aria-hidden="true" />

                <div>
                  <strong>{copy.actionError}</strong>
                  <p>{actionError}</p>
                </div>
              </div>
            )}

            <div className="moderation-page__dialog-target">
              <span>{copy.targets[pendingDecision.report.targetType]}</span>

              <strong>{copy.reasons[pendingDecision.report.reason]}</strong>

              <code>{pendingDecision.report.targetId}</code>
            </div>

            <label className="moderation-page__note-field">
              <span>{copy.moderatorNote}</span>

              <textarea
                value={moderatorNote}
                maxLength={2000}
                rows={5}
                autoFocus
                dir="auto"
                placeholder={copy.moderatorNotePlaceholder}
                onChange={(event) => setModeratorNote(event.target.value)}
              />

              <small>
                <span>{copy.noteHelp}</span>

                <span>
                  {moderatorNote.length.toLocaleString(copy.locale)} /{" "}
                  {(2000).toLocaleString(copy.locale)}
                </span>
              </small>
            </label>

            <footer>
              <button
                className="button button--secondary"
                type="button"
                disabled={Boolean(busyReportId)}
                onClick={closeDecisionDialog}
              >
                {copy.cancel}
              </button>

              <button
                className={`button ${
                  pendingIsRestrictive
                    ? "moderation-page__action--danger"
                    : "button--primary"
                }`}
                type="button"
                disabled={Boolean(busyReportId)}
                onClick={() => void confirmDecision()}
              >
                {busyReportId ? (
                  <LoaderCircle
                    className="moderation-page__spinner"
                    aria-hidden="true"
                  />
                ) : pendingDecision.kind === "dismiss" ? (
                  <XCircle aria-hidden="true" />
                ) : (
                  <Gavel aria-hidden="true" />
                )}

                {busyReportId
                  ? copy.applying
                  : pendingDecision.kind === "dismiss"
                    ? copy.confirmDismiss
                    : copy.confirmAction}
              </button>
            </footer>
          </section>
        </div>
      )}
    </main>
  );
}
