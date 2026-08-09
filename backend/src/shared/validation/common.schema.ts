import { z } from "zod";

export const uuidSchema = z.string().uuid("The identifier is invalid.");

export const cursorSchema = z
    .string()
    .uuid("The cursor is invalid.")
    .optional();

export const pageLimitSchema = z.coerce
    .number()
    .int()
    .min(1)
    .max(50)
    .default(20);

export const paginationQuerySchema = z
    .object({
        cursor: cursorSchema,
        limit: pageLimitSchema,
    })
    .strict();

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
