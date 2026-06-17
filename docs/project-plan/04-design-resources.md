# Design Resources (Free)

> **Governance:** Read [08-design-system.md](./08-design-system.md) first.  
> Agents must **research → verify license → compare → apply** — never paste random UI themes.

Assets and libraries already approved for the SaaS UI. No paid licenses required.

## In the repository

### Illustrations (unDraw, MIT license)

Location: `frontend/src/assets/illustrations/`

| File | Use case |
|------|----------|
| `order-a-car.svg` | Vehicles, empty vehicle list |
| `booking.svg` | Bookings empty state, onboarding |
| `payments.svg` / `receipt.svg` | Payments, checkout |
| `dashboard.svg` / `business-analytics.svg` | Dashboard hero, reports |
| `heatmap.svg` | Occupancy / analytics screens |
| `location-search.svg` | Search, find parking lot |
| `secure-login.svg` | Login and auth pages |
| `city-driver.svg` | Urban / public parking marketing |
| `at-the-park.svg` | General parking branding |
| `empty.svg` | Generic empty states |

### Components

```text
frontend/src/components/common/Illustration.tsx   — render any named illustration
frontend/src/components/common/EmptyState.tsx     — optional illustration prop
```

Example:

```tsx
<EmptyState
  illustration="orderCar"
  title="No vehicles yet"
  description="Register your first vehicle to start booking."
/>
```

Illustrations support brand tint via CSS variable `--primary-svg-color` (defaults to theme primary).

### Typography

- **Inter** via `@fontsource/inter` (OFL license)
- Loaded in `frontend/src/main.tsx` (weights 400, 500, 600, 700)
- Theme references Inter in `frontend/src/theme.ts`

## Libraries (already installed)

| Library | License | Use for |
|---------|---------|---------|
| MUI (`@mui/material`) | MIT | Layout, forms, dialogs, theme |
| MUI Icons | MIT | Navigation and action icons |
| MUI X DataGrid | MIT (community) | All data tables |
| React Query | MIT | Server state, caching |

## Recommended additions (free, not yet installed)

| Library | Use for |
|---------|---------|
| `@mui/x-charts` | Occupancy and revenue charts on operator dashboard |
| `react-colorful` or native input | Tenant admin color picker for branding |

## UI principles for sellable SaaS

1. **Layman-readable tables** — business labels in grid; technical IDs only in details drawer
2. **Consistent empty states** — always use `EmptyState` + illustration where helpful
3. **Role-aware screens** — USER never sees other users' data or admin actions
4. **Mobile-first for SECURITY** — gate UI is a first-class surface, not a shrunk desktop page
5. **Tenant branding everywhere** — login, sidebar, emails (future) use tenant logo and colors

## External free sources (reference only)

- [unDraw](https://undraw.co/) — MIT illustrations (copied subset in repo)
- [Google Fonts / Fontsource](https://fontsource.org/) — Inter and other OFL fonts
- [MUI templates](https://mui.com/material-ui/getting-started/templates/) — dashboard layout reference

Do not hotlink unDraw URLs in production; use the bundled SVGs in `src/assets/illustrations/`.