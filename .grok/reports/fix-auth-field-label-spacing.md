# Fix Auth Field Label Spacing

**Branch:** `fix/auth-field-label-spacing`  
**Date:** 2026-06-18  
**Scope:** Frontend auth pages only

## Issue fixed

On `/login` and `/register`, Email and Password labels (and other auth fields) sat inside the outlined input border notch. On the dark auth card surface they were hard to read and looked cramped against the blue-tinted input background.

## Files changed

| File | Change |
|------|--------|
| `frontend/src/pages/auth/authFieldProps.ts` | New shared `authTextFieldProps`, `authFormControlProps`, `authInputLabelProps` |
| `frontend/src/pages/auth/LoginPage.tsx` | Apply shared TextField props |
| `frontend/src/pages/auth/RegisterPage.tsx` | Apply shared TextField + Role select label props |
| `frontend/src/test/pages/auth/LoginPage.test.tsx` | Assert full-width accessible fields |
| `frontend/src/test/pages/auth/RegisterPage.test.tsx` | Assert full-width accessible fields |

## Before / after behavior

**Before**
- Labels floated inside the top border notch
- Low contrast on dark mode auth inputs
- Fields were not consistently `fullWidth`

**After**
- Labels use `slotProps.inputLabel.shrink: true` so they rest above the border
- Label background uses `background.paper` with horizontal padding to clear the outline
- Label color uses `text.secondary`; focused state uses `primary.main`
- Input surface uses `background.paper` for consistent light/dark readability
- Outlined notch legend expanded for stable shrink layout
- Login and Register fields are `fullWidth`

Auth behavior, routing, and API calls are unchanged.

## Validation

| Command | Result |
|---------|--------|
| `cd frontend && npm run build` | ✅ Pass |
| `cd frontend && npm run test:run` (auth page tests) | ✅ 8/8 pass |

## Not included

- No backend or payment-service changes
- No auth logic changes
- No page layout redesign