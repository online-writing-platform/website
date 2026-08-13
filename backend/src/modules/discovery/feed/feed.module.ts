import { FeedService } from "./feed.service.js";
import { PrismaFeedStore } from "./prisma-feed.store.js";

const store = new PrismaFeedStore();
export const feedModule = { service: new FeedService(store) };
