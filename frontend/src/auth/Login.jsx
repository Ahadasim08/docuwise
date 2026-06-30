import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import ParticleCanvas from "@/components/ui/ParticleCanvas";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] } }),
};

export default function Login({ onSignIn }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const result = await onSignIn(email, password);
    if (result?.error) setError(result.error.message);
    setLoading(false);
  };

  return (
    <div className="relative min-h-[100dvh] flex items-center justify-center px-4 overflow-hidden bg-[#080808]">
      <ParticleCanvas />

      {/* Vignette overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#080808]/60 via-transparent to-[#080808]/80 pointer-events-none" />

      <motion.div
        className="relative z-10 w-full max-w-xs"
        initial="hidden"
        animate="show"
      >
        {/* Wordmark */}
        <motion.div custom={0} variants={fadeUp} className="mb-10">
          <span className="text-[15px] font-semibold tracking-tight text-zinc-100">
            Docuwise
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          custom={1}
          variants={fadeUp}
          className="text-3xl font-semibold tracking-tight text-foreground mb-1"
        >
          Sign in
        </motion.h1>
        <motion.p custom={2} variants={fadeUp} className="text-sm text-muted-foreground mb-8">
          Access your document workspace.
        </motion.p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <motion.input
            custom={3}
            variants={fadeUp}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            className="w-full bg-white/[0.04] border border-white/10 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 focus:ring-0 rounded-md transition-colors"
          />
          <motion.input
            custom={4}
            variants={fadeUp}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            className="w-full bg-white/[0.04] border border-white/10 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 focus:ring-0 rounded-md transition-colors"
          />
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs text-destructive"
            >
              {error}
            </motion.p>
          )}
          <motion.div custom={5} variants={fadeUp}>
            <Button
              type="submit"
              disabled={loading}
              className="w-full mt-1 font-medium shadow-[0_0_20px_rgba(251,191,36,0.2)] hover:shadow-[0_0_28px_rgba(251,191,36,0.35)] transition-shadow"
            >
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </motion.div>
        </form>
      </motion.div>
    </div>
  );
}
