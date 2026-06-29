from app.llm.factory import get_provider


def summarize_chunks(chunks: list[str]) -> str:
    """
    Summarize a list of chunks using map-reduce.

    - If 0 chunks: return empty string
    - If 1 chunk: single generate call
    - If 2+ chunks: map step (summarize each), reduce step (combine all)

    Args:
        chunks: List of text chunks to summarize

    Returns:
        Combined summary string
    """
    if not chunks:
        return ""

    provider = get_provider()

    if len(chunks) == 1:
        # Single chunk: direct summarization
        prompt = f"Summarize concisely:\n\n{chunks[0]}"
        return provider.generate(prompt)

    # Map step: summarize each chunk
    partials = []
    for chunk in chunks:
        prompt = f"Summarize:\n\n{chunk}"
        summary = provider.generate(prompt)
        partials.append(summary)

    # Reduce step: combine all summaries
    combined_text = "\n".join(partials)
    prompt = f"Combine these into one summary:\n\n{combined_text}"
    return provider.generate(prompt)
