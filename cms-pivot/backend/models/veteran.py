# Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

"""Veteran model for BigQuery."""

import json
import uuid
from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Any


@dataclass
class Veteran:
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    name_display: str = ""
    ssn_last4: str = ""
    date_of_birth: date | None = None
    date_of_death: date | None = None
    vital_status: str = "alive"
    service_branch: str | None = None
    disability_rating: int | None = None
    benefits_enrolled: list | None = None
    created_at: datetime | None = None

    @classmethod
    def from_bq_row(cls, row) -> "Veteran":
        benefits = row.benefits_enrolled
        if isinstance(benefits, str):
            benefits = json.loads(benefits)
        return cls(
            id=row.id,
            name_display=row.name_display,
            ssn_last4=row.ssn_last4,
            date_of_birth=row.date_of_birth,
            date_of_death=row.date_of_death,
            vital_status=row.vital_status or "alive",
            service_branch=row.service_branch,
            disability_rating=row.disability_rating,
            benefits_enrolled=benefits,
            created_at=row.created_at,
        )

    def to_dict(self) -> dict[str, Any]:
        # Map military service branch to a CMS Coverage Group/Medicare Plan
        branch = self.service_branch
        if branch:
            branch_lower = branch.lower()
            if "army" in branch_lower:
                branch = "Medicare Plan A/B (Fee-for-Service)"
            elif "navy" in branch_lower:
                branch = "Medicare Plan A/B (Part A & B)"
            elif "air force" in branch_lower:
                branch = "Medicare Advantage (Part C - HMO)"
            elif "marines" in branch_lower or "marine" in branch_lower:
                branch = "Medicare Advantage (Part C - PPO)"
            elif "coast guard" in branch_lower:
                branch = "Medicare Part D (Prescription Drug Plan)"
            else:
                branch = "Medicare Part A & B"
        else:
            branch = "Medicare Part A & B"

        # Map VA benefits list to CMS/Medicare equivalents
        benefits = self.benefits_enrolled or []
        cms_benefits = []
        for b in benefits:
            b_lower = b.lower()
            if "pension" in b_lower:
                cms_benefits.append("Medicare Part A (Hospital Insurance)")
            elif "disability" in b_lower or "compensation" in b_lower:
                cms_benefits.append("Medicare Part B (Medical Insurance)")
            elif "health" in b_lower:
                cms_benefits.append("Medicare Part B (Medical Insurance)")
            elif "education" in b_lower or "gi bill" in b_lower:
                cms_benefits.append("Medicare Part D (Prescription Drug Coverage)")
            else:
                cms_benefits.append(f"Medicare {b}")
        if not cms_benefits:
            cms_benefits = ["Medicare Part A", "Medicare Part B"]

        return {
            "id": self.id,
            "name_display": self.name_display,
            "ssn_last4": self.ssn_last4,
            "date_of_birth": self.date_of_birth.isoformat() if self.date_of_birth else None,
            "date_of_death": self.date_of_death.isoformat() if self.date_of_death else None,
            "vital_status": self.vital_status,
            "service_branch": branch,
            "disability_rating": self.disability_rating,
            "benefits_enrolled": cms_benefits,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

