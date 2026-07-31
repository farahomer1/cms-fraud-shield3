# Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import asyncio
import json
import logging
import time
from typing import Any

from google import genai
from google.genai import types

from config import settings

logger = logging.getLogger(__name__)

_client: genai.Client | None = None


def get_client() -> genai.Client:
    global _client
    if _client is None:
        _client = genai.Client(api_key=settings.gemini_api_key)
    return _client


async def generate_text(
    prompt: str,
    system_prompt: str | None = None,
    history: list[dict[str, str]] | None = None,
    temperature: float = 0.7,
) -> tuple[str, int]:
    """Generate text from Gemini. Returns (response_text, latency_ms)."""
    client = get_client()
    start = time.time()

    contents = []
    if history:
        for msg in history:
            role = "user" if msg["role"] == "user" else "model"
            contents.append(types.Content(role=role, parts=[types.Part.from_text(text=msg["content"])]))
    contents.append(types.Content(role="user", parts=[types.Part.from_text(text=prompt)]))

    config = types.GenerateContentConfig(
        temperature=temperature,
        max_output_tokens=4096,
    )
    if system_prompt:
        config.system_instruction = system_prompt

    response = await asyncio.to_thread(
        client.models.generate_content,
        model=settings.gemini_model,
        contents=contents,
        config=config,
    )

    latency_ms = int((time.time() - start) * 1000)
    return response.text or "", latency_ms


async def generate_json(
    prompt: str,
    system_prompt: str | None = None,
    temperature: float = 0.3,
) -> tuple[dict[str, Any], int]:
    """Generate structured JSON from Gemini. Returns (parsed_json, latency_ms)."""
    client = get_client()
    start = time.time()

    config = types.GenerateContentConfig(
        temperature=temperature,
        max_output_tokens=8192,
        response_mime_type="application/json",
    )
    if system_prompt:
        config.system_instruction = system_prompt

    response = await asyncio.to_thread(
        client.models.generate_content,
        model=settings.gemini_model,
        contents=prompt,
        config=config,
    )

    latency_ms = int((time.time() - start) * 1000)
    text = response.text or "{}"
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        parsed = {"raw_response": text}
    return parsed, latency_ms


async def generate_multimodal(
    prompt: str,
    file_bytes: bytes,
    mime_type: str,
    system_prompt: str | None = None,
    temperature: float = 0.3,
) -> tuple[dict[str, Any], int]:
    """Generate structured JSON from multimodal input (PDF/image + text). Returns (parsed_json, latency_ms)."""
    client = get_client()
    start = time.time()

    config = types.GenerateContentConfig(
        temperature=temperature,
        max_output_tokens=8192,
        response_mime_type="application/json",
    )
    if system_prompt:
        config.system_instruction = system_prompt

    contents = [
        types.Content(
            role="user",
            parts=[
                types.Part.from_bytes(data=file_bytes, mime_type=mime_type),
                types.Part.from_text(text=prompt),
            ],
        )
    ]

    response = await asyncio.to_thread(
        client.models.generate_content,
        model=settings.gemini_model,
        contents=contents,
        config=config,
    )

    latency_ms = int((time.time() - start) * 1000)
    text = response.text or "{}"
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        parsed = {"raw_response": text}
    return parsed, latency_ms


async def health_check() -> dict[str, Any]:
    """Test Gemini connectivity with a simple prompt."""
    try:
        response_text, latency_ms = await generate_text(
            prompt="Respond with exactly: PIVOT system online.",
            temperature=0.0,
        )
        return {
            "status": "connected",
            "model": settings.gemini_model,
            "latency_ms": latency_ms,
            "response": response_text.strip(),
        }
    except Exception as e:
        return {
            "status": "error",
            "model": settings.gemini_model,
            "error": str(e),
        }
