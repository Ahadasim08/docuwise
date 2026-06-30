import { motion } from "framer-motion";

export default function UserMessage({ content }) {
  return (
    <motion.div
      className="flex justify-end"
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="max-w-[75%] border-r-2 border-primary/50 pr-4 py-0.5">
        <p className="text-sm text-foreground text-right leading-relaxed">{content}</p>
      </div>
    </motion.div>
  );
}
