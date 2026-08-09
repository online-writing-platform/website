"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";

import Girl from "../../../assets/Girl.jpg";
import Hands from "../../../assets/Hands.jpg";
import myBoy from "../../../assets/myBoy.jpg";
import storycover from "../../../assets/storycover.jpg";
import wedding from "../../../assets/wedding.jpg";

interface Slide {
  image?: {
    src?: string;
    srcSet?: string;
    alt?: string;
  };
  title?: string;
}

type AutoplayDirection = "leftToRight" | "rightToLeft";
type TitleCorner = "topLeft" | "topRight" | "bottomLeft" | "bottomRight";

interface SlideshowTransition {
  duration?: number;
  delay?: number;
  ease?: string | readonly [number, number, number, number];
}

interface Smooth3DSlideshowProps {
  slides?: Slide[];
  cardWidth?: number;
  cardHeight?: number;
  radius?: number;
  tilt?: number;
  sideTilt?: number;
  gap?: number;
  opacity?: number;
  transition?: SlideshowTransition;
  autoplay?: boolean;
  autoplayDirection?: AutoplayDirection;
  showTitle?: boolean;
  titleFont?: CSSProperties;
  titleColor?: string;
  titlePosition?: {
    position?: TitleCorner;
    paddingLeft?: number;
    paddingRight?: number;
    paddingTop?: number;
    paddingBottom?: number;
  };
  style?: CSSProperties;
}

const DEFAULT_SLIDES: Slide[] = [
  {
    image: { src: Hands, alt: "دست در دست" },
    title: "دست در دست",
  },
  {
    image: { src: storycover, alt: "افسانه آخر" },
    title: "افسانه آخر",
  },
  {
    image: { src: wedding, alt: "عروس" },
    title: "عروس",
  },
  {
    image: { src: myBoy, alt: "پسر من" },
    title: "پسر من",
  },
  {
    image: { src: Girl, alt: "آن دختر واقعی نبود" },
    title: "آن دختر واقعی نبود",
  },
];

const DEFAULT_PROPS: Required<
  Pick<
    Smooth3DSlideshowProps,
    | "cardWidth"
    | "cardHeight"
    | "radius"
    | "tilt"
    | "sideTilt"
    | "gap"
    | "opacity"
    | "autoplay"
    | "autoplayDirection"
    | "showTitle"
    | "titleColor"
  >
> = {
  cardWidth: 300,
  cardHeight: 400,
  radius: 3,
  tilt: 12,
  sideTilt: 8,
  gap: 8,
  opacity: 60,
  autoplay: true,
  autoplayDirection: "rightToLeft",
  showTitle: true,
  titleColor: "#ffffff",
};

const PERSPECTIVE = 1600;
const SCALE_STEP = 0.16;
const MAX_VISIBLE = 2;
const DEPTH = 240;

function transitionValues(
  transition: SlideshowTransition | undefined,
): { duration: number; delay: number; easing: string } {
  const duration =
    typeof transition?.duration === "number" ? transition.duration : 0.6;

  const delay =
    typeof transition?.delay === "number" ? transition.delay : 2.5;

  const ease = transition?.ease;

  if (
    Array.isArray(ease) &&
    ease.length === 4 &&
    ease.every((value) => typeof value === "number")
  ) {
    return {
      duration,
      delay,
      easing: `cubic-bezier(${ease.join(", ")})`,
    };
  }

  const easingMap: Record<string, string> = {
    linear: "linear",
    easeIn: "ease-in",
    easeOut: "ease-out",
    easeInOut: "ease-in-out",
  };

  return {
    duration,
    delay,
    easing:
      typeof ease === "string"
        ? (easingMap[ease] ?? ease)
        : "cubic-bezier(0.22, 1, 0.36, 1)",
  };
}

