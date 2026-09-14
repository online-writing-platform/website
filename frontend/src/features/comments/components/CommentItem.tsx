import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, Pencil, Reply, Trash2, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import ReportForm from "../../../components/ReportForm";
import type { ChapterComment } from "../types";
import CommentComposer from "./CommentComposer";

interface CommentItemProps {
  item: ChapterComment;
  locale: string;
  direction: "rtl" | "ltr";
  currentUserId: string | null;
  authenticated: boolean;
  isReply?: boolean;
  highlighted?: boolean;
  updating: boolean;
  deleting: boolean;
  updateError?: string | null;
  deleteError?: string | null;
  onReply?(): void;
  onClearUpdateError(): void;
  onClearDeleteError(): void;
  onUpdate(commentId: string, content: string): Promise<boolean>;
  onDelete(commentId: string): Promise<boolean>;
}

function initials(value: string): string {
  return (
    value
      .trim()
      .split(/\s+/u)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("") || "?"
  );
}

export default function CommentItem({
  item,
  locale,
  direction,
  currentUserId,
  authenticated,
  isReply = false,
  highlighted = false,
  updating,
  deleting,
  updateError,
  deleteError,
  onReply,
  onClearUpdateError,
  onClearDeleteError,
  onUpdate,
  onDelete,
}: CommentItemProps) {
  const { t } = useTranslation();
  const deleteConfirmationId = useId();
  const deleteButtonRef = useRef<HTMLButtonElement>(null);
  const deleteConfirmationRef = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const active = item.status === "ACTIVE";
  const ownComment = Boolean(item.author && item.author.id === currentUserId);
  const edited =
    active &&
    Math.abs(
      new Date(item.updatedAt).getTime() - new Date(item.createdAt).getTime(),
    ) > 1000;

  const formattedDate = useMemo(() => {
    const date = new Date(item.createdAt);

    if (Number.isNaN(date.getTime())) return "";

    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  }, [item.createdAt, locale]);

  async function saveEdit(content: string): Promise<boolean> {
    const succeeded = await onUpdate(item.id, content);

    if (succeeded) setEditing(false);
    return succeeded;
  }

  async function confirmDelete(): Promise<void> {
    const succeeded = await onDelete(item.id);

    if (succeeded) setConfirmingDelete(false);
  }

  function cancelDelete(): void {
    onClearDeleteError();
    setConfirmingDelete(false);
    window.setTimeout(() => deleteButtonRef.current?.focus(), 0);
  }

  useEffect(() => {
    if (confirmingDelete) deleteConfirmationRef.current?.focus();
  }, [confirmingDelete]);

  return (
    <article
      id={`comment-${item.id}`}
      className={`chapter-comment${
        isReply ? " chapter-comment--reply" : ""
      }${highlighted ? " chapter-comment--highlighted" : ""}`}
      dir={direction}
      tabIndex={highlighted ? -1 : undefined}
    >
      <header className="chapter-comment__header">
        <div className="chapter-comment__author">
          {item.author ? (
            <Link
              className="chapter-comment__author-link"
              to={`/users/${encodeURIComponent(item.author.username)}`}
            >
              <span className="chapter-comment__avatar" aria-hidden="true">
                {item.author.avatarUrl ? (
                  <img src={item.author.avatarUrl} alt="" />
                ) : (
                  initials(item.author.displayName)
                )}
              </span>
              <span className="chapter-comment__identity">
                <strong>{item.author.displayName}</strong>
                <bdi dir="ltr">@{item.author.username}</bdi>
              </span>
            </Link>
          ) : (
            <span className="chapter-comment__anonymous">
              <span className="chapter-comment__avatar" aria-hidden="true">
                ?
              </span>
              <strong>
                {item.status === "DELETED"
                  ? t("reader.interactions.deletedUser")
                  : t("reader.interactions.unavailableUser")}
              </strong>
            </span>
          )}
        </div>

        <div className="chapter-comment__date">
          {edited ? <small>{t("reader.interactions.edited")}</small> : null}
          {formattedDate ? (
            <time dateTime={item.createdAt}>{formattedDate}</time>
          ) : null}
        </div>
      </header>

      {editing ? (
        <CommentComposer
          compact
          autoFocus
          initialValue={item.content}
          label={t("reader.interactions.editLabel")}
          submitLabel={t("reader.interactions.saveEdit")}
          submittingLabel={t("reader.interactions.savingEdit")}
          cancelLabel={t("common.cancel")}
          error={updateError}
          onClearError={onClearUpdateError}
          onCancel={() => setEditing(false)}
          onSubmit={saveEdit}
        />
      ) : (
        <p className="chapter-comment__content">
          {active
            ? item.content
            : t("reader.interactions.unavailableComment")}
        </p>
      )}

      {active && !editing ? (
        <div className="chapter-comment__actions">
          {authenticated && onReply ? (
            <button
              className="chapter-comment__action"
              type="button"
              onClick={onReply}
            >
              <Reply aria-hidden="true" />
              {t("reader.interactions.reply")}
            </button>
          ) : null}

          {ownComment ? (
            <>
              <button
                className="chapter-comment__action"
                type="button"
                disabled={updating || deleting}
                onClick={() => {
                  onClearUpdateError();
                  setEditing(true);
                }}
              >
                <Pencil aria-hidden="true" />
                {t("reader.interactions.edit")}
              </button>
              <button
                ref={deleteButtonRef}
                className="chapter-comment__action chapter-comment__action--danger"
                type="button"
                disabled={updating || deleting}
                onClick={() => {
                  onClearDeleteError();
                  setConfirmingDelete(true);
                }}
              >
                <Trash2 aria-hidden="true" />
                {t("reader.interactions.delete")}
              </button>
            </>
          ) : authenticated ? (
            <ReportForm targetType="COMMENT" targetId={item.id} />
          ) : null}
        </div>
      ) : null}

      {confirmingDelete ? (
        <div
          ref={deleteConfirmationRef}
          className="chapter-comment__delete-confirmation"
          role="alertdialog"
          aria-labelledby={deleteConfirmationId}
          tabIndex={-1}
          onKeyDown={(event) => {
            if (event.key === "Escape" && !deleting) cancelDelete();
          }}
        >
          <p id={deleteConfirmationId}>
            {t("reader.interactions.deleteConfirmation")}
          </p>
          {deleteError ? (
            <p className="chapter-comment__mutation-error" role="alert">
              {deleteError}
            </p>
          ) : null}
          <div>
            <button
              className="button button--quiet"
              type="button"
              disabled={deleting}
              onClick={cancelDelete}
            >
              <X aria-hidden="true" />
              {t("common.cancel")}
            </button>
            <button
              className="button button--danger"
              type="button"
              disabled={deleting}
              onClick={() => void confirmDelete()}
            >
              <Check aria-hidden="true" />
              {deleting
                ? t("reader.interactions.deleting")
                : t("reader.interactions.confirmDelete")}
            </button>
          </div>
        </div>
      ) : null}
    </article>
  );
}
