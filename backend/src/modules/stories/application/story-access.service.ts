import type {
    ReadableChapterReference,
    ReadableStoryReference,
    StoryStore,
} from "./story.ports.js";

export class StoryAccessService {
    public constructor(private readonly store: StoryStore) {}

    public findReadableStoryById(storyId: string): Promise<ReadableStoryReference | null> {
        return this.store.findReadableStoryById(storyId);
    }

    public findReadableChapterById(chapterId: string): Promise<ReadableChapterReference | null> {
        return this.store.findReadableChapterById(chapterId);
    }
}
