import { BookOpen, PenTool, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";

export function HeroSection() {
  const { t } = useTranslation();

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-orange-50 via-rose-50 to-amber-50 dark:from-orange-950/20 dark:via-rose-950/20 dark:to-amber-950/20">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            y: [0, -20, 0],
            rotate: [0, 5, 0],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute top-20 left-[10%] h-16 w-16 rounded-full bg-orange-200/40 blur-xl dark:bg-orange-800/20"
        />

        <motion.div
          animate={{
            y: [0, 15, 0],
            rotate: [0, -3, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute top-40 right-[15%] h-24 w-24 rounded-full bg-rose-200/40 blur-xl dark:bg-rose-800/20"
        />

        <motion.div
          animate={{
            y: [0, -10, 0],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute bottom-20 left-[20%] h-20 w-20 rounded-full bg-amber-200/40 blur-xl dark:bg-amber-800/20"
        />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-20 md:py-32">
        <div className="flex flex-col items-center gap-6 text-center">
          <motion.div
            initial={{
              opacity: 0,
              y: 20,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.6,
            }}
            className="flex items-center gap-2 text-orange-600 dark:text-orange-400"
          >
            <Sparkles className="h-5 w-5" />

            <span className="text-sm font-medium uppercase tracking-wider">
              {t("hero.tagline")}
            </span>
          </motion.div>

          <motion.h1
            initial={{
              opacity: 0,
              y: 20,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.6,
              delay: 0.1,
            }}
            className="max-w-4xl bg-gradient-to-r from-orange-600 via-rose-600 to-amber-600 bg-clip-text text-4xl font-bold tracking-tight text-transparent md:text-6xl lg:text-7xl"
          >
            {t("hero.title")}
          </motion.h1>

          <motion.p
            initial={{
              opacity: 0,
              y: 20,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.6,
              delay: 0.2,
            }}
            className="max-w-2xl text-lg text-muted-foreground md:text-xl"
          >
            {t("hero.subtitle")}
          </motion.p>

          <motion.div
            initial={{
              opacity: 0,
              y: 20,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.6,
              delay: 0.3,
            }}
            className="mt-4 flex flex-col gap-3 sm:flex-row"
          >
            <Link to="/stories">
              <Button
                size="lg"
                className="gap-2 bg-gradient-to-r from-orange-500 to-rose-500 text-white"
              >
                <BookOpen className="h-5 w-5" />

                {t("hero.cta")}
              </Button>
            </Link>
            <Link to="/write">
              <Button
                size="lg"
                variant="outline"
                className="gap-2 border-orange-300 text-orange-600"
              >
                <PenTool className="h-5 w-5" />

                {t("hero.ctaWrite")}
              </Button>
            </Link>
          </motion.div>

          <motion.div
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            transition={{
              duration: 0.6,
              delay: 0.5,
            }}
            className="mt-8 flex flex-wrap justify-center gap-8 text-sm text-muted-foreground"
          >
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold text-foreground">2.4M+</span>

              <span>{t("stats.stories")}</span>
            </div>

            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold text-foreground">94M+</span>

              <span>{t("stats.readers")}</span>
            </div>

            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold text-foreground">680K+</span>

              <span>{t("stats.writers")}</span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
