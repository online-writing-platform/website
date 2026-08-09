export function isAtLeastAge(
    birthDate: Date,
    requiredAge: number,
    now: Date,
): boolean {
    let age = now.getUTCFullYear() - birthDate.getUTCFullYear();
    const monthDelta = now.getUTCMonth() - birthDate.getUTCMonth();

    if (
        monthDelta < 0 ||
        (monthDelta === 0 && now.getUTCDate() < birthDate.getUTCDate())
    ) {
        age -= 1;
    }

    return age >= requiredAge;
}
