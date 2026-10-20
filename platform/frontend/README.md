# Infollion Evaluate frontend

Next.js 16 (App Router) client for the Phase 1 MVP. The binding API contract is `../docs/mvp_api_contract.md`.

## Areas

| Path | Who | What |
|---|---|---|
| `/login`, `/signup`, `/settings/security` | everyone | Sign in, customer sign-up, MFA enrolment |
| `/app/orgs/[orgId]/projects/...` | `customer_admin`, `customer_member` | Projects, rubric builder, data ingestion, gold, quality metrics, datasets and exports |
| `/app/orgs/[orgId]/usage`, `/audit` | `customer_admin` | Usage and audit log |
| `/expert`, `/expert/profile` | `expert` | Approved projects, task list, profile, credentials, conflicts |
| `/expert/tasks/[assignmentId]` | `expert` | Task workbench: scoring, error labels, preference, correction, autosaved drafts |
| `/staff/projects`, `/staff/experts`, `/staff/audit` | `platform_admin`, `project_manager` | Project approval and lifecycle, task generation, expert recommendation and assignment, credential verification |
| `/staff/reviews`, `/staff/adjudications` | staff and `reviewer` | Review decisions and adjudication |

## API proxy

The browser only talks to this app's origin. `next.config.ts` rewrites:

- `/api/v1/*` to `${API_URL}/v1/*`
- `/v1/auth/*` to `${API_URL}/v1/auth/*`, because the `ifl_refresh` cookie is scoped to `Path=/v1/auth` and would not be sent to `/api/v1/auth/*`

The access token lives in memory only; a page load calls `/v1/auth/refresh` to restore the session.

`API_URL` is read at build time (rewrites are serialised into the build output):

| Environment | `API_URL` |
|---|---|
| Local dev (default) | `http://localhost:8010` (the backend's host port; 8000 is used by another project) |
| Docker Compose | `http://api:8000` (the API service's container port; the Dockerfile default) |

## Theme and design tokens

Every colour comes from semantic tokens in `src/app/globals.css`. Raw values are CSS variables on `:root` (light) and repeated for dark mode, once under `prefers-color-scheme: dark` and once under `:root[data-theme="dark"]`. `@theme inline` exposes them to Tailwind, and the default Tailwind palette is cleared (`--color-*: initial`), so a class like `bg-blue-600` generates nothing.

| Token (utility suffix) | Use |
|---|---|
| `bg`, `surface`, `surface-raised`, `surface-sunken`, `surface-hover` | Page background, cards, menus and dialogs, table headers and wells, hover rows |
| `line`, `line-strong` | Dividers and card borders, input borders |
| `fg`, `fg-muted`, `fg-subtle` | Body text, secondary text, hints and placeholders |
| `primary`, `primary-hover`, `primary-subtle`, `primary-line`, `primary-text`, `on-primary` | Brand indigo: buttons, active nav and tabs, links (`primary-text`), text on filled primary (`on-primary`) |
| `accent`, `accent-subtle`, `accent-line`, `accent-text` | Teal for positive and quality signals |
| `success`, `warning`, `danger`, `info` (each with `-subtle` and `-line`), `danger-solid` | Status pills, banners, validation, disagreement highlights |
| `focus` | Focus rings |
| `chart-1` to `chart-6`, `chart-grid` | Chart series and gridlines |

Light brand values: primary `#4340d4`, accent `#0d9488`, warning `#9a4b06`, danger `#b42318`, success `#157341`, info `#1d4fb8`, neutrals from `#0f172a` to `#f6f7f9`. Text and fill pairs meet WCAG AA in both themes.

To change the brand, edit the `--primary*` and `--accent*` variables in all three blocks (light, system dark, explicit dark) and re-check contrast of `primary-text` on `surface` and `on-primary` on `primary`. The logo mark (`src/components/icons.tsx`) reads the same variables.

Theme choice (light, dark or system) is set from the top bar and the sign-in page, stored in `localStorage` under `ifl-theme`, and applied by an inline script in `src/app/layout.tsx` before first paint. Type is Inter via `next/font`. Animations are disabled under `prefers-reduced-motion`.

## Development

```bash
npm ci
npm run dev            # http://localhost:3000, proxies to http://localhost:8010
API_URL=http://localhost:9000 npm run dev   # point at a different API
```

Checks:

```bash
npm run lint
npm run typecheck      # tsc --noEmit
npm test               # vitest run
npm run build
```

Unit tests cover the API client (routing, refresh, idempotency keys, error normalisation), the workbench state and validation rules that mirror the contract's submission rules, adjudication helpers, rubric validation, export compatibility and role routing.

## Docker

```bash
docker build -t infollion-frontend --build-arg API_URL=http://api:8000 .
docker run -p 3000:3000 infollion-frontend
```

The image uses Next's standalone output and runs as a non-root user on port 3000.
