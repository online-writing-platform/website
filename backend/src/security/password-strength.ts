import { ZxcvbnFactory } from "@zxcvbn-ts/core";
import * as commonPackage from "@zxcvbn-ts/language-common";
import * as englishPackage from "@zxcvbn-ts/language-en";

export const MIN_PASSWORD_LENGTH = 10;
export const MAX_PASSWORD_LENGTH = 128;

const MIN_ACCEPTABLE_PASSWORD_SCORE = 2;

export type PasswordScore = 0 | 1 | 2 | 3 | 4;

export type PasswordStrengthLevel =
    | "very_weak"
    | "weak"
    | "acceptable"
    | "strong"
    | "very_strong";

export interface PasswordStrengthAssessment {
    score: PasswordScore;
    level: PasswordStrengthLevel;
    acceptable: boolean;
}

const passwordEstimator = new ZxcvbnFactory({
    graphs: commonPackage.adjacencyGraphs,

    dictionary: {
        ...commonPackage.dictionary,
        ...englishPackage.dictionary,

        userInputs: ["رمز", "رمزعبور", "رمزعبورمن", "۱۲۳۴۵۶۷۸۹", "۱۲۳۴۵۶۷۸۹۰"],
    },

    useLevenshteinDistance: true,
    maxLength: MAX_PASSWORD_LENGTH,
});

function getStrengthLevel(score: PasswordScore): PasswordStrengthLevel {
    switch (score) {
        case 0:
            return "very_weak";

        case 1:
            return "weak";

        case 2:
            return "acceptable";

        case 3:
            return "strong";

        case 4:
            return "very_strong";
    }
}

export function assessPasswordStrength(
    rawPassword: string,
    userInputs: string[] = [],
): PasswordStrengthAssessment {
    const password = rawPassword.normalize("NFC");

    const result = passwordEstimator.check(password, userInputs);

    const hasValidLength =
        password.length >= MIN_PASSWORD_LENGTH &&
        password.length <= MAX_PASSWORD_LENGTH;

    return {
        score: result.score,

        level: getStrengthLevel(result.score),

        acceptable:
            hasValidLength && result.score >= MIN_ACCEPTABLE_PASSWORD_SCORE,
    };
}
