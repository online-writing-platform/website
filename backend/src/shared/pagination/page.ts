export interface CursorPage<T> {
    items: T[];
    pagination: {
        hasMore: boolean;
        nextCursor: string | null;
    };
}

export function buildCursorPage<T>(
    rows: T[],
    limit: number,
    getCursor: (item: T) => string,
): CursorPage<T> {
    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit);
    const lastItem = items.at(-1);

    return {
        items,
        pagination: {
            hasMore,
            nextCursor: hasMore && lastItem ? getCursor(lastItem) : null,
        },
    };
}
