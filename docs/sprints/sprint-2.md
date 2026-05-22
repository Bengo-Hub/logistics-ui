# UI Sprint 2 – Rider & Fleet Management

**Status**: ✅ DONE
**Completed**: 2026-05-22

## Goals
- Riders list + detail with KYC review workflow
- Fleet management (create, view, edit)
- Task list + detail + create form
- Zone editor

## Completed

### Riders ✅
- Riders list page: DataTable with search, status filter tabs (All/Pending/Active/Suspended/Rejected)
- Rider detail page (`/riders/[id]`) wired to `useFleetMember` — real API data, no more mocks
- KYC document viewer: shows `id_passport_attachment`, `rider_photo` with View links + "Not uploaded" badge
- Vehicle info card: registration, make/model, year, capacity, license plate photo
- Approve / Suspend / Reject actions with confirmation dialogs (connected to real mutations)
- `useRejectMember` hook with optional reason field
- Batch invite modal: multi-row form, `useBatchInviteMembers` → `POST /fleet/members/batch`
- `useInviteMember` / `useApproveMember` / `useSuspendMember` hooks

### Tasks ✅
- Task list page: status filter, search, pagination
- Task detail page (`/tasks/[taskId]`): status badge, steps, assignment info
- **New Task modal**: form with task type, reference, pickup/dropoff address, priority → `POST /tasks`
- **Auto-Dispatch button** on task detail → `POST /tasks/{id}/dispatch` (`useDispatchTask`)
- **Live SSE indicator**: `useTaskStream` hook wired to task detail; auto-invalidates query on status change
- Assign rider modal: already present from previous sprint
- `useTasks` / `useTask` / `useCreateTask` / `useUpdateTaskStatus` / `useAssignTask` / `useDispatchTask` hooks

### Zones ✅
- Zones list with create/edit/delete (ZonesPage with inline form)
- `useZones` / `useCreateZone` / `useUpdateZone` / `useDeleteZone` hooks
- Static polygon display

### Tracking ✅
- Tracking page with rider location polling (REST fallback)
- `useTaskStream` SSE hook: connects to `GET /tasks/{id}/stream`, broadcasts `status_changed` events
- Live indicator in task detail header when SSE is connected

## Remaining / Next Sprint

→ See sprint-3.md:
- MapLibre GL live map component with rider markers
- Zones map-draw control (polygon editing)
- PoD viewer enhancements
