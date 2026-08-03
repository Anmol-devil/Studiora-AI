import os
import faiss
import numpy as np
from openai import OpenAI
client = OpenAI(
    api_key=os.getenv("JINA_API_KEY"),
    base_url="https://api.jina.ai/v1"
)
def get_embeddings(texts):
    response = client.embeddings.create(
        model="jina-embeddings-v4",
        input=texts
    )

    embeddings = np.array(
        [item.embedding for item in response.data],
        dtype=np.float32
    )

    return embeddings
def build_index(documents):
    texts = [doc["content"] for doc in documents]

    embeddings = get_embeddings(texts)

    dimension = embeddings.shape[1]

    index = faiss.IndexFlatL2(dimension)

    index.add(embeddings)

    return index
