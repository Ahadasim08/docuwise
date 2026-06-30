// frontend/src/components/TopBar.jsx
import { Menu, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TopBar({ sessionTitle, onMenuClick, onSignOut }) {
  return (
    <header className="h-12 border-b border-border bg-background/95 backdrop-blur-sm flex items-center px-4 gap-3 sticky top-0 z-10">
      <Button variant="ghost" size="icon" onClick={onMenuClick} className="h-8 w-8">
        <Menu className="h-4 w-4" />
      </Button>
      <span className="text-sm font-medium text-foreground flex-1 truncate">{sessionTitle}</span>
      <Button variant="ghost" size="icon" onClick={onSignOut} className="h-8 w-8">
        <LogOut className="h-4 w-4 text-muted-foreground" />
      </Button>
    </header>
  );
}
