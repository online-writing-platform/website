import { notificationModule } from "../notifications/index.js";
import { userModule } from "../users/index.js";

import { SocialService } from "./application/social.service.js";
import { PrismaSocialStore } from "./infrastructure/prisma-social.store.js";

const store = new PrismaSocialStore();

export const socialModule = {
    service: new SocialService(store, userModule.directory, notificationModule.publisher),
};
