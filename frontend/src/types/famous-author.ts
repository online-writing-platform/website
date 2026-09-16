export type FamousAuthorRegion = "world" | "iran";

export type FamousAuthor = {
  id: string;

  name: {
    fa: string;
    en: string;
  };

  /**
   * Gregorian date in YYYY-MM-DD format.
   *
   * This is the canonical date used for birthday matching.
   */
  birthDate: string;

  /**
   * Filename inside /public/authors
   *
   * Example:
   * "فرانتس کافکا.jpg"
   */
  imageFile: string;

  region: FamousAuthorRegion;
};
