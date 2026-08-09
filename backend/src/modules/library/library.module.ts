import { storyModule } from "../stories/index.js";
import { userModule } from "../users/index.js";

import { LibraryService } from "./application/library.service.js";
import { PrismaLibraryStore } from "./infrastructure/prisma-library.store.js";

const store = new PrismaLibraryStore();

export const libraryModule = {
    service: new LibraryService(store, storyModule.access, userModule.directory),
};
