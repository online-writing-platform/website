import {
  Bookmark,
  Heart,
  MessageCircle,
  ShieldAlert,
  UserRound,
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
  coverUrl: string | null;
  language?: string;
  isMature: boolean;
  libraryCount?: number;
  voteCount?: number;
  commentCount?: number;
  author: {
    username: string;
    displayName: string;
  };
}

interface StoryCardProps {
  story: StoryCardStory;
  reason?: string;
  variant?: "default" | "home";
}

function StoryCard({ story, reason, variant = "default" }: StoryCardProps) {
  const { i18n, t } = useTranslation();

  const interfaceLanguage = getActiveStoryLanguage(i18n.resolvedLanguage);

  const storyLanguage =
    normalizeStoryLanguage(story.language) ?? interfaceLanguage;

  const isHomeCard = variant === "home";
  const numberFormatter = new Intl.NumberFormat(
    interfaceLanguage === "fa" ? "fa-IR" : "en-US",
    {
      notation: "compact",
      maximumFractionDigits: 1,
    },
  );

  const metrics = [
    {
      key: "library",
      value: story.libraryCount ?? 0,
      icon: Bookmark,
    },
    {
      key: "votes",
      value: story.voteCount ?? 0,
      icon: Heart,
    },
    {
      key: "comments",
      value: story.commentCount ?? 0,
      icon: MessageCircle,
    },
  ] as const;

  return (
    <article
      className={`story-card surface${isHomeCard ? " story-card--home" : ""}`}
      dir={storyLanguage === "fa" ? "rtl" : "ltr"}
      lang={storyLanguage}
    >
      <Link
        to={`/stories/${encodeURIComponent(story.slug)}`}
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
            <div className="story-card-placeholder" aria-hidden="true">
              {story.title}{" "}
            </div>
          )}

          {isHomeCard && story.isMature ? (
            <span
              className="story-card-mature"
              aria-label={t("home.stories.mature")}
            >
              <ShieldAlert aria-hidden="true" />
              +18
            </span>
          ) : null}
        </div>

        <div className="story-card-body">
          <h3 className="story-card-title">{story.title}</h3>

          {isHomeCard ? (
            <>
              <p
                className="story-card-author"
                aria-label={t("home.stories.author", {
                  name: story.author.displayName,
                })}
              >
                <UserRound aria-hidden="true" />

                <span>{story.author.displayName}</span>
              </p>

              <div className="story-card-stats">
                {" "}
                {metrics.map(({ key, value, icon: Icon }) => {
                  const formattedValue = numberFormatter.format(value);

                  const label = t(`home.stories.stats.${key}`, {
                    value: formattedValue,
                  });

                  return (
                    <span
                      key={key}
                      className="story-card-stat"
                      aria-label={label}
                      title={label}
                    >
                      <Icon aria-hidden="true" />
                      <span>{formattedValue}</span>
                    </span>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <p className="story-card-meta">
                {story.author.displayName}
                {story.isMature ? " · +۱۸" : ""}
              </p>

              {reason ? <p className="story-card-meta">{reason}</p> : null}
            </>
          )}
        </div>
      </Link>
    </article>
  );
}

export default StoryCard;
