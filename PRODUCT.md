# Product

## Users

Internal knowledge workers — employees, analysts, ops teams — who need fast, trustworthy answers from documents they already own. They're in a work context: time-pressured, results-oriented, skeptical of AI hallucinations. The primary job is **get a reliable answer with a traceable source**, not explore or browse. They upload files once, then query repeatedly across a session.

## Product Purpose

DocuWise is a private document Q&A tool: upload PDFs, Word docs, and CSVs, ask questions in plain English, get cited answers with source references. It replaces the "search the folder, open the file, skim for the answer" workflow with a single conversation. Success means the user trusts the answer and can verify it in seconds.

A marketing landing page exists alongside the product; the primary design focus is the app UI.

## Brand Personality

**Calm, precise, capable.** The tool does serious work without performing seriousness. Three words: *Trustworthy · Refined · Unhurried.*

Emotional goals: confidence that the answer is grounded; relief that the search is over; clarity that citations are real and checkable.

## Anti-references

- **ChatGPT / generic AI chatbot UI** — bubbly, conversational chrome, oversized send buttons, excessive whitespace, the "talking to a chatbot" feel. DocuWise is a precision instrument, not a chat client.
- **Enterprise SaaS defaults** — gradient hero cards, sidebar with 14 items, blue-on-white color scheme, icon-label pairs everywhere. Looks like an HR tool, not a sharp internal utility.
- **Basic SaaS dashboard** — KPI cards at top, table below, sidebar with logo. The metric-grid template. Documents are the product, not data widgets.

## Design Principles

1. **Citations are first-class.** The source reference is as important as the answer — never demote it to a footnote.
2. **Quiet confidence.** The UI doesn't announce itself. It loads fast, responds immediately, and gets out of the way.
3. **Clarity over chrome.** Every element earns its space. If it doesn't help the user find or verify an answer, it's noise.
4. **Predictable structure, surprising content.** The layout never shifts; the AI's answer might. Lock the frame; let the content breathe.
5. **Precision at every scale.** From file selection to streaming tokens — each interaction should feel intentional and exact, never flabby or vague.

## Accessibility & Inclusion

WCAG AA. Keyboard-navigable throughout. Streaming text must not cause focus loss. Document selection accessible via keyboard. No time limits on any interaction. Reduced-motion alternatives for all animations (Framer Motion's `useReducedMotion` hook).
