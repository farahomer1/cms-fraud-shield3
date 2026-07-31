#!/usr/bin/env bash
# Deploy the agent to Vertex AI Agent Engine on your Argolis project.
#
# Prereqs (one time):
#   gcloud auth login
#   gcloud config set project "$PROJECT"
#   gcloud services enable aiplatform.googleapis.com
#   pip install "google-adk[vertexai]>=2.4.0"
#
# Uses the ADK CLI (version-stable), not the Python Agent Engine SDK, so it won't
# break as that SDK churns. Requirements and .env are picked up from the agent dir.

set -euo pipefail

PROJECT="${GOOGLE_CLOUD_PROJECT:?set GOOGLE_CLOUD_PROJECT to your Argolis project}"
REGION="${GOOGLE_CLOUD_LOCATION:-us-central1}"

adk deploy agent_engine \
  --project="$PROJECT" \
  --region="$REGION" \
  --display_name="Enrollment Integrity Analyst" \
  --description="Front-door enrollment fraud screening + adversarial hardening probe" \
  --otel_to_cloud \
  enrollment_agent

# --otel_to_cloud turns on OpenTelemetry tracing in Agent Engine — the audit trail
# a federal deployment wants. To update an existing instance instead of creating a
# new one, add: --agent_engine_id=<resource_id>
