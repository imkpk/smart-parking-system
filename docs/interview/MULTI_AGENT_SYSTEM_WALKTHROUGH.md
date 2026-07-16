# Interview walkthrough — Multi-Agent Orchestration (Smart Parking)

## 30 seconds

We turned a **documented** multi-agent process for a multi-tenant parking SaaS monorepo into an **enforceable orchestration control plane**: one YAML agent manifest, deterministic path-based routing, typed run/task state, permissions, provider-neutral adapters, and CI that posts a single activation plan. Models may implement tasks; they never decide ownership of `backend/` vs `frontend/`.

## 2 minutes

Smart Parking has NestJS, React, Spring payments, and IoT/MQTT. Humans already defined roles ①–⑫ (orchestrator, specialists, testing, quality). Problems: duplicate routing in docs and shell greps, Markdown-only runs, no schema validation, no safe automation.

We built a **control plane** (manifest, schemas, permissions, skills, schedules, eval fixtures) and an **execution plane** (run.json, tasks, events.jsonl, worktrees, evidence). A Node planner computes activated agents, dependency order, parallel-safe groups, risk, and split recommendations without calling an LLM. CI validates the manifest and upserts one PR comment. Dry-run orchestration produces prompts via `local-prompt`/`mock` without external APIs. Memory and skills are governed so web content and secrets cannot poison durable knowledge.

## 10-minute system design

### Problem & requirements

- Multi-service monorepo; wrong agent ⇒ wrong layer touched
- Need auditability for interviews and production engineering culture
- Must not invent a second SaaS product; stay GitHub + Node
- Preserve historical agent-run Markdown

### Architecture

1. **Manifest** — 12 agents with activation paths, write scopes, tool profiles, timeouts, max attempts, escalation, memory access, risk tier  
2. **Planner** — git diff → plan JSON (deterministic)  
3. **Run ledger** — create-run materializes tasks + events  
4. **Orchestrator** — dry-run/resume; stops before live providers  
5. **Isolation** — git worktrees per writing task  
6. **Gates** — Testing after implement; Quality last with evidence  
7. **Governance** — memory promotion, skills versioning, schedules read-only  

### Routing

Static globs + keywords + heuristics (security-sensitive paths, performance filenames). Precision/recall measured on 20 fixtures (see test output).

### Safety

Blocked commands, path traversal checks, quality cannot implement features, human-required actions list, provider credential blocks.

### Failure handling

Retries bounded by `maximumAttempts`; FAILED→READY only if budget remains; escalate to quality/human; resume idempotently.

### Scaling

Split recommendation when file count or service fan-out is high; parallel groups only without write overlap.

### Future

Optional live provider adapters behind the same interface; richer evidence from CI artifacts; Graphite-style PR stacks generated from split recommendations.
