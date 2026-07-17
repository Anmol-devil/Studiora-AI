import asyncio
import traceback
from main import upload_pdfs
from fastapi import UploadFile

async def run():
    try:
        # Create a valid minimal PDF using PyMuPDF (fitz)
        import fitz
        doc = fitz.open()
        page = doc.new_page()
        page.insert_text((50, 50), "This is a test document with some text to trigger embeddings.")
        doc.save("valid_test.pdf")
        doc.close()

        file = UploadFile(filename="valid_test.pdf", file=open("valid_test.pdf", "rb"))
        res = await upload_pdfs([file])
        print("Upload Result:", res)
    except Exception as e:
        print("ERROR DUMP:")
        traceback.print_exc()

asyncio.run(run())
