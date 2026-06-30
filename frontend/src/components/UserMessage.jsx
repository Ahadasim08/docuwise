export default function UserMessage({ content }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] bg-accent/20 border border-accent/30 rounded-2xl rounded-tr-sm px-4 py-2.5">
        <p className="text-sm text-foreground">{content}</p>
      </div>
    </div>
  );
}
