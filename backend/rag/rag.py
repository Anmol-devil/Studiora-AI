import fitz
from langchain_text_splitters import RecursiveCharacterTextSplitter

def extract_text(file_path):
    pages = []
    try:
        if file_path.lower().endswith(".pdf"):
            pdf = fitz.open(file_path)
            for page_num, page in enumerate(pdf):
                pages.append(
                    {
                        "page": page_num + 1,
                        "text": page.get_text()
                    }
                )
            pdf.close()
        elif file_path.lower().endswith(".docx") or file_path.lower().endswith(".doc"):
            import docx
            doc = docx.Document(file_path)
            full_text = "\n".join([para.text for para in doc.paragraphs if para.text.strip()])
            pages.append({
                "page": 1,
                "text": full_text
            })
        elif file_path.lower().endswith(".txt"):
            with open(file_path, "r", encoding="utf-8") as f:
                full_text = f.read()
            pages.append({
                "page": 1,
                "text": full_text
            })
    except Exception as e:
        print(f"File Extraction Error: {e}")
    return pages

def create_chunks(text):
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=100
    )
    return splitter.split_text(text)
