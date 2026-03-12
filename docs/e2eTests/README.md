# Logistics UI E2E Tests

Playwright E2E tests for SSO login and landing flows.

## Running

```bash
pnpm install
npx playwright install   # once, to install browsers
pnpm test:e2e
```

Local runs open the browser (headed). For CI, set `CI=true` for headless.

## Environment variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `BASE_URL` | Logistics UI origin | `https://logistics.codevertexitsolutions.com` |
| `E2E_ORG_SLUG` | Default tenant for tenant-scoped base URL | `urban-loft` |
| `E2E_LOGIN_EMAIL` | SSO test user email | (seeded demo user) |
| `E2E_LOGIN_PASSWORD` | SSO test user password | (seeded demo user) |

Production host: `logistics.codevertexitsolutions.com` (see shared-docs/sso-integration-guide.md).
