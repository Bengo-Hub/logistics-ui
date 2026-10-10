# UI Sprint 3 – Real-time Tracking & Task Operations

**Status**: ⚠️ PARTIAL (~50% done)
**Target**: 2026-06-14

## Goals
- Live fleet tracking map with SSE-powered rider markers
- Task create form + assign modal + dispatch button
- KYC document review workflow in rider detail
- Proof of Delivery viewer

## Completed

### Task Operations ✅
- Create task form: task type, external_reference, pickup/dropoff addresses, priority (modal on tasks page)
- Assign task modal: rider selector filtered by `active` status
- Manual dispatch button → `POST /tasks/{id}/dispatch`
- Status progression: PATCH /tasks/{id}/status (from task detail)
- PoD viewer on task detail: photo, signature, OTP code display

### KYC Review ✅
- KYC document viewer on `/riders/[id]`: id/passport attachment, rider photo with view links
- Approve/reject per rider with confirmation; reject modal has reason field
- Status badge showing overall KYC state

### SSE Live Tracking ✅
- `useTaskStream` hook: EventSource on `GET /tasks/{id}/stream`
- Auto-invalidates TanStack Query cache on `status_changed` event
- Live dot indicator in task detail header when SSE connected

## Remaining

- [x] MapLibre GL JS map component through @bengo-hub/maps (2026-10-09)
- [ ] Rider marker layer: fetch active telemetry streams `GET /telemetry/streams?status=active`
- [ ] Task route overlay (Valhalla polyline on map)
- [x] Zone circle and polygon editor (`ZoneEditor` in @bengo-hub/maps v0.3.0) with typed coordinates (2026-10-09)
- [x] Zone type selector (delivery / no-delivery) and status in the zone editor (2026-10-09)

## Round 3 (2026-10-10)

Done:
- [x] Sidebar reads logistics permissions from the service `/auth/me` (same source as pages); tenant admins and superusers get every permission from the API, the Platform link shows for platform owners only. Duplicate `useHasPermission` removed.
- [x] Shell owns page spacing (`max-w-[1600px]`, `px-4 sm:px-6 lg:px-8`); pages render content only.
- [x] One add-rider dialog (`components/riders/invite-rider-dialog.tsx`): name, email, phone, ID, licence, freelance or staff. `/{org}/riders?invite=1` opens it so other apps link here instead of copying the form. Rider sheet shows and changes the engagement.
- [x] e2e login reads `E2E_LOGIN_PASSWORD` only (no committed fallback).

- [x] Settings rebuilt to settings the API acts on (auto-assign, proof of delivery) plus links to where the rest lives; modules card loads its saved state; dead fields and the fake integrations tab removed (`d9b9783`).
- [x] Platform page edits the platform default delivery policy with the shared pricing card (mock forms removed).
- [x] Roles page rebuilt on the corrected RBAC API (roles, permissions, grants, revoke by id).
- [x] Delivery area editor full screen; paste a Google Maps place link or coordinates.
- [x] Dashboard live fleet map through the shared `FleetMapPanel` (also used by Tracking), gated on `live_tracking` (`5559fdd`).

Open, in priority order:
- [ ] Design pass on the remaining pages (tasks, riders, earnings, analytics, shifts) and `SubscriptionGate` on each gated page; `NavFeatureLock` badges on all gated sidebar items.
- [ ] Task detail and rider detail: show `per_diem_claim` status and a "Raise per diem" action for staff riders.
- [ ] Storefront staff area links to `/{org}/riders?invite=1` (cafe-website's own add-rider form to be removed).
- [ ] Rider marker layer and task route overlay (above).
