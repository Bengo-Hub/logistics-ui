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

## Round 4 (2026-10-13): Deliveries, Riders, Shifts, Earnings
- [x] One task status vocabulary (`lib/task-status.ts`, mirrors the API's `statuses.go`): labels, badge tones, board filters (Waiting, Assigned, On the way, Delivered, Failed or cancelled) covering every state; the dashboard, tracking and task pages had their own copies. `returned` added to the status type.
- [x] Deliveries board: rows show route, delivery area, rider or "Needs a rider", cash to collect and lateness; the sheet assigns a rider (staff marked) or sends to the nearest rider; `?new=1` opens the form (dashboard shortcut).
- [x] New delivery form (`components/tasks/create-task-dialog.tsx`): pickup from an outlet, drop-off pinned on the shared map with place search, customer, instructions, cash to collect, area and fee preview from the live quote. The old form put the addresses in metadata, so hand-made jobs had no stops (no navigation, no area tag, no nearest-rider dispatch).
- [x] Riders: on-shift dot and count, ratings, staff badge, waiting-for-approval count and filter, rejected filter, recent jobs (tasks `rider_id` filter) instead of "Activity coming soon", vehicle summary. Batch invite takes freelance or staff and shows rows the API refused (it always said all were invited).
- [x] Shifts: On shift now, Upcoming and Past views grouped by day, presets, areas, start, end, cancel and remove; the form sent `datetime-local` text the API rejects (every shift failed) and now sends RFC3339. Gated on the `shifts` module and `fleet.view` like the API.
- [x] Earnings: To pay, Being paid, Paid; statements name the rider; Pay (needs `earnings.manage`) confirms the amount; "Make statements for a day" sends the `date` the API reads (it sent a period it ignored); pay rules offer only fixed or per km (surge alone pays nothing), with a worked example; earnings log names the rider and links the delivery.
- [x] One `apiErrorText` helper (cash and task pages had copies) so API messages reach the toast.

Open, in priority order:
- [ ] Analytics page design pass; `SubscriptionGate` on each gated page; `NavFeatureLock` badges on all gated sidebar items.
- [ ] Rider marker layer and task route overlay (above).
