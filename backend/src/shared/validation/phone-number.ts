import parsePhoneNumber from "libphonenumber-js/max";

export function normalizeIranianMobile(
    input: string,
): string | null {
    let value = input.trim();

    if (!value) {
        return null;
    }

    value = value.replace(/[\s()-]/g, "");

    if (value.startsWith("0098")) {
        value = `+98${value.slice(4)}`;
    }

    if (value.startsWith("98") && !value.startsWith("+")) {
        value = `+${value}`;
    }

    const phoneNumber = parsePhoneNumber(value, {
        defaultCountry: "IR",
        extract: false,
    });

    if (!phoneNumber || !phoneNumber.isValid()) {
        return null;
    }

    if (phoneNumber.country !== "IR") {
        return null;
    }

    const e164 = phoneNumber.number;

    if (!/^\+989\d{9}$/.test(e164)) {
        return null;
    }

    return `0${e164.slice(3)}`;
}