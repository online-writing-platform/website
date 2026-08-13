import { notificationModule } from "../notifications/index.js";
import { socialModule } from "../social/social.module.js";
import { contentModule } from "../content/index.js";

import { InteractionService } from "./application/interaction.service.js";
import { PrismaInteractionStore } from "./infrastructure/prisma-interaction.store.js";

const store = new PrismaInteractionStore();

export const interactionModule = {
    service: new InteractionService(
        store,
        contentModule.access,
        notificationModule.publisher,
        socialModule.policy,
    ),
};
