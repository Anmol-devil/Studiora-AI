from fastapi import APIRouter, Header
from state import get_session_state
from models.llm import _generation_stream

router = APIRouter()

@router.post("/api/flashcards")
def generate_flashcards_route(x_session_id: str = Header(None)):
    state = get_session_state(x_session_id)
    text = state["combined_text"]
    prompt = f"""
You are a document-grounded flashcard generator.

Generate flashcards ONLY from the provided document.

Rules:
1. Use only information explicitly present in the document.
2. Create concise Question → Answer pairs.
3. Each flashcard should test a unique concept.
4. Do not generate duplicate flashcards.
5. Generate between 15 and 20 flashcards depending on the amount of information available.
6. Answers should be short (1-3 sentences).
7. Prefer definitions, processes, causes, purposes, advantages, and comparisons.

Output Format:

Flashcard 1
Front: ...
Back: ...

Flashcard 2
Front: ...
Back: ...
Document
{text[:20000]}
"""
    return _generation_stream([{"role": "user", "content": prompt}], "flashcards", state)
