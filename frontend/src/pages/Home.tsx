import "./Home.css";

import StorySection from "../components/StorySection";
import { mockStories } from "../data/mockStories";

function Home() {
  const latestStories = mockStories;

  const popularStories = mockStories;

  const recommendedStories = mockStories;

  return (
    <main className="home">
      <StorySection title="تازه‌ها" stories={latestStories} />

      <StorySection title="محبوب‌ها" stories={popularStories} />

      <StorySection title="مطابق با سلیقه شما" stories={recommendedStories} />
    </main>
  );
}

export default Home;
