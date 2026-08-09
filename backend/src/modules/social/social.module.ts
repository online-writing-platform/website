import { notificationModule } from "../notifications/index.js";
import { userModule } from "../users/index.js";

import { SocialPolicy, SocialService } from "./application/social.service.js";
import { PrismaSocialStore } from "./infrastructure/prisma-social.store.js";

const store = new PrismaSocialStore();
const policy = new SocialPolicy(store);

export const socialModule = {
    policy,
    service: new SocialService(
        store,
        userModule.directory,
        notificationModule.publisher,
        policy,
    ),
};
