'use client';

import { useMemo } from 'react';
import { LatexRender } from './latex-render';

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const rendered = useMemo(() => {
    if (!content) return null;

    // Pre-process: extract LaTeX blocks
    let processed = content;
    const latexBlocks: Array<{ id: string; latex: string; display: boolean }> = [];
    let latexCounter = 0;

    // Display math: $$...$$ or \[...\]
    processed = processed.replace(/\$\$([\s\S]*?)\$\$/g, (_match, latex) => {
      const id = `LATEX_BLOCK_${latexCounter++}`;
      latexBlocks.push({ id, latex: latex.trim(), display: true });
      return id;
    });
    processed = processed.replace(/\\\[([\s\S]*?)\\\]/g, (_match, latex) => {
      const id = `LATEX_BLOCK_${latexCounter++}`;
      latexBlocks.push({ id, latex: latex.trim(), display: true });
      return id;
    });

    // Inline math: $...$ or \(...\)
    processed = processed.replace(/(?<!\$)\$(?!\$)(.+?)(?<!\$)\$(?!\$)/g, (_match, latex) => {
      const id = `LATEX_INLINE_${latexCounter++}`;
      latexBlocks.push({ id, latex: latex.trim(), display: false });
      return id;
    });
    processed = processed.replace(/\\\((.+?)\\\)/g, (_match, latex) => {
      const id = `LATEX_INLINE_${latexCounter++}`;
      latexBlocks.push({ id, latex: latex.trim(), display: false });
      return id;
    });

    // Split by code blocks
    const parts: Array<{
      type: 'text' | 'code';
      content: string;
      language?: string;
    }> = [];

    const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(processed)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: 'text', content: processed.slice(lastIndex, match.index) });
      }
      parts.push({
        type: 'code',
        language: match[1] || 'text',
        content: match[2],
      });
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < processed.length) {
      parts.push({ type: 'text', content: processed.slice(lastIndex) });
    }

    if (parts.length === 0 && processed) {
      parts.push({ type: 'text', content: processed });
    }

    return parts.map((part, i) => {
      if (part.type === 'code') {
        return (
          <div key={i} className="my-3 overflow-hidden rounded-lg border border-border bg-[#1e1e1e]">
            {part.language && (
              <div className="flex items-center justify-between border-b border-white/10 bg-black/30 px-4 py-1.5">
                <span className="text-[11px] font-medium text-white/50 uppercase">{part.language}</span>
                <button
                  onClick={() => navigator.clipboard.writeText(part.content)}
                  className="text-[11px] text-white/40 transition-colors hover:text-white/80"
                >
                  Copy
                </button>
              </div>
            )}
            <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed">
              <code className="font-mono text-[13px] text-[#d4d4d4]">
                <SyntaxHighlighted code={part.content} language={part.language || 'text'} />
              </code>
            </pre>
          </div>
        );
      }

      // Process text part with inline elements
      return (
        <div key={i} className="text-[14px] leading-relaxed">
          <TextBlock content={part.content} latexBlocks={latexBlocks} />
        </div>
      );
    });
  }, [content]);

  return <div className="max-w-none">{rendered}</div>;
}

