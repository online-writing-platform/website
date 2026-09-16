import type { FamousAuthor } from "@/types/famous-author";

function parseBirthDate(birthDate: string) {
  const [year, month, day] = birthDate.split("-").map(Number);

  return {
    year,
    month,
    day,
  };
}

export function getAuthorImagePath(author: FamousAuthor): string {
  return `/authors/${author.imageFile}`;
}

export function getAuthorsBornOn(
  date: Date,
  authors: FamousAuthor[],
): FamousAuthor[] {
  const month = date.getMonth() + 1;
  const day = date.getDate();

  return authors.filter((author) => {
    const birth = parseBirthDate(author.birthDate);

    return birth.month === month && birth.day === day;
  });
}

/**
 * Some dates have more than one writer.
 *
 * We rotate between them by year so:
 * - refreshing the page does not change the author
 * - different years can feature another writer
 */
export function pickFeaturedBirthdayAuthor(
  authors: FamousAuthor[],
  date: Date,
): FamousAuthor | null {
  if (authors.length === 0) {
    return null;
  }

  if (authors.length === 1) {
    return authors[0];
  }

  const sortedAuthors = [...authors].sort((a, b) => a.id.localeCompare(b.id));

  const index = date.getFullYear() % sortedAuthors.length;

  return sortedAuthors[index];
}

export function getBirthYear(author: FamousAuthor): number {
  return parseBirthDate(author.birthDate).year;
}

export function getBirthdayAge(author: FamousAuthor, date: Date): number {
  return date.getFullYear() - getBirthYear(author);
}

export function getNextBirthday(
  from: Date,
  authors: FamousAuthor[],
): {
  author: FamousAuthor;
  date: Date;
  daysUntil: number;
} | null {
  if (authors.length === 0) {
    return null;
  }

  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());

  let best: {
    author: FamousAuthor;
    date: Date;
    daysUntil: number;
  } | null = null;

  for (const author of authors) {
    const birth = parseBirthDate(author.birthDate);

    let nextBirthday = new Date(
      start.getFullYear(),
      birth.month - 1,
      birth.day,
    );

    if (nextBirthday < start) {
      nextBirthday = new Date(
        start.getFullYear() + 1,
        birth.month - 1,
        birth.day,
      );
    }

    const diffMs = nextBirthday.getTime() - start.getTime();

    const daysUntil = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (!best || daysUntil < best.daysUntil) {
      best = {
        author,
        date: nextBirthday,
        daysUntil,
      };
    }
  }

  return best;
}
