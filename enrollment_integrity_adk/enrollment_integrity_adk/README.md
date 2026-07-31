# Enrollment Integrity Analyst — ADK build

A front-door CMS enrollment-fraud agent built on **Google ADK 2.4.0**. It screens a
provider/supplier application *before approval*, resolves the applicant's true
identity through the ownership layers they hide behind, and returns a **cited**
reviewer brief recommending an action CMS already has (screening-tier elevation,
fingerprint check, site visit, hold) — while a credentialed human decides. It also
runs an adversarial purple-team probe that produces a hardening report on the
enrollment front door.

Verified against `google-adk==2.4.0` (Python 3.10+). Resolution, detection and
scoring run in deterministic tools, so the **risk disposition and findings are
reproducible every run**; Gemini only narrates over the tool output (tier 5).

## Layout

```
enrollment_integrity_adk/
  enrollment_agent/            <- the ADK agent package (this is what you deploy)
    __init__.py                   exposes root_agent
    agent.py                      root_agent = Agent(... tools=[...])   (tier 5)
    tools.py                      3 FunctionTools over the engine
    engine/                       deterministic engine (tiers 1-4), verified
      synthetic_data.py           synthetic network + planted phoenix (tier 1)
      graph.py                    entity-resolution graph (tiers 2-3, the asset)
      detection.py                motif detection + scoring (tier 4)
      adversarial.py              purple-team loop -> hardening report
    .env.example                  copy to .env, add Argolis/Vertex creds
  run_local.py                  local harness (full agent, or --engine-only)
  deploy_agent_engine.sh        one command to Agent Engine
  requirements.txt
```

## Setup

```bash
pip install -r requirements.txt          # google-adk>=2.4.0, networkx
cp enrollment_agent/.env.example enrollment_agent/.env
# edit enrollment_agent/.env -> set GOOGLE_CLOUD_PROJECT to your Argolis project
```

`.env` (Argolis / Vertex):

```
GOOGLE_GENAI_USE_VERTEXAI=TRUE
GOOGLE_CLOUD_PROJECT=your-argolis-project-id
GOOGLE_CLOUD_LOCATION=us-central1
```

Auth once: `gcloud auth application-default login` (and
`gcloud services enable aiplatform.googleapis.com`).

## Run locally

```bash
# No creds needed — sanity-check resolution/detection/hardening offline:
python run_local.py --engine-only

# Full agent (Gemini narration), needs .env creds:
python run_local.py "Screen applicant ENT-COASTAL"
python run_local.py "Where could a bad actor slip through enrollment?"

# Or the ADK dev UI / CLI:
adk web .            # then pick 'enrollment_agent' in the browser
adk run enrollment_agent
```

The demo arc: `ENT-BLUERIDGE` is a clean control (flags nothing). `ENT-COASTAL` is
the phoenix — an operator revoked 18 months ago as `Harbor Health Devices LLC`,
re-applying under a fresh LLC with a straw owner placed on top 41 days ago. The agent
resolves it to the excluded `Victor A. Malen` via an ownership record the paperwork
buries, returns **HIGH RISK**, and holds it pre-approval with cited findings. The
adversarial probe then shows which evasion tactics still get caught and which one
opens the seam.

## Deploy to Agent Engine (Argolis)

```bash
pip install "google-adk[vertexai]>=2.4.0"
export GOOGLE_CLOUD_PROJECT=your-argolis-project-id
export GOOGLE_CLOUD_LOCATION=us-central1
./deploy_agent_engine.sh
```

`--otel_to_cloud` is on, so Agent Engine emits OpenTelemetry traces — the audit trail
a federal deployment wants. To update an existing instance, pass `--agent_engine_id`.

## How the code maps to the six-tier architecture

| Tier | Layer | Graph RAG? | Code |
|------|-------|-----------|------|
| 1 | Source systems | — | `engine/synthetic_data.py` |
| 2 | Ingestion & extraction | Graph-RAG-*adjacent* | `engine/graph.build_graph` |
| 3 | **Entity-resolution graph (the asset)** | **No** — record linkage | `engine/graph.resolve_identities` |
| 4 | Detection (motif analytics) | **No** — graph analytics | `engine/detection.py` |
| 5 | Risk narrative + citations | **Yes** — RAG-shaped | `agent.py` (Gemini) |
| 6 | Human decision | — | recommendations only |
| — | Adversarial purple-team loop | No — simulation | `engine/adversarial.py` |

Only tier 5 is model-driven, and it is constrained to narrate over tool output — no
invented findings or citations. Everything that determines the disposition is
deterministic Python.

## Production swap: MCP Toolbox for Databases

In the sandbox, `tools.py` calls the in-memory synthetic network directly. In
production, the data-touching calls become governed **MCP Toolbox** tools over a
first-party store (Spanner Graph or AlloyDB), which brings IAM/OAuth2 auth,
connection pooling and OpenTelemetry — so the agent never freehands SQL against
enrollment data. ADK loads a Toolbox server's tools directly (verified signature,
`google-adk==2.4.0`):

```python
from google.adk.tools.toolbox_toolset import ToolboxToolset

toolbox = ToolboxToolset(
    server_url="https://your-toolbox-server",   # Toolbox on Cloud Run
    toolset_name="enrollment_integrity",         # tools defined in tools.yaml
)

root_agent = Agent(
    name="enrollment_integrity_analyst",
    model="gemini-flash-latest",
    instruction=INSTRUCTION,
    tools=[toolbox],                              # governed queries replace direct calls
)
```

Toolbox is the phase-two hardening layer, not needed for the sandbox demo — but it's
the ADK-native path to Agent Engine, so adding it later is a swap, not a rewrite.

## Model

`model="gemini-flash-latest"`. Change the string to use another Gemini tier, Claude
via Vertex, or any LiteLLM-supported model — the agent logic is unchanged.

---

**Nothing in this repo is real.** Every identifier, name, and address is synthetic.
