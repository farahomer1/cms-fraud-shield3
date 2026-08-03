# Task Checklist: CMS Fraud Shield Transition

- `[x]` **Phase 1: Parallelize Table Truncation**
    - `[x]` Refactor `clear_all_tables` in `backend/datagen/generator.py` to truncate tables concurrently using `asyncio.gather`
- `[x]` **Phase 2: Clean up Chat Suggestions**
    - `[x]` Replace legacy `'What VA policy applies?'` suggestion in `frontend/src/components/deepdive/ChatInterface.tsx` with `'What CMS policy applies?'`
- `[x]` **Phase 3: Run Database Re-seeding & Verification**
    - `[x]` Execute seeding live to measure latency improvement (targeting <5 seconds truncation time)
    - `[x]` Run backend pytest suite to verify zero regressions
- `[ ]` Phase 4: Proactive Policy Alerts & DOJ (NFED) Referrals
    - `[ ]` Build Proactive Policy Amendment Alerts suggesting claims-edit closures (Rule #714)
    - `[ ]` Build automated DOJ (NFED) and FBI Investigative Referral Brief generator and workspace
    - `[ ]` Integrate Slide 4 Trust Fund Protection ROI statistics inside the analytics view
- `[ ]` Phase 5: Verification & Quality Assurance
    - `[ ]` Run typescript compile safety checks (`npx tsc --noEmit`)
    - `[ ]` Perform role-based manual walk-through verification (MCR, Supervisor, Auditor, Admin)
