import StoryCard from "./StoryCard";
import type { DiscoveryStory, Story } from "../types/story";

interface StoryShelfProps {
  title: string;
  stories: Array<Story | DiscoveryStory>;
  emptyMessage?: string;
  showReason?: boolean;
}

function StoryShelf({
  title,
  stories,
  emptyMessage = "هنوز داستانی برای نمایش وجود ندارد.",
  showReason = false,
}: StoryShelfProps) {
  return (
    <section className="story-shelf" aria-labelledby={`shelf-${title}`}>
      <div className="story-shelf-header">
        <h2 id={`shelf-${title}`}>{title}</h2>
      </div>

      {stories.length === 0 ? (
        <div className="empty-state surface">{emptyMessage}</div>
      ) : (
        <div className="story-grid">
          {stories.map((story) => (
            <StoryCard
              key={story.id}
              story={story}
              {...(showReason && "reason" in story && story.reason
                ? { reason: story.reason }
                : {})}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default StoryShelf;
