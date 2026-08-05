import StoryCard from "./StoryCard";
import { StorySectionProps } from "../types/story";

function StorySection({ title, stories }: StorySectionProps) {
  return (
    <section className="story-section">
      <h2>{title}</h2>

      <div className="story-row">
        {stories.map((story) => (
          <StoryCard
            key={`${title}-${story.id}`}
            image={story.image}
            category={story.category}
            title={story.title}
            link={story.link}
          />
        ))}
      </div>
    </section>
  );
}

export default StorySection;
