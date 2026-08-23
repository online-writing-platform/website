import { prisma } from "../../../db/index.js";
import { isAtLeastAge } from "../../stories/stories.policy.js";
import type { SearchStore, StorySearchFilters } from "./search.types.js";

interface SearchStoryRow {
  id: string;
  slug: string;
  title: string;
  description: string;
  coverUrl: string | null;
  language: string;
  status: "ONGOING" | "COMPLETED" | "HIATUS";
  isMature: boolean;
  publishedAt: Date;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  genreSlug: string | null;
  genreName: string | null;
  libraryCount: number;
  voteCount: number;
  commentCount: number;
  qualifiedViews: number;
  chapterCount: number;
}

function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/gu, "\\$&");
}

async function viewerPolicy(viewerId?: string) {
  if (!viewerId) {
    return {
      includeMature: false,
      blockedIds: [] as string[],
    };
  }

  const [viewer, blocks] = await Promise.all([
    prisma.user.findUnique({
      where: {
        id: viewerId,
      },
      select: {
        birthDate: true,
        preferences: {
          select: {
            allowMatureContent: true,
          },
        },
      },
    }),

    prisma.block.findMany({
      where: {
        OR: [
          {
            blockerId: viewerId,
          },
          {
            blockedId: viewerId,
          },
        ],
      },
      select: {
        blockerId: true,
        blockedId: true,
      },
    }),
  ]);

  return {
    includeMature:
      viewer?.preferences?.allowMatureContent === true &&
      isAtLeastAge(viewer.birthDate, 18, new Date()),

    blockedIds: blocks.map((item) =>
      item.blockerId === viewerId ? item.blockedId : item.blockerId,
    ),
  };
}

