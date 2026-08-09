import { notificationModule } from "../notifications/index.js";
import { storyModule } from "../stories/index.js";

import { InteractionService } from "./application/interaction.service.js";
import { PrismaInteractionStore } from "./infrastructure/prisma-interaction.store.js";

const store = new PrismaInteractionStore();

export const interactionModule = {
    service: new InteractionService(store, storyModule.access, notificationModule.publisher),
};
