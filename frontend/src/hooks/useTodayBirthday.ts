import { useEffect, useMemo, useState } from "react";

import { famousAuthors } from "@/data/famous-authors";
import {
  getAuthorsBornOn,
  getNextBirthday,
  pickFeaturedBirthdayAuthor,
} from "@/lib/birthday-feature";

export function useTodayBirthday() {
  const [today, setToday] = useState(() => new Date());

  useEffect(() => {
    const now = new Date();

    const nextMidnight = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      0,
      0,
      1,
    );

    const delay = nextMidnight.getTime() - now.getTime();

    const timeoutId = window.setTimeout(() => {
      setToday(new Date());
    }, delay);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [today]);

  const birthdayAuthors = useMemo(
    () => getAuthorsBornOn(today, famousAuthors),
    [today],
  );

  const featuredAuthor = useMemo(
    () => pickFeaturedBirthdayAuthor(birthdayAuthors, today),
    [birthdayAuthors, today],
  );

  const nextBirthday = useMemo(
    () => getNextBirthday(today, famousAuthors),
    [today],
  );

  return {
    today,
    featuredAuthor,
    birthdayAuthors,
    nextBirthday,
    hasBirthdayToday: birthdayAuthors.length > 0,
  };
}
