export interface Story {
  id: string;

  title: string;

  description: string;

  coverImage: string | null;

  category: string;

  slug: string;

  views: number;

  likes: number;

  status: "ONGOING" | "COMPLETED";
}

export interface StoryListResponse {
  stories: Story[];

  nextCursor: string | null;
}
