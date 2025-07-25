import argparse
from langchain_chroma import Chroma
from langchain.prompts import ChatPromptTemplate
from langchain_ollama import ChatOllama
from get_embedding_function import get_embedding_function

CHROMA_PATH = "chroma"

PROMPT_TEMPLATE = """"
Answer the question based only on the following context:

{context}

---

Answer the question based on the above context: {question}
"""

def main():

    parser = argparse.ArgumentParser()
    parser.add_argument("query_text", type=str, help="The query text.")
    args = parser.parse_args()
    query_text = args.query_text
    queryrag(query_text)

def queryrag(query_text: str):
    db = Chroma(
        persist_directory=CHROMA_PATH,
        embedding_function=get_embedding_function()
    )

    print(f"Querying RAG with: {query_text}")
    results = db.similarity_search_with_score(query_text, k=5)


    context_text = "n\n\---\n\n".join([doc.page_content for doc, _score in results])
    prompt_template = ChatPromptTemplate.from_template(PROMPT_TEMPLATE)
    prompt = prompt_template.format(context=context_text, question=query_text)
    print(prompt)

    model = ChatOllama(model="mistral")
    response_text = model.invoke(input=prompt)

    sources = [doc.metadata.get("id", None) for doc, _score in results]
    formatted_response = f"Response: {response_text}\nSources: {'\n'.join(sources)}"
    print(formatted_response)

    return response_text

if __name__ == "__main__":
    main()
