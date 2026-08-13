import type {
    ReadableChapterReference,
    ReadableStoryReference,
    StoryStore,
} from "../application/content.ports.js";

export class ContentAccessService {
    public constructor(private readonly store: StoryStore) {}

    public findReadableStoryById(
        storyId: string,
        viewerId?: string,
    ): Promise<ReadableStoryReference | null> {
        return this.store.findReadableStoryById(storyId, viewerId);
    }

    public findReadableChapterById(
        chapterId: string,
        viewerId?: string,
    ): Promise<ReadableChapterReference | null> {
        return this.store.findReadableChapterById(chapterId, viewerId);
    }
}
