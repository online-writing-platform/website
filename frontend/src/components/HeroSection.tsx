import { BookOpen, PenTool, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";

export function HeroSection() {
  const { t } = useTranslation();

  return (
    <section
      className="relative overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, var(--background) 0%, var(--primary-soft) 55%, var(--accent-soft) 100%)",
      }}
    >
      {/* Decorative animated blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Purple glow */}
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
          className="absolute left-[10%] top-20 h-16 w-16 rounded-full blur-2xl"
          style={{
            backgroundColor: "var(--primary)",
            opacity: 0.14,
          }}
        />

        {/* Orange glow */}
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
          className="absolute right-[15%] top-40 h-24 w-24 rounded-full blur-2xl"
          style={{
            backgroundColor: "var(--accent)",
            opacity: 0.14,
          }}
        />

        {/* Another purple glow */}
        <motion.div
          animate={{
            y: [0, -10, 0],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute bottom-20 left-[20%] h-20 w-20 rounded-full blur-2xl"
          style={{
            backgroundColor: "var(--primary)",
            opacity: 0.1,
          }}
        />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-20 md:py-32">
        <div className="flex flex-col items-center gap-6 text-center">
          {/* Tagline */}
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
            className="flex items-center gap-2"
            style={{
              color: "var(--primary)",
            }}
          >
            <Sparkles className="h-5 w-5" />

            <span className="text-sm font-medium uppercase tracking-wider">
              {t("hero.tagline")}
            </span>
          </motion.div>

          {/* Main title */}
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
            className="max-w-4xl bg-clip-text text-4xl font-bold tracking-tight text-transparent md:text-6xl lg:text-7xl"
            style={{
              backgroundImage:
                "linear-gradient(90deg, var(--primary) 0%, var(--primary-hover) 55%, var(--accent) 100%)",
            }}
          >
            {t("hero.title")}
          </motion.h1>

          {/* Subtitle */}
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

          {/* CTA Buttons */}
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
            {/* Primary CTA */}
            <Link to="/browse">
              <Button
                size="lg"
                className="gap-2 text-white shadow-md transition-all hover:-translate-y-0.5"
                style={{
                  background:
                    "linear-gradient(90deg, var(--primary), var(--primary-hover))",
                }}
              >
                <BookOpen className="h-5 w-5" />

                {t("hero.cta")}
              </Button>
            </Link>

            {/* Secondary CTA */}
            <Link to="/write">
              <Button
                size="lg"
                variant="outline"
                className="gap-2 transition-all hover:-translate-y-0.5"
                style={{
                  borderColor: "var(--accent)",
                  color: "var(--accent)",
                  backgroundColor: "transparent",
                }}
              >
                <PenTool className="h-5 w-5" />

                {t("hero.ctaWrite")}
              </Button>
            </Link>
          </motion.div>

          {/* Stats */}
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
              <span
                className="text-2xl font-bold"
                style={{ color: "var(--foreground)" }}
              >
                2.4M+
              </span>

              <span>{t("stats.stories")}</span>
            </div>

            <div className="flex flex-col items-center">
              <span
                className="text-2xl font-bold"
                style={{ color: "var(--foreground)" }}
              >
                94M+
              </span>

              <span>{t("stats.readers")}</span>
            </div>

            <div className="flex flex-col items-center">
              <span
                className="text-2xl font-bold"
                style={{ color: "var(--foreground)" }}
              >
                680K+
              </span>

              <span>{t("stats.writers")}</span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
