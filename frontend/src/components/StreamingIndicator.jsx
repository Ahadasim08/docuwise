export default function StreamingIndicator() {
  return (
    <div className="flex justify-start mt-2">
      <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1.5 items-center">
        <span className="h-1.5 w-1.5 rounded-full bg-accent animate-bounce" />
        <span className="h-1.5 w-1.5 rounded-full bg-accent animate-bounce [animation-delay:150ms]" />
        <span className="h-1.5 w-1.5 rounded-full bg-accent animate-bounce [animation-delay:300ms]" />
      </div>
    </div>
  );
}
