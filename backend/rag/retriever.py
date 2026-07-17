import numpy as np
from .embedding import embedding_model

def retrieve_context(question, index, documents, k=3):
    query_embedding = embedding_model.encode(
        [question],
        convert_to_numpy=True
    ).astype(np.float32)

    distances, indices = index.search(query_embedding, k)

    # Convert L2 distances to a 0-100 similarity percentage.
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

        context += doc["content"]
        context += "\n\n"

        sources.append(doc["source"])
        retrieved_docs.append({
            **doc,
            "similarity": dist_to_sim(dist),
            "rank": rank + 1,
        })

    return (context, list(set(sources)), retrieved_docs)
