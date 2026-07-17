import fitz
from langchain_text_splitters import RecursiveCharacterTextSplitter

def extract_text(pdf_path):
    pages = []
    try:
        pdf = fitz.open(pdf_path)
        for page_num, page in enumerate(pdf):
            pages.append(
                {
                    "page": page_num + 1,
                    "text": page.get_text()
                }
            )
        pdf.close()
    except Exception as e:
        print(f"PDF Error: {e}")
    return pages

def create_chunks(text):
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=100
    )
    return splitter.split_text(text)
