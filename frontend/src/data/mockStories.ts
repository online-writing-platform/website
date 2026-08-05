import { StoryListItem } from "../types/story";
export const mockStories: StoryListItem[] = Array.from(
  { length: 5 },
  (_, index) => ({
    id: index + 1,
    image: "https://picsum.photos/300/200",
    category: "فانتزی",
    title: "افسانه آخر",
    link: "/story/1",
  }),
);
