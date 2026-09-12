export function getChapterPath(slug: string, chapterId: string): string {
  return `/stories/${encodeURIComponent(
    slug,
  )}/chapters/${encodeURIComponent(chapterId)}`;
}
