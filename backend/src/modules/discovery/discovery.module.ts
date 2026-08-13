import { DiscoveryService } from "./application/discovery.service.js";
import { PrismaDiscoveryStore } from "./infrastructure/prisma-discovery.store.js";
import { searchModule } from "./search/search.module.js";

const store = new PrismaDiscoveryStore();

export const discoveryModule = {
    service: new DiscoveryService(store),
    search: searchModule.service,
};
