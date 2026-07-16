# Demo script — Multi-Agent Orchestration

Prerequisites: Node 20+, repo checkout, `git fetch origin develop`.

```bash
cd scripts/agents
npm ci
```

## 1. Manifest validation

```bash
node scripts/agents/validate-manifest.mjs
```

## 2. Route a backend-only diff

```bash
node scripts/agents/plan-run.mjs \
  --files backend/src/bookings/bookings.service.ts \
  --format text
```

## 3. Route a full-stack diff

```bash
node scripts/agents/plan-run.mjs \
  --files backend/src/parking-events/parking-events.service.ts,frontend/src/pages/PaymentsPage.tsx,payment-service/src/main/java/com/parking/payment/web/PaymentController.java \
  --format json
```

## 4. Dry-run orchestration

```bash
node scripts/agents/orchestrate-run.mjs \
  --dry-run \
  --provider mock \
  --files backend/src/bookings/bookings.service.ts \
  --slug demo-dry-run
```

Note the printed `runId`. Inspect:

```bash
node scripts/agents/inspect-run.mjs --run <runId> --events
node scripts/agents/render-run-status.mjs --run <runId>
node scripts/agents/summarize-run.mjs --run <runId>
```

## 5. Task graph / status

Open `.grok/agent-runs/<runId>/status.md` and `plan.md`.

## 6. Permissions denial

```bash
node --input-type=module -e "
import { loadAndValidateManifest } from './scripts/agents/lib/manifest.mjs';
import { assertWriteAllowed, assertCommandAllowed } from './scripts/agents/lib/permissions.mjs';
const { manifest } = loadAndValidateManifest();
console.log(assertWriteAllowed(manifest, 'quality', 'backend/src/x.ts'));
console.log(assertCommandAllowed('database', 'prisma migrate reset'));
"
```

## 7. Worktree isolation (optional local)

```bash
node scripts/agents/create-task-worktree.mjs --run demo --task task-core-api-implement
# write only inside .worktrees/demo/task-core-api-implement
node scripts/agents/cleanup-task-worktree.mjs --run demo --task task-core-api-implement
```

## 8. Provider failure simulation

```bash
node scripts/agents/orchestrate-run.mjs --dry-run --provider mock --files backend/src/bookings/bookings.service.ts --slug demo-fail
# Or invoke mock with FORCE_FAIL via unit tests:
cd scripts/agents && node --test __tests__/provider.test.mjs
```

## 9. Resume

```bash
node scripts/agents/orchestrate-run.mjs --resume <runId> --provider mock
```

## 10. Memory propose / promote

```bash
node scripts/agents/propose-memory.mjs \
  --title "Prefer AccessPolicyService" \
  --body "Tenant checks go through AccessPolicyService" \
  --run <runId> --task task-core-api-implement \
  --evidence backend/src/common/access-policy.service.ts

node scripts/agents/promote-memory.mjs --id <mem-id> --reviewer quality
node scripts/agents/audit-memory.mjs
```

## 11. Skills & schedules

```bash
node scripts/agents/validate-skills.mjs
node scripts/agents/validate-schedules.mjs
```

## 12. PR activation comment body (local)

```bash
node scripts/agents/plan-run.mjs --base origin/develop --head HEAD --format comment
```

Look for marker: `<!-- smart-parking-agent-activation -->`

## 13. Full test suite

```bash
cd scripts/agents && npm test
```

**Important:** These demos use **mock** / **local-prompt** only. No external model is invoked.
