import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function CitationChip({ citation, filename }) {
  const label = citation.page_number
    ? `${filename} · p.${citation.page_number}`
    : citation.section
    ? `${filename} · ${citation.section}`
    : filename;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="secondary"
            className="text-xs cursor-default bg-accent/20 text-accent border border-accent/30 hover:bg-accent/30 transition-colors"
          >
            {label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="bg-card border-border text-foreground text-xs"
        >
          <p className="font-medium">{filename}</p>
          {citation.page_number && (
            <p className="text-muted-foreground">Page {citation.page_number}</p>
          )}
          {citation.section && (
            <p className="text-muted-foreground">Section: {citation.section}</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
