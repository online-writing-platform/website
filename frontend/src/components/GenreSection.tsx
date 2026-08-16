import { useEffect, useState, type ComponentType } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BookOpen,
  Compass,
  Drama,
  Feather,
  FileText,
  GraduationCap,
  Heart,
  Landmark,
  Rocket,
  Search,
  Skull,
  Smile,
  Wand2,
  Zap,
} from "lucide-react";
import { GiStarSwirl } from "react-icons/gi";

import { apiRequest } from "../lib/api";
import { getErrorMessage } from "../lib/error-message";
import { Button } from "./ui/button";

interface Genre {
  slug: string;
  name: string;
}

interface GenresResponse {
  data: {
    genres: Genre[];
  };
}

interface GenrePresentation {
  icon: ComponentType<{
    className?: string;
    "aria-hidden"?: boolean;
  }>;
  className: string;
}

const defaultPresentation: GenrePresentation = {
  icon: BookOpen,
  className:
    "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300",
};

const genrePresentations: Record<string, GenrePresentation> = {
  romance: {
    icon: Heart,
    className:
      "bg-rose-kiss-100 text-rose-700 dark:bg-rose-kiss-700 dark:text-rose-300",
  },

  fantasy: {
    icon: Wand2,
    className:
      "bg-electric-aqua-100 text-electric-aqua-300 dark:bg-electric-aqua-800 dark:text-violet-300",
  },

  "science-fiction": {
    icon: Rocket,
    className:
      "bg-tea-green-100 text-cyan-700 dark:bg-tea-green-800 dark:text-cyan-300",
  },

  mystery: {
    icon: Search,
    className:
      "bg-baby-blue-ice-100 text-amber-700 dark:bg-baby-blue-ice-800 dark:text-amber-300",
  },

  thriller: {
    icon: Zap,
    className:
      "bg-vibrant-coral-100 text-red-700 dark:bg-vibrant-coral-800 dark:text-red-300",
  },

  horror: {
    icon: Skull,
    className:
      "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300",
  },

  adventure: {
    icon: Compass,
    className:
      "bg-beige-100 text-emerald-700 dark:bg-beige-800 dark:text-emerald-300",
  },

  "fan-fiction": {
    icon: GiStarSwirl,
    className:
      "bg-[linear-gradient(135deg,#fecdd3_0%,#fed7aa_16%,#fef08a_32%,#bbf7d0_48%,#bae6fd_64%,#ddd6fe_80%,#fbcfe8_100%)] text-slate-900 dark:bg-[linear-gradient(135deg,#9f1239_0%,#9a3412_16%,#854d0e_32%,#166534_48%,#075985_64%,#5b21b6_80%,#9d174d_100%)] dark:text-white",
  },

  "historical-fiction": {
    icon: Landmark,
    className:
      "bg-powder-petal-100 text-orange-700 dark:bg-powder-petal-800 dark:text-orange-300",
  },

  "young-adult": {
    icon: GraduationCap,
    className:
      "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  },

  humor: {
    icon: Smile,
    className:
      "bg-porcelain-100 text-yellow-700 dark:bg-porcelain-800 dark:text-yellow-300",
  },

  poetry: {
    icon: Feather,
    className:
      "bg-apricot-cream-50 text-pink-700 dark:bg-apricot-cream-700 dark:text-pink-300",
  },

  "non-fiction": {
    icon: FileText,
    className:
      "bg-dusty-olive-100 text-blue-700 dark:bg-dusty-olive-800 dark:text-blue-300",
  },

  "short-story": {
    icon: Drama,
    className:
      "bg-cream-100 text-teal-700 dark:bg-cream-800 dark:text-teal-300",
  },
};

export function GenreSection() {
  const { t } = useTranslation();

  const [genres, setGenres] = useState<Genre[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    void apiRequest<GenresResponse>("/api/v1/stories/genres", {
      signal: controller.signal,
    })
      .then((response) => {
        setGenres(response.data.genres);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setError(getErrorMessage(cause));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [reloadKey]);

  function retry(): void {
    setError(null);
    setLoading(true);
    setReloadKey((current) => current + 1);
  }

  return (
    <section className="py-12" aria-labelledby="browse-by-genre-title">
      <div className="mx-auto max-w-7xl px-4">
        <h2 id="browse-by-genre-title" className="mb-6 text-2xl font-bold">
          {t("genres.title")}
        </h2>

        {loading ? (
          <p className="status-message" aria-live="polite">
            {t("genres.loading")}
          </p>
        ) : error ? (
          <div className="status-message" data-kind="error" role="alert">
            <p>{t("genres.error", { message: error })}</p>

            <Button type="button" variant="outline" onClick={retry}>
              {t("genres.retry")}
            </Button>
          </div>
        ) : genres.length === 0 ? (
          <p className="empty-state surface">{t("genres.empty")}</p>
        ) : (
          <ul className="grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
            {genres.map((genre, index) => {
              const presentation =
                genrePresentations[genre.slug] ?? defaultPresentation;

              const Icon = presentation.icon;

              const label = t(`genres.items.${genre.slug}`, {
                defaultValue: genre.name,
              });

              return (
                <motion.li
                  key={genre.slug}
                  initial={{
                    opacity: 0,
                    y: 10,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  transition={{
                    duration: 0.3,
                    delay: index * 0.05,
                  }}
                >
                  <Link
                    to={`/browse/genres/${encodeURIComponent(genre.slug)}`}
                    className={`flex min-h-28 w-full flex-col items-center justify-center gap-2 rounded-lg border border-transparent px-2 py-4 text-center transition-all hover:-translate-y-0.5 hover:border-current hover:shadow-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 ${presentation.className}`}
                    aria-label={t("genres.browseAriaLabel", {
                      genre: label,
                    })}
                  >
                    <Icon className="h-6 w-6" aria-hidden={true} />

                    <span className="text-sm font-medium">{label}</span>
                  </Link>
                </motion.li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
