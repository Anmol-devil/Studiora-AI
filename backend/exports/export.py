from io import BytesIO
from fastapi import APIRouter
from fastapi.responses import JSONResponse, StreamingResponse
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from state import state

router = APIRouter()

def create_pdf(text, title="Study Notes"):
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer)
    styles = getSampleStyleSheet()

    story = [
        Paragraph(title, styles["Title"]),
        Spacer(1, 12),
        Paragraph(
            text.replace("\n", "<br/>"),
            styles["BodyText"]
        )
    ]

    doc.build(story)
    buffer.seek(0)
    return buffer

@router.get("/api/export/{kind}")
def export_pdf(kind: str):
    if kind == "study-pack":
        sections = []
        for key, label in [
            ("summary", "SUMMARY"), ("notes", "STUDY NOTES"),
            ("formula", "FORMULA SHEET"), ("mcq", "MCQ QUESTIONS"),
            ("flashcards", "FLASHCARDS"),
        ]:
            if state.get(key):
                sections.append(f"{label}\n\n{state[key]}")
        content = ("\n\n" + "=" * 80 + "\n\n").join(sections)
        buf = create_pdf(content, "Study Pack")
        return StreamingResponse(
            buf, media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=Study_Pack.pdf"},
        )

    mapping = {
        "notes": ("notes", "Study_Notes.pdf", "Study Notes"),
        "formula": ("formula", "Imp_Formula.pdf", "Formula Sheet"),
        "flashcards": ("flashcards", "Flashcards_Quick_Revision.pdf", "Flashcards"),
    }
    if kind not in mapping:
        return JSONResponse({"error": "unknown export kind"}, status_code=404)

    key, filename, title = mapping[kind]
    buf = create_pdf(state.get(key, ""), title)
    return StreamingResponse(
        buf, media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
