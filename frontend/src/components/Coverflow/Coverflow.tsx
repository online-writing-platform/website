import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import "./Coverflow.css";

import CoverflowCard from "./CoverflowCard";

import { CoverflowItem, CoverflowProps } from "./types";

const DEFAULT_ROTATION = 45;

const DEFAULT_SPACING = 170;

const DEFAULT_SCALE = 0.82;

const DEFAULT_AUTOPLAY_DELAY = 3000;

function mod(value: number, length: number) {
  return ((value % length) + length) % length;
}

function Coverflow({
  items,
  autoplay = true,
  autoplayDelay = DEFAULT_AUTOPLAY_DELAY,
  loop = true,
  keyboardNavigation = true,
  rotate = DEFAULT_ROTATION,
  spacing = DEFAULT_SPACING,
  scale = DEFAULT_SCALE,
  className = "",
}: CoverflowProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  const autoplayRef = useRef<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const touchStartX = useRef(0);

  const touchEndX = useRef(0);

  const totalItems = items.length;

  const goNext = useCallback(() => {
    setActiveIndex((current) => {
      if (loop) {
        return mod(current + 1, totalItems);
      }

      return Math.min(current + 1, totalItems - 1);
    });
  }, [loop, totalItems]);

  const goPrevious = useCallback(() => {
    setActiveIndex((current) => {
      if (loop) {
        return mod(current - 1, totalItems);
      }

      return Math.max(current - 1, 0);
    });
  }, [loop, totalItems]);

  const goTo = useCallback(
    (index: number) => {
      setActiveIndex(mod(index, totalItems));
    },
    [totalItems],
  );

  useEffect(() => {
    if (!keyboardNavigation) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowRight") {
        goNext();
      }

      if (event.key === "ArrowLeft") {
        goPrevious();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [keyboardNavigation, goNext, goPrevious]);

  useEffect(() => {
    if (!autoplay) {
      return;
    }

    autoplayRef.current = window.setInterval(() => {
      goNext();
    }, autoplayDelay);

    return () => {
      if (autoplayRef.current) {
        clearInterval(autoplayRef.current);
      }
    };
  }, [autoplay, autoplayDelay, goNext]);

  const visibleItems = useMemo(() => {
    return items.map((item, index) => {
      let offset = index - activeIndex;

      if (loop) {
        if (offset > totalItems / 2) {
          offset -= totalItems;
        }

        if (offset < -totalItems / 2) {
          offset += totalItems;
        }
      }

      return {
        item,
        index,
        offset,
      };
    });
  }, [activeIndex, items, loop, totalItems]);
  const pauseAutoplay = useCallback(() => {
    if (autoplayRef.current !== null) {
      clearInterval(autoplayRef.current);
      autoplayRef.current = null;
    }
  }, []);

  const resumeAutoplay = useCallback(() => {
    if (!autoplay || autoplayRef.current !== null) {
      return;
    }

    autoplayRef.current = window.setInterval(() => {
      goNext();
    }, autoplayDelay);
  }, [autoplay, autoplayDelay, goNext]);

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    touchStartX.current = event.touches[0].clientX;

    pauseAutoplay();
  };

  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    touchEndX.current = event.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const distance = touchStartX.current - touchEndX.current;

    if (Math.abs(distance) > 60) {
      if (distance > 0) {
        goNext();
      } else {
        goPrevious();
      }
    }

    resumeAutoplay();
  };

  const mouseStart = useRef<number | null>(null);

  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    mouseStart.current = event.clientX;

    pauseAutoplay();
  };

  const handleMouseUp = (event: React.MouseEvent<HTMLDivElement>) => {
    if (mouseStart.current === null) {
      return;
    }

    const distance = mouseStart.current - event.clientX;

    if (Math.abs(distance) > 80) {
      if (distance > 0) {
        goNext();
      } else {
        goPrevious();
      }
    }

    mouseStart.current = null;

    resumeAutoplay();
  };

  const handleMouseLeave = () => {
    mouseStart.current = null;

    resumeAutoplay();
  };

  const handleMouseEnter = () => {
    pauseAutoplay();
  };
  return (
    <section className={`coverflow ${className}`}>
      <button
        className="coverflow-arrow coverflow-arrow-left"
        onClick={goPrevious}
        aria-label="Previous"
      >
        ❮
      </button>

      <div
        ref={containerRef}
        className="coverflow-stage"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onMouseEnter={handleMouseEnter}
      >
        {visibleItems.map(({ item, index, offset }) => (
          <CoverflowCard
            key={item.id}
            item={item}
            offset={offset}
            isActive={index === activeIndex}
            rotate={rotate}
            spacing={spacing}
            scale={scale}
            onClick={() => goTo(index)}
          />
        ))}
      </div>

      <button
        className="coverflow-arrow coverflow-arrow-right"
        onClick={goNext}
        aria-label="Next"
      >
        ❯
      </button>
    </section>
  );
}
export default Coverflow;