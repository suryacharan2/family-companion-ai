import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

LANGUAGE_NAMES = {
    "en": "English", "hi": "Hindi", "te": "Telugu",
    "ta": "Tamil", "es": "Spanish", "fr": "French", "ar": "Arabic",
}

SYSTEM_PROMPTS = {
   "mother":  "You are a warm caring mother aged 35-42. Loving and nurturing. Ask about food and health naturally. Use endearments like sweetheart, my dear, honey, darling. Never use the word 'beta'. Comfort first, advice second. Keep responses 2-4 sentences.",
    "father":  "You are a calm wise father aged 38-45. Firm but loving. Give practical advice. Motivational tone. Use: son, daughter, trust me on this. Keep responses 2-4 sentences.",
    "brother": "You are a fun loyal brother aged 20-26. Casual and cool. Use: bro, dude, man. Humor first then real support. Keep responses 2-3 sentences.",
    "sister":  "You are a caring fun sister aged 18-24. Warm and excited. Deep empathy. Hype them up. Keep responses 2-4 sentences.",
}

EMOTION_KEYWORDS = {
    "sad":     ["sad", "cry", "upset", "unhappy", "depressed", "lonely", "heartbroken", "hurt"],
    "anxious": ["anxious", "worried", "nervous", "scared", "panic", "stress", "overwhelmed"],
    "angry":   ["angry", "mad", "furious", "annoyed", "frustrated", "hate"],
    "happy":   ["happy", "excited", "amazing", "great", "wonderful", "love", "joy", "awesome"],
    "proud":   ["proud", "achieved", "won", "promoted", "passed", "graduated"],
}


def detect_emotion(message: str) -> str:
    msg = message.lower()
    for emotion, keywords in EMOTION_KEYWORDS.items():
        if any(kw in msg for kw in keywords):
            return emotion
    return "neutral"


def is_noise_transcription(text: str) -> bool:
    if not text or len(text.strip()) < 2:
        return True
    words = text.strip().split()
    if len(words) > 4:
        most_common = max(set(words), key=words.count)
        if words.count(most_common) / len(words) > 0.6:
            return True
    return False


def _build_messages(relation_type, user_message, conversation_history=None,
                    user_name=None, language="en", memories=None):
    system_prompt = SYSTEM_PROMPTS.get(relation_type, SYSTEM_PROMPTS["mother"])

    if user_name:
        system_prompt += f" The user's name is {user_name}."

    # Inject long-term memories into system prompt
    if memories:
        facts = "\n".join([
            f"- {m['fact_key'].replace('_', ' ')}: {m['fact_value']}"
            for m in memories
        ])
        system_prompt += (
            f"\n\nImportant things you already know about this person "
            f"(use naturally in conversation, never ask about these again):\n{facts}"
        )

    lang_name = LANGUAGE_NAMES.get(language, "English")
    if language and language != "en":
        system_prompt += (
            f" IMPORTANT: You MUST reply ONLY in {lang_name}."
            f" Do NOT use any English in your response."
        )
    else:
        system_prompt += " IMPORTANT: Always reply in English only."

    messages = []
    for entry in (conversation_history or [])[-6:]:
        if entry.get("message"):
            messages.append({"role": "user",      "content": entry["message"]})
        if entry.get("response"):
            messages.append({"role": "assistant", "content": entry["response"]})
    messages.append({"role": "user", "content": user_message})
    return [{"role": "system", "content": system_prompt}] + messages


def _get_client():
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise ValueError("GROQ_API_KEY not set in .env file")
    return Groq(api_key=api_key)


async def generate_response(relation_type, user_message, conversation_history=None,
                            user_name=None, language="en", memories=None):
    client = _get_client()
    messages = _build_messages(relation_type, user_message,
                               conversation_history, user_name, language, memories)
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=messages,
        max_tokens=300,
        temperature=0.85,
    )
    return response.choices[0].message.content.strip()


def generate_response_stream(relation_type, user_message, conversation_history=None,
                             user_name=None, language="en", memories=None):
    client = _get_client()
    messages = _build_messages(relation_type, user_message,
                               conversation_history, user_name, language, memories)
    stream = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=messages,
        max_tokens=300,
        temperature=0.85,
        stream=True,
    )
    for chunk in stream:
        delta = chunk.choices[0].delta
        if delta and delta.content:
            yield delta.content