# logistics-ui -- UX/UI Specification

**Target users**: Tenant admins, dispatchers, fleet managers
**Device targets**: Desktop (primary), tablet (secondary)
**Design system**: Shadcn UI + Tailwind CSS

---

## Layout

### Shell

- **Sidebar** (collapsible, 240px): Logo, nav sections (Riders, Fleets, Tasks, Tracking, Zones, Settings), user avatar + role badge, logout
- **Header** (56px): Page title, breadcrumbs, tenant name badge, notification bell (placeholder)
- **Content area**: Max-width 1280px, responsive padding

### Navigation structure

| Section | Icon | Sub-items |
|---------|------|-----------|
| Dashboard | LayoutDashboard | -- |
| Riders | Users | All Riders, Pending Approval, Invite |
| Fleets | Truck | All Fleets, Create Fleet |
| Tasks | Package | All Tasks, Active, Completed |
| Tracking | MapPin | Live Map |
| Zones | Map | Zone List, Zone Editor |
| Settings | Settings | General, Roles |

---

## Page specifications

### Riders list (`/riders`)

- **Data table** with columns: Name, Driver Code, Status, Fleet, Vehicle, Joined Date, Actions
- **Filters**: Status tabs (All, Pending, Active, Suspended, Rejected), search by name/code
- **Actions per row**: View, Approve (if pending), Suspend (if active), Reject (if pending)
- **Bulk actions**: Approve selected, Export CSV
- **Empty state**: "No riders found" with "Invite Rider" CTA

### Rider detail (`/riders/[riderId]`)

- **Header**: Name, status badge, driver code
- **Tabs**: Profile, KYC Documents, Activity Log
- **Profile tab**: Contact info, fleet assignment, vehicle info, joined date
- **KYC tab**: Document list (ID, license, insurance) with preview/download, approve/reject buttons per document
- **Activity tab**: Timeline of status changes, task completions, incidents

### Rider invite (`/riders/invite`)

- **Form**: Email, phone, fleet assignment (dropdown), vehicle type (dropdown)
- **Validation**: Email required, phone format, fleet must exist
- **Success**: Toast notification, redirect to riders list

### Fleet list (`/fleets`)

- **Card grid** (3 columns): Fleet name, type badge, member count, vehicle count, status
- **Actions**: View detail, edit, deactivate
- **Create button**: Opens `/fleets/new`

### Fleet detail (`/fleets/[fleetId]`)

- **Header**: Fleet name, type, status
- **Tabs**: Members, Vehicles, Settings
- **Members tab**: Table of fleet members with status, vehicle assignment
- **Vehicles tab**: Table of vehicles with type, plate, compliance status

### Task list (`/tasks`)

- **Data table**: Order ref, status, priority, pickup, dropoff, rider, ETA, created
- **Filters**: Status tabs (All, Pending, Assigned, In Transit, Completed, Cancelled), date range, rider
- **Actions**: View detail, assign rider (if pending), cancel
- **Real-time**: Status badges update via WebSocket

### Task detail (`/tasks/[taskId]`)

- **Split view**: Left panel (task info, status timeline, POD) + Right panel (map with pickup/dropoff markers, rider location if assigned)
- **Status timeline**: Vertical stepper (created -> assigned -> picked_up -> in_transit -> completed)
- **POD section**: Photo thumbnail, signature preview, timestamp
- **Actions**: Assign rider (dropdown), cancel task, view on full map

### Live tracking (`/tracking`)

- **Full-width Leaflet map** with rider markers (color-coded by status)
- **Sidebar panel**: Active rider list with current task, speed, last update time
- **Click rider marker**: Popup with rider name, current task, ETA
- **Auto-center**: Fit bounds to active riders on load
- **Update frequency**: Every 3 seconds via WebSocket; 5 seconds polling fallback

### Zone editor (`/zones/editor`) -- stretch goal

- **Leaflet map** with draw controls (polygon)
- **Side panel**: Zone name, description, operating hours, dispatch priority
- **Save**: Sends polygon GeoJSON + metadata to logistics-api

---

## Component library (Shadcn)

| Component | Usage |
|-----------|-------|
| DataTable | Riders, tasks, fleet members |
| Badge | Status indicators (green=active, yellow=pending, red=suspended, gray=rejected) |
| Card | Fleet cards, stat cards |
| Dialog | Confirm actions (suspend, reject, cancel) |
| Sheet | Mobile sidebar, filter panel |
| Tabs | Rider detail, fleet detail |
| Toast | Success/error notifications |
| Form + Input | Invite rider, create fleet, zone editor |
| Select | Fleet dropdown, vehicle type, status filter |
| Avatar | Rider photo, user menu |
| Skeleton | Loading states for all data views |

---

## Status color system

| Status | Color | Tailwind class |
|--------|-------|---------------|
| Active / Completed | Green | `bg-green-100 text-green-800` |
| Pending / Assigned | Yellow | `bg-yellow-100 text-yellow-800` |
| In Transit / En Route | Blue | `bg-blue-100 text-blue-800` |
| Suspended / Cancelled | Red | `bg-red-100 text-red-800` |
| Rejected / Failed | Gray | `bg-gray-100 text-gray-800` |

---

## Responsive breakpoints

| Breakpoint | Layout |
|-----------|--------|
| >= 1280px | Full sidebar + content |
| 768-1279px | Collapsed sidebar (icons only) + content |
| < 768px | Hidden sidebar (sheet overlay), stacked layout |

---

## Loading and error states

- **Page load**: Full-page skeleton matching the page layout
- **Table load**: Skeleton rows (5 rows)
- **Map load**: Gray placeholder with spinner
- **API error**: Inline error banner with retry button
- **Empty state**: Illustration + description + CTA button
- **Offline**: Top banner "You are offline -- some features may be unavailable"
