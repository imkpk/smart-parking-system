# Phase 5A — Security gate illustrations polish

**Source:** User instruction during PR #99 / illustrations work (2026-06-19).

## Prompt

> You have so many SVG images in assets — can you use them for the search screen and, if possible, use them elsewhere if you feel it's useful? UI is not really funky; don't overdo anything and don't mess anything up. Raise the PR and don't merge.

## Follow-up

> We worked on the search table all this time and you reverted to the same old one — I just asked you to use some images.

> Can you add more images to the parking lots, vehicle, and bookings pages?

> Commit the changes and don't merge the MR — I will review this later.

> OK, now switch to develop.

> Merge `enhance/security-gate-illustrations` PR into develop.

## Rules

* Use curated unDraw illustrations from `frontend/src/assets/illustrations/` via existing `Illustration` + `EmptyState` components.
* Do **not** revert DataGrid / table UX improvements from PR #99 when adding illustrations.
* Subtle placement only — search hero, empty states, page headers; no visual clutter.
* Extend to Parking Lots, Vehicles, and Bookings pages where empty states or headers benefit.
* Open PR; do not merge until human review (merged as PR #100).

## Branch / PR

* Branch: `enhance/security-gate-illustrations`
* PR #100: `enhance(frontend): gate illustrations + post-#99 UI fixes` ✅ merged