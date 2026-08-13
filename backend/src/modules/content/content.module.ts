import { StoryService } from "./catalog/story.service.js";
import { ChapterService } from "./manuscript/chapter.service.js";
import { ContentAccessService } from "./queries/content-access.service.js";
import { PrismaContentStore } from "./infrastructure/prisma-content.store.js";
import { RevisionService } from "./revisions/revision.service.js";
import { SchedulingService } from "./publishing/scheduling.service.js";

const store = new PrismaContentStore();

export const contentModule = {
    stories: new StoryService(store),
    chapters: new ChapterService(store),
    access: new ContentAccessService(store),
    revisions: new RevisionService(),
    scheduling: new SchedulingService(),
};
