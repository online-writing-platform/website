import {
  Bell,
  BookOpen,
  Check,
  LoaderCircle,
  LockKeyhole,
  MessageCircle,
  Reply,
  ShieldAlert,
  ThumbsUp,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import {
  formatNotificationDate,
  getInitials,
  getNotificationLabel,
  getNotificationTarget,
  getNotificationTone,
} from "../presentation";
import type { NotificationItem, NotificationType } from "../types";

const ICONS: Partial<Record<NotificationType, LucideIcon>> = {
  FOLLOW: UserPlus,
  COMMENT: MessageCircle,
  COMMENT_REPLY: Reply,
  CHAPTER_VOTE: ThumbsUp,
  STORY_PUBLISHED: BookOpen,
  CHAPTER_PUBLISHED: BookOpen,
  MODERATION: ShieldAlert,
  SECURITY: LockKeyhole,
};

interface NotificationListItemProps {
  item: NotificationItem;
  locale: string;
  isMarking: boolean;
  labels: {
    newBadge: string;
    readStatus: string;
    markRead: string;
    markingRead: string;
  };
  onMarkRead(notificationId: string): void;
}

export default function NotificationListItem({
  item,
  locale,
  isMarking,
  labels,
  onMarkRead,
}: NotificationListItemProps) {
  const { t } = useTranslation();
  const isUnread = item.readAt === null;
  const formattedDate = formatNotificationDate(item.createdAt, locale);
  const Icon = ICONS[item.type as NotificationType] ?? Bell;
  const tone = getNotificationTone(item.type);

  return (
    <article
      className={`notifications-page__item${
        isUnread ? " notifications-page__item--unread" : ""
      }`}
    >
      <Link
        className="notifications-page__item-main"
        to={getNotificationTarget(item)}
        onClick={() => onMarkRead(item.id)}
      >
        <span
          className={`notifications-page__avatar notifications-page__avatar--${tone}`}
          aria-hidden="true"
        >
          {item.actor?.avatarUrl ? (
            <img src={item.actor.avatarUrl} alt="" />
          ) : item.actor ? (
            getInitials(item.actor.displayName)
          ) : (
            <Icon />
          )}
        </span>

        <span className="notifications-page__item-content">
          <span className="notifications-page__item-title">
            <strong>{getNotificationLabel(item, t)}</strong>
            {isUnread ? <small>{labels.newBadge}</small> : null}
          </span>

          <span className="notifications-page__item-meta">
            {item.actor ? <span>@{item.actor.username}</span> : null}
            {item.actor && formattedDate ? (
              <span aria-hidden="true">•</span>
            ) : null}
            {formattedDate ? (
              <time dateTime={item.createdAt}>{formattedDate}</time>
            ) : null}
          </span>
        </span>
      </Link>

      {isUnread ? (
        <button
          type="button"
          className="notifications-page__read-button"
          disabled={isMarking}
          onClick={() => onMarkRead(item.id)}
        >
          {isMarking ? (
            <LoaderCircle className="is-spinning" aria-hidden="true" />
          ) : (
            <Check aria-hidden="true" />
          )}
          <span>{isMarking ? labels.markingRead : labels.markRead}</span>
        </button>
      ) : (
        <span className="notifications-page__read-status">
          <Check aria-hidden="true" />
          <span>{labels.readStatus}</span>
        </span>
      )}
    </article>
  );
}
