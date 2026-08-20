import AppError from "../../errors/app-error.js";
import { isAtLeastAge } from "../stories/stories.policy.js";
import { type PreferenceStore, type UpdatePreferencesInput } from "./preference.types.js";
import { PreferenceRepository } from "./preferences.repo.js";

export class PreferenceService {
    public constructor(private readonly store: PreferenceStore) {}

    public get(userId: string) {
        return this.store.get(userId);
    }

    public async update(userId: string, input: UpdatePreferencesInput) {
        if (input.allowMatureContent === true) {
            const birthDate = await this.store.getBirthDate(userId);

            if (!birthDate || !isAtLeastAge(birthDate, 18, new Date())) {
                throw AppError.forbidden(
                    "Mature content can only be enabled by adult accounts.",
                    "MATURE_CONTENT_AGE_RESTRICTED",
                );
            }
        }

        return this.store.update(userId, input);
    }
}

const store = new PreferenceRepository();

export const preferenceServices = {
    service: new PreferenceService(store),
};
