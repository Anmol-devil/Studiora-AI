from fastapi import APIRouter, Header
from state import get_session_state
from models.llm import _generation_stream

router = APIRouter()

@router.post("/api/mcqs")
def generate_mcqs_route(x_session_id: str = Header(None)):
    state = get_session_state(x_session_id)
    text = state["combined_text"]
    system_prompt = """You are a document-grounded MCQ generator.

Generate ONLY questions whose answers appear explicitly in the provided document.

RULES:

1. First identify key facts from the document.
2. Use each fact only once.
3. Do not create two questions about the same concept.
4. If fewer than 10 unique facts exist, generate fewer questions.
5. Never use external knowledge.
6. The correct answer must be directly supported by the document.
7. Distractors must be plausible but contradicted by the document.
8. Avoid yes/no questions.
9. Avoid repeating terms already used as the main focus of previous questions.
10. VERY IMPORTANT: You MUST output each option (A., B., C., D.) on a new line. Do not put multiple options on the same line.

OUTPUT FORMAT:

Fact:
"<exact supporting sentence from document>"

Question:
...

A. ...
B. ...
C. ...
D. ...

Correct Answer: X

---

Before generating a question, verify:

* Is the answer explicitly present in the document?
* Has this concept already been used?
* Is only one option correct?

If any answer is NO, skip that question.
Document:
{text[:50000]}
"""
    user_prompt = f"Here is the document text. and generate the MCQs:\n{text}\n</Document>"

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]
    return _generation_stream(messages, "mcq", state)
