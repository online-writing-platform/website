import { ZxcvbnFactory } from "@zxcvbn-ts/core";
import * as commonPackage from "@zxcvbn-ts/language-common";
import * as englishPackage from "@zxcvbn-ts/language-en";

export const MIN_PASSWORD_LENGTH = 10;
export const MAX_PASSWORD_LENGTH = 64;
export const MIN_ACCEPTABLE_PASSWORD_SCORE = 2;

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
    warningKey: string | null;
    suggestionKeys: string[];
}

const passwordEstimator = new ZxcvbnFactory({
    graphs: commonPackage.adjacencyGraphs,

    dictionary: {
        ...commonPackage.dictionary,
        ...englishPackage.dictionary,
    },

    useLevenshteinDistance: true,
    maxLength: MAX_PASSWORD_LENGTH,
});

function getStrenghtLevel(score: PasswordScore): PasswordStrengthLevel {
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
    password: string,
    userInputs: string[] = [],
): PasswordStrengthAssessment {
    const result = passwordEstimator.check(password, userInputs);
    const score = result.score;

    const hasValidLength =
        password.length >= MIN_PASSWORD_LENGTH &&
        password.length <= MAX_PASSWORD_LENGTH;

    const hasValidWhitespace =
        password.length > 0 && password.trim() === password;

    return {
        score,
        level: getStrenghtLevel(score),

        acceptable:
            hasValidLength &&
            hasValidWhitespace &&
            score >= MIN_ACCEPTABLE_PASSWORD_SCORE,

        warningKey: result.feedback.warning || null,
        suggestionKeys: result.feedback.suggestions,
    };
}
