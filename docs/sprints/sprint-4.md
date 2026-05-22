# UI Sprint 4 – Earnings, Analytics & Settings

**Status**: ⚠️ PARTIAL (~60% done)
**Target**: 2026-07-01

## Completed

### Earnings Dashboard ✅
- `/earnings` page: Statements, Pricing Rules, Billing Events tabs
- Summary cards: total paid out, pending payout, statement count
- Statements table: period, gross, net, status (draft/confirmed/paid)
- Pricing rule editor: CRUD for flat / distance / surge rules (create, delete)
- Manual statement generation button → `POST /earnings/statements/generate` with date-range modal
- Billing events audit table: event type, amount, occurred_at (backend field — description removed as it's not in schema)
- Sidebar nav item added: Earnings (permission: `logistics.earnings.view`)
- TanStack Query hooks in `src/hooks/use-earnings.ts`:
  `useEarningStatements`, `useBillingEvents`, `usePricingRules`,
  `useCreatePricingRule`, `useUpdatePricingRule`, `useDeletePricingRule`,
  `useGenerateStatements`
- PricingRule fields corrected to match Ent schema: `base_fee`, `is_active`, `per_kg_rate` (not `base_fare`/`active`/`min_fare`)
- BillingEvent fields corrected: `occurred_at` (not `created_at`); `metadata` map (no `description` top-level field)
- Tracking page: uses `GET /{tenant}/telemetry/streams?status=active` (not non-existent `/tracking/fleet`)

## Remaining

- [ ] SLA stats card on dashboard: on-time %, breach count (needs `GET /tasks/sla-stats` API)
- [ ] Overdue tasks alert banner (tasks past sla_due_at)
- [ ] Task status distribution chart (pie/bar)
- [ ] Service config page: feature flags, subscription limits
- [ ] Rate limit config viewer
- [ ] Platform-level permission and pricing views
- [ ] `useUpdatePricingRule` wired to inline edit UI
