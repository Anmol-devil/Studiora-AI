# <div align="center">

# 🎓 Studiora AI

### Transform PDFs into an Intelligent AI Study Companion

<p align="center">
  <img src="screenshots/logo.png" width="140">
</p>

<p align="center">

![Python](https://img.shields.io/badge/Python-3.10+-blue?logo=python)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi)
![FAISS](https://img.shields.io/badge/FAISS-VectorDB-orange)
![Sentence Transformers](https://img.shields.io/badge/SentenceTransformers-Embeddings-red)
![License](https://img.shields.io/badge/License-MIT-green)

</p>

**Studiora AI** is a modern Retrieval-Augmented Generation (RAG) application that transforms PDF documents into an interactive AI-powered study platform.

Upload one or multiple PDFs and instantly:

- 💬 Chat with your documents
- 📝 Generate study notes
- 📐 Extract mathematical formulas
- ❓ Generate MCQs
- 🃏 Create flashcards
- 📥 Export complete study packs

Built using **React**, **FastAPI**, **FAISS**, **Sentence Transformers**, and **LLMs (Ollama / GLM-4)**.

---

# 📸 Screenshots

## Welcome

![Welcome](screenshots/Studiora%20Welcome%20page.png)

---

## AI Chat

![Chat](screenshots/Studiora%20Chat.png)

---

## Study Notes

![Notes](screenshots/Studiora%20Notes.png)

---

## Formula Sheet

![Formula](screenshots/Studiora%20Formulas.png)

---

## MCQ Generator

![MCQ](screenshots/Studiora%20MCQs.png)

---

## Flashcards

![Flashcards](screenshots/Studiora%20Flashcards.png)

---

## Document Summary

![Summary](screenshots/Studiora%20Summary.png)

---

## Light Theme

![Light](screenshots/Studiora%20Light%20Theme.png)

---

# ✨ Features

## 📄 Smart PDF Processing

- Upload single or multiple PDFs
- Automatic text extraction using PyMuPDF
- Intelligent chunking
- Semantic embeddings
- High-speed FAISS vector search

---

## 💬 AI Chat

Ask natural language questions about your documents.

Supports:

- Question Answering
- Detailed Explanation
- Exam Style
- Tutor Mode

Every answer includes:

- Source PDF
- Retrieved chunks
- Similarity score
- Generation time

---

## 📝 AI Study Notes

Generate structured study notes containing

- Key Concepts
- Definitions
- Important Topics
- Interview Questions
- Exam Questions
- Revision Notes

---

## 📐 Formula Sheet Generator

Automatically extracts

- Mathematical formulas
- Equations
- Neural Network equations
- Probability formulas
- Matrix formulas
- Optimization equations

Rendered beautifully using **LaTeX**.

---

## ❓ MCQ Generator

Generate document-based Multiple Choice Questions.

Features

- 10–15 MCQs
- Randomized options
- Correct answers
- Based ONLY on uploaded documents

---

## 🃏 Flashcards

Automatically create flashcards for revision.

Each flashcard contains

- Front Question
- Back Answer

Perfect for quick learning.

---

## 📥 Export Study Pack

Export

- Summary
- Notes
- Formula Sheet
- MCQs
- Flashcards

as beautifully formatted PDF documents.

---

## 🌗 Modern Interface

- Dark Theme
- Light Theme
- Responsive Layout
- Streaming Responses
- Copy Answers
- Source Highlighting

---

# 🏗️ System Architecture

```text
                    User
                      │
                      ▼
              React Frontend
                      │
         REST API / Streaming
                      │
                      ▼
              FastAPI Backend
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
    PyMuPDF        FAISS        LLM
  PDF Parsing    Vector DB   Ollama / GLM
        │             │
        ▼             ▼
   Chunking     Embeddings
        │             │
        └──────► Retrieval ◄──────┐
                      │            │
                      ▼            │
              Prompt Construction  │
                      │            │
                      ▼            │
             AI Generated Response │
```

---

# ⚙️ Tech Stack

## Frontend

- React
- Vite
- React Markdown
- KaTeX
- CSS

---

## Backend

- FastAPI
- Uvicorn
- Python

---

## AI Stack

- Retrieval-Augmented Generation (RAG)
- FAISS
- Sentence Transformers
- all-MiniLM-L6-v2
- Ollama
- GLM-4 Flash

---

## PDF Processing

- PyMuPDF
- LangChain Text Splitters

---

## Export

- ReportLab

---

# 📂 Project Structure

```
Studiora-AI/

│

├── frontend/

│

├── backend/

│   ├── api/

│   ├── rag/

│   ├── models/

│   ├── exports/

│   ├── uploads/

│   ├── state.py

│   ├── main.py

│   └── requirements.txt

│

├── screenshots/

│

├── README.md

└── LICENSE
```

---

# 🚀 Installation

## Clone Repository

```bash
git clone https://github.com/yourusername/studiora-ai.git

cd studiora-ai
```

---

## Backend

```bash
cd backend

python -m venv .venv

source .venv/bin/activate

# Windows

.venv\Scripts\activate

pip install -r requirements.txt

uvicorn main:app --reload
```

---

## Frontend

```bash
cd frontend

npm install

npm run dev
```

---

Visit

```
http://localhost:5173
```

---

# 🧠 AI Pipeline

```text
PDF

↓

PyMuPDF

↓

Chunking

↓

Embeddings

↓

FAISS

↓

Semantic Search

↓

Retrieved Context

↓

Prompt Builder

↓

LLM

↓

Generated Answer
```

---

# 📊 Current Features

| Feature | Status |
|----------|--------|
| Multi PDF Chat | ✅ |
| RAG | ✅ |
| Streaming Response | ✅ |
| Study Notes | ✅ |
| Formula Extraction | ✅ |
| Flashcards | ✅ |
| MCQs | ✅ |
| PDF Export | ✅ |
| Source Highlighting | ✅ |
| Dark / Light Theme | ✅ |
| Multiple Answer Modes | ✅ |

---

# 🔮 Future Improvements

- User Authentication
- Persistent Vector Database
- OCR for Scanned PDFs
- Hybrid Search (BM25 + FAISS)
- Conversation Memory
- Voice Interaction
- Mobile Application
- Cloud Deployment

---

# 👨‍💻 Author

**Anmol**

Pursuing AI / Machine Learning Engineer

Built using

- React
- FastAPI
- FAISS
- Sentence Transformers
- Ollama
- GLM-4
- PyMuPDF

---

# ⭐ Support

If you found this project helpful,

please consider giving it a ⭐ on GitHub.

It helps others discover the project.

---

# 📜 License

This project is licensed under the MIT License.

