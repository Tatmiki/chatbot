from sqlalchemy.orm import Session
from sqlalchemy import asc
from models import User, Message
from schemas import UserCreate, MessageCreate, MessageUpdate
from passlib.hash import bcrypt
from passlib.context import CryptContext
from fastapi import HTTPException

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def get_user_by_email(db: Session, email: str):
    return db.query(User).filter(User.email == email).first()


def create_user(db: Session, user: UserCreate):
    hashed = pwd_context.hash(user.password)
    db_user = User(email=user.email, hashed_password=hashed)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def create_message(db: Session, user_id: int, msg: MessageCreate):
    db_msg = Message(**msg.dict(), user_id=user_id)
    db.add(db_msg)
    db.commit()
    db.refresh(db_msg)
    return db_msg

def get_messages(db: Session, user_id: int):
    return (
        db.query(Message)
          .filter(Message.user_id == user_id)
          .order_by(asc(Message.timestamp))
          .all()
    )

def update_message(db: Session, msg_id: int, msg_data: MessageUpdate):
    msg = db.query(Message).filter(Message.id == msg_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Mensagem não encontrada")
    
    msg.question = msg_data.question
    msg.answer = msg_data.answer
    db.commit()
    db.refresh(msg)
    return msg

def delete_user_messages(db: Session, user_id: int):
    db.query(Message).filter(Message.user_id == user_id).delete()
    db.commit()
