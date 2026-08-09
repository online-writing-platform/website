import AppError from "../../../errors/app-error.js";
import { isAtLeastAge } from "../../stories/domain/mature.policy.js";

import type { UpdatePreferencesInput } from "../domain/preference.types.js";
import type { PreferenceStore } from "./preference.ports.js";

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
