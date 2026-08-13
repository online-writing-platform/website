import { SearchService } from "./search.service.js";
import { PrismaSearchStore } from "./prisma-search.store.js";

const store = new PrismaSearchStore();
export const searchModule = { service: new SearchService(store) };
