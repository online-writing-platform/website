import { ModerationService } from "./application/moderation.service.js";
import { PrismaModerationStore } from "./infrastructure/prisma-moderation.store.js";

const store = new PrismaModerationStore();
export const moderationModule = { service: new ModerationService(store) };
