import { motion, useReducedMotion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import CitationChip from "./CitationChip";

const mdComponents = {
  h1: ({ children }) => <h1 className="text-base font-bold text-foreground mt-4 mb-2 first:mt-0">{children}</h1>,
  h2: ({ children }) => <h2 className="text-sm font-bold text-foreground mt-3 mb-1.5 first:mt-0">{children}</h2>,
  h3: ({ children }) => <h3 className="text-sm font-semibold text-foreground/90 mt-3 mb-1 first:mt-0">{children}</h3>,
  p:  ({ children }) => <p  className="text-sm text-foreground/85 leading-relaxed my-1.5 first:mt-0 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="my-2 space-y-1 pl-1">{children}</ul>,
  ol: ({ children }) => <ol className="my-2 space-y-1 pl-4 list-decimal">{children}</ol>,
  li: ({ children }) => (
    <li className="text-sm text-foreground/85 leading-relaxed flex gap-2">
      <span className="text-primary mt-1.5 shrink-0">▸</span>
      <span>{children}</span>
    </li>
  ),
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  em:     ({ children }) => <em className="italic text-foreground/80">{children}</em>,
  code:   ({ children }) => <code className="text-primary bg-primary/10 px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>,
  pre:    ({ children }) => <pre className="bg-muted rounded-lg p-3 my-2 overflow-x-auto text-xs">{children}</pre>,
  blockquote: ({ children }) => <blockquote className="border-l-2 border-primary/40 pl-3 my-2 text-foreground/70 italic">{children}</blockquote>,
  hr: () => <hr className="my-3 border-border" />,
};

export default function AssistantMessage({ content, citations, docMap = {} }) {
  const prefersReduced = useReducedMotion();
  return (
    <motion.div
      className="flex justify-start"
      initial={{ opacity: 0, x: prefersReduced ? 0 : -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: prefersReduced ? 0 : 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="max-w-[88%] space-y-3">
        <div className="py-0.5">
          <ReactMarkdown components={mdComponents}>{content}</ReactMarkdown>
        </div>
        {citations.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pl-4">
            {citations.map((c, i) => (
              <CitationChip
                key={i}
                citation={c}
                filename={docMap[c.document_id] || "Document"}
              />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
