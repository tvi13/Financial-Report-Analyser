from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from rag import RAGPipeline
import os
import traceback

app = FastAPI(title="Financial Analyzer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

rag = None
loaded_document_info = {
    "title": "No document loaded",
    "char_count": 0,
    "chunk_count": 0,
    "sample_loaded": False
}

SAMPLE_DOCUMENT = """Acme Technologies Inc. — Q3 2026 Financial Results & Operational Review

1. Executive Summary & Consolidated Financial Results
For the third quarter ended September 30, 2026, Acme Technologies reported consolidated revenue of $4.85 billion, representing an increase of 14.2% year-over-year compared to $4.25 billion in Q3 2025. 
- Gross Profit: $3.15 billion, with a gross margin of 64.9%, compared to 62.1% in the prior-year period.
- Operating Income: $1.12 billion, up 18.5% from $945 million in Q3 2025.
- Net Income: $890 million, compared to $760 million in Q3 2025.
- Diluted Earnings Per Share (EPS): $1.42, surpassing analyst consensus of $1.36.
- Free Cash Flow: Operating cash flow reached $1.35 billion, and free cash flow stood at $1.05 billion after capital expenditures of $300 million.

2. Segment Performance
- Enterprise Cloud & AI Infrastructure:
  Revenue totaled $2.10 billion (43.3% of total revenue), an increase of 28.4% year-over-year. The growth was primarily driven by enterprise adoption of Acme NeuralEngine cloud clusters and multi-year generative AI contracts.
- Consumer Devices & Smart Wearables:
  Revenue was $1.45 billion, declining 3.1% year-over-year due to extended replacement cycles in North America and component supply delays in East Asia.
- Software Subscriptions & Services:
  Revenue reached $1.30 billion, up 11.2% year-over-year. Annual Recurring Revenue (ARR) reached $5.1 billion with a net revenue retention rate of 114%.

3. Operational Expenses & Capital Allocation
- Research & Development (R&D): Expenses increased by 16.0% to $1.20 billion, representing 24.7% of total revenue, reflecting increased investments in next-generation inference hardware and proprietary LLM alignment algorithms.
- Sales & Marketing (S&M): Expenses remained flat at $580 million.
- General & Administrative (G&A): Expenses were $250 million.
- Share Repurchases: The company repurchased 4.2 million shares of common stock for $500 million during the quarter.

4. Risk Factors & Forward-Looking Guidance
- Macroeconomic & Foreign Exchange Headwinds: Ongoing currency fluctuations, particularly the strengthening US Dollar against the Euro and Yen, negatively impacted revenue by approximately $85 million.
- Semiconductor Supply Chain Constraints: High-performance wafer supply from Tier-1 foundries remains constrained. Delivery lead times for custom ASIC accelerators currently average 22 weeks.
- Regulatory & Antitrust Scrutiny: Acme is subject to ongoing compliance audits under the EU AI Act and regulatory inquiries concerning data licensing agreements for model pre-training. Potential compliance remediation costs could range between $40 million and $60 million in FY2027.
- Q4 2026 Outlook: Management anticipates revenue between $5.05 billion and $5.20 billion and operating margins between 22.0% and 23.5%."""

class SetupRequest(BaseModel):
    api_key: str
    model: str = "openai/gpt-oss-20b"

class ModelsRequest(BaseModel):
    api_key: str

class DocumentRequest(BaseModel):
    document_text: str
    title: str = "Financial Report"

class QueryRequest(BaseModel):
    query: str

@app.get("/api/status")
def get_status():
    global rag, loaded_document_info
    return {
        "status": "online",
        "initialized": rag is not None,
        "has_document": loaded_document_info["chunk_count"] > 0,
        "document_info": loaded_document_info,
        "model": rag.model_name if rag else "not configured",
        "embeddings": "all-MiniLM-L6-v2 (384-d)",
        "vector_store": "FAISS (Facebook AI Similarity Search)"
    }

@app.get("/api/sample")
def get_sample():
    return {
        "title": "Acme Technologies Q3 2026 10-Q Earnings Report",
        "content": SAMPLE_DOCUMENT
    }

@app.post("/api/models")
def list_models(req: ModelsRequest):
    import requests
    try:
        clean_key = req.api_key.strip()
        headers = {"Authorization": f"Bearer {clean_key}"}
        resp = requests.get("https://api.groq.com/openai/v1/models", headers=headers)
        resp.raise_for_status()
        data = resp.json()
        
        # Filter for relevant chat models and sort
        all_models = [m["id"] for m in data.get("data", [])]
        chat_models = all_models
            
        return {"status": "success", "models": chat_models}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/setup")
def setup_api(req: SetupRequest):
    global rag
    try:
        clean_key = req.api_key.strip()
        if not clean_key:
            raise ValueError("API key cannot be empty.")
        rag = RAGPipeline(api_key=clean_key, model=req.model)
        return {"status": "success", "message": f"Pipeline initialized with Groq {req.model}."}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/upload")
def upload_document(req: DocumentRequest):
    global rag, loaded_document_info
    if not rag:
        raise HTTPException(status_code=400, detail="Please configure your Groq API key first.")
    
    try:
        text = req.document_text.strip()
        if not text:
            raise ValueError("Document text cannot be empty.")
        chunks = rag.load_document(text)
        loaded_document_info = {
            "title": req.title or "Financial Report",
            "char_count": len(text),
            "chunk_count": chunks,
            "sample_loaded": "Acme Technologies" in text
        }
        return {
            "status": "success",
            "message": f"Document processed and split into {chunks} semantic chunks.",
            "chunk_count": chunks
        }
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat")
def chat(req: QueryRequest):
    global rag
    if not rag:
        raise HTTPException(status_code=400, detail="Engine not configured. Please enter your Groq API key in the Setup tab.")
    
    if loaded_document_info["chunk_count"] == 0:
        raise HTTPException(status_code=400, detail="No document loaded. Please upload or load a sample document first.")
    
    try:
        query_text = req.query.strip()
        if not query_text:
            raise ValueError("Query cannot be empty.")
        response = rag.query(query_text)
        return {"status": "success", "data": response}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

