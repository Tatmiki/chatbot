from fastapi import FastAPI, Request, Depends, HTTPException
from sqlalchemy.orm import Session
from database import SessionLocal, engine, Base
import crud, schemas
from models import User
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
import bcrypt

from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

Base.metadata.create_all(bind=engine)
app = FastAPI()

# CORS para permitir conexões do frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

#---------------------------------------------------------------#
### API DO BANCO DE DADOS
#---------------------------------------------------------------#

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# VERIFICA A EXISTÊNCIA DE UM EMAIL CADASTRADO, SE NÃO EXISTIR, CRIA
@app.post("/users/", response_model=schemas.UserOut)
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = crud.get_user_by_email(db, user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    return crud.create_user(db, user)

# RETORNA OS DADOS DE UM USUÁRIO DADO SEU EMAIL
@app.get("/users/{email}", response_model=schemas.UserOut)
def get_user_data(email: str, db: Session = Depends(get_db)):
    user = crud.get_user_by_email(db, email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# EFETUA A AUTENTICAÇÃO DE LOGIN (VERIFICANDO A EXISTÊNCIA DO EMAIL E AUTENTICAÇÃO DA SENHA)
@app.post("/login/")
def login(user: schemas.UserLogin, db: Session = Depends(get_db)):
    db_user = crud.get_user_by_email(db, user.email)
    if not db_user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not pwd_context.verify(user.password.encode('utf-8'), db_user.hashed_password.encode('utf-8')):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    return {"id": db_user.id, "email": db_user.email}

# ARMAZENA UMA MENSAGEM NO BANCO DE UM USUÁRIO
@app.post("/users/{user_id}/messages", response_model=schemas.MessageOut)
def post_message(user_id: int, msg: schemas.MessageCreate, db: Session = Depends(get_db)):
    return crud.create_message(db, user_id, msg)

# RECUPERA AS MENSAGENS RELACIONADAS A UM USUÁRIO
@app.get("/users/{user_id}/messages", response_model=list[schemas.MessageOut])
def list_messages(user_id: int, db: Session = Depends(get_db)):
    return crud.get_messages(db, user_id)

# ATUALIZA UMA MENSAGEM (POR SUBSTITUIÇÃO) NO BANCO
@app.put("/messages/{msg_id}", response_model=schemas.MessageOut)
def edit_message(msg_id: int, msg: schemas.MessageUpdate, db: Session = Depends(get_db)):
    return crud.update_message(db, msg_id, msg)

# DELETA TODAS AS MENSAGENS DE UM DETERMINADO USUÁRIO
@app.delete("/users/{user_id}/messages")
def delete_messages(user_id: int, db: Session = Depends(get_db)):
    crud.delete_user_messages(db, user_id)
    return {"detail": "Messages deleted"}

#---------------------------------------------------------------#
### API DA IA
#---------------------------------------------------------------#

def build_context(db: Session, user_id: int) -> str:
    msgs = crud.get_messages(db, user_id)
    history = ""
    for m in msgs:
        history += f"Usuário: {m.question}\n"
        history += f"Assistente: {m.answer}\n"
    return history

class PromptRequest(BaseModel):
    user_id: int         # agora inclui o ID do usuário
    prompt: str

# POST PARA RECEBER RESPOSTAS DA IA COM CONTEXTO
@app.post("/chat")
async def chat(request: PromptRequest, db: Session = Depends(get_db)):
    ctx = build_context(db, request.user_id)
    full_prompt = f"{ctx}Usuário: {request.prompt}\nAssistente:"

    response = requests.post(
        "http://ollama:11434/api/generate",
        json={"model": "llama3.2", "prompt": full_prompt, "stream": False},
        timeout=600
    )
    data = response.json()
    return {"response": data.get("response", "Erro na resposta")}