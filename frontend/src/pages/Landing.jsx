import { motion, useReducedMotion } from "framer-motion";
import { FileSearch, ArrowRight } from "lucide-react";

function Reveal({ children, delay = 0, className = "" }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

function ProductPreview() {
  return (
    <div className="rounded-lg border border-[#242424] bg-[#141414] overflow-hidden select-none">
      <div className="px-5 py-5 space-y-5">
        <div className="flex justify-end">
          <p className="text-sm text-[#f5f5f5] text-right leading-relaxed">
            What was the net revenue in Q3 2024?
          </p>
        </div>
        <div className="flex justify-start">
          <div className="max-w-[88%] space-y-2.5">
            <p className="text-sm text-[#f5f5f5]/90 leading-relaxed">
              Net revenue for Q3 2024 was $4.2 billion, a 12% increase year-over-year. Growth was driven by enterprise subscriptions in the Americas.
            </p>
            <div className="flex flex-wrap gap-1.5">
              <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded bg-[#fabd23]/12 text-[#fabd23] border border-[#fabd23]/30">
                Q3-Report-2024.pdf &middot; p.7
              </span>
              <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded bg-[#fabd23]/12 text-[#fabd23] border border-[#fabd23]/30">
                Earnings-Summary.pdf &middot; p.2
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-[#242424] px-5 py-3">
        <div className="flex items-center gap-2 rounded-md border border-[#242424] bg-[#0a0a0a] px-3 py-2">
          <span className="flex-1 text-sm text-[#7b7b7b]/50">Ask another question&hellip;</span>
          <div className="w-6 h-6 rounded bg-[#fabd23] flex items-center justify-center flex-shrink-0">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <polyline points="19 12 12 5 5 12"/>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Landing({ onShowLogin }) {
  const reduced = useReducedMotion();

  return (
    <div className="min-h-[100dvh] bg-[#0a0a0a] text-[#f5f5f5]">

      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-[#1f1f1f] bg-[#0a0a0a]/95 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-[#fabd23] flex items-center justify-center flex-shrink-0">
              <FileSearch className="w-4 h-4 text-[#0a0a0a]" />
            </div>
            <span className="text-[15px] font-semibold tracking-tight">DocuWise</span>
          </div>
          <button
            onClick={onShowLogin}
            className="text-sm font-medium text-[#7b7b7b] hover:text-[#f5f5f5] transition-colors flex items-center gap-1.5"
          >
            Sign in <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-16 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center min-h-[calc(100dvh-64px)]">
        <div className="space-y-6">
          <motion.h1
            className="text-5xl lg:text-[3.5rem] font-semibold tracking-tight leading-[1.1]"
            initial={reduced ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            Ask your documents.<br />
            <span className="text-[#f5f5f5]/40">Get cited answers.</span>
          </motion.h1>
          <motion.p
            className="text-base text-[#7b7b7b] leading-relaxed max-w-sm"
            initial={reduced ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          >
            Upload PDFs, Word docs, and CSVs. Ask anything in plain English. Every answer cites its source.
          </motion.p>
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <button
              onClick={onShowLogin}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#fabd23] text-[#0a0a0a] text-sm font-semibold rounded-md hover:bg-[#fbc84a] active:scale-[0.98] transition-[background-color,transform] duration-150"
            >
              Sign in to your archive <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        </div>

        <motion.div
          className="hidden lg:block"
          initial={reduced ? false : { opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        >
          <ProductPreview />
        </motion.div>
      </section>

      {/* How it works */}
      <section className="border-t border-[#1f1f1f] py-20">
        <div className="max-w-5xl mx-auto px-6">
          <Reveal>
            <h2 className="text-2xl font-semibold tracking-tight mb-12 text-center">
              From upload to answer in seconds.
            </h2>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[#1f1f1f]">
            {[
              {
                step: "01",
                heading: "Upload your files",
                body: "PDF, Word, or CSV. Up to 20 MB per file. Stored privately in your Supabase instance.",
              },
              {
                step: "02",
                heading: "Ask in plain English",
                body: "Type any question. The AI searches across all your documents simultaneously.",
              },
              {
                step: "03",
                heading: "Verify the source",
                body: "Every answer shows which document and page it came from. Confirm before you act.",
              },
            ].map((item, i) => (
              <Reveal key={item.step} delay={i * 0.07} className="bg-[#0a0a0a] px-6 py-8">
                <span className="block text-xs font-medium text-[#fabd23] mb-4">{item.step}</span>
                <h3 className="text-base font-semibold text-[#f5f5f5] mb-2">{item.heading}</h3>
                <p className="text-sm text-[#7b7b7b] leading-relaxed">{item.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-[#1f1f1f]">
            <Reveal className="bg-[#0a0a0a] px-8 py-10 lg:row-span-2 flex flex-col justify-between gap-8">
              <div>
                <h3 className="text-xl font-semibold tracking-tight mb-3">Private by design.</h3>
                <p className="text-sm text-[#7b7b7b] leading-relaxed max-w-xs">
                  Your files never leave your infrastructure. DocuWise runs entirely on your Supabase instance. No third-party indexing, no shared embeddings, no data residency concerns.
                </p>
              </div>
              <div className="rounded-md border border-[#242424] bg-[#141414] px-4 py-3">
                <p className="text-xs font-medium text-[#7b7b7b] mb-2.5">Runs on your stack</p>
                <div className="flex flex-wrap gap-2">
                  {["Supabase", "pgvector", "FastAPI", "Gemini"].map((t) => (
                    <span key={t} className="text-xs px-2 py-0.5 rounded border border-[#242424] text-[#7b7b7b]">{t}</span>
                  ))}
                </div>
              </div>
            </Reveal>
            <Reveal delay={0.05} className="bg-[#0a0a0a] px-8 py-8">
              <h3 className="text-base font-semibold mb-2">Citations, not guesses.</h3>
              <p className="text-sm text-[#7b7b7b] leading-relaxed">
                The AI never paraphrases without telling you where it read it. Amber citation chips appear on every answer, pointing to the exact document and page.
              </p>
            </Reveal>
            <Reveal delay={0.1} className="bg-[#0a0a0a] px-8 py-8">
              <h3 className="text-base font-semibold mb-2">Sessions your team can revisit.</h3>
              <p className="text-sm text-[#7b7b7b] leading-relaxed">
                Conversations are saved. Start a session for a project, return to it later, pick up where you left off.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-[#1f1f1f] py-24">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <Reveal>
            <h2 className="text-4xl font-semibold tracking-tight mb-3">
              Your team's private archive.
            </h2>
            <p className="text-sm text-[#7b7b7b] mb-8 max-w-xs mx-auto">
              One login away. Your files, your questions, your answers.
            </p>
            <button
              onClick={onShowLogin}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#fabd23] text-[#0a0a0a] text-sm font-semibold rounded-md hover:bg-[#fbc84a] active:scale-[0.98] transition-[background-color,transform] duration-150"
            >
              Sign in <ArrowRight className="w-4 h-4" />
            </button>
          </Reveal>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1f1f1f] py-6">
        <div className="max-w-5xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-[#fabd23] flex items-center justify-center flex-shrink-0">
              <FileSearch className="w-3 h-3 text-[#0a0a0a]" />
            </div>
            <span className="text-sm font-medium text-[#7b7b7b]">DocuWise</span>
          </div>
          <p className="text-xs text-[#7b7b7b]/60">Private AI document Q&amp;A</p>
        </div>
      </footer>
    </div>
  );
}
