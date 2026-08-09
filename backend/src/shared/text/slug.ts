import { randomBytes } from "node:crypto";

function normalizeSlugPart(value: string): string {
    return value
        .normalize("NFKC")
        .trim()
        .toLowerCase()
        .replace(/[\s_]+/g, "-")
        .replace(/[^\p{L}\p{N}-]+/gu, "")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 160);
}

export function createSlugBase(value: string): string {
    const normalized = normalizeSlugPart(value);

    return normalized.length > 0 ? normalized : "story";
}

export function createUniqueSlugCandidate(value: string): string {
    const suffix = randomBytes(6).toString("hex");

    return `${createSlugBase(value)}-${suffix}`.slice(0, 220);
}

export function normalizeTagName(value: string): string {
    return value.normalize("NFKC").trim().replace(/\s+/g, " ").slice(0, 80);
}

export function createTagSlug(value: string): string {
    const slug = normalizeSlugPart(value).slice(0, 80);

    return slug.length > 0 ? slug : randomBytes(4).toString("hex");
}
