from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, ForeignKey, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./companion.db")
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    messages = relationship("Message", back_populates="user", cascade="all, delete")
    memories = relationship("LongTermMemory", back_populates="user", cascade="all, delete")
    voice_profiles = relationship("VoiceProfile", back_populates="user", cascade="all, delete")
    avatar_profiles = relationship("AvatarProfile", back_populates="user", cascade="all, delete")


class VoiceProfile(Base):
    __tablename__ = "voice_profiles"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    relation_type = Column(String, nullable=False)
    voice_id = Column(String, nullable=False)
    voice_name = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
    user = relationship("User", back_populates="voice_profiles")


class AvatarProfile(Base):
    __tablename__ = "avatar_profiles"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    relation_type = Column(String, nullable=False)
    image_url = Column(String, nullable=False)
    local_filename = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
    user = relationship("User", back_populates="avatar_profiles")


class Message(Base):
    __tablename__ = "messages"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    relation_type = Column(String, nullable=False)
    role = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    emotion = Column(String, default="neutral")
    created_at = Column(DateTime, default=datetime.utcnow)
    user = relationship("User", back_populates="messages")


class LongTermMemory(Base):
    __tablename__ = "long_term_memory"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    relation_type = Column(String, nullable=False)
    fact_key = Column(String, nullable=False)
    fact_value = Column(Text, nullable=False)
    confidence = Column(Float, default=1.0)
    last_updated = Column(DateTime, default=datetime.utcnow)
    user = relationship("User", back_populates="memories")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    Base.metadata.create_all(bind=engine)
    print("✅ Database initialized successfully")