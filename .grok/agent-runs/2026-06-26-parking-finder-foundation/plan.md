# Plan — Parking Finder foundation

## Active agents this run

| Agent | ID | Reason activated | Execution |
|-------|----|------------------|-----------|
| Orchestrator | ① | Always | First |
| Database Agent | ⑥ | `backend/prisma/schema.prisma` | Before API |
| Core API Agent | ② | `backend/src/public-parking-finder/` | Parallel after ⑥ |
| Experience Agent | ③ | `frontend/src/pages/parking-finder/` | Parallel after ⑥ |
| Security Agent | ⑧ | Public unauthenticated endpoint | Review with ② |
| Testing Agent | ⑨ | Specs after writers | Before ⑤ |
| Performance Agent | ⑪ | Debounced finder queries | During ③ |
| Quality Agent | ⑤ | Always | **Last** |

## Branch

`feat/parking-finder-foundation` → `develop` (merge commit — human merges after review)