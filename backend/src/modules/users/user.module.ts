import { UserDirectoryService } from "./application/user-directory.service.js";
import { UserProfileService } from "./application/user-profile.service.js";
import { PrismaUserProfileStore } from "./infrastructure/prisma-user.store.js";

const store = new PrismaUserProfileStore();

export const userModule = {
    profile: new UserProfileService(store),
    directory: new UserDirectoryService(store),
};
