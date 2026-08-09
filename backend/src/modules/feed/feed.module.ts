import { FeedService } from "./application/feed.service.js";
import { PrismaFeedStore } from "./infrastructure/prisma-feed.store.js";

const store = new PrismaFeedStore();
export const feedModule = { service: new FeedService(store) };
