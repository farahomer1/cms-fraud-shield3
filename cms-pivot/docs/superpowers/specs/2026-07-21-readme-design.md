# README.md Design — PIVOT

**Date:** 2026-07-21
**Status:** Approved
**Deliverable:** A single, comprehensive `README.md` at the repo root. No other files change (aside from this spec).

## Goal

Produce a detailed, verbose, professionally polished README that lets an engineer take over the PIVOT project: what it is, how it's architected (with Mermaid diagrams), how to run it locally, how to deploy it, and how to extend it. Visual bar: "something a professional Google engineer would create" — hero header, tech badges, clean tables, working diagrams on GitHub.

## Decisions (from brainstorm)

- **Structure:** single epic README with a linked table of contents; no `docs/` split.
- **Deployment story:** backend container on **Cloud Run**, frontend on **Firebase Hosting**. Unknown identifiers (project ID, service name) use `<PLACEHOLDER>` style.
- **Diagrams (Mermaid, all four):** system architecture flowchart, batch SSE sequence diagram, BigQuery ER diagram, agent class/registry diagram.
- **Header:** full hero treatment — centered HTML title + tagline, shields.io badge rows (Python 3.13, FastAPI, React 18, TypeScript, Vite, MUI, BigQuery, Gemini, Cloud Run, Firebase, Docker + status badges). No custom SVG banner asset.
- **Optional sections — all included:** API endpoint reference, fraud agent catalog, annotated project structure tree, testing + troubleshooting/FAQ.

## Section outline

1. **Hero header** — centered title/tagline/description; two badge rows; table of contents with anchor links.
2. **Overview** — what PIVOT is (VA payment-integrity GPS demo), problem statement, key capabilities (AI fraud agents, SSE batch processing, auditor workflows, analytics dashboards), explicit synthetic-data callout.
3. **Architecture** — prose + four Mermaid diagrams:
   - *System architecture* (flowchart with subgraphs for Firebase Hosting, Cloud Run, GCP services): browser → frontend → FastAPI routes → services → agents/database → BigQuery + Gemini.
   - *Batch SSE sequence*: client → `routes/batches.py` → `services/batch_service.py` → each registered agent → `services/gemini_client.py` → SSE events → `frontend/src/hooks/useBatchProcessing.ts`. Note the no-Gemini fast path (`fake_batch_service.py`) and the requirement to keep both paths + frontend in sync.
   - *BigQuery ER diagram*: entities and relationships derived from `backend/schema.py` `TABLES` dict (veterans, claims, providers, batches, agent_findings, decisions, overpayments, audit_log, plus any others found in the code).
   - *Agent class diagram*: `BaseAgent` → concrete agents, `AGENT_REGISTRY`, prompt loading from `data/agent-prompts/`, normalized finding output shape.
   - Backend layering explanation (routes → services → agents/database), BigQuery access pattern (validated identifiers + query parameters), auto-seed-on-startup lifespan behavior.
4. **Project structure** — annotated directory tree of the repo (backend, frontend, data, processing_pipeline).
5. **Getting started** — prerequisites; backend setup (cd backend, venv, pip install, `.env` from `.env.example`, `python seed.py --reset`, uvicorn on 8000); frontend setup (npm install, npm run dev on 5173 with `/api` proxy); configuration reference tables for `backend/.env` and `frontend/.env` variables.
6. **Fraud agent catalog** — table from `agents/registry.py`: agent name, fraud type, what it detects, prompt file. Followed by the 3-step "add an agent" recipe.
7. **API reference** — one table per route group (health, claims, batches, chat, analytics, alerts, audit_log, audit_workflows, documents, fraud_research, monitoring, normalization, overpayments) with method, path, one-line description — verified against the route files. Pointer to FastAPI `/docs` Swagger UI.
8. **Deployment** — Docker build/run from repo root (port 8080, non-root user, healthcheck); Cloud Run deploy (`gcloud run deploy` with env vars / Secret Manager for `GEMINI_API_KEY`); Firebase Hosting deploy for frontend (`npm run build`, `firebase deploy --only hosting`) with `VITE_API_URL` pointed at the Cloud Run URL.
9. **Testing & troubleshooting** — pytest (BigQuery/Gemini fully mocked, no GCP creds needed), single-test invocation example, `npm run build` as the frontend type gate (no lint/test setup); FAQ table covering: credentials errors, 8000-vs-8080 port confusion, auto-seed resetting data each boot, missing `GEMINI_API_KEY`, BigQuery permissions.
10. **Footer** — `processing_pipeline/` note (standalone EDI X12/NCPDP experiments, not imported by the server), Google "Free Evaluation Services" copyright-header convention for new files, synthetic-data disclaimer, license note.

## Accuracy requirements

- Every table, diagram, path, and command must be verified against the actual source — no writing from memory. Files to read before authoring: `backend/schema.py`, `backend/agents/registry.py`, all `backend/routes/*.py` route decorators, `backend/config.py`, both `.env.example` files, `backend/main.py` (lifespan/mount points), `frontend/vite.config.ts`, `frontend/package.json`, `Dockerfile`, `backend/seed.py` CLI flags.
- Mermaid syntax must be GitHub-renderable (validate blocks; avoid unsupported features).
- Unknown deployment identifiers use angle-bracket placeholders (`<YOUR_PROJECT_ID>`, `<REGION>`).
- The README itself does not get the source-file copyright header (it's documentation, not a source file) unless existing docs in the repo do.

## Non-goals

- No changes to application code, CI, or deployment config.
- No `docs/` documentation split, no custom image/SVG assets.
- No fabricated deployment details (real service names, domains) — placeholders only.
