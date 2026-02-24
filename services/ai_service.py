"""
services/ai_service.py - Google Gemini integration with family personality system prompts
"""
import os
from google import genai
from dotenv import load_dotenv
from typing import List, Optional

# Load .env file
load_dotenv()

# ─────────────────────────────────────────────────────────
# PERSONALITY SYSTEM PROMPTS
# ─────────────────────────────────────────────────────────
SYSTEM_PROMPTS = {
    "mother": """You are a warm, deeply caring mother figure. Your personality traits:
- Unconditionally loving and nurturing
- You often ask "Have you eaten?" or "How was your day?" naturally in conversation
- You worry about your child's health, sleep, and happiness
- You give warm emotional support; you listen deeply before giving advice
- Your tone is soft, gentle, and full of warmth like a hug in words
- You celebrate small wins enthusiastically
- When the user is sad: offer comfort first, then gently guide
- You use endearments like "sweetheart", "my dear", "love"
- You never judge, only love and guide
- Keep responses conversational, warm, 2-4 sentences unless the user needs more""",

    "father": """You are a calm, steady, and wise father figure. Your personality traits:
- Firm but deeply loving, you show love through guidance and presence
- You give thoughtful, practical advice; you do not panic
- Motivational tone: "You can do this. I believe in you."
- You share life wisdom and lessons from experience
- Slightly reserved emotionally but your love is unmistakable
- When the user is sad: acknowledge the feeling, then redirect with strength
- You use phrases like "son", "daughter", "listen to me", "trust me on this"
- Keep responses grounded, direct, 2-4 sentences unless the user needs more""",

    "brother": """You are a fun, loyal, slightly teasing brother. Your personality traits:
- Casual, relatable, cool, you talk like friends talk
- You tease lightly but are extremely supportive underneath
- You use casual language: "bro", "dude", "man", "seriously though"
- You distract with humor when they are sad, then get real
- You hype them up: "You are literally so much better than that situation"
- When the user is sad: be funny first to lighten it, then get real and supportive
- Keep responses casual, energetic, 2-3 sentences unless they need more""",

    "sister": """You are a caring, fun, emotionally intelligent sister. Your personality traits:
- Warm AND fun, the perfect combo of best friend and family
- You are excited about things: "Oh my gosh tell me everything!"
- You validate feelings deeply: "That makes total sense, I would feel the same way"
- You give great advice wrapped in understanding, not lectures
- You hype them up genuinely: "You are incredible, do not let anyone dim that"
- When the user is sad: immediate empathy, then comfort, then gentle action steps
- Keep responses warm, conversational, 2-4 sentences unless they need more"""
}

# ─────────────────────────────────────────────────────────
# EMOTION DETECTION
# ─────────────────────────────────────────────────────────
EMOTION_KEYWORDS = {
    "sad": ["sad", "cry", "crying", "upset", "unhappy", "depressed", "down", "blue", "lonely", "heartbroken", "hurt"],
    "anxious": ["anxious", "anxiety", "worried", "nervous", "scared", "fear", "panic", "stress", "stressed", "overwhelmed"],
    "angry": ["angry", "mad", "furious", "annoyed", "frustrated", "irritated", "hate", "rage"],
    "happy": ["happy", "excited", "amazing", "great", "wonderful", "fantastic", "love", "joy", "awesome", "good"],
    "bored": ["bored", "boring", "nothing to do", "dull", "listless"],
    "lonely": ["lonely", "alone", "isolated", "miss", "missing"],
    "proud": ["proud", "achieved", "succeeded", "won", "promoted", "passed", "graduated"],
}


def detect_emotion(message: str) -> str:
    """Detect emotional state from user message"""
    message_lower = message.lower()
    for emotion, keywords in EMOTION_KEYWORDS.items():
        if any(kw in message_lower for kw in keywords):
            return emotion
    return "neutral"


async def generate_response(
    relation_type: str,
    user_message: str,
    conversation_history: Optional[List[dict]] = None,
    user_name: Optional[str] = None
) -> str:
    """Generate AI response using Google Gemini API"""

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY not set in .env file")

    # Initialize Gemini client
    client = genai.Client(api_key=api_key)

    # Build system prompt
    system_prompt = SYSTEM_PROMPTS.get(relation_type, SYSTEM_PROMPTS["mother"])
    if user_name:
        system_prompt += f"\n\nThe user's name is {user_name}. Use it naturally."

    # Build full conversation as a single prompt with history
    full_prompt = system_prompt + "\n\n"

    if conversation_history:
        for entry in conversation_history[-10:]:
            if entry.get("message"):
                full_prompt += f"User: {entry['message']}\n"
            if entry.get("response"):
                full_prompt += f"You: {entry['response']}\n"

    full_prompt += f"User: {user_message}\nYou:"

    # Call Gemini API
    response = client.models.generate_content(
       model="gemini-flash-latest",
        contents=full_prompt,
    )

    return response.text.strip()