import { motion } from "framer-motion";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function EmptyState({ onNewSession }) {
  return (
    <motion.div
      className="flex-1 flex flex-col items-center justify-center gap-5 text-center p-8"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="h-12 w-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
        <FileText className="h-5 w-5 text-primary" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">No session selected</p>
        <p className="text-xs text-muted-foreground leading-relaxed max-w-[200px]">
          Start a new session to ask questions about your documents
        </p>
      </div>
      <Button onClick={onNewSession} size="sm" className="shadow-[0_0_16px_rgba(251,191,36,0.2)]">
        New session
      </Button>
    </motion.div>
  );
}
