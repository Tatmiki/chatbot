from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests

app = FastAPI()

# CORS para permitir conexões do frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PromptRequest(BaseModel):
    prompt: str

@app.post("/chat")
async def chat(request: PromptRequest):
    response = requests.post(
        "http://ollama:11434/api/generate",
        json={"model": "llama3.2", "prompt": request.prompt, "stream": False}
    )
    data = response.json()
    return {"response": data.get("response", "Erro na resposta")}