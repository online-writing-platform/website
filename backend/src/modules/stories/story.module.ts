import { ChapterService } from "./application/chapter.service.js";
import { StoryAccessService } from "./application/story-access.service.js";
import { StoryService } from "./application/story.service.js";
import { PrismaStoryStore } from "./infrastructure/prisma-story.store.js";

const store = new PrismaStoryStore();

export const storyModule = {
    stories: new StoryService(store),
    chapters: new ChapterService(store),
    access: new StoryAccessService(store),
};
