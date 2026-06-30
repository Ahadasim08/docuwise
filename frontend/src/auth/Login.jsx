import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import ParticleCanvas from "@/components/ui/ParticleCanvas";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] } }),
};

export default function Login({ onSignIn, onSignUp }) {
  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const switchMode = (next) => {
    setMode(next);
    setError("");
    setInfo("");
    setPassword("");
    setConfirmPassword("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");

    if (mode === "signup" && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    if (mode === "signin") {
      const result = await onSignIn(email, password);
      if (result?.error) setError(result.error.message);
    } else {
      const result = await onSignUp(email, password);
      if (result?.error) {
        setError(result.error.message);
      } else {
        setInfo("Account created! Check your email to confirm, then sign in.");
        switchMode("signin");
      }
    }
    setLoading(false);
  };

  const isSignup = mode === "signup";

  return (
    <div className="relative min-h-[100dvh] flex items-center justify-center px-4 overflow-hidden bg-[#080808]">
      <ParticleCanvas />
      <div className="absolute inset-0 bg-gradient-to-b from-[#080808]/60 via-transparent to-[#080808]/80 pointer-events-none" />

      <motion.div className="relative z-10 w-full max-w-xs" initial="hidden" animate="show">
        <motion.div custom={0} variants={fadeUp} className="mb-10">
          <span className="text-[15px] font-semibold tracking-tight text-zinc-100">Docuwise</span>
        </motion.div>

        <motion.h1 custom={1} variants={fadeUp} className="text-3xl font-semibold tracking-tight text-foreground mb-1">
          {isSignup ? "Create account" : "Sign in"}
        </motion.h1>
        <motion.p custom={2} variants={fadeUp} className="text-sm text-muted-foreground mb-8">
          {isSignup ? "Start your document workspace." : "Access your document workspace."}
        </motion.p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <motion.input
            custom={3} variants={fadeUp}
            type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="Email" required
            className="w-full bg-white/[0.04] border border-white/10 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 rounded-md transition-colors"
          />
          <motion.input
            custom={4} variants={fadeUp}
            type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="Password" required
            className="w-full bg-white/[0.04] border border-white/10 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 rounded-md transition-colors"
          />
          {isSignup && (
            <motion.input
              custom={5} variants={fadeUp}
              type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm password" required
              className="w-full bg-white/[0.04] border border-white/10 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 rounded-md transition-colors"
            />
          )}

          {error && (
            <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-xs text-destructive">
              {error}
            </motion.p>
          )}
          {info && (
            <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-xs text-primary">
              {info}
            </motion.p>
          )}

          <motion.div custom={6} variants={fadeUp}>
            <Button
              type="submit" disabled={loading}
              className="w-full mt-1 font-medium shadow-[0_0_20px_rgba(251,191,36,0.2)] hover:shadow-[0_0_28px_rgba(251,191,36,0.35)] transition-shadow"
            >
              {loading ? (isSignup ? "Creating…" : "Signing in…") : (isSignup ? "Create account" : "Sign in")}
            </Button>
          </motion.div>

          <motion.p custom={7} variants={fadeUp} className="text-center text-xs text-muted-foreground pt-1">
            {isSignup ? "Already have an account? " : "Don't have an account? "}
            <button
              type="button"
              onClick={() => switchMode(isSignup ? "signin" : "signup")}
              className="text-primary hover:underline"
            >
              {isSignup ? "Sign in" : "Sign up"}
            </button>
          </motion.p>
        </form>
      </motion.div>
    </div>
  );
}
