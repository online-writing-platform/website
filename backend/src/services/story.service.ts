import { prisma } from "../db/index.js";
import AppError from "../errors/app-error.js";

const STORY_PAGE_SIZE = 12;
const STORY_QUERY_SIZE = STORY_PAGE_SIZE + 1;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type StoryStatus = "DRAFT" | "ONGOING" | "COMPLETED" | "HIATUS";

export interface StoryAuthor {
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface StoryListItem {
  id: string;
  slug: string;
  title: string;
  description: string;
  coverUrl: string | null;
  language: string;
  status: StoryStatus;
  isMature: boolean;
  publishedAt: string;
  author: StoryAuthor;
}

export interface StoryPagination {
  hasMore: boolean;
  nextCursor: string | null;
}

export interface StoryListResult {
  stories: StoryListItem[];
  pagination: StoryPagination;
}

interface SelectedStory {
  id: string;
  slug: string;
  title: string;
  description: string;
  coverUrl: string | null;
  language: string;
  status: StoryStatus;
  isMature: boolean;
  publishedAt: Date | null;
  author: StoryAuthor;
}

const publicStoryWhere = {
  visibility: "PUBLIC",
  publishedAt: {
    not: null,
  },
  status: {
    not: "DRAFT",
  },
} as const;

const publicStorySelect = {
  id: true,
  slug: true,
  title: true,
  description: true,
  coverUrl: true,
  language: true,
  status: true,
  isMature: true,
  publishedAt: true,
  author: {
    select: {
      username: true,
      displayName: true,
      avatarUrl: true,
    },
  },
} as const;

function assertValidCursorFormat(cursor: string): void {
  if (!UUID_PATTERN.test(cursor)) {
    throw AppError.badRequest(
      "The story cursor is invalid.",
      "INVALID_STORY_CURSOR",
    );
  }
}

async function ensureCursorIsPublicStory(cursor: string): Promise<void> {
  const cursorStory = await prisma.story.findFirst({
    where: {
      ...publicStoryWhere,
      id: cursor,
    },
    select: {
      id: true,
    },
  });

  if (!cursorStory) {
    throw AppError.badRequest(
      "The story cursor is invalid or no longer available.",
      "INVALID_STORY_CURSOR",
    );
  }
}

function serializeStory(story: SelectedStory): StoryListItem {
  if (story.publishedAt === null) {
    throw new Error("A public story was returned without publishedAt.");
  }

  return {
    id: story.id,
    slug: story.slug,
    title: story.title,
    description: story.description,
    coverUrl: story.coverUrl,
    language: story.language,
    status: story.status,
    isMature: story.isMature,
    publishedAt: story.publishedAt.toISOString(),
    author: story.author,
  };
}

export async function listPublicStories(
  cursor?: string,
): Promise<StoryListResult> {
  if (cursor !== undefined) {
    assertValidCursorFormat(cursor);
    await ensureCursorIsPublicStory(cursor);
  }

  const storyRows: SelectedStory[] = await prisma.story.findMany({
    where: publicStoryWhere,

    orderBy: [
      {
        publishedAt: "desc",
      },
      {
        id: "desc",
      },
    ],

    take: STORY_QUERY_SIZE,

    ...(cursor === undefined
      ? {}
      : {
          cursor: {
            id: cursor,
          },
          skip: 1,
        }),

    select: publicStorySelect,
  });

  const hasMore = storyRows.length > STORY_PAGE_SIZE;

  const stories = storyRows.slice(0, STORY_PAGE_SIZE).map(serializeStory);

  const lastStory = stories.at(-1);

  return {
    stories,
    pagination: {
      hasMore,
      nextCursor: hasMore && lastStory !== undefined ? lastStory.id : null,
    },
  };
}
