# UI Sprint 2 – Rider & Fleet Management

**Status**: ⚠️ PARTIAL (~70% done)
**Target**: 2026-05-30

## Goals
- Riders list + detail with KYC review workflow
- Fleet management (create, view, edit)
- Task list + detail + create form
- Zone editor

## Completed

### Riders ✅
- Riders list page: DataTable with search, status filter tabs (All/Pending/Active/Suspended/Rejected)
- Rider detail page (`/riders/[id]`) with profile, KYC fields, vehicle info
- `useFleetMembers` / `useFleetMember` hooks with TanStack Query
- Invite form (single rider): email, fleet dropdown, vehicle type
- Approve / Suspend / Reject actions with confirmation dialogs
- Batch invite UI — ⬜ not yet wired (API: `POST /fleet/members/batch`)

### Tasks ✅
- Task list page: status filter, search, pagination
- Task detail page (`/tasks/[taskId]`): status badge, steps, assignment info
- `useTasks` / `useTask` / `useUpdateTaskStatus` hooks
- Status update mutation (PATCH /tasks/{id}/status)

### Zones ✅
- Zones list with create/edit/delete (ZonesPage with inline form)
- `useZones` / `useCreateZone` / `useUpdateZone` / `useDeleteZone` hooks
- Static polygon display (no map-draw control yet)

### Tracking ✅ (partial)
- Tracking page scaffold with rider location polling (`GET /api/v1/tracking`)
- SSE connection hook skeleton (no live render yet)

## Remaining

- [ ] KYC document viewer tab on rider detail (show uploaded docs, approve per doc)
- [ ] Manual task create form (`POST /tasks`)
- [ ] Task assign modal (pick rider, POST /tasks/{id}/assign)
- [ ] Manual dispatch button (POST /tasks/{id}/dispatch)
- [ ] Batch invite UI wired to API
- [ ] Live tracking map (Leaflet/MapLibre + SSE) — Sprint 3
