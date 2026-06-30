import { Menu, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TopBar({ sessionTitle, onMenuClick, onSignOut }) {
  return (
    <header className="h-11 border-b border-border bg-background flex items-center px-3 gap-2 sticky top-0 z-10">
      <Button variant="ghost" size="icon" onClick={onMenuClick} className="h-7 w-7 shrink-0">
        <Menu className="h-3.5 w-3.5" />
      </Button>
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="text-xs font-medium text-foreground/80 truncate">{sessionTitle}</span>
      </div>
      <Button variant="ghost" size="icon" onClick={onSignOut} className="h-7 w-7 shrink-0">
        <LogOut className="h-3.5 w-3.5 text-muted-foreground" />
      </Button>
    </header>
  );
}
