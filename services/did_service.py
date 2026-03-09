"""
services/did_service.py - D-ID API for photo-to-talking-face video
"""
import os
import httpx
import base64
import asyncio
from dotenv import load_dotenv

load_dotenv()

DID_API_KEY = os.getenv("DID_API_KEY", "")
DID_BASE_URL = "https://api.d-id.com"


def _get_headers():
    credentials = base64.b64encode(f"{DID_API_KEY}:".encode()).decode()
    return {
        "Authorization": f"Basic {credentials}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }


async def create_talking_video(
    image_url: str,
    audio_url: str = None,
    audio_base64: str = None,
    audio_mime: str = "audio/mpeg",
) -> str:
    """
    Create a talking face video from a photo + audio.
    Returns the video URL when ready.
    image_url: publicly accessible URL of the face photo
    audio_url OR audio_base64: the speech audio
    """
    if not DID_API_KEY:
        raise ValueError("DID_API_KEY not set in .env")

    # Build audio source
    if audio_base64:
        audio_source = {
            "type": "base64",
            "value": audio_base64,
            "mime_type": audio_mime,
        }
    elif audio_url:
        audio_source = {
            "type": "url",
            "url": audio_url,
        }
    else:
        raise ValueError("Must provide audio_url or audio_base64")

    payload = {
        "source_url": image_url,
        "script": {
            "type": "audio",
            "audio_url": audio_url,
        } if audio_url else {
            "type": "audio",
            "audio_url": None,
        },
        "driver_url": "bank://lively/",
        "config": {
            "fluent": True,
            "pad_audio": 0.0,
            "stitch": True,
        },
    }

    # If base64 audio, use different payload
    if audio_base64:
        payload = {
            "source_url": image_url,
            "script": {
                "type": "audio",
                "audio_url": f"data:{audio_mime};base64,{audio_base64}",
            },
            "driver_url": "bank://lively/",
            "config": {
                "fluent": True,
                "pad_audio": 0.0,
                "stitch": True,
            },
        }

    async with httpx.AsyncClient(timeout=60) as client:
        # Create the talk
        resp = await client.post(
            f"{DID_BASE_URL}/talks",
            headers=_get_headers(),
            json=payload,
        )
        if resp.status_code not in (200, 201):
            raise ValueError(f"D-ID create error {resp.status_code}: {resp.text}")

        talk_id = resp.json().get("id")
        if not talk_id:
            raise ValueError("No talk ID returned from D-ID")

        # Poll until done (max 60 seconds)
        for _ in range(30):
            await asyncio.sleep(2)
            status_resp = await client.get(
                f"{DID_BASE_URL}/talks/{talk_id}",
                headers=_get_headers(),
            )
            data = status_resp.json()
            status = data.get("status")

            if status == "done":
                video_url = data.get("result_url")
                if not video_url:
                    raise ValueError("No result_url in D-ID response")
                return video_url

            if status == "error":
                raise ValueError(f"D-ID processing error: {data.get('description', 'unknown')}")

        raise TimeoutError("D-ID video generation timed out after 60 seconds")


async def upload_image_to_did(image_bytes: bytes, filename: str = "avatar.jpg") -> str:
    """
    Upload an image to D-ID and get back a hosted URL.
    """
    if not DID_API_KEY:
        raise ValueError("DID_API_KEY not set in .env")

    credentials = base64.b64encode(f"{DID_API_KEY}:".encode()).decode()
    headers = {
        "Authorization": f"Basic {credentials}",
        "Accept": "application/json",
    }

    async with httpx.AsyncClient(timeout=30) as client:
        files = {"image": (filename, image_bytes, "image/jpeg")}
        resp = await client.post(
            f"{DID_BASE_URL}/images",
            headers=headers,
            files=files,
        )
        if resp.status_code not in (200, 201):
            raise ValueError(f"D-ID image upload error {resp.status_code}: {resp.text}")

        data = resp.json()
        url = data.get("url") or data.get("id")
        if not url:
            raise ValueError("No URL returned from D-ID image upload")
        return url
