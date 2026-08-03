import os
import faiss
import numpy as np
from sentence_transformers import SentenceTransformer

model = SentenceTransformer("all-MiniLM-L6-v2")

def get_embeddings(texts):
    embeddings = model.encode(texts, convert_to_numpy=True)
    return embeddings.astype(np.float32)


def build_index(documents):
    texts = [doc["content"] for doc in documents]

    embeddings = get_embeddings(texts)

    dimension = embeddings.shape[1]

    index = faiss.IndexFlatL2(dimension)

    index.add(embeddings)

    return index
