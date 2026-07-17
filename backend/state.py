# state.py

# In-memory state. Direct replacement for st.session_state — fine for one
# person running this locally; would need a per-session store for multiple
# concurrent users.
state = {
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
