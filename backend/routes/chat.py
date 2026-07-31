# Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import json
import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from google.cloud import bigquery

from database import get_db, get_dataset, run_query, run_dml, insert_rows
from models.chat_message import ChatMessage
from schemas.chat import ChatMessageResponse, ChatRequest

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/claims", tags=["chat"])


@router.post("/{claim_id}/chat", response_model=ChatMessageResponse)
async def chat_with_claim(claim_id: str, body: ChatRequest, bq: bigquery.Client = Depends(get_db)):
    from services.chat_service import generate_chat_response

    now = datetime.now(timezone.utc)
    user_msg_id = str(uuid.uuid4())

    # Save user message
    await insert_rows("chat_messages", [{
        "id": user_msg_id,
        "claim_id": claim_id,
        "role": "user",
        "content": body.message,
        "created_at": now.isoformat(),
    }])

    try:
        response_text = await generate_chat_response(claim_id, body.message, bq)
    except Exception:
        logger.exception("Failed to generate chat response for claim %s", claim_id)
        raise HTTPException(status_code=500, detail="Failed to generate response. Please try again.")

    assistant_msg_id = str(uuid.uuid4())
    assistant_now = datetime.now(timezone.utc)

    # Save assistant message
    await insert_rows("chat_messages", [{
        "id": assistant_msg_id,
        "claim_id": claim_id,
        "role": "assistant",
        "content": response_text,
        "created_at": assistant_now.isoformat(),
    }])

    # Audit log
    await insert_rows("audit_log", [{
        "id": str(uuid.uuid4()),
        "timestamp": assistant_now.isoformat(),
        "actor": body.sessionUser,
        "actor_type": "human",
        "action_type": "chat",
        "claim_id": claim_id,
        "details": json.dumps({"message": body.message[:100]}),
        "confidence_score": None,
    }])

    return ChatMessage(
        id=assistant_msg_id,
        claim_id=claim_id,
        role="assistant",
        content=response_text,
        created_at=assistant_now,
    ).to_dict()


@router.get("/{claim_id}/chat/history", response_model=list[ChatMessageResponse])
async def get_chat_history(claim_id: str, bq: bigquery.Client = Depends(get_db)):
    ds = get_dataset()
    rows = await run_query(
        f"SELECT * FROM `{ds}.chat_messages` WHERE claim_id = @claim_id ORDER BY created_at",  # nosec B608 - dataset identifier validated in get_dataset(); user input parameterized
        [bigquery.ScalarQueryParameter("claim_id", "STRING", claim_id)],
    )
    return [ChatMessage.from_bq_row(r).to_dict() for r in rows]


@router.delete("/{claim_id}/chat/clear")
async def clear_chat_history(claim_id: str, bq: bigquery.Client = Depends(get_db)):
    ds = get_dataset()
    await run_dml(
        f"DELETE FROM `{ds}.chat_messages` WHERE claim_id = @claim_id",  # nosec B608 - dataset identifier validated in get_dataset(); user input parameterized
        [bigquery.ScalarQueryParameter("claim_id", "STRING", claim_id)],
    )
    return {"status": "success", "message": "Chat history cleared"}

