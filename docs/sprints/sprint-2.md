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

## Internal riders (2026-10-17/18)
- Add rider dialog (`components/riders/invite-rider-dialog.tsx`) has two paths. Internal rider: the admin fills name, email, phone, ID number (required), pay basis (salary by payroll or per delivery by earning rules) and a vehicle (link a free one or register one), then `POST /fleet/members/onboard`. Freelance rider: the email invite as before.
- A new account's temporary password is shown once in a "Rider added" panel with copy buttons; the rider is also emailed it when "Email them their sign-in details" is ticked (default). They must change it on first sign-in.
- Rider sheet and detail page share `EmploymentControl` (engagement and pay basis) and `RiderVehicleLink` (link or unlink). KYC uploads show "Optional" for internal riders and the ID number is flagged when missing.
- Vehicles page lists from `GET /fleet/vehicles` (free vehicles show; search, totals and paging are server side). Vehicle types come from `lib/vehicle-types.ts`.
- App switcher Account Portal now opens auth-ui (`NEXT_PUBLIC_AUTH_UI_URL`), not the SSO API host.

## Vehicle insurance (2026-10-18)
- Linking a rider to a vehicle: the rider's sheet and detail page share `RiderVehicleLink` (pick a free vehicle and Link, or "Register this rider's vehicle" with its insurance in one step); the Vehicles page card has "Assign to rider".
- One vehicle form (`components/vehicles/vehicle-form.tsx`: plate, type, make, model, chassis, insurance) used by the Vehicles page, the rider panel and the add-rider dialog; insurance fields with certificate upload (`components/ui/file-upload.tsx`); `RenewInsuranceDialog`; `InsuranceBadge`.
- Vehicles page: insurance badge, policy, deactivation note and Renew/Add insurance on every card; totals for insurance expiring, expired and missing.
- Riders list: "No jobs: ..." badge for riders blocked by their vehicle.
- Settings: Vehicle insurance card, each rule on the platform default, block or allow, and the reminder days.

## App icons and favicon (2026-10-18)
- Tenant pages set the browser tab title, favicon, iOS home-screen icon and the tenant PWA manifest server-side from `lib/app-branding.ts` (shared-ui-lib `resolveAppIdentity`, service key `logistics`): the tenant's own logistics app name and icon, else "<Business> Logistics" with the business logo.
- `/{slug}/app-icon/{size}[?maskable=1]` serves square PNGs from the tenant icon or logo, else initials (shared-ui-lib `appIconResponse`, the same code as ordering-frontend). The manifest lists only these.
- Pages outside a tenant (landing, public tracking) use the logistics mark (`public/icons/logistics-icon.svg`, bundled PNGs); `public/manifest.json` fixed (start_url `/`, brand colours, maskable icons).
- Removed the duplicate client manifest injector in `org-shell.tsx` (`PwaRegistration` already keeps the link right across navigation).

## Remaining / Next Sprint

→ See sprint-3.md:
- MapLibre GL live map component with rider markers
- Zones map-draw control (polygon editing)
- PoD viewer enhancements
