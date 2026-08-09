import { useEffect } from "react";

interface DocumentMetaInput {
  title: string;
  description?: string;
  canonicalPath?: string;
  image?: string;
}

function setMeta(property: string, content: string, useProperty = false) {
  const selector = useProperty
    ? `meta[property="${property}"]`
    : `meta[name="${property}"]`;

  let element = document.head.querySelector<HTMLMetaElement>(selector);

  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(useProperty ? "property" : "name", property);
    document.head.append(element);
  }

  element.content = content;
}

export function useDocumentMeta({
  title,
  description,
  canonicalPath,
  image,
}: DocumentMetaInput): void {
  useEffect(() => {
    document.title = title;

    setMeta(
      "description",
      description ?? "پلتفرم خواندن و نوشتن داستان",
    );
    setMeta("og:title", title, true);
    setMeta(
      "og:description",
      description ?? "پلتفرم خواندن و نوشتن داستان",
      true,
    );
    setMeta("og:type", "website", true);

    if (image) {
      setMeta("og:image", image, true);
    }

    if (canonicalPath) {
      const url = new URL(canonicalPath, window.location.origin).toString();
      setMeta("og:url", url, true);

      let canonical =
        document.head.querySelector<HTMLLinkElement>(
          'link[rel="canonical"]',
        );
      if (!canonical) {
        canonical = document.createElement("link");
        canonical.rel = "canonical";
        document.head.append(canonical);
      }
      canonical.href = url;
    }
  }, [canonicalPath, description, image, title]);
}