export default function Smooth3DSlideshow(
  props: Smooth3DSlideshowProps,
) {
  const {
    slides = DEFAULT_SLIDES,
    cardWidth = DEFAULT_PROPS.cardWidth,
    cardHeight = DEFAULT_PROPS.cardHeight,
    radius = DEFAULT_PROPS.radius,
    tilt = DEFAULT_PROPS.tilt,
    sideTilt = DEFAULT_PROPS.sideTilt,
    gap = DEFAULT_PROPS.gap,
    opacity = DEFAULT_PROPS.opacity,
    transition,
    autoplay = DEFAULT_PROPS.autoplay,
    autoplayDirection = DEFAULT_PROPS.autoplayDirection,
    showTitle = DEFAULT_PROPS.showTitle,
    titleFont,
    titleColor = DEFAULT_PROPS.titleColor,
    titlePosition,
    style,
  } = props;

  const list = slides.length > 0 ? slides : DEFAULT_SLIDES;
  const count = list.length;

  const [active, setActive] = useState(0);
  const lockedUntilRef = useRef(0);

  const safeActive =
    count > 0 ? ((active % count) + count) % count : 0;

  const { duration, delay, easing } = transitionValues(transition);

  const move = (direction: number): void => {
    if (count < 2) return;

    const now = Date.now();
    if (now < lockedUntilRef.current) return;

    lockedUntilRef.current =
      now + Math.max(50, Math.round(duration * 1000));

    setActive((current) => {
      const normalized =
        ((current % count) + count) % count;

      return (normalized + direction + count) % count;
    });
  };

  useEffect(() => {
    if (!autoplay || count < 2) {
      return undefined;
    }

    const direction =
      autoplayDirection === "leftToRight" ? -1 : 1;

    const intervalId = window.setInterval(() => {
      const now = Date.now();

      if (now >= lockedUntilRef.current) {
        lockedUntilRef.current =
          now + Math.max(50, Math.round(duration * 1000));

        setActive((current) => {
          const normalized =
            ((current % count) + count) % count;

          return (normalized + direction + count) % count;
        });
      }
    }, Math.max(300, delay * 1000));

    return () => window.clearInterval(intervalId);
  }, [
    autoplay,
    autoplayDirection,
    count,
    delay,
    duration,
  ]);

  const title = titlePosition ?? {};
  const corner: TitleCorner =
    title.position ?? "bottomRight";

  const isTop =
    corner === "topLeft" || corner === "topRight";

  const isRight =
    corner === "topRight" || corner === "bottomRight";

  const padLeft = title.paddingLeft ?? 22;
  const padRight = title.paddingRight ?? 22;
  const padTop = title.paddingTop ?? 24;
  const padBottom = title.paddingBottom ?? 24;

  const effectiveRadius =
    (Math.max(0, Math.min(20, radius)) / 20) *
    (Math.min(cardWidth, cardHeight) / 2);

  const inactiveOverlayOpacity =
    1 - Math.max(0, Math.min(100, opacity)) / 100;

  const rootStyle: CSSProperties = {
    ...style,
    position: "relative",
    width: "100%",
    height: "100%",
    minWidth: 320,
    minHeight: 360,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    perspective: `${PERSPECTIVE}px`,
    overflow: "hidden",
    outline: "none",
  };

  const transitionCss =
    `transform ${duration}s ${easing}, opacity ${duration}s ${easing}`;

  const handleKeyDown = (
    event: KeyboardEvent<HTMLDivElement>,
  ): void => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      move(1);
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      move(-1);
    }
  };

  return (
    <div
      style={rootStyle}
      tabIndex={0}
      role="group"
      aria-roledescription="carousel"
      aria-label="داستان‌های پیشنهادی"
      onKeyDown={handleKeyDown}
    >
      <div
        style={{
          position: "relative",
          width: cardWidth,
          height: cardHeight,
          transformStyle: "preserve-3d",
        }}
      >
        {list.map((slide, index) => {
          let relativeIndex = index - safeActive;

          if (relativeIndex > count / 2) {
            relativeIndex -= count;
          }

          if (relativeIndex < -count / 2) {
            relativeIndex += count;
          }

          const absoluteIndex = Math.abs(relativeIndex);
          const visible = absoluteIndex <= MAX_VISIBLE;
          const isActive = relativeIndex === 0;

          const scale = Math.max(
            0.4,
            1 - absoluteIndex * SCALE_STEP,
          );

          const translateX = relativeIndex * (gap * 30);
          const translateZ = -absoluteIndex * DEPTH;
          const rotateY = -relativeIndex * tilt;
          const rotateZ = relativeIndex * sideTilt;

          const cardStyle: CSSProperties = {
            position: "absolute",
            left: "50%",
            top: "50%",
            width: cardWidth,
            height: cardHeight,
            borderRadius: effectiveRadius,
            overflow: "hidden",
            transformStyle: "preserve-3d",
            transformOrigin: "center center",
            transform:
              `translate(-50%, -50%) translateX(${translateX}px) ` +
              `translateZ(${translateZ}px) rotateY(${rotateY}deg) ` +
              `rotateZ(${rotateZ}deg) scale(${scale})`,
            transition: transitionCss,
            opacity: visible ? 1 : 0,
            cursor:
              autoplay || isActive ? "default" : "pointer",
            pointerEvents:
              visible && !autoplay ? "auto" : "none",
            backgroundColor: "#1a1a1a",
          };

          return (
            <div
              key={`${slide.image?.src ?? "slide"}-${index}`}
              style={cardStyle}
              aria-label={slide.title}
              aria-hidden={!visible}
              onClick={() => {
                if (autoplay || isActive) return;

                const now = Date.now();

                if (now < lockedUntilRef.current) return;

                lockedUntilRef.current =
                  now +
                  Math.max(50, Math.round(duration * 1000));

                setActive(index);
              }}
            >
              {slide.image?.src ? (
                <img
                  src={slide.image.src}
                  srcSet={slide.image.srcSet}
                  alt={
                    slide.image.alt ??
                    slide.title ??
                    ""
                  }
                  draggable={false}
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                    userSelect: "none",
                  }}
                />
              ) : null}

              {showTitle && slide.title ? (
                <>
                  <div
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: isTop
                        ? "linear-gradient(0deg, rgba(0,0,0,0) 35%, rgba(0,0,0,0.7) 100%)"
                        : "linear-gradient(180deg, rgba(0,0,0,0) 35%, rgba(0,0,0,0.7) 100%)",
                      pointerEvents: "none",
                    }}
                  />

                  <div
                    style={{
                      position: "absolute",
                      left: padLeft,
                      right: padRight,
                      ...(isTop
                        ? { top: padTop }
                        : { bottom: padBottom }),
                      textAlign: isRight ? "right" : "left",
                      pointerEvents: "none",
                    }}
                  >
                    <span
                      style={{
                        color: titleColor,
                        fontSize: 28,
                        fontWeight: 700,
                        lineHeight: "1.1em",
                        letterSpacing: "-0.02em",
                        whiteSpace: "pre-line",
                        textShadow:
                          "0 2px 10px rgba(0,0,0,0.4)",
                        ...titleFont,
                      }}
                    >
                      {slide.title}
                    </span>
                  </div>
                </>
              ) : null}

              <div
                aria-hidden="true"
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "#000000",
                  opacity:
                    isActive
                      ? 0
                      : inactiveOverlayOpacity,
                  transition:
                    `opacity ${duration}s ${easing}`,
                  pointerEvents: "none",
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
