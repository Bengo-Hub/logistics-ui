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
