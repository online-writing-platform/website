import { useMemo } from "react";

import { getChapterReaderHtml } from "../lib/chapter-content";

interface RichTextContentProps {
  className?: string;
  content: string;
}

export default function RichTextContent({
  className,
  content,
}: RichTextContentProps) {
  const richTextHtml = useMemo(() => getChapterReaderHtml(content), [content]);

  if (richTextHtml !== null) {
    return (
      <div
        className={className}
        dangerouslySetInnerHTML={{ __html: richTextHtml }}
      />
    );
  }

  return (
    <div className={className}>
      {content.split(/\n{2,}/u).map((paragraph, index) => (
        <p key={`${index}-${paragraph.slice(0, 24)}`}>{paragraph}</p>
      ))}
    </div>
  );
}
