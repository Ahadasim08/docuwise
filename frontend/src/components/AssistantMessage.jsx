import CitationChip from "./CitationChip";

export default function AssistantMessage({ content, citations, docMap = {} }) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] space-y-2">
        <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-2.5">
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
            {content}
          </p>
        </div>
        {citations.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-1">
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
    </div>
  );
}
