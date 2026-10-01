import os
os.environ["TOKENIZERS_PARALLELISM"] = "false"

from pydantic import BaseModel
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain.prompts import PromptTemplate
from langchain.output_parsers import StructuredOutputParser, ResponseSchema
from langchain_openai import ChatOpenAI
from langchain_core.runnables import RunnablePassthrough
import json
import re

# Initialize global state for the vector store
vectorstore = None

class RAGPipeline:
    def __init__(self, api_key: str, model: str = "openai/gpt-oss-20b"):
        # Configure output parser
        response_schemas = [
            ResponseSchema(name="analytical_answer", description="The answer to the user's question based strictly on the context."),
            ResponseSchema(name="source_citations", description="A list of direct quotes or references from the context that support the answer.")
        ]
        self.output_parser = StructuredOutputParser.from_response_schemas(response_schemas)
        format_instructions = self.output_parser.get_format_instructions()
        
        # Configure Prompt
        prompt_template = """
You are a strict financial analyst AI. Use the following context to answer the user's query.
If the answer is not contained in the context, explicitly state "I do not have enough information to answer this."
Do not hallucinate any financial figures.

Context:
{context}

Query:
{query}

{format_instructions}
"""
        self.prompt = PromptTemplate(
            template=prompt_template,
            input_variables=["context", "query"],
            partial_variables={"format_instructions": format_instructions}
        )
        
        # Configure LLM
        os.environ["OPENAI_API_KEY"] = api_key
        self.model_name = model
        self.llm = ChatOpenAI(
            model=model,
            api_key=api_key,
            base_url="https://api.groq.com/openai/v1",
            temperature=0
        )


    def format_docs(self, docs):
        return "\n\n".join(doc.page_content for doc in docs)

    def load_document(self, text: str):
        global vectorstore
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=300, chunk_overlap=50)
        texts = text_splitter.split_text(text)
        
        embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
        vectorstore = FAISS.from_texts(texts, embeddings)
        return len(texts)

    def query(self, question: str):
        global vectorstore
        if not vectorstore:
            raise ValueError("Document not loaded yet.")
            
        retriever = vectorstore.as_retriever(search_kwargs={"k": 3})
        
        # We can run retriever and prompt through LLM
        retrieved_docs = retriever.invoke(question)
        context_str = self.format_docs(retrieved_docs)
        
        formatted_prompt = self.prompt.format(context=context_str, query=question)
        response_msg = self.llm.invoke(formatted_prompt)
        content = response_msg.content
        
        try:
            parsed = self.output_parser.parse(content)
        except Exception:
            # Fallback if markdown json codeblock wasn't cleanly parsed
            json_match = re.search(r"\{.*\}", content, re.DOTALL)
            if json_match:
                try:
                    parsed = json.loads(json_match.group(0))
                except Exception:
                    parsed = {
                        "analytical_answer": content,
                        "source_citations": [doc.page_content for doc in retrieved_docs]
                    }
            else:
                parsed = {
                    "analytical_answer": content,
                    "source_citations": [doc.page_content for doc in retrieved_docs]
                }
        
        # Guarantee safe schema types for the frontend
        if not isinstance(parsed, dict):
            parsed = {"analytical_answer": str(parsed), "source_citations": []}
            
        answer = parsed.get("analytical_answer") or parsed.get("answer") or str(parsed)
        citations = parsed.get("source_citations", [])
        if isinstance(citations, str):
            citations = [citations]
        elif not isinstance(citations, list):
            citations = [str(citations)]
            
        return {
            "analytical_answer": str(answer),
            "source_citations": [str(c) for c in citations if c],
            "context_chunks": [doc.page_content for doc in retrieved_docs]
        }


