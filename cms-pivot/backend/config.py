# Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    bigquery_project: str = ""
    bigquery_dataset: str = "pivot"
    google_credentials_path: str = ""
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.0-flash"
    data_dir: str = "data"

    class Config:
        env_file = ".env"


settings = Settings()
