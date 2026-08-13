import { contentModule } from "../content/index.js";
import { userModule } from "../users/index.js";

import { ReadingService } from "./application/reading.service.js";
import { PrismaReadingStore } from "./infrastructure/prisma-reading.store.js";

const store = new PrismaReadingStore();

export const readingModule = {
    service: new ReadingService(store, contentModule.access, userModule.directory),
};
