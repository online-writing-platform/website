import { storyModule } from "../stories/index.js";

import { AnalyticsService } from "./application/analytics.service.js";
import { PrismaAnalyticsStore } from "./infrastructure/prisma-analytics.store.js";

const store = new PrismaAnalyticsStore();

export const analyticsModule = {
    service: new AnalyticsService(store, storyModule.access),
};
