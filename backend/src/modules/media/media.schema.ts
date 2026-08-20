import { z } from "zod";

import { uuidSchema } from "../../shared/validation/common.schema.js";

export const storyCoverParamsSchema = z
    .object({ storyId: uuidSchema })
    .strict();

export const mediaAssetParamsSchema = z
    .object({ assetId: uuidSchema })
    .strict();

export type StoryCoverParams = z.infer<typeof storyCoverParamsSchema>;
export type MediaAssetParams = z.infer<typeof mediaAssetParamsSchema>;
