# UI Sprint 4 – Earnings, Analytics & Settings

**Status**: ⬜ NOT STARTED
**Target**: 2026-07-01

## Goals
- Earnings dashboard (pricing rules, statements, billing events)
- SLA stats and task analytics
- Settings: service config, rate limits
- Platform admin pages

## Tasks

### Earnings Dashboard
- [ ] `useEarnings` hooks: statements, billing events, pricing rules (TanStack Query)
- [ ] Earnings overview card: total paid out, pending statements
- [ ] Statements list with status filter (draft/confirmed/paid)
- [ ] Billing events audit table
- [ ] Pricing rule editor: CRUD for distance-based / flat / surge rules
- [ ] Manual statement generation button (POST /earnings/statements/generate)

### SLA & Analytics
- [ ] SLA stats card on dashboard: on-time %, breach count (from `/tasks/sla-stats` once implemented)
- [ ] Overdue tasks alert banner (tasks past sla_due_at)
- [ ] Task status distribution chart (pie/bar)

### Settings
- [ ] Service config page: feature flags, subscription limits
- [ ] Rate limit config viewer

### Platform Admin
- [ ] Platform-level permission and pricing views
