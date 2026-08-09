import { SearchService } from "./application/search.service.js";
import { PrismaSearchStore } from "./infrastructure/prisma-search.store.js";

const store = new PrismaSearchStore();
export const searchModule = { service: new SearchService(store) };