function TextBlock({
  content,
  latexBlocks,
}: {
  content: string;
  latexBlocks: Array<{ id: string; latex: string; display: boolean }>;
}) {
  // Replace latex placeholders with actual renders
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let inList = false;
  let listItems: React.ReactNode[] = [];
  let isOrdered = false;

  const flushList = () => {
    if (listItems.length > 0) {
      if (isOrdered) {
        elements.push(
          <ol key={`ol-${elements.length}`} className="my-2 ml-5 list-decimal space-y-1 text-[14px]">
            {listItems}
          </ol>
        );
      } else {
        elements.push(
          <ul key={`ul-${elements.length}`} className="my-2 ml-5 list-disc space-y-1 text-[14px]">
            {listItems}
          </ul>
        );
      }
      listItems = [];
      inList = false;
    }
  };

  const processInline = (text: string): React.ReactNode => {
    // Check for latex placeholders
    const latexRegex = /LATEX_(BLOCK|INLINE)_\d+/g;
    const parts: React.ReactNode[] = [];
    let lastIdx = 0;
    let match: RegExpExecArray | null;

    while ((match = latexRegex.exec(text)) !== null) {
      const m = match as RegExpExecArray;
      if (m.index > lastIdx) {
        parts.push(<span key={`t-${lastIdx}`}>{renderInlineMarkdown(text.slice(lastIdx, m.index))}</span>);
      }
      const block = latexBlocks.find((b) => b.id === m[0]);
      if (block) {
        parts.push(<LatexRender key={m[0]} content={block.latex} display={block.display} />);
      }
      lastIdx = m.index + m[0].length;
    }

    if (lastIdx < text.length) {
      parts.push(<span key={`t-${lastIdx}`}>{renderInlineMarkdown(text.slice(lastIdx))}</span>);
    }

    if (parts.length === 0) return renderInlineMarkdown(text);
    return <>{parts}</>;
  };

  lines.forEach((line, idx) => {
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    const unorderedMatch = line.match(/^(?:[-*+])\s+(.+)$/);
    const orderedMatch = line.match(/^\d+\.\s+(.+)$/);
    const blockquoteMatch = line.match(/^>\s?(.+)$/);
    const hrMatch = line.match(/^---+$/);

    if (hrMatch) {
      flushList();
      elements.push(<hr key={`hr-${idx}`} className="my-4 border-border" />);
    } else if (headingMatch) {
      flushList();
      const level = headingMatch[1].length;
      const sizes: Record<number, string> = {
        1: 'text-2xl font-bold mt-6 mb-3',
        2: 'text-xl font-semibold mt-5 mb-2',
        3: 'text-lg font-semibold mt-4 mb-2',
        4: 'text-base font-medium mt-3 mb-1',
        5: 'text-sm font-medium mt-2 mb-1',
        6: 'text-xs font-medium mt-2 mb-1',
      };
      elements.push(
        <div key={`h-${idx}`} className={`${sizes[level]} text-foreground`}>
          {processInline(headingMatch[2])}
        </div>
      );
    } else if (unorderedMatch) {
      if (inList && isOrdered) flushList();
      inList = true;
      isOrdered = false;
      listItems.push(
        <li key={`li-${idx}`}>{processInline(unorderedMatch[1])}</li>
      );
    } else if (orderedMatch) {
      if (inList && !isOrdered) flushList();
      inList = true;
      isOrdered = true;
      listItems.push(
        <li key={`li-${idx}`}>{processInline(orderedMatch[1])}</li>
      );
    } else if (blockquoteMatch) {
      flushList();
      elements.push(
        <blockquote
          key={`bq-${idx}`}
          className="my-2 border-l-2 border-primary/30 pl-4 text-muted-foreground italic"
        >
          {processInline(blockquoteMatch[1])}
        </blockquote>
      );
    } else if (line.trim() === '') {
      flushList();
    } else {
      flushList();
      elements.push(
        <p key={`p-${idx}`} className="my-2 text-[14px] leading-relaxed text-foreground/90">
          {processInline(line)}
        </p>
      );
    }
  });

  flushList();

  return <>{elements}</>;
}

function renderInlineMarkdown(text: string): React.ReactNode {
  if (!text) return null;

  const parts: Array<
    | { type: 'text'; content: string }
    | { type: 'bold'; content: string }
    | { type: 'italic'; content: string }
    | { type: 'code'; content: string }
    | { type: 'link'; content: string; url: string }
    | { type: 'strikethrough'; content: string }
  > = [];

  const regex =
    /(\*\*(.+?)\*\*|__(.+?)__|\*(.+?)\*|_(.+?)_|`(.+?)`|\[(.+?)\]\((.+?)\)|~~(.+?)~~)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }

    if (match[2] || match[3]) {
      parts.push({ type: 'bold', content: match[2] || match[3] });
    } else if (match[4] || match[5]) {
      parts.push({ type: 'italic', content: match[4] || match[5] });
    } else if (match[6]) {
      parts.push({ type: 'code', content: match[6] });
    } else if (match[7] && match[8]) {
      parts.push({ type: 'link', content: match[7], url: match[8] });
    } else if (match[9]) {
      parts.push({ type: 'strikethrough', content: match[9] });
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.slice(lastIndex) });
  }

  if (parts.length === 0) return text;

  return parts.map((part, i) => {
    switch (part.type) {
      case 'bold':
        return (
          <strong key={i} className="font-semibold text-foreground">
            {part.content}
          </strong>
        );
      case 'italic':
        return (
          <em key={i} className="italic text-foreground/80">
            {part.content}
          </em>
        );
      case 'code':
        return (
          <code
            key={i}
            className="rounded bg-muted px-1.5 py-0.5 font-mono text-[12px] text-foreground"
          >
            {part.content}
          </code>
        );
      case 'link':
        return (
          <a
            key={i}
            href={part.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline transition-colors hover:text-primary/80"
          >
            {part.content}
          </a>
        );
      case 'strikethrough':
        return (
          <del key={i} className="text-muted-foreground line-through">
            {part.content}
          </del>
        );
      default:
        return <span key={i}>{part.content}</span>;
    }
  });
}

