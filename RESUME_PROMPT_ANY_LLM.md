Use this prompt in Cursor / Claude Code / any coding agent:

You are resuming an existing Job Portal repository.

Rules:
1) Read `phase-progress/BLUEPRINT_PRODUCTION_SEQUENCE_2026-02-09.md` first.
2) Read `AGENT_HANDOFF.md` second.
3) Follow strict sequence only: `S4 -> S5 -> S6 -> S7`.
4) Do not use Docker/Kubernetes in this phase.
5) Do not add out-of-scope features.
6) After each completed step, update the sequence file with status and exact verification outputs.

First actions:
- Verify local runtime with:
  - `npm run local:status`
  - `http://localhost:5000/health`
  - `http://localhost:3000/dashboard`
  - `http://localhost:3000/admin/dashboard`
- Continue from `S4` and close any remaining frontend route/data gaps.

Then continue sequence in order.
