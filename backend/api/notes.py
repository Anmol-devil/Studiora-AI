from fastapi import APIRouter, Header
from state import get_session_state
from models.llm import _generation_stream

router = APIRouter()

@router.post("/api/notes")
def generate_notes_route(x_session_id: str = Header(None)):
    state = get_session_state(x_session_id)
    text = state["combined_text"]
    prompt = f"""
You are an expert teacher.
Create study notes from this document.
Include:
1. Key Concepts
2. Important Definitions in details. Each Definitions in 2-3 lines.
3. Important Formulas
4. Interview Questions
5. Exam Questions
6. Quick Revision Notes
Document:
{text[:20000]}
"""
    return _generation_stream([{"role": "user", "content": prompt}], "notes", state)
