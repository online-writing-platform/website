const characterMap = new Map<string, string>([
    ["ي", "ی"],
    ["ى", "ی"],
    ["ئ", "ی"],
    ["ك", "ک"],
    ["ۀ", "ه"],
    ["ة", "ه"],
]);

const digitMap = new Map<string, string>([
    ["۰", "0"], ["۱", "1"], ["۲", "2"], ["۳", "3"], ["۴", "4"],
    ["۵", "5"], ["۶", "6"], ["۷", "7"], ["۸", "8"], ["۹", "9"],
    ["٠", "0"], ["١", "1"], ["٢", "2"], ["٣", "3"], ["٤", "4"],
    ["٥", "5"], ["٦", "6"], ["٧", "7"], ["٨", "8"], ["٩", "9"],
]);

export function normalizeSearchText(value: string): string {
    const normalizedCharacters = [...value]
        .map((character) => characterMap.get(character) ?? digitMap.get(character) ?? character)
        .join("");

    return normalizedCharacters
        .normalize("NFKD")
        .replace(/[\p{M}\u0640]/gu, "")
        .toLocaleLowerCase("en-US")
        .replace(/\s+/gu, " ")
        .trim();
}
