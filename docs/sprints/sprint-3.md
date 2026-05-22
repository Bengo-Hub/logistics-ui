# UI Sprint 3 – Real-time Tracking & Task Operations

**Status**: ⬜ NOT STARTED
**Target**: 2026-06-14

## Goals
- Live fleet tracking map with SSE-powered rider markers
- Task create form + assign modal + dispatch button
- KYC document review workflow in rider detail
- Proof of Delivery viewer

## Tasks

### Live Tracking Map
- [ ] MapLibre GL JS map component (or Leaflet fallback)
- [ ] `useTaskStream` hook: SSE to `GET /api/v1/{tenant}/tasks/{id}/stream`
- [ ] Rider marker layer: show active riders from `/telemetry/streams?status=active`
- [ ] Real-time position updates from SSE `status_changed` events
- [ ] Task route overlay (Valhalla route polyline)

### Task Operations
- [ ] Create task form: external_reference, type, pickup/dropoff addresses, SLA
- [ ] Assign task modal: rider selector, filtered by availability
- [ ] Manual dispatch button → `POST /tasks/{id}/dispatch`
- [ ] Status progression buttons per FSM state
- [ ] PoD viewer tab on task detail (photo, signature, notes, COD)

### KYC Review
- [ ] KYC document viewer tab on `/riders/[id]`: renders uploaded docs
- [ ] Approve/reject per document; comment field
- [ ] Status badge showing overall KYC state

### Zones
- [ ] Map-draw control (Leaflet.draw or MapLibre Draw) for polygon editing
- [ ] Zone type selector (delivery / exclusion / surge)
