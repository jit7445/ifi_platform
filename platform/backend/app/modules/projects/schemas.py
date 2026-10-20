from datetime import datetime
from typing import Literal

from pydantic import Field

from Frontier_platform.platform.backend.app.core.schemas import StrictModel

TaskType = Literal["rubric_scoring", "pairwise_preference", "sft_correction"]
Difficulty = Literal["general", "professional", "expert"]
Deliverable = Literal["evaluation_results", "sft", "preference_pairs"]


class Quality(StrictModel):
    overlap_k: int = Field(ge=1, le=5)
    review_rate: float = Field(ge=0, le=1)
    gold_rate: float = Field(ge=0, le=0.3)
    agreement_threshold: float = Field(ge=0, le=1)


class RequiredSkill(StrictModel):
    skill_key: str = Field(min_length=1, max_length=64)
    min_level: int = Field(ge=1, le=5)


class ProjectCreate(StrictModel):
    name: str = Field(min_length=1, max_length=200)
    code: str = Field(pattern=r"^[A-Z0-9-]{2,24}$")
    description: str = Field(default="", max_length=10000)
    domain: str = Field(default="", max_length=200)
    task_type: TaskType
    languages: list[str] = Field(default_factory=lambda: ["en"], min_length=1, max_length=20)
    difficulty: Difficulty = "professional"
    target_volume: int = Field(default=0, ge=0, le=10_000_000)
    deadline: datetime | None = None
    deliverable_format: Deliverable = "evaluation_results"
    quality: Quality = Quality(overlap_k=1, review_rate=0.1, gold_rate=0.0, agreement_threshold=0.667)
    required_skills: list[RequiredSkill] = Field(default_factory=list, max_length=50)
    excluded_companies: list[str] = Field(default_factory=list, max_length=200)


class ProjectPatch(StrictModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=10000)
    domain: str | None = Field(default=None, max_length=200)
    languages: list[str] | None = Field(default=None, min_length=1, max_length=20)
    difficulty: Difficulty | None = None
    target_volume: int | None = Field(default=None, ge=0, le=10_000_000)
    deadline: datetime | None = None
    deliverable_format: Deliverable | None = None
    quality: Quality | None = None
    required_skills: list[RequiredSkill] | None = Field(default=None, max_length=50)
    excluded_companies: list[str] | None = Field(default=None, max_length=200)


class NoteIn(StrictModel):
    note: str = Field(min_length=1, max_length=5000)
