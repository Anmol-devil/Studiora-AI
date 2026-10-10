
const BASE_URL = import.meta.env.VITE_API_URL;

const SESSION_KEY = "studiora_session_id";

export function getSessionId() {
  let sessionId = sessionStorage.getItem(SESSION_KEY);

  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }

  return sessionId;
}

function sessionHeaders() {
  return {
    "x-session-id": getSessionId(),
  };
}

async function handleResponse(res) {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed: ${res.status}`);
  }

  return res;
}

export async function uploadPdfs(files) {
  const formData = new FormData();

  for (const file of files) {
    formData.append("files", file);
  }

  const res = await fetch(`${BASE_URL}/api/upload`, {
    method: "POST",
    headers: sessionHeaders(),
    body: formData,
  });

  await handleResponse(res);
  return res.json();
}

export async function getStats() {
  const res = await fetch(`${BASE_URL}/api/stats`, {
    headers: sessionHeaders(),
  });

  await handleResponse(res);
  return res.json();
}

export async function resetSession() {
  const res = await fetch(`${BASE_URL}/api/reset`, {
    method: "POST",
    headers: sessionHeaders(),
  });

  await handleResponse(res);
  return res.json();
}

export async function getMessages() {
  const res = await fetch(`${BASE_URL}/api/messages`, {
    headers: sessionHeaders(),
  });

  await handleResponse(res);
  return res.json();
}

export async function getLastRetrieved() {
  const res = await fetch(`${BASE_URL}/api/last-retrieved`, {
    headers: sessionHeaders(),
  });

  await handleResponse(res);
  return res.json();
}

export async function getLastElapsed() {
  const res = await fetch(`${BASE_URL}/api/last-elapsed`, {
    headers: sessionHeaders(),
  });

  await handleResponse(res);
  return res.json();
}

async function streamPost(path, body, onChunk) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: sessionHeaders(),
    body,
  });

  await handleResponse(res);

  if (!res.body) {
    throw new Error("Response stream is unavailable.");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  let full = "";
  const t0 = performance.now();

  while (true) {
    const { done, value } = await reader.read();

    if (done) break;

    full += decoder.decode(value, { stream: true });

    if (onChunk) {
      onChunk(full);
    }
  }

  full += decoder.decode();

  const elapsed = (performance.now() - t0) / 1000;

  return {
    text: full,
    elapsed: Number(elapsed.toFixed(2)),
  };
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
    source,
    page: page.toString(),
    chunk_id: chunk_id.toString(),
    session_id: getSessionId(),
  });

  return `${BASE_URL}/api/highlight?${params.toString()}`;
}