export class SearchRepository implements SearchStore {
  public async searchStories(
    query: string | undefined,
    limit: number,
    offset: number,
    filters: StorySearchFilters,
    viewerId?: string,
  ) {
    const policy = await viewerPolicy(viewerId);

    const hasQuery = query !== undefined;
    const normalizedQuery = query ?? "";

    const escapedTitleQuery = escapeLikePattern(normalizedQuery);

    const titleStartsWithPattern = `${escapedTitleQuery}%`;
    const titleContainsPattern = `%${escapedTitleQuery}%`;

    const hasGenre = filters.genre !== undefined;
    const genre = filters.genre ?? "";

    const hasTag = filters.tag !== undefined;
    const tag = filters.tag ?? "";

    const hasLanguage = filters.language !== undefined;
    const language = filters.language ?? "";

    const rows = await prisma.$queryRaw<SearchStoryRow[]>`
      SELECT
        story."id",
        story."slug",
        story."title",
        story."description",
        story."cover_url" AS "coverUrl",
        story."is_mature" AS "isMature",
        story."language",
        story."status",
        story."published_at" AS "publishedAt",
        author."username",
        author."display_name" AS "displayName",
        author."avatar_url" AS "avatarUrl",
        genre."slug" AS "genreSlug",
        genre."name" AS "genreName",
        COALESCE(
          stats."library_count",
          0
        )::int AS "libraryCount",
        COALESCE(
          stats."vote_count",
          0
        )::int AS "voteCount",
        COALESCE(
          stats."comment_count",
          0
        )::int AS "commentCount",
        COALESCE(
          stats."qualified_views",
          0
        )::int AS "qualifiedViews",
        chapter_stats."chapterCount"
      FROM "stories" AS story
      JOIN "users" AS author
        ON author."id" = story."author_id"
      LEFT JOIN "genres" AS genre
        ON genre."id" = story."genre_id"
        AND genre."is_active" = true
      LEFT JOIN "story_stats" AS stats
        ON stats."story_id" = story."id"
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS "chapterCount"
        FROM "chapters" AS chapter
        WHERE chapter."story_id" = story."id"
          AND chapter."deleted_at" IS NULL
          AND chapter."status" = 'PUBLISHED'
          AND chapter."moderation_state" = 'VISIBLE'
      ) AS chapter_stats ON true
      WHERE story."deleted_at" IS NULL
        AND story."moderation_state" = 'VISIBLE'
        AND story."visibility" = 'PUBLIC'
        AND story."published_at" IS NOT NULL
        AND story."status" NOT IN (
          'DRAFT',
          'SCHEDULED',
          'ARCHIVED'
        )
        AND author."status" = 'ACTIVE'
        AND (
          ${policy.includeMature}
          OR story."is_mature" = false
        )
        AND (
          cardinality(
            ${policy.blockedIds}::uuid[]
          ) = 0
          OR story."author_id" <> ALL(
            ${policy.blockedIds}::uuid[]
          )
        )
        AND (
          NOT ${hasQuery}

          -- Guaranteed literal substring match against the normalized title.
          OR story."search_title"
            LIKE ${titleContainsPattern}
            ESCAPE E'\\\\'

          -- Existing full-text search against title and description.
          OR to_tsvector(
            'simple',
            story."search_text"
          ) @@ websearch_to_tsquery(
            'simple',
            ${normalizedQuery}
          )

          -- Existing fuzzy match.
          OR story."search_text" % ${normalizedQuery}

          -- Author username search remains available.
          OR lower(author."username") % ${normalizedQuery}
        )
        AND (
          NOT ${hasGenre}
          OR genre."slug" = ${genre}
        )
        AND (
          NOT ${hasTag}
          OR EXISTS (
            SELECT 1
            FROM "story_tags" AS story_tag
            JOIN "tags" AS tag_filter
              ON tag_filter."id" = story_tag."tag_id"
            WHERE story_tag."story_id" = story."id"
              AND tag_filter."slug" = ${tag}
          )
        )
        AND (
          NOT ${hasLanguage}
          OR story."language" = ${language}
        )
      ORDER BY
        -- Direct title matches are ranked before matches from description
        -- or author username.
        CASE
          WHEN ${filters.sort} = 'relevance' THEN
            CASE
              WHEN story."search_title" = ${normalizedQuery}
                THEN 3

              WHEN story."search_title"
                LIKE ${titleStartsWithPattern}
                ESCAPE E'\\\\'
                THEN 2

              WHEN story."search_title"
                LIKE ${titleContainsPattern}
                ESCAPE E'\\\\'
                THEN 1

              ELSE 0
            END
        END DESC,

        CASE
          WHEN ${filters.sort} = 'relevance' THEN GREATEST(
            ts_rank_cd(
              to_tsvector(
                'simple',
                story."search_text"
              ),
              websearch_to_tsquery(
                'simple',
                ${normalizedQuery}
              )
            ),
            similarity(
              story."search_title",
              ${normalizedQuery}
            ) * 0.75,
            similarity(
              story."search_text",
              ${normalizedQuery}
            ) * 0.5,
            similarity(
              lower(author."username"),
              ${normalizedQuery}
            ) * 0.35
          )
        END DESC,

        CASE
          WHEN ${filters.sort} = 'mostRead'
            THEN COALESCE(
              stats."qualified_views",
              0
            )
        END DESC,

        CASE
          WHEN ${filters.sort} = 'mostVoted'
            THEN COALESCE(
              stats."vote_count",
              0
            )
        END DESC,

        CASE
          WHEN ${filters.sort} = 'newest'
            THEN story."published_at"
        END DESC,

        story."published_at" DESC,
        story."id" DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    return rows.map(
      ({
        username,
        displayName,
        avatarUrl,
        genreSlug,
        genreName,
        ...story
      }) => ({
        ...story,

        author: {
          username,
          displayName,
          avatarUrl,
        },

        genre:
          genreSlug && genreName
            ? {
                slug: genreSlug,
                name: genreName,
              }
            : null,
      }),
    );
  }

  public async searchUsers(
    query: string,
    limit: number,
    offset: number,
    viewerId?: string,
  ) {
    const policy = await viewerPolicy(viewerId);

    return prisma.user.findMany({
      where: {
        status: "ACTIVE",

        ...(policy.blockedIds.length > 0
          ? {
              id: {
                notIn: policy.blockedIds,
              },
            }
          : {}),

        OR: [
          {
            usernameNormalized: {
              contains: query,
            },
          },
          {
            displayName: {
              contains: query,
              mode: "insensitive",
            },
          },
        ],
      },

      orderBy: [
        {
          createdAt: "desc",
        },
        {
          id: "desc",
        },
      ],

      skip: offset,
      take: limit,

      select: {
        id: true,
        username: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
      },
    });
  }

  public async searchTags(
    query: string,
    limit: number,
    offset: number,
    viewerId?: string,
  ) {
    const policy = await viewerPolicy(viewerId);

    const rows = await prisma.tag.findMany({
      where: {
        name: {
          contains: query,
          mode: "insensitive",
        },
      },

      orderBy: [
        {
          name: "asc",
        },
        {
          id: "asc",
        },
      ],

      skip: offset,
      take: limit,

      select: {
        slug: true,
        name: true,

        _count: {
          select: {
            stories: {
              where: {
                story: {
                  deletedAt: null,
                  moderationState: "VISIBLE",
                  visibility: "PUBLIC",
                  publishedAt: {
                    not: null,
                  },
                  author: {
                    status: "ACTIVE",
                  },

                  ...(policy.includeMature
                    ? {}
                    : {
                        isMature: false,
                      }),

                  ...(policy.blockedIds.length > 0
                    ? {
                        authorId: {
                          notIn: policy.blockedIds,
                        },
                      }
                    : {}),
                },
              },
            },
          },
        },
      },
    });

    return rows.map(({ _count, ...row }) => ({
      ...row,
      storyCount: _count.stories,
    }));
  }
}
