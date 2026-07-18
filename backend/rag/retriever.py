import os
import numpy as np
from openai import OpenAI

client = OpenAI(
    api_key=os.getenv("JINA_API_KEY"),
    base_url="https://api.jina.ai/v1"
)

def get_query_embedding(question):
    response = client.embeddings.create(
        model="jina-embeddings-v4",
        input=[question]
    )

    return np.array(
        [response.data[0].embedding],
        dtype=np.float32
    )


def retrieve_context(question, index, documents, k=3):

    query_embedding = get_query_embedding(question)

    distances, indices = index.search(query_embedding, k)

    def dist_to_sim(d):
        return round(float(np.exp(-d / 4) * 100), 1)

    MAX_CONTEXT = 5000

    context = ""
    sources = []
    retrieved_docs = []

    for rank, (idx, dist) in enumerate(zip(indices[0], distances[0])):

        doc = documents[idx]

        if len(context) + len(doc["content"]) > MAX_CONTEXT:
            break

        context += doc["content"] + "\n\n"

        sources.append(doc["source"])

        retrieved_docs.append({
            **doc,
            "similarity": dist_to_sim(dist),
            "rank": rank + 1,
        })

    return context, list(set(sources)), retrieved_docs
