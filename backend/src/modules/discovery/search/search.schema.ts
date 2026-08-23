import { z } from "zod";

export const searchQuerySchema = z
  .object({
    q: z.string().trim().min(2).max(100).optional(),
    type: z.enum(["all", "stories", "users", "tags"]).default("all"),
    genre: z.string().trim().min(1).max(80).optional(),
    tag: z.string().trim().min(1).max(80).optional(),
    language: z.string().trim().min(2).max(10).optional(),
    sort: z
      .enum(["relevance", "mostRead", "mostVoted", "newest"])
      .default("relevance"),
    limit: z.coerce.number().int().min(1).max(20).default(10),
    page: z.coerce.number().int().min(1).max(100).default(1),
  })
  .strict()
  .superRefine((query, context) => {
    if (!query.q && query.type !== "stories") {
      context.addIssue({
        code: "custom",
        path: ["q"],
        message: "A search query is required for this result type.",
      });
    }

    if (!query.q && query.sort === "relevance") {
      context.addIssue({
        code: "custom",
        path: ["sort"],
        message: "Relevance sorting requires a search query.",
      });
    }

    if (
      query.type !== "stories" &&
      (query.genre || query.tag || query.language || query.sort !== "relevance")
    ) {
      context.addIssue({
        code: "custom",
        path: ["type"],
        message: "Story filters can only be used with story results.",
      });
    }
  });

export type SearchQuery = z.infer<typeof searchQuerySchema>;
