import { motion, useReducedMotion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import CitationChip from "./CitationChip";

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
        <div className="py-0.5 prose prose-sm prose-invert max-w-none
          prose-p:text-foreground/90 prose-p:leading-relaxed prose-p:my-1.5
          prose-headings:text-foreground prose-headings:font-semibold prose-headings:mt-4 prose-headings:mb-1.5
          prose-strong:text-foreground prose-strong:font-semibold
          prose-ul:my-1.5 prose-ul:pl-4 prose-li:my-0.5 prose-li:text-foreground/90
          prose-ol:my-1.5 prose-ol:pl-4
          prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1 prose-code:rounded prose-code:text-xs
          prose-pre:bg-muted prose-pre:rounded-lg prose-pre:text-xs">
          <ReactMarkdown>{content}</ReactMarkdown>
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
