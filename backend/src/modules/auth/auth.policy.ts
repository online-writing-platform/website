import AppError from "../../errors/app-error.js";

export const MINIMUM_ACCOUNT_AGE = 13;

function calculateAge(birthDate: Date, currentDate: Date): number {
    let age = currentDate.getUTCFullYear() - birthDate.getUTCFullYear();

    const currentMonth = currentDate.getUTCMonth();
    const birthMonth = birthDate.getUTCMonth();

    const birthdayHasPassed =
        currentMonth > birthMonth ||
        (currentMonth === birthMonth &&
            currentDate.getUTCDate() >= birthDate.getUTCDate());

    if (!birthdayHasPassed) {
        age -= 1;
    }

    return age;
}

export function parseAndValidateBirthDate(
    value: string,
    now = new Date(),
): Date {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

    if (!match) {
        throw AppError.badRequest(
            "Birth date is invalid.",
            "INVALID_BIRTH_DATE",
        );
    }

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);

    const birthDate = new Date(Date.UTC(year, month - 1, day));

    const isValidDate =
        birthDate.getUTCFullYear() === year &&
        birthDate.getUTCMonth() === month - 1 &&
        birthDate.getUTCDate() === day;

    if (!isValidDate || birthDate > now) {
        throw AppError.badRequest(
            "Birth date is invalid.",
            "INVALID_BIRTH_DATE",
        );
    }

    const age = calculateAge(birthDate, now);

    if (age < MINIMUM_ACCOUNT_AGE) {
        throw AppError.badRequest(
            `You must be at least ${MINIMUM_ACCOUNT_AGE} years old to create an account.`,
            "AGE_REQUIREMENT_NOT_MET",
        );
    }

    if (age > 120) {
        throw AppError.badRequest(
            "Birth date is invalid.",
            "INVALID_BIRTH_DATE",
        );
    }

    return birthDate;
}
