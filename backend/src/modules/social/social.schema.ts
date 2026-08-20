import { z } from "zod";

import { paginationQuerySchema } from "../../shared/validation/common.schema.js";
import { usernameSchema } from "../../shared/validation/username.schema.js";

export const socialUsernameParamsSchema = z.object({ username: usernameSchema });
export const socialListQuerySchema = paginationQuerySchema;

export type SocialUsernameParams = z.infer<typeof socialUsernameParamsSchema>;
export type SocialListQuery = z.infer<typeof socialListQuerySchema>;
