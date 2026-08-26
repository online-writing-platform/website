import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight } from "lucide-react";

import StoryCard from "./StoryCard";
import type { DiscoveryStory, Story } from "../types/story";

import "./StoryShelf.css";

interface StoryShelfProps {
  title: string;
  stories: Array<Story | DiscoveryStory>;
  emptyMessage?: string;
  initialCount?: number;
}

function StoryShelf({
  title,
  stories,
  emptyMessage,
  initialCount = 5,
}: StoryShelfProps) {
  const { i18n, t } = useTranslation();

  const [isExpanded, setIsExpanded] = useState(false);

  const headingId = useId();
  const isRtl = i18n.dir() === "rtl";

  const visibleStories = isExpanded ? stories : stories.slice(0, initialCount);

  return (
    <section className="home-story-shelf" aria-labelledby={headingId}>
      <div className="home-story-shelf__header">
        <h2 id={headingId}>{title}</h2>

        {stories.length > initialCount ? (
          <button
            type="button"
            className="home-story-shelf__more"
            aria-expanded={isExpanded}
            onClick={() => setIsExpanded((current) => !current)}
          >
            <span>
              {isExpanded
                ? t("home.stories.showLess")
                : t("home.stories.viewMore")}
            </span>

            {isRtl ? (
              <ArrowLeft aria-hidden="true" />
            ) : (
              <ArrowRight aria-hidden="true" />
            )}
          </button>
        ) : null}
      </div>

      {stories.length === 0 ? (
        <div className="empty-state surface">
          {emptyMessage ?? t("home.stories.empty")}
        </div>
      ) : (
        <div className="home-story-grid">
          {visibleStories.map((story) => (
            <StoryCard key={story.id} story={story} variant="home" />
          ))}
        </div>
      )}
    </section>
  );
}

export default StoryShelf;
