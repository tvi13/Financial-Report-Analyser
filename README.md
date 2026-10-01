# Financial Report Analyzer

A full-stack, Retrieval-Augmented Generation (RAG) application designed to allow users to upload, index, and semantically query lengthy financial documents (such as 10-K and 10-Q reports). 

This project was built for Lab 9 (Activity 1 - RAG-Based Domain Assistant).

## Tech Stack
*   **Frontend**: React (Vite)
*   **Backend**: Python FastAPI
*   **RAG Engine**: LangChain
*   **Embeddings**: HuggingFace `all-MiniLM-L6-v2`
*   **Vector Database**: In-Memory FAISS
*   **LLM**: Groq API (using OpenAI compatibility layer)

## Prerequisites
*   Python 3.9+
*   Node.js & npm
*   A free [Groq API Key](https://console.groq.com/keys)

## Setup & Installation

### 1. Backend Setup
Navigate to the backend directory and install the requirements:
```bash
cd backend
pip install -r requirements.txt
```

Run the FastAPI server:
```bash
uvicorn main:app --reload --port 8000
```

### 2. Frontend Setup
Open a new terminal, navigate to the frontend directory, and install dependencies:
```bash
cd frontend
npm install
```

Start the React development server:
```bash
npm run dev
```

### 3. Usage
1. Open your browser to `http://localhost:5173`.
2. On the Setup page, enter your Groq API Key and initialize the engine.
3. Paste a financial document or click "Load Sample Report", then index the document.
4. Navigate to the "Analyze" tab and ask financial queries (e.g., "What was the total revenue?"). The system will answer and provide exact citations from the text.

## Architecture
See the `architecture_diagram.md` and `technical_report.md` for full details on the RAG pipeline and LangChain components used.
