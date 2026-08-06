export interface CoverflowItem {
  id: number;

  image: string;

  title: string;

  subtitle?: string;

  href?: string;
}

export interface CoverflowProps {
  items: CoverflowItem[];

  autoplay?: boolean;

  autoplayDelay?: number;

  loop?: boolean;

  showTitles?: boolean;

  keyboardNavigation?: boolean;

  perspective?: number;

  spacing?: number;

  rotate?: number;

  scale?: number;

  className?: string;
}
