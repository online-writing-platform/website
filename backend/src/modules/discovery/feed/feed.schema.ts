import type { z } from "zod";

import { paginationQuerySchema } from "../../../shared/validation/common.schema.js";

export const feedQuerySchema = paginationQuerySchema;

export type FeedQuery = z.infer<typeof feedQuerySchema>;
