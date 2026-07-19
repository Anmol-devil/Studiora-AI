const BASE_URL =  import.meta.env.VITE_API_URL;

export async function uploadPdfs(files) {
  const formData = new FormData();
  for (const file of files) formData.append("files", file);

  const res = await fetch(`${BASE_URL}/api/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Upload failed");
  return res.json();
}

export async function getStats() {
  const res = await fetch(`${BASE_URL}/api/stats`);
  return res.json();
}

export async function resetSession() {
  const res = await fetch(`${BASE_URL}/api/reset`, { method: "POST" });
  return res.json();
}

export async function getMessages() {
  const res = await fetch(`${BASE_URL}/api/messages`);
  return res.json();
}

export async function getLastRetrieved() {
  const res = await fetch(`${BASE_URL}/api/last-retrieved`);
  return res.json();
}

export async function getLastElapsed() {
  const res = await fetch(`${BASE_URL}/api/last-elapsed`);
  return res.json();
}

/**
 * Streams a POST response chunk-by-chunk, calling onChunk(text) as data
 * arrives. Used for chat answers and all the generation endpoints
 * (summary/notes/formulas/mcqs/flashcards) so the UI fills in live,
 * the same way the old st.empty()/placeholder.markdown() loop did.
 * Returns { text, elapsed } — elapsed is measured client-side.
 */
async function streamPost(path, body, onChunk) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    body,
  });

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "Request failed");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let full = "";
  const t0 = performance.now();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    full += chunk;
    onChunk(full);
  }

  const elapsed = ((performance.now() - t0) / 1000).toFixed(2);
  return { text: full, elapsed: parseFloat(elapsed) };
}

export function askQuestion(question, mode, onChunk) {
  const formData = new FormData();
  formData.append("question", question);
  formData.append("mode", mode);
  return streamPost("/api/ask", formData, onChunk);
}

export function generateSummary(onChunk) {
  return streamPost("/api/summary", null, onChunk);
}

export function generateNotes(onChunk) {
  return streamPost("/api/notes", null, onChunk);
}

export function generateFormulas(onChunk) {
  return streamPost("/api/formulas", null, onChunk);
}

export function generateMcqs(onChunk) {
  return streamPost("/api/mcqs", null, onChunk);
}

export function generateFlashcards(onChunk) {
  return streamPost("/api/flashcards", null, onChunk);
}

export function exportPdfUrl(kind) {
  return `${BASE_URL}/api/export/${kind}`;
}

export function getHighlightUrl(source, page, chunk_id) {
  const params = new URLSearchParams({
    source: source,
    page: page.toString(),
    chunk_id: chunk_id.toString()
  });
  return `${BASE_URL}/api/highlight?${params.toString()}`;
}

