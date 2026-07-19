import time
from fastapi.responses import StreamingResponse
from state import state

def build_ask_prompt(question, context, mode):
    if mode == "Question Answering":
        instruction = """
        Give a concise answer from the context.
        in 3-4 lines
        """
    elif mode == "Detailed":
        instruction = """
        Explain the topic in extreme detail. You MUST provide a comprehensive and lengthy explanation. 
        Break it down into multiple paragraphs, and use bullet points where necessary.
        Aim for at least 15-20 lines of detailed explanation.
        """
    elif mode == "Exam Style":
        instruction = """
        Write the answer in a detailed university exam format. You MUST write a comprehensive and long response.

        Include the following headings:
        - **Definition**
        - **Working** / **Core Concept**
        - **Advantages** / **Key Benefits**
        - **Applications** / **Use Cases**
        - **Conclusion**

        You MUST elaborate extensively on each section based on the context. Aim for a long, essay-style answer (minimum 20 lines).
        """
    elif mode == "Tutor Mode":
        instruction = """
        Act like a teacher.

        Explain:
        - Definition
        - Intuition
        - Example
        - Key Points
        - Add one short paragraph
        Use simple language.
        """
    else:
        instruction = """
        Answer from the context.
        """

    return f"""
You are a PDF Question Answering Assistant
{instruction}
Answer ONLY using the provided context.
If the answer is not found in the context,
say:
I could not find this information in the document.

Context:
{context}

Question:
{question}

Answer:
"""

def stream_chat(model_name, messages, options=None):
    if model_name.startswith("glm"):
        from openai import OpenAI
        import os
        try:
            client = OpenAI(
                api_key=os.environ.get("ZAI_API_KEY"),
                base_url="https://open.bigmodel.cn/api/paas/v4/"
            )
            temp = options.get("temperature", 0.7) if options else 0.7
            max_tokens = options.get("num_predict", 1024) if options else 1024
            
            response = client.chat.completions.create(
                model=model_name,
                messages=messages,
                stream=True,
                temperature=temp,
                max_tokens=max_tokens
            )
            for chunk in response:
                if chunk.choices and len(chunk.choices) > 0:
                    delta = chunk.choices[0].delta
                    if delta and delta.content:
                        yield delta.content
        except Exception as e:
            err_msg = str(e)
            if hasattr(e, 'response') and hasattr(e.response, 'text'):
                err_msg += " " + e.response.text
            yield f"\n[API Error: {err_msg}]\n"
    else:
        from ollama import chat
        response = chat(
            model=model_name,
            messages=messages,
            stream=True,
            options=options or {},
        )
        for chunk in response:
            if "message" in chunk:
                yield chunk["message"]["content"]

def _generation_stream(messages, state_key, model_name="glm-4-flash"):
    def event_stream():
        full_response = ""
        start = time.time()
        for piece in stream_chat(model_name, messages):
            full_response += piece
            yield piece
        elapsed = round(time.time() - start, 2)
        state[state_key] = full_response
        state["last_elapsed"][state_key] = elapsed

    return StreamingResponse(event_stream(), media_type="text/plain")
    return StreamingResponse(
        event_stream(), 
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
