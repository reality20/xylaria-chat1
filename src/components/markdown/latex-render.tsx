'use client';

import { useEffect, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface LatexRenderProps {
  content: string;
  display?: boolean;
}

export function LatexRender({ content, display = false }: LatexRenderProps) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (ref.current) {
      try {
        katex.render(content, ref.current, {
          displayMode: display,
          throwOnError: false,
          strict: false,
          trust: true,
        });
      } catch {
        ref.current.textContent = content;
      }
    }
  }, [content, display]);

  if (display) {
    return <div ref={ref as React.RefObject<HTMLDivElement>} className="my-3 overflow-x-auto" />;
  }
  return <span ref={ref} />;
}
