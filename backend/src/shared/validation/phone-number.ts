const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

export function normalizeDecimalDigits(value: string): string {
    return [...value]
        .map((character) => {
            const persianIndex = PERSIAN_DIGITS.indexOf(character);
            if (persianIndex >= 0) return String(persianIndex);

            const arabicIndex = ARABIC_DIGITS.indexOf(character);
            if (arabicIndex >= 0) return String(arabicIndex);

            return character;
        })
        .join("");
}

export function normalizeIranianMobile(input: string): string | null {
    let value = normalizeDecimalDigits(input.trim()).replace(/[\s()-]/gu, "");

    if (value.startsWith("0098")) {
        value = `0${value.slice(4)}`;
    } else if (value.startsWith("+98")) {
        value = `0${value.slice(3)}`;
    } else if (value.startsWith("98")) {
        value = `0${value.slice(2)}`;
    }

    return /^09\d{9}$/u.test(value) ? value : null;
}
