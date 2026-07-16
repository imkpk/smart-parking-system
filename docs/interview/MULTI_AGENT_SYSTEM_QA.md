# Interview Q&A — Multi-Agent Orchestration (30+)

1. **Why multi-agent instead of one agent?**  
   Different ownership, risk, and tools across NestJS, React, payments, IoT. Specialists reduce context pollution and enforce boundaries.

2. **Why deterministic routing?**  
   Path ownership is known a priori; LLMs add cost, non-determinism, and audit risk for a decision that greps can make.

3. **How do agents communicate?**  
   Via structured run/task state, handoff fields, events.jsonl, and orchestrator-owned integration — not free-form shared chat as source of truth.

4. **How do you avoid conflicting writes?**  
   Manifest write scopes + planner never parallelizes overlapping writers + optional worktrees per task.

5. **How do you handle context isolation?**  
   Per-task prompts with allowed/denied paths; worktrees; reference memory read-only.

6. **How do you prevent memory poisoning?**  
   Proposals need evidence; external URLs untrusted; promotion by quality/human; secret regex rejection; expiry.

7. **How do you evaluate routing?**  
   `routing-cases.yaml` fixtures; precision/recall across 20 cases in CI.

8. **How do you recover failed runs?**  
   `--resume`, bounded retries, BLOCKED/ESCALATED states, explicit recovery messages.

9. **How do you control cost?**  
   No LLM for routing; dry-run default; mock in CI; live providers optional and blocked without keys.

10. **How do you scale concurrency?**  
    Parallel groups for independent write scopes; split recommendation for large cross-service diffs.

11. **How do you avoid duplicate work?**  
    Single activation comment upsert; one manifest; idempotent resume skips SUCCEEDED tasks.

12. **How do you secure tool access?**  
    Tool profiles, denied commands, path sanitization, human-required actions list.

13. **How do you support multiple model providers?**  
    Provider interface + normalizeResult; codex/claude/grok stubs; mock/local-prompt for CI.

14. **How do you handle human approval?**  
    Quality gate verdicts; alwaysRequireHuman actions; schedules cannot merge/deploy.

15. **How do you measure success?**  
    Routing F1, CI green, evidence completeness, quality verdict, dry-run demos.

16. **Why Git worktrees?**  
    True filesystem isolation for parallel agent branches without thrashing one checkout.

17. **Why JSONL events?**  
    Append-only, streamable, easy to grep, no DB required.

18. **Why YAML manifest?**  
    Readable in PRs, comments friendly, maps cleanly to schema validation.

19. **What would you change at production scale?**  
    Persist runs outside git, add OTEL export, queue workers, stronger policy engine.

20. **What are the limitations?**  
    Live providers not wired; worktree integrate needs clean main tree; historical runs stay Markdown.

21. **Why Quality cannot implement features?**  
    Separation of duties — reviewers who can silently ship code defeat the gate.

22. **Why Testing after implementation?**  
    Avoid writing tests for unfinished contracts; Testing still audits independently.

23. **Can implementers write unit tests?**  
    Yes — tightly coupled unit/contract tests; Testing owns broader regression/E2E.

24. **How is Security activated?**  
    Path globs (auth/guards) + careful content hints; elevates risk to high.

25. **How do schedules stay safe?**  
    Mode read-only/report-only; workflow must exist; retries capped; no merge/deploy.

26. **What is adaptive-investigation?**  
    Pattern when files match no known ownership — plan before coding.

27. **How do you prevent force-push?**  
    Blocked command patterns + human permission list + project branch policy.

28. **How do CI and local planner stay consistent?**  
    Same `plan-run.mjs` entrypoint; CI installs `scripts/agents` deps and runs it.

29. **What is the planner version for?**  
    Traceability in PR comments when routing rules evolve.

30. **How do you handle Prisma + API changes?**  
    Database task before core-api dependency edge in the plan graph.

31. **What is a skill vs a prompt?**  
    Skills are versioned, reviewed capabilities with eval cases; prompts are one-off missions.

32. **How do you detect overlapping write ownership?**  
    Planner compares allowed path prefixes among write-mode tasks.

33. **What evidence does Quality need?**  
    Manifest validation, routing eval, tests, dry-run, permission denials, etc. (see QUALITY_REVIEW).

34. **Why not auto-merge?**  
    Repository policy: human merge; platform prepares merge-ready PRs only.

35. **How does this relate to Azure/Claude docs?**  
    Patterns inspired; implementation is local GitHub/Node — vendor limits do not apply as constraints.
