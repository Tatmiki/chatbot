from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional

class UserLogin(BaseModel):
    email: str
    password: str

class MessageBase(BaseModel):
    question: str
    answer: str

class MessageCreate(MessageBase):
    pass

class MessageUpdate(BaseModel):
    question: Optional[str]
    answer: Optional[str]

class MessageOut(MessageBase):
    id: int
    timestamp: datetime

    class Config:
        orm_mode = True

class UserBase(BaseModel):
    email: str

class UserCreate(UserBase):
    password: str

class UserOut(UserBase):
    id: int
    messages: List[MessageOut] = []

    class Config:
        orm_mode = True
