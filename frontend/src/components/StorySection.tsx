import { mockStories } from "../data/mockStories";
import StoryCard from "../components/StoryCard";

interface StorySectionProps {
  title: string;
}

function StorySection({ title }: StorySectionProps) {
  return (
    <section className="story-section">
      <h2>{title}</h2>

      <div className="story-row">
        {mockStories.map((story) => (
          <StoryCard
            key={`${title}-${story.id}`}
            image={story.image}
            category={story.category}
            title={story.title}
            link={story.link}
            views={1000}
          />
        ))}
      </div>
    </section>
  );
}

export default StorySection;
