import type {
    DiscoveryCandidate,
    DiscoverySignals,
    DiscoveryStore,
} from "./discovery.ports.js";

export interface RankedStory extends DiscoveryCandidate {
    score: number;
    reason: string;
}

function daysSince(date: Date, now: Date): number {
    return Math.max(0, (now.getTime() - date.getTime()) / 86_400_000);
}

function engagement(candidate: DiscoveryCandidate): number {
    return (
        candidate.libraryCount * 3 +
        candidate.voteCount * 2 +
        candidate.commentCount * 2
    );
}

function scoreCandidate(
    candidate: DiscoveryCandidate,
    signals: DiscoverySignals,
    now: Date,
): RankedStory {
    let score = Math.log1p(engagement(candidate)) * 5;
    const reasons: string[] = [];

    if (signals.followedAuthorIds.has(candidate.author.id)) {
        score += 35;
        reasons.push("followed author");
    }

    if (candidate.genre) {
        const affinity = signals.preferredGenres.get(candidate.genre.slug) ?? 0;
        if (affinity > 0) {
            score += Math.min(24, affinity * 6);
            reasons.push(`genre: ${candidate.genre.name}`);
        }
    }

    let matchedTags = 0;
    for (const tag of candidate.tags) {
        const affinity = signals.preferredTags.get(tag.slug) ?? 0;
        if (affinity > 0) {
            score += Math.min(9, affinity * 3);
            matchedTags += 1;
        }
    }
    if (matchedTags > 0) reasons.push("tags you read");

    const recency = Math.max(0, 14 - daysSince(candidate.updatedAt, now));
    score += recency;

    if (engagement(candidate) > 0) reasons.push("reader engagement");
    if (reasons.length === 0) reasons.push("recently published");

    return {
        ...candidate,
        score: Number(score.toFixed(4)),
        reason: reasons.slice(0, 2).join(" · "),
    };
}

export class DiscoveryService {
    public constructor(private readonly store: DiscoveryStore) {}

    public async home(userId?: string) {
        const signals = await this.store.getSignals(userId);
        const candidates = await this.store.listCandidates(signals, 120);
        const now = new Date();

        const ranked = candidates
            .map((candidate) => scoreCandidate(candidate, signals, now))
            .sort(
                (a, b) =>
                    b.score - a.score ||
                    b.updatedAt.getTime() - a.updatedAt.getTime() ||
                    a.id.localeCompare(b.id),
            );

        const recent = [...candidates]
            .sort(
                (a, b) =>
                    b.publishedAt.getTime() - a.publishedAt.getTime() ||
                    a.id.localeCompare(b.id),
            )
            .slice(0, 12);

        const popular = [...candidates]
            .sort(
                (a, b) =>
                    engagement(b) - engagement(a) ||
                    b.updatedAt.getTime() - a.updatedAt.getTime() ||
                    a.id.localeCompare(b.id),
            )
            .slice(0, 12);

        return {
            recommended: ranked.slice(0, 12),
            recent,
            popular,
        };
    }
}
