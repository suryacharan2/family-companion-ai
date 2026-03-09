import os
import httpx
from dotenv import load_dotenv

load_dotenv()

ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "")

DEFAULT_VOICES = {
    "mother": "21m00Tcm4TlvDq8ikWAM",
    "father": "TxGEqnHWrfWFTfGW9XjX",
    "brother": "VR6AewLTigWG4xSOukaG",
    "sister":  "EXAVITQu4vr4xnSDxMaL",
}

EMOTION_PREFIXES = {
    "sad":     "(softly, with empathy) ",
    "anxious": "(calmly, reassuring) ",
    "angry":   "(gently, with patience) ",
    "happy":   "(warmly, with joy) ",
    "proud":   "(proudly, with warmth) ",
    "neutral": "",
}

VOICE_SETTINGS = {
    "mother":  {"stability": 0.75, "similarity_boost": 0.85, "style": 0.35},
    "father":  {"stability": 0.80, "similarity_boost": 0.80, "style": 0.25},
    "brother": {"stability": 0.60, "similarity_boost": 0.75, "style": 0.50},
    "sister":  {"stability": 0.65, "similarity_boost": 0.80, "style": 0.45},
}


async def synthesize_speech(
    text: str,
    relation: str,
    emotion: str = "neutral",
    language: str = "en",
    custom_voice_id: str = None,
) -> bytes:
    if not ELEVENLABS_API_KEY:
        raise ValueError("ELEVENLABS_API_KEY not set")

    voice_id = custom_voice_id or DEFAULT_VOICES.get(relation, DEFAULT_VOICES["mother"])
    prefix = EMOTION_PREFIXES.get(emotion, "")
    full_text = prefix + text[:450]
    settings = VOICE_SETTINGS.get(relation, VOICE_SETTINGS["mother"])

    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
    headers = {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
    }
    payload = {
        "text": full_text,
        "model_id": "eleven_multilingual_v2",
        "voice_settings": {
            "stability": settings["stability"],
            "similarity_boost": settings["similarity_boost"],
            "style": settings["style"],
            "use_speaker_boost": True,
        },
    }

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(url, headers=headers, json=payload)
        if resp.status_code != 200:
            print(f"ElevenLabs error {resp.status_code}: {resp.text}")
            raise ValueError(f"ElevenLabs error {resp.status_code}: {resp.text}")
        return resp.content