// Simple syntax highlighting
function SyntaxHighlighted({ code, language }: { code: string; language: string }) {
  const highlighted = useMemo(() => {
    // Keywords for common languages
    const keywords: Record<string, string> = {
      javascript:
        'const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|new|this|class|extends|import|export|from|default|async|await|try|catch|finally|throw|typeof|instanceof|in|of|yield|void|delete|true|false|null|undefined|static|get|set|constructor|super',
      typescript:
        'const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|new|this|class|extends|import|export|from|default|async|await|try|catch|finally|throw|typeof|instanceof|in|of|yield|void|delete|true|false|null|undefined|static|get|set|constructor|super|interface|type|enum|implements|declare|namespace|module|readonly|abstract|as|satisfies|infer|keyof|never|unknown|any|string|number|boolean|object|symbol|bigint',
      python:
        'def|class|return|if|elif|else|for|while|break|continue|pass|try|except|finally|raise|import|from|as|with|yield|lambda|and|or|not|in|is|None|True|False|global|nonlocal|assert|del|print|len|range|enumerate|zip|map|filter',
      java:
        'public|private|protected|static|final|abstract|class|interface|extends|implements|return|if|else|for|while|do|switch|case|break|continue|new|this|super|try|catch|finally|throw|import|package|void|int|long|double|float|boolean|char|byte|short|String|true|false|null',
      c: 'int|char|float|double|void|if|else|for|while|do|switch|case|break|continue|return|struct|union|typedef|enum|const|static|extern|sizeof|goto|default|register|volatile|signed|unsigned|short|long|auto|inline|restrict',
      cpp: 'int|char|float|double|void|if|else|for|while|do|switch|case|break|continue|return|struct|union|typedef|enum|const|static|extern|sizeof|goto|default|class|public|private|protected|virtual|template|typename|namespace|using|new|delete|this|operator|friend|inline|explicit|override|final|nullptr|constexpr|auto|decltype|noexcept|try|catch|throw',
      go: 'package|import|func|return|if|else|for|range|switch|case|break|continue|default|type|struct|interface|map|chan|go|defer|panic|recover|select|const|var|fallthrough|goto|nil|true|false|iota|make|new|len|cap|append|copy|close|delete|complex|real|imag',
      rust: 'fn|let|mut|const|static|if|else|match|for|while|loop|break|continue|return|struct|enum|trait|impl|pub|use|mod|crate|self|super|where|unsafe|async|await|move|ref|type|dyn|Box|Vec|String|Option|Result|Some|None|Ok|Err|true|false',
      html: 'div|span|p|a|img|br|hr|h1|h2|h3|h4|h5|h6|ul|ol|li|table|tr|td|th|thead|tbody|form|input|button|select|option|textarea|label|script|style|link|meta|head|body|html|title|nav|header|footer|section|article|aside|main|figure|figcaption|details|summary|dialog|template|slot',
      css: 'color|background|border|margin|padding|width|height|display|position|top|left|right|bottom|font|text|align|flex|grid|transform|transition|animation|opacity|overflow|z-index|cursor|pointer|hover|focus|active|before|after|important|none|auto|hidden|visible|absolute|relative|fixed|sticky|block|inline|contents',
      bash: 'if|then|else|elif|fi|for|while|do|done|case|esac|function|return|exit|echo|printf|read|source|export|unset|alias|unalias|true|false|test|grep|sed|awk|cat|ls|cd|pwd|mkdir|rm|cp|mv|chmod|chown|find|sort|uniq|head|tail|wc|cut|tr|xargs|curl|wget|ssh|scp',
      json: 'true|false|null',
      sql: 'SELECT|INSERT|UPDATE|DELETE|FROM|WHERE|AND|OR|NOT|IN|BETWEEN|LIKE|IS|NULL|JOIN|LEFT|RIGHT|INNER|OUTER|ON|GROUP|BY|HAVING|ORDER|LIMIT|OFFSET|AS|DISTINCT|COUNT|SUM|AVG|MIN|MAX|CREATE|TABLE|ALTER|DROP|INDEX|VIEW|TRIGGER|PROCEDURE|FUNCTION|DATABASE|SCHEMA|VALUES|INTO|SET|UNION|ALL|EXISTS|CASE|WHEN|THEN|ELSE|END|CAST|CONVERT|PRIMARY|KEY|FOREIGN|REFERENCES|CONSTRAINT|DEFAULT|AUTO_INCREMENT|UNIQUE|CHECK|CASCADE',
    };

    const langKey = language.toLowerCase();
    const keywordStr = keywords[langKey] || keywords.javascript;
    const keywordRegex = new RegExp(
      `\\b(${keywordStr})\\b`,
      'g'
    );

    // Tokenize and color
    let result = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Strings
    result = result.replace(
      /(&quot;.*?&quot;|&#039;.*?&#039;|`[\s\S]*?`)/g,
      '<span style="color:#ce9178">$1</span>'
    );

    // Keywords
    result = result.replace(
      keywordRegex,
      '<span style="color:#569cd6">$1</span>'
    );

    // Comments
    result = result.replace(
      /(\/\/.*$|\/\*[\s\S]*?\*\/|#.*$|--.*$)/gm,
      '<span style="color:#6a9955">$1</span>'
    );

    // Numbers
    result = result.replace(
      /\b(\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b/g,
      '<span style="color:#b5cea8">$1</span>'
    );

    // Functions
    result = result.replace(
      /(\w+)(\()/g,
      '<span style="color:#dcdcaa">$1</span>$2'
    );

    return result;
  }, [code, language]);

  return (
    <span dangerouslySetInnerHTML={{ __html: highlighted }} />
  );
}
