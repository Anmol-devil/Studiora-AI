import os
import time
from io import BytesIO
from typing import List

def load_env_file(filepath="../ani.env"):
    if os.path.exists(filepath):
        with open(filepath) as f:
            for line in f:
                line = line.strip()
                if line and '=' in line and not line.startswith('#'):
                    k, v = line.split('=', 1)
                    os.environ[k] = v

load_env_file()

import fitz
from fastapi import FastAPI, File, UploadFile, Form, Header, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.concurrency import run_in_threadpool

# Import our new modules
from state import get_session_state, reset_session_state
from rag.rag import extract_text, create_chunks
from rag.embedding import build_index
from rag.retriever import retrieve_context
from models.llm import build_ask_prompt, stream_chat, _generation_stream
from api.router import router as api_router

app = FastAPI(title="AI Study Assistant API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("uploads", exist_ok=True)

# Include the refactored routes
app.include_router(api_router)


@app.get("/")
def home():
    return {
        "message": "Studiora AI Backend is running 🚀",
        "docs": "/docs"
    }

@app.post("/api/upload")
def upload_files(files: List[UploadFile] = File(...), x_session_id: str = Header(None)):
    state = get_session_state(x_session_id)
    documents = []
    combined_text = ""
    file_stats = []
    global_chunk_id = 0  # unique across all files + pages

    for uploaded_file in files:
        file_path = os.path.join("uploads", f"{x_session_id}_{uploaded_file.filename}")
        content = uploaded_file.file.read()
        with open(file_path, "wb") as f:
            f.write(content)

        pages = extract_text(file_path)
        full_text = ""
        total_chunks = 0

        for page_data in pages:
            page_num = page_data["page"]
            page_text = page_data["text"]
            full_text += page_text
            chunks = create_chunks(page_text)
            total_chunks += len(chunks)

            for chunk in chunks:
                documents.append({
                    "content": chunk,
                    "source": uploaded_file.filename,
                    "local_path": file_path,
                    "page": page_num,
                    "chunk_id": global_chunk_id,
                })
                global_chunk_id += 1

        file_stats.append({
            "file": uploaded_file.filename,
            "chars": len(full_text),
            "pages": len(pages),
            "chunks": total_chunks
        })
        combined_text += full_text

    if documents:
        index = build_index(documents)
        state["documents"] = documents
        state["index"] = index
        state["combined_text"] = combined_text
        state["pdf_stats"] = state.get("pdf_stats", []) + file_stats
        state["messages"] = []

    return get_stats(x_session_id=x_session_id)


@app.get("/api/stats")
def get_stats(x_session_id: str = Header(None)):
    state = get_session_state(x_session_id)
    docs = state["documents"]
    page_count = len({(d["source"], d["page"]) for d in docs})
    return {
        "pdf_count": len(state["pdf_stats"]),
        "page_count": page_count,
        "chunk_count": len(docs),
        "question_count": len(state["messages"]),
        "ready": state["index"] is not None,
    }


@app.post("/api/reset")
def reset_session(x_session_id: str = Header(None)):
    reset_session_state(x_session_id)
    return {"ok": True}


@app.get("/api/highlight")
def highlight_chunk(source: str, page: int, chunk_id: int, session_id: str = Query(None)):
    state = get_session_state(session_id)
    # Find the document chunk
    chunk_text = None
    local_path = None
    for doc in state["documents"]:
        if doc["source"] == source and doc["page"] == page and doc["chunk_id"] == chunk_id:
            chunk_text = doc["content"]
            local_path = doc.get("local_path")
            break
            
    if not chunk_text or not local_path:
        return JSONResponse({"error": "Chunk not found"}, status_code=404)
        
    if not os.path.exists(local_path):
        return JSONResponse({"error": "File not found"}, status_code=404)
        
    if not source.lower().endswith(".pdf"):
        # We don't support highlighting for non-PDFs yet, return a placeholder or error
        return JSONResponse({"error": "Highlight is only supported for PDFs"}, status_code=400)
        
    try:
        doc = fitz.open(local_path)
        if page < 1 or page > len(doc):
            return JSONResponse({"error": "Invalid page number"}, status_code=400)
            
        pdf_page = doc[page - 1]
        
        # Split chunk_text to search for smaller segments 
        # (PyMuPDF search_for handles small exact strings better than large multiline blocks)
        lines = chunk_text.split('\n')
        for line in lines:
            line = line.strip()
            if len(line) < 5: continue
            
            # search_for returns a list of fitz.Rect
            rects = pdf_page.search_for(line)
            for r in rects:
                annot = pdf_page.add_highlight_annot(r)
                annot.update()
                
        pix = pdf_page.get_pixmap(matrix=fitz.Matrix(2, 2))
        img_data = pix.tobytes("png")
        
        return StreamingResponse(BytesIO(img_data), media_type="image/png")
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@app.get("/api/last-retrieved")
def get_last_retrieved(x_session_id: str = Header(None)):
    """Returns the chunks retrieved for the most recent /api/ask call."""
    state = get_session_state(x_session_id)
    return state["last_retrieved"]


@app.get("/api/last-elapsed")
def get_last_elapsed(x_session_id: str = Header(None)):
    """Returns a map of {panel_key: elapsed_seconds} for all panels."""
    state = get_session_state(x_session_id)
    return state["last_elapsed"]


@app.get("/api/messages")
def get_messages(x_session_id: str = Header(None)):
    state = get_session_state(x_session_id)
    return state["messages"]


@app.post("/api/ask")
async def ask(question: str = Form(...), mode: str = Form("Question Answering"), x_session_id: str = Header(None)):
    state = get_session_state(x_session_id)
    if state["index"] is None:
        return JSONResponse({"error": "No documents indexed yet"}, status_code=400)

    # Use the async retrieve_context since it now makes network requests to Jina API
    context, sources, retrieved_docs = await retrieve_context(
        question, state["index"], state["documents"], k=3
    )
    prompt = build_ask_prompt(question, context, mode)
    messages = [{"role": "user", "content": prompt}]
    options = {"temperature": 0.3, "num_predict": 1500}

    # Save retrieved chunks immediately so the frontend can fetch them
    # right after the stream ends without waiting for the message append.
    state["last_retrieved"] = [
        {
            "source": d["source"],
            "page": d["page"],
            "chunk_id": d["chunk_id"],
            "similarity": d["similarity"],
            "rank": d["rank"],
            "content": d["content"],
        }
        for d in retrieved_docs
    ]

    # Change event_stream to an async generator since we will use async clients
    async def event_stream():
        full_response = ""
        start = time.time()
        async for piece in stream_chat("glm-4-flash", messages, options):
            full_response += piece
            yield piece
        elapsed = round(time.time() - start, 2)

        state["last_elapsed"]["chat"] = elapsed
        state["messages"].append({
            "question": question,
            "answer": full_response,
            "sources": sources,
            "elapsed": elapsed,
            "retrieved": state["last_retrieved"],
        })

    return StreamingResponse(
        event_stream(), 
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@app.post("/api/summary")
def generate_summary_route(x_session_id: str = Header(None)):
    state = get_session_state(x_session_id)
    text = state["combined_text"]
    prompt = f"""
Summarize the following document.
Provide:
1. Executive Summary
2. Key Concepts
3. Important Findings
4. Final Takeaways

Document:

{text[:5000]}
"""
    return _generation_stream([{"role": "user", "content": prompt}], "summary", state)

