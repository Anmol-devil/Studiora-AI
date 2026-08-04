from typing import Dict, Any

# In-memory session store for multiple concurrent users
# Key: session_id, Value: dict of state
sessions: Dict[str, Dict[str, Any]] = {}

def get_default_state() -> Dict[str, Any]:
    return {
        "documents": [],
        "index": None,
        "combined_text": "",
        "pdf_stats": [],
        "messages": [],
        "summary": "",
        "notes": "",
        "formula": "",
        "mcq": "",
        "flashcards": "",
        "last_retrieved": [],   # chunks + similarity from the most recent /api/ask call
        "last_elapsed": {},    # {panel_key: elapsed_seconds} for generation panels
    }

def get_session_state(session_id: str) -> Dict[str, Any]:
    if not session_id:
        session_id = "default"
        
    if session_id not in sessions:
        sessions[session_id] = get_default_state()
        
    return sessions[session_id]

def reset_session_state(session_id: str):
    if session_id:
        sessions[session_id] = get_default_state()
