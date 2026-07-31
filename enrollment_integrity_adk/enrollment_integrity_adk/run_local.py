"""
Local run harness. Two modes:

  # Full agent (Gemini narration) — requires Argolis/Vertex or AI Studio creds in
  # enrollment_agent/.env (see .env.example):
  python run_local.py
  python run_local.py "Screen applicant ENT-COASTAL"
  python run_local.py "Where could a bad actor slip through enrollment?"

  # Engine only (deterministic tools, NO model / NO creds) — sanity-check the
  # resolution + detection + hardening logic offline:
  python run_local.py --engine-only

You can also use the ADK CLI instead of this script:
  adk web .          # visual dev UI, pick 'enrollment_agent'
  adk run enrollment_agent
"""

import sys


def engine_only():
    from enrollment_agent.tools import (list_applicants, screen_applicant,
                                        run_adversarial_probe)
    import json
    print("== applicants ==")
    print([e["id"] for e in list_applicants()["entities"]])
    print("\n== screen ENT-BLUERIDGE (control) ==")
    print(json.dumps(screen_applicant("ENT-BLUERIDGE"), indent=2))
    print("\n== screen ENT-COASTAL (phoenix) ==")
    print(json.dumps(screen_applicant("ENT-COASTAL"), indent=2))
    print("\n== adversarial probe ==")
    print(json.dumps(run_adversarial_probe(), indent=2))


def run_agent(prompt: str):
    from google.adk.runners import InMemoryRunner
    from enrollment_agent import root_agent

    runner = InMemoryRunner(agent=root_agent, app_name="enrollment_integrity")
    print(f">>> {prompt}\n")
    try:
        # run_debug handles session creation and prints the streamed turn.
        runner.run_debug(prompt)
    except Exception as e:
        print("\n[!] The agent could not reach a model backend.")
        print(f"    {type(e).__name__}: {e}")
        print("    Set creds in enrollment_agent/.env (see .env.example), or run")
        print("    `python run_local.py --engine-only` to exercise the logic offline.")


if __name__ == "__main__":
    args = sys.argv[1:]
    if args and args[0] == "--engine-only":
        engine_only()
    else:
        prompt = " ".join(args) if args else "Screen applicant ENT-COASTAL"
        run_agent(prompt)
