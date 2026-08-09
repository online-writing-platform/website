import { Link } from "react-router-dom";

export interface StoryCardStory {
  id: string;
  slug: string;
  title: string;
  coverUrl: string | null;
  isMature: boolean;
  author: {
    username: string;
    displayName: string;
  };
}

interface StoryCardProps {
  story: StoryCardStory;
  reason?: string;
}

function StoryCard({ story, reason }: StoryCardProps) {
  return (
    <article className="story-card surface">
      <Link
        to={`/stories/${encodeURIComponent(story.slug)}`}
        aria-label={`مشاهده داستان ${story.title}`}
      >
        <div className="story-card-cover">
          {story.coverUrl ? (
            <img referrerPolicy="no-referrer" src={story.coverUrl} alt="" loading="lazy" width={400} height={600} />
          ) : (
            <div className="story-card-placeholder" aria-hidden="true">{story.title}</div>
          )}
        </div>
        <div className="story-card-body">
          <h3 className="story-card-title">{story.title}</h3>
          <p className="story-card-meta">
            {story.author.displayName}{story.isMature ? " · +۱۸" : ""}
          </p>
          {reason ? <p className="story-card-meta">{reason}</p> : null}
        </div>
      </Link>
    </article>
  );
}

export default StoryCard;
