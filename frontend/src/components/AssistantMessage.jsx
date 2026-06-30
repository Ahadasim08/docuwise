import { motion } from "framer-motion";
import CitationChip from "./CitationChip";

export default function AssistantMessage({ content, citations, docMap = {} }) {
  return (
    <motion.div
      className="flex justify-start"
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="max-w-[88%] space-y-3">
        <div className="border-l-2 border-primary/30 pl-4 py-0.5">
          <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
            {content}
          </p>
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
