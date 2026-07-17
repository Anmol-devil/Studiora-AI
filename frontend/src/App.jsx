import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import {
  uploadPdfs,
  resetSession,
  askQuestion,
  generateSummary,
  generateNotes,
  generateFormulas,
  generateMcqs,
  generateFlashcards,
  exportPdfUrl,
  getLastRetrieved,
  getHighlightUrl,
} from "./api";

const MODE_META = {
  "Question Answering": { icon: "💡", desc: "Short, direct answer" },
  "Detailed": { icon: "📖", desc: "5-8 line in-depth explanation" },
  "Exam Style": { icon: "🎓", desc: "University exam format" },
  "Tutor Mode": { icon: "🧑‍🏫", desc: "Step-by-step with examples" },
};

const TABS = [
  { id: "chat", label: "Chat", icon: "🤖" },
  { id: "summary", label: "Summary", icon: "📑" },
  { id: "notes", label: "Notes", icon: "📝" },
  { id: "formulas", label: "Formulas", icon: "📐" },
  { id: "mcqs", label: "MCQs", icon: "❓" },
  { id: "flashcards", label: "Flashcards", icon: "🃏" },
];

const ANSWER_MODES = ["Question Answering", "Detailed", "Exam Style", "Tutor Mode"];

const FEATURES = [
  { icon: "💬", label: "Chat with PDFs" },
  { icon: "📝", label: "Study Notes" },
  { icon: "📐", label: "Formula Sheets" },
  { icon: "❓", label: "MCQs" },
  { icon: "🃏", label: "Flashcards" },
  { icon: "📦", label: "Export Study Pack" },
];

/* ── Professional spinner ──────────────────────────────────────────────── */
function Spinner({ label, size = 24 }) {
  return (
    <div className="spinner-wrap">
      <svg className="svg-spinner" width={size} height={size} viewBox="0 0 50 50">
        <circle className="path" cx="25" cy="25" r="20" fill="none" strokeWidth="5"></circle>
      </svg>
      {label && <span className="spinner-label">{label}</span>}
    </div>
  );
}

/* ── Skeleton Loader ───────────────────────────────────────────────────── */
function SkeletonLoader({ lines = 3 }) {
  return (
    <div className="skeleton-wrap">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="skeleton-line" style={{ width: i === lines - 1 ? '70%' : '100%' }} />
      ))}
    </div>
  );
}

/* ── Elapsed badge ─────────────────────────────────────────────────────── */
function ElapsedBadge({ seconds }) {
  if (seconds == null) return null;
  return (
    <span className="elapsed-badge">
      ⚡ Generated in <strong>{seconds}s</strong>
    </span>
  );
}

