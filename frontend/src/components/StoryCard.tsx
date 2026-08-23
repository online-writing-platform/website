import type { ReactNode } from "react";
import {
  Bookmark,
  BookOpen,
  CheckCircle2,
  Eye,
  Heart,
  MessageCircle,
  ShieldAlert,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import {
  getActiveStoryLanguage,
  normalizeStoryLanguage,
} from "../lib/story-language";

import "./StoryCard.css";

export interface StoryCardStory {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  coverUrl: string | null;
  language?: string;
  status?: "DRAFT" | "SCHEDULED" | "ONGOING" | "COMPLETED" | "HIATUS";
  isMature: boolean;
  libraryCount?: number;
  voteCount?: number;
  commentCount?: number;
  qualifiedViews?: number;
  chapterCount?: number;
  author: {
    username: string;
    displayName: string;
    avatarUrl?: string | null;
  };
  genre?: {
    slug: string;
    name: string;
  } | null;
}

interface StoryCardProps {
  story: StoryCardStory;
  reason?: string;

  /**
   * اکشن‌هایی مانند مدیریت، حذف یا ویرایش.
   * این بخش عمداً بیرون از لینک اصلی قرار می‌گیرد.
   */
  actions?: ReactNode;

  /**
   * مقصد سفارشی کارت.
   * اگر مشخص نشود، صفحه عمومی داستان باز می‌شود.
   */
  to?: string;
}

function StoryCard({ story, reason, actions, to }: StoryCardProps) {
  const { i18n, t } = useTranslation();

  const interfaceLanguage = getActiveStoryLanguage(i18n.resolvedLanguage);
  const storyLanguage =
    normalizeStoryLanguage(story.language) ?? interfaceLanguage;

  const destination = to ?? `/stories/${encodeURIComponent(story.slug)}`;

  const numberFormatter = new Intl.NumberFormat(
    interfaceLanguage === "fa" ? "fa-IR" : "en-US",
    {
      notation: "compact",
      maximumFractionDigits: 1,
    },
  );

  const hasBrowseMetrics =
    story.qualifiedViews !== undefined || story.chapterCount !== undefined;

  const hasHomeMetrics =
    story.libraryCount !== undefined ||
    story.voteCount !== undefined ||
    story.commentCount !== undefined;

  const metrics = hasBrowseMetrics
    ? [
        {
          key: "reads",
          value: story.qualifiedViews ?? 0,
          icon: Eye,
          label: t("browse.card.reads"),
        },
        {
          key: "votes",
          value: story.voteCount ?? 0,
          icon: Heart,
          label: t("browse.card.votes"),
        },
        {
          key: "chapters",
          value: story.chapterCount ?? 0,
          icon: BookOpen,
          label: t("browse.card.chapters"),
          suffix: t("browse.card.chapterLabel"),
        },
      ]
    : hasHomeMetrics
      ? [
          {
            key: "library",
            value: story.libraryCount ?? 0,
            icon: Bookmark,
            label: t("home.stories.stats.library", {
              value: numberFormatter.format(story.libraryCount ?? 0),
            }),
          },
          {
            key: "votes",
            value: story.voteCount ?? 0,
            icon: Heart,
            label: t("home.stories.stats.votes", {
              value: numberFormatter.format(story.voteCount ?? 0),
            }),
          },
          {
            key: "comments",
            value: story.commentCount ?? 0,
            icon: MessageCircle,
            label: t("home.stories.stats.comments", {
              value: numberFormatter.format(story.commentCount ?? 0),
            }),
          },
        ]
      : [];

  const translatedGenre = story.genre
    ? t(`browse.genres.${story.genre.slug}`, {
        defaultValue: story.genre.name,
      })
    : null;

  const authorInitial =
    story.author.displayName.trim().slice(0, 1) ||
    story.author.username.trim().slice(0, 1);

  return (
    <article
      className="story-card"
      dir={storyLanguage === "fa" ? "rtl" : "ltr"}
      lang={storyLanguage}
    >
      <Link
        className="story-card-link"
        to={destination}
        aria-label={t("home.stories.viewStory", {
          title: story.title,
        })}
      >
        <div className="story-card-cover">
          {story.coverUrl ? (
            <img
              referrerPolicy="no-referrer"
              src={story.coverUrl}
              alt=""
              loading="lazy"
              width={400}
              height={600}
            />
          ) : (
            <span className="story-card-placeholder" aria-hidden="true">
              <BookOpen />
            </span>
          )}

          {story.genre ? (
            <span className="story-card-genre" data-genre={story.genre.slug}>
              {translatedGenre}
            </span>
          ) : null}

          {story.status === "COMPLETED" || story.isMature ? (
            <span className="story-card-badges">
              {story.status === "COMPLETED" ? (
                <span className="story-card-badge">
                  <CheckCircle2 aria-hidden="true" />
                  {t("browse.card.completed")}
                </span>
              ) : null}

              {story.isMature ? (
                <span
                  className="story-card-badge"
                  aria-label={t("home.stories.mature")}
                >
                  <ShieldAlert aria-hidden="true" />+
                  {numberFormatter.format(18)}
                </span>
              ) : null}
            </span>
          ) : null}

          <span className="story-card-overlay">
            <h3>{story.title}</h3>

            {story.description?.trim() ? (
              <span>{story.description}</span>
            ) : null}
          </span>
        </div>

        <div className="story-card-details">
          <span className="story-card-author">
            {story.author.avatarUrl ? (
              <img
                src={story.author.avatarUrl}
                alt=""
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="story-card-avatar" aria-hidden="true">
                {authorInitial}
              </span>
            )}

            <span>
              {t("browse.card.by", {
                name: story.author.displayName,
              })}
            </span>
          </span>

          {metrics.length > 0 ? (
            <span className="story-card-stats">
              {metrics.map(({ key, value, icon: Icon, label, suffix }) => {
                const formattedValue = numberFormatter.format(value);

                const accessibleLabel = hasBrowseMetrics
                  ? `${label}: ${formattedValue}`
                  : label;

                return (
                  <span key={key} title={accessibleLabel}>
                    <Icon aria-hidden="true" />
                    <span>{formattedValue}</span>
                    {suffix ? <span>{suffix}</span> : null}
                  </span>
                );
              })}
            </span>
          ) : null}

          {reason ? <span className="story-card-reason">{reason}</span> : null}
        </div>
      </Link>

      {actions ? <div className="story-card-actions">{actions}</div> : null}
    </article>
  );
}

export default StoryCard;
