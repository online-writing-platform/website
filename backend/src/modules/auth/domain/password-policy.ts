export const MIN_PASSWORD_LENGTH = 10;
export const MAX_PASSWORD_LENGTH = 128;

export const MIN_ACCOUNT_AGE = 13;
export const MAX_ACCOUNT_AGE = 120;

export type PasswordPolicyViolation =
    | "MIN_LENGTH"
    | "LOWERCASE_REQUIRED"
    | "UPPERCASE_REQUIRED"
    | "NUMBER_REQUIRED"
    | "SPECIAL_CHARACTER_REQUIRED"
    | "CONTAINS_USERNAME";

export type BirthDateValidationResult =
    | {
          valid: true;
          birthDate: Date;
      }
    | {
          valid: false;
          reason: "INVALID_BIRTH_DATE" | "AGE_REQUIREMENT_NOT_MET";
      };

function containsAsciiSpecialCharacter(password: string): boolean {
    for (const character of password) {
        const code = character.codePointAt(0);

        if (code === undefined) {
            continue;
        }

        if (
            (code >= 33 && code <= 47) ||
            (code >= 58 && code <= 64) ||
            (code >= 91 && code <= 96) ||
            (code >= 123 && code <= 126)
        ) {
            return true;
        }
    }

    return false;
}

export function getPasswordPolicyViolations(
    password: string,
    username: string,
): PasswordPolicyViolation[] {
    const violations: PasswordPolicyViolation[] = [];

    if (password.length < MIN_PASSWORD_LENGTH) {
        violations.push("MIN_LENGTH");
    }

    if (!/[a-z]/.test(password)) {
        violations.push("LOWERCASE_REQUIRED");
    }

    if (!/[A-Z]/.test(password)) {
        violations.push("UPPERCASE_REQUIRED");
    }

    if (!/[0-9]/.test(password)) {
        violations.push("NUMBER_REQUIRED");
    }

    if (!containsAsciiSpecialCharacter(password)) {
        violations.push("SPECIAL_CHARACTER_REQUIRED");
    }

    const normalizedUsername = username.trim().toLowerCase();

    if (
        normalizedUsername.length > 0 &&
        password.toLowerCase().includes(normalizedUsername)
    ) {
        violations.push("CONTAINS_USERNAME");
    }

    return violations;
}

export function validateBirthDate(
    value: string,
    today = new Date(),
): BirthDateValidationResult {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

    if (!match) {
        return {
            valid: false,
            reason: "INVALID_BIRTH_DATE",
        };
    }

    const year = Number(match[1]);

    const month = Number(match[2]);

    const day = Number(match[3]);

    const birthDate = new Date(Date.UTC(year, month - 1, day));

    const isRealDate =
        birthDate.getUTCFullYear() === year &&
        birthDate.getUTCMonth() === month - 1 &&
        birthDate.getUTCDate() === day;

    if (!isRealDate || birthDate.getTime() > today.getTime()) {
        return {
            valid: false,
            reason: "INVALID_BIRTH_DATE",
        };
    }

    let age = today.getUTCFullYear() - birthDate.getUTCFullYear();

    const birthdayPassed =
        today.getUTCMonth() > birthDate.getUTCMonth() ||
        (today.getUTCMonth() === birthDate.getUTCMonth() &&
            today.getUTCDate() >= birthDate.getUTCDate());

    if (!birthdayPassed) {
        age -= 1;
    }

    if (age < MIN_ACCOUNT_AGE) {
        return {
            valid: false,
            reason: "AGE_REQUIREMENT_NOT_MET",
        };
    }

    if (age > MAX_ACCOUNT_AGE) {
        return {
            valid: false,
            reason: "INVALID_BIRTH_DATE",
        };
    }

    return {
        valid: true,
        birthDate,
    };
}