/* ── Retrieved-chunk pills ─────────────────────────────────────────────── */
function RetrievedChunks({ chunks, onChunkClick }) {
  const [open, setOpen] = useState(false);
  if (!chunks || chunks.length === 0) return null;

  return (
    <div className="retrieved-wrap">
      <button className="retrieved-toggle" onClick={() => setOpen(o => !o)}>
        🔍 {chunks.length} retrieved chunk{chunks.length > 1 ? "s" : ""} {open ? "▲" : "▼"}
      </button>
      {open && (
        <div className="retrieved-list">
          {chunks.map((c, i) => (
            <div 
              className="retrieved-card clickable-card" 
              key={i}
              onClick={() => onChunkClick && onChunkClick(c)}
              title="Click to view highlighted source page"
            >
              <div className="retrieved-meta">
                <span className="tag">📄 {c.source}</span>
                <span className="tag page-tag">Page {c.page} ↗</span>
                <span className="tag">Chunk #{c.chunk_id}</span>
                <span className={`sim-badge ${c.similarity >= 60 ? "high" : c.similarity >= 35 ? "mid" : "low"}`}>
                  {c.similarity}% match
                </span>
              </div>
              <p className="retrieved-content">{c.content.slice(0, 300)}{c.content.length > 300 ? "…" : ""}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════ */
export default function App() {
  const [theme, setTheme] = useState("dark");
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const [isResizing, setIsResizing] = useState(false);
  const [activeTab, setActiveTab] = useState("chat");
  const [files, setFiles] = useState([]);
  const [stats, setStats] = useState({
    pdf_count: 0, page_count: 0, chunk_count: 0, question_count: 0, ready: false,
  });
  const [mode, setMode] = useState("Detailed");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [selectedChunk, setSelectedChunk] = useState(null);

  // Chat state
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [streamingAnswer, setStreamingAnswer] = useState(null);
  const [asking, setAsking] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const chatEndRef = useRef(null);
  const chatScrollRef = useRef(null);
  const isAtBottom = useRef(true);

  const handleChatScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    // Consider it at the bottom if within 50px
    isAtBottom.current = scrollHeight - scrollTop - clientHeight < 50;
  };

  // Generation panels: { content, loading, elapsed, chunks }
  const [panelState, setPanelState] = useState({
    summary: { content: "", loading: false, elapsed: null },
    notes: { content: "", loading: false, elapsed: null },
    formulas: { content: "", loading: false, elapsed: null },
    mcqs: { content: "", loading: false, elapsed: null },
    flashcards: { content: "", loading: false, elapsed: null },
  });

  // Per-message retrieved chunks & elapsed
  const [lastChunks, setLastChunks] = useState([]);
  const [chatElapsed, setChatElapsed] = useState(null);
  
  // Track temporary "completed" state for each tab
  const [completedTabs, setCompletedTabs] = useState({});

  function triggerCompleted(key) {
    setCompletedTabs(prev => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setCompletedTabs(prev => ({ ...prev, [key]: false }));
    }, 1500);
  }

  useEffect(() => {
    if (!isResizing) return;
    const handleMouseMove = (e) => {
      let newWidth = e.clientX;
      if (newWidth < 200) newWidth = 200;
      if (newWidth > 600) newWidth = 600;
      setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => setIsResizing(false);
    
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    if (isAtBottom.current) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, streamingAnswer]);

  function setPanel(key, patch) {
    setPanelState(prev => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  }

  async function handleUpload(e) {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;
    setFiles(selected);
    setUploadError(null);
    setUploading(true);
    try {
      const result = await uploadPdfs(selected);
      // Force ready=true after a successful upload so the welcome screen dismisses
      setStats({ ...result, ready: true });
    } catch (err) {
      setUploadError(err.message || "Upload failed. Is the backend running?");
      setFiles([]);
    } finally {
      setUploading(false);
    }
  }

  function removeFile(name) {
    setFiles(prev => prev.filter(f => f.name !== name));
  }

  async function handleReset() {
    await resetSession();
    setFiles([]);
    setStats({ pdf_count: 0, page_count: 0, chunk_count: 0, question_count: 0, ready: false });
    setMessages([]);
    setLastChunks([]);
    setChatElapsed(null);
    setPanelState({
      summary: { content: "", loading: false, elapsed: null },
      notes: { content: "", loading: false, elapsed: null },
      formulas: { content: "", loading: false, elapsed: null },
      mcqs: { content: "", loading: false, elapsed: null },
      flashcards: { content: "", loading: false, elapsed: null },
    });
  }

  async function handleAsk() {
    const q = question.trim();
    if (!q || asking) return;
    setAsking(true);
    setQuestion("");
    setStreamingAnswer({ question: q, answer: "" });
    setLastChunks([]);
    setChatElapsed(null);

    try {
      const { text: finalAnswer, elapsed } = await askQuestion(q, mode, (partial) => {
        setStreamingAnswer({ question: q, answer: partial });
      });
      const chunks = await getLastRetrieved();
      setLastChunks(chunks);
      setChatElapsed(elapsed);
      setMessages(prev => [...prev, { question: q, answer: finalAnswer, elapsed, chunks }]);
      setStats(prev => ({ ...prev, question_count: prev.question_count + 1 }));
      triggerCompleted("chat");
    } catch (err) {
      setMessages(prev => [...prev, { question: q, answer: `Error: ${err.message}`, elapsed: null, chunks: [] }]);
    } finally {
      setStreamingAnswer(null);
      setAsking(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  }

  async function runPanel(key, generator) {
    setPanel(key, { loading: true, content: "", elapsed: null });
    try {
      const { text, elapsed } = await generator(partial => setPanel(key, { content: partial }));
      setPanel(key, { content: text, loading: false, elapsed });
      triggerCompleted(key);
    } catch (err) {
      setPanel(key, { content: `Error: ${err.message}`, loading: false, elapsed: null });
    }
  }

  function copyText(text, index) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(cur => (cur === index ? null : cur)), 1500);
    });
  }

  const hasOutputs = Object.values(panelState).some(p => p.content);

  return (
    <div className={`app-shell ${isResizing ? 'resizing' : ''}`} style={{ "--sidebar-width": `${sidebarWidth}px` }}>
      <Sidebar
        files={files}
        onUpload={handleUpload}
        onRemove={removeFile}
        stats={stats}
        onReset={handleReset}
        hasOutputs={hasOutputs}
        uploading={uploading}
        uploadError={uploadError}
        setIsResizing={setIsResizing}
        isResizing={isResizing}
      />

      <div className="main-area">
        <header className="app-header-unified">
          <div className="branding-pill">
            <img src="/logo.png" alt="Studiora" className="branding-logo" />
            <span className="branding-text">Studiora AI</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-main)", marginLeft: "2px" }}><polyline points="6 9 12 15 18 9"></polyline></svg>
          </div>

          <div className="header-right">
            <ThemeToggle theme={theme} setTheme={setTheme} />
          </div>
        </header>

        <nav className="tabs">
            {TABS.map(tab => {
              const isLoading = tab.id === "chat" ? asking : panelState[tab.id]?.loading;
              const isCompleted = completedTabs[tab.id] && !isLoading;
              
              let label = tab.label;
              if (isLoading) label = `${tab.label} ⟳`;
              else if (isCompleted) label = `${tab.label} ✓`;

              return (
                <button
                  key={tab.id}
                  className={`tab-btn ${activeTab === tab.id ? "active" : ""} ${isLoading ? "loading" : ""}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <span className="tab-icon">{tab.icon}</span> {label}
                </button>
              );
            })}
        </nav>

        {!stats.ready ? (
          <WelcomeState uploading={uploading} uploadError={uploadError} />
        ) : (
          <div key={activeTab} className="tab-content-fade">
            {activeTab === "chat" && (
              <ChatPanel
                messages={messages}
                streamingAnswer={streamingAnswer}
                lastChunks={lastChunks}
                chatElapsed={chatElapsed}
                question={question}
                setQuestion={setQuestion}
                onKeyDown={handleKeyDown}
                onSend={handleAsk}
                asking={asking}
                mode={mode}
                setMode={setMode}
                chatEndRef={chatEndRef}
                onCopy={copyText}
                copiedIndex={copiedIndex}
                onChunkClick={setSelectedChunk}
                chatScrollRef={chatScrollRef}
                handleChatScroll={handleChatScroll}
              />
            )}

            {activeTab === "summary" && (
              <GenerationPanel
                title="📑 Summary"
                buttonLabel="📄 Generate Summary"
                panelKey="summary"
                ps={panelState.summary}
                onGenerate={() => runPanel("summary", generateSummary)}
              />
            )}

            {activeTab === "notes" && (
              <GenerationPanel
                title="📝 Study Notes"
                buttonLabel="📝 Generate Study Notes"
                panelKey="notes"
                ps={panelState.notes}
                onGenerate={() => runPanel("notes", generateNotes)}
                downloadUrl={panelState.notes.content ? exportPdfUrl("notes") : null}
                downloadLabel="📥 Download Notes PDF"
              />
            )}

            {activeTab === "formulas" && (
              <GenerationPanel
                title="📐 Formula Sheet"
                buttonLabel="📐 Generate Formula Sheet"
                panelKey="formulas"
                ps={panelState.formulas}
                onGenerate={() => runPanel("formulas", generateFormulas)}
                downloadUrl={panelState.formulas.content ? exportPdfUrl("formula") : null}
                downloadLabel="📥 Download Formula PDF"
                renderMath
              />
            )}

            {activeTab === "mcqs" && (
              <GenerationPanel
                title="❓ MCQ Generator"
                buttonLabel="❓ Generate MCQs"
                panelKey="mcqs"
                ps={panelState.mcqs}
                onGenerate={() => runPanel("mcqs", generateMcqs)}
              />
            )}

            {activeTab === "flashcards" && (
              <FlashcardsPanel
                ps={panelState.flashcards}
                onGenerate={() => runPanel("flashcards", generateFlashcards)}
                downloadUrl={panelState.flashcards.content ? exportPdfUrl("flashcards") : null}
              />
            )}
          </div>
        )}

        <footer className="app-footer">
          Built with PyMuPDF • SentenceTransformers • FAISS • GLM 4 Flash • FastAPI • React • By Anmol
        </footer>
      </div>

      {/* ── Highlight Modal ── */}
      {selectedChunk && (
        <div className="highlight-modal-backdrop" onClick={() => setSelectedChunk(null)}>
          <div className="highlight-modal-content" onClick={e => e.stopPropagation()}>
            <div className="highlight-modal-header">
              <h3>Source: {selectedChunk.source} — Page {selectedChunk.page}</h3>
              <button className="highlight-modal-close" onClick={() => setSelectedChunk(null)}>✕</button>
            </div>
            <div className="highlight-modal-body">
              <img 
                src={getHighlightUrl(selectedChunk.source, selectedChunk.page, selectedChunk.chunk_id)} 
                alt={`Highlighted page ${selectedChunk.page} from ${selectedChunk.source}`}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Theme toggle (standalone component) ───────────────────────────────── */
function ThemeToggle({ theme, setTheme }) {
  return (
    <div className="theme-toggle">
      <button
        className={theme === "dark" ? "active" : ""}
        onClick={() => setTheme("dark")}
        data-tooltip="Dark theme"
      >
        🌙 Dark
      </button>
      <button
        className={theme === "light" ? "active" : ""}
        onClick={() => setTheme("light")}
        data-tooltip="Light theme"
      >
        ☀️ Light
      </button>
    </div>
  );
}

/* ── Welcome state ─────────────────────────────────────────────────────── */

function WelcomeState({ uploading, uploadError }) {
  return (
    <div className="welcome-wrap">
      <div className="welcome-icon">
        <img src="/logo.png" alt="AI Study Assistant logo" className="welcome-logo" />
      </div>
      <h2>Turn Any PDF Into Your AI Study Partner</h2>
      <p className="lead">
        Upload a PDF and this turns into a chat partner, a note-taker, and a quiz
        generator, MCQs generator — all grounded in what's actually in your document.
      </p>

      {/* Upload progress indicator */}
      {uploading && (
        <div className="upload-progress-banner">
          <Spinner label="Processing your PDF… this may take a moment" size={18} />
        </div>
      )}

      {/* Upload error banner */}
      {uploadError && !uploading && (
        <div className="upload-error-banner">
          ⚠️ {uploadError}
        </div>
      )}

      {!uploading && (
        <>
          <div className="feature-grid">
            {FEATURES.map(f => (
              <div className="feature-card" key={f.label}>
                <div className="icon">{f.icon}</div>
                <div className="label">{f.label}</div>
              </div>
            ))}
          </div>
          <p className="welcome-cta">
            ⬆ Upload one or more PDFs from the <strong>sidebar</strong> to begin.
          </p>
          <div style={{ marginTop: "24px", fontSize: "12px", color: "var(--text-muted)" }}>
            Copyright (c) 2026 Studiora AI
          </div>
        </>
      )}
    </div>
  );
}


/* ── Sidebar ───────────────────────────────────────────────────────────── */
function Sidebar({ files, onUpload, onRemove, stats, onReset, hasOutputs, uploading, uploadError, setIsResizing, isResizing }) {
  const inputRef = useRef(null);

  return (
    <aside className="sidebar">
      <div 
        className={`sidebar-resizer ${isResizing ? 'active' : ''}`}
        onMouseDown={() => setIsResizing && setIsResizing(true)}
      />
      <div>
        <h3>Upload PDFs</h3>
        <div className={`dropzone ${uploading ? "dropzone-loading" : ""}`} onClick={() => !uploading && inputRef.current?.click()}>
          {uploading ? (
            <>
              <Spinner size={32} />
              <p style={{ fontSize: 13, marginTop: 8 }}>Processing PDF…</p>
            </>
          ) : (
            <>
              <p>Drag and drop files here</p>
              <p style={{ fontSize: 11 }}>Limit 200MB per file • PDF</p>
              <button className="btn" type="button" style={{ marginTop: 8 }}>Browse files</button>
            </>
          )}
          <input ref={inputRef} type="file" accept=".pdf" multiple hidden onChange={onUpload} disabled={uploading} />
        </div>
        {uploadError && (
          <div className="upload-error-inline">⚠️ {uploadError}</div>
        )}
        <div className="file-list-scroll">
          {files.map(f => (
            <div className="file-chip" key={f.name}>
              <div>
                <div className="name">{f.name}</div>
                <div className="meta">{(f.size / 1024).toFixed(1)}KB</div>
              </div>
              <button onClick={() => onRemove(f.name)}>✕</button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3>📊 Document Stats</h3>
        <div className="stats-grid">
          <StatCard label="📄 PDFs" value={stats.pdf_count} />
          <StatCard label="📖 Pages" value={stats.page_count} />
          <StatCard label="✂ Chunks" value={stats.chunk_count} />
          <StatCard label="💬 Questions" value={stats.question_count} />
        </div>
      </div>

      <div className="sidebar-divider" />

      {hasOutputs && (
        <div>
          <h3>📚 Export Study Pack</h3>
          <a className="btn btn-block" href={exportPdfUrl("study-pack")}>
            📥 Download Complete Study Pack PDF
          </a>
        </div>
      )}

      <div style={{ marginTop: "auto" }}>
        <h3>Settings</h3>
        <button className="btn btn-block" onClick={onReset} data-tooltip="Clear all data and start over">🔄 Reset Session</button>
      </div>
    </aside>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="stat-card">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
    </div>
  );
}

/* ── Chat panel ────────────────────────────────────────────────────────── */
function ChatPanel({
  messages, streamingAnswer, lastChunks, chatElapsed,
  question, setQuestion, onKeyDown, onSend, asking,
  mode, setMode, chatEndRef, onCopy, copiedIndex,
  onChunkClick, chatScrollRef, handleChatScroll
}) {
  const hasMessages = messages.length > 0 || streamingAnswer;
  const [modeOpen, setModeOpen] = useState(false);
  const pillRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [question]);

  // Close popover when clicking outside
  useEffect(() => {
    if (!modeOpen) return;
    function handleOutside(e) {
      if (pillRef.current && !pillRef.current.contains(e.target)) setModeOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [modeOpen]);

  return (
    <div className="chat-wrap">
      <div className="chat-scroll" ref={chatScrollRef} onScroll={handleChatScroll}>
        {!hasMessages && (
          <div className="empty-state">
            💬 Ask anything about your uploaded PDFs to get started
          </div>
        )}

        {messages.map((msg, i) => (
          <ChatTurn key={i} index={i} msg={msg} onCopy={onCopy} copied={copiedIndex === i} onChunkClick={onChunkClick} />
        ))}

        {streamingAnswer && (
          <>
            <ChatTurn msg={streamingAnswer} isStreaming />
            <div style={{ padding: "4px 0 12px 4px" }}>
              <Spinner label="Thinking…" />
            </div>
          </>
        )}


        <div ref={chatEndRef} />
      </div>

      {/* ── Input bar ── */}
      <div className="chat-input-row">
        <div className="mode-selector-wrap" ref={pillRef}>
          <button
            className={`mode-toggle-btn ${modeOpen ? "active" : ""}`}
            onClick={() => setModeOpen(o => !o)}
          >
            <span className="mode-opt-icon">{MODE_META[mode].icon}</span>
            <span className="mode-name">{mode}</span>
            <span className="mode-opt-chevron">{modeOpen ? "▲" : "▼"}</span>
          </button>

          {/* Floating mode popover */}
          {modeOpen && (
            <div className="mode-popover">
              <div className="mode-popover-title">Answer Mode</div>
              {ANSWER_MODES.map(m => (
                <button
                  key={m}
                  className={`mode-option ${mode === m ? "selected" : ""}`}
                  onClick={() => { setMode(m); setModeOpen(false); }}
                >
                  <span className="mode-opt-icon">{MODE_META[m].icon}</span>
                  <span className="mode-opt-body">
                    <span className="mode-opt-name">{m}</span>
                    <span className="mode-opt-desc">{MODE_META[m].desc}</span>
                  </span>
                  {mode === m && <span className="mode-opt-check">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="chat-input-pill">
          {/* LEFT: + button */}
          <div className="pill-left">
            <button
              className={`plus-btn ${modeOpen ? "active" : ""}`}
              onClick={() => setModeOpen(o => !o)}
              title="Toggle answer mode"
            >
              +
            </button>
          </div>

          {/* MIDDLE: textarea */}
          <textarea
            ref={textareaRef}
            placeholder="Ask anything from your PDFs…"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
          />

          {/* RIGHT: send button */}
          <button className="send-btn" onClick={onSend} disabled={asking || !question.trim()} data-tooltip="Send message">
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" style={{ marginLeft: "2px" }}>
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

function ChatTurn({ msg, onCopy, isStreaming, index, copied, onChunkClick }) {
  return (
    <div className="chat-turn">
      <div className="user-bubble">👤 {msg.question}</div>

      {/* Assistant bubble wrapper — copy btn hovers top-right */}
      <div className="assistant-bubble-wrap">
        <div className="assistant-bubble markdown-bubble">
          <div style={{ display: 'flex', gap: '8px' }}>
            <span>🤖</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                {msg.answer}
              </ReactMarkdown>
              {isStreaming && <span style={{ opacity: 0.5 }}>▍</span>}
              {!isStreaming && msg.elapsed && (
                <div style={{ marginTop: "16px", fontSize: "0.75rem", color: "var(--text-muted)", fontStyle: "italic", textAlign: "right", opacity: 0.8 }}>
                  ✨ Generated by GLM-4 Flash in {msg.elapsed}s
                </div>
              )}
            </div>
          </div>
        </div>
        {!isStreaming && (
          <button
            className={`copy-btn-overlay ${copied ? "copied" : ""}`}
            title={copied ? "Copied!" : "Copy answer"}
            onClick={() => onCopy(msg.answer, index)}
          >
            {copied ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            )}
          </button>
        )}
      </div>

      {/* Meta row — elapsed + retrieved chunks, shown below bubble */}
      {!isStreaming && (
        <div className="chat-turn-meta">
          {msg.elapsed != null && <ElapsedBadge seconds={msg.elapsed} />}
          {msg.chunks && msg.chunks.length > 0 && (
            <RetrievedChunks chunks={msg.chunks} onChunkClick={onChunkClick} />
          )}
        </div>
      )}
    </div>
  );
}

/* ── Generation panel (Summary / Notes / Formulas / MCQs) ───────────── */
function GenerationPanel({
  title, buttonLabel, ps, onGenerate, downloadUrl, downloadLabel, renderMath,
}) {
  const [copied, setCopied] = useState(false);
  const isStreaming = ps.loading;
  const hasContent = Boolean(ps.content);

  function handleCopy() {
    if (!ps.content) return;
    navigator.clipboard.writeText(ps.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="panel">
      <div className="panel-scroll">

        {/* No content yet — show skeleton while waiting for first tokens */}
        {isStreaming && !hasContent && (
          <div className="panel-skeleton-wrap">
            <SkeletonLoader lines={4} />
          </div>
        )}

        {/* Content present (streaming or done) — render it live */}
        {hasContent && (
          <>
            <div className="panel-header-row">
              <h3 style={{ marginTop: 0 }}>{title}</h3>
              {!isStreaming && <ElapsedBadge seconds={ps.elapsed} />}
              {isStreaming && <span className="stream-live-badge">&#9679; Generating…</span>}
            </div>

            <div className="panel-output">
              {!isStreaming && (
                <button
                  className={`copy-btn-overlay ${copied ? "copied" : ""}`}
                  title={copied ? "Copied!" : "Copy content"}
                  onClick={handleCopy}
                >
                  {copied ? (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                      <span style={{ fontSize: "11px", fontWeight: "bold", marginLeft: "4px", marginRight: "4px" }}>Copied!</span>
                    </>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                  )}
                </button>
              )}
              {renderMath ? (
                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                  {ps.content}
                </ReactMarkdown>
              ) : (
                <ReactMarkdown>{ps.content}</ReactMarkdown>
              )}
              {/* Blinking cursor while streaming */}
              {isStreaming && <span className="stream-cursor">&#9614;</span>}
            </div>

            {/* Download + regenerate only appear when done */}
            {!isStreaming && (
              <>
                {downloadUrl && (
                  <a className="btn panel-download" href={downloadUrl}>{downloadLabel}</a>
                )}
                <div className="panel-action-inline">
                  <button className="panel-generate-btn" onClick={onGenerate}>
                    🔄 Regenerate
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {/* Nothing at all — idle state */}
        {!isStreaming && !hasContent && (
          <>
            <div className="empty-state">Nothing generated yet — use the button below.</div>
            <div className="panel-action-inline">
              <button className="panel-generate-btn" onClick={onGenerate}>
                {buttonLabel}
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}  /* ── Flashcards panel ────────────────────────────────────────── */
function FlashcardsPanel({ ps, onGenerate, downloadUrl }) {
  const [copied, setCopied] = useState(false);
  const isStreaming = ps.loading;
  const cards = parseFlashcards(ps.content);
  const hasAnyContent = Boolean(ps.content);

  function handleCopy() {
    if (!ps.content) return;
    navigator.clipboard.writeText(ps.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="panel">
      <div className="panel-scroll">

        {/* Waiting for first tokens */}
        {isStreaming && !hasAnyContent && (
          <div className="panel-skeleton-wrap">
            <SkeletonLoader lines={4} />
          </div>
        )}

        {/* Show parsed cards as they accumulate, plus raw tail while streaming */}
        {hasAnyContent ? (
          <>
            <div className="panel-header-row" style={{ position: "relative" }}>
              <h3 style={{ marginTop: 0 }}>🃏 Flashcards</h3>
              <ElapsedBadge seconds={ps.elapsed} />
              {!isStreaming && (
                <button
                  className={`copy-btn-overlay ${copied ? "copied" : ""}`}
                  style={{ top: "0", right: "0" }}
                  title={copied ? "Copied!" : "Copy flashcards text"}
                  onClick={handleCopy}
                >
                  {copied ? (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                      <span style={{ fontSize: "11px", fontWeight: "bold", marginLeft: "4px", marginRight: "4px" }}>Copied!</span>
                    </>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                  )}
                </button>
              )}
            </div>
            {cards.map((card, i) => (
              <details className="flashcard" key={i}>
                <summary>🃏 {card.front}</summary>
                <div className="back">{card.back}</div>
              </details>
            ))}
            {downloadUrl && (
              <a className="btn panel-download" href={downloadUrl}>📥 Download Flashcards PDF</a>
            )}
            <div className="panel-action-inline">
              <button className="panel-generate-btn" onClick={onGenerate}>🔄 Regenerate</button>
            </div>
          </>
        ) : (
          <>
            <div className="empty-state">Nothing generated yet — use the button below.</div>
            <div className="panel-action-inline">
              <button className="panel-generate-btn" onClick={onGenerate}>🃏 Generate Flashcards</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function parseFlashcards(raw) {
  if (!raw) return [];
  const cards = [];
  const blocks = raw.split("Flashcard ");
  for (const block of blocks) {
    if (!block.trim()) continue;
    let front = "", back = "";
    for (const line of block.split("\n")) {
      if (line.startsWith("Front:")) front = line.replace("Front:", "").trim();
      else if (line.startsWith("Back:")) back = line.replace("Back:", "").trim();
    }
    if (front) cards.push({ front, back });
  }
  return cards;
}
