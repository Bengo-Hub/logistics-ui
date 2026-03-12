# logistics-ui -- Integrations

**Canonical tenant**: `urban-loft` | **Active outlet**: Busia

---

## Backend API (logistics-api)

**Base URL**: `NEXT_PUBLIC_LOGISTICS_API_URL` (default: `https://logisticsapi.codevertexitsolutions.com/api/v1`)

### Request conventions

All requests include:

```
Authorization: Bearer {accessToken}
X-Tenant-Slug: urban-loft
X-Tenant-ID: {tenantId}
Content-Type: application/json
```

Tenant slug is injected from `NEXT_PUBLIC_TENANT_SLUG` env var. Access token is read from Zustand auth store (persisted in localStorage).

### Endpoint mapping

| UI feature | Method | Endpoint | Notes |
|-----------|--------|----------|-------|
| Rider list | GET | `/{tenant}/admin/riders` | Filterable by status |
| Rider detail | GET | `/{tenant}/admin/riders/{id}` | Includes fleet + vehicle |
| Invite rider | POST | `/{tenant}/admin/riders/invite` | Email + fleet assignment |
| Approve rider | PUT | `/{tenant}/admin/riders/{id}/approve` | KYC review |
| Suspend rider | PUT | `/{tenant}/admin/riders/{id}/suspend` | Reason required |
| Reject rider | PUT | `/{tenant}/admin/riders/{id}/reject` | Reason required |
| Fleet list | GET | `/{tenant}/fleets` | |
| Fleet detail | GET | `/{tenant}/fleets/{id}` | Includes members + vehicles |
| Create fleet | POST | `/{tenant}/fleets` | |
| Update fleet | PUT | `/{tenant}/fleets/{id}` | |
| Task list | GET | `/{tenant}/tasks` | Filterable by status, rider, date |
| Task detail | GET | `/{tenant}/tasks/{taskId}` | |
| Assign task | POST | `/{tenant}/tasks/{taskId}/assign` | Rider ID in body |
| Cancel task | POST | `/{tenant}/tasks/{taskId}/cancel` | Reason in body |
| Task tracking | GET | `/{tenant}/tracking/task/{taskId}` | Current rider location |
| Rider location | GET | `/{tenant}/tracking/rider/{riderId}/location` | Latest position |
| POD | GET | `/{tenant}/deliveries/{taskId}/proof` | Photo + signature |
| RBAC assignments | GET/POST/DELETE | `/{tenant}/rbac/assignments` | Role management |
| Roles | GET | `/{tenant}/roles` | Available roles |

### Pagination

All list endpoints accept `page` (1-based) and `per_page` (default 20, max 100). Response includes `meta: { page, per_page, total }`.

---

## Auth service (SSO)

**SSO URL**: `NEXT_PUBLIC_SSO_URL` (default: `https://sso.codevertexitsolutions.com`)
**Auth UI URL**: `NEXT_PUBLIC_AUTH_UI_URL` (default: `https://accounts.codevertexitsolutions.com`)
**Client ID**: `NEXT_PUBLIC_SSO_CLIENT_ID` (default: `logistics-ui`)

### Flow

1. Check auth state in Zustand store
2. If no token, redirect to auth-ui with PKCE params
3. Auth-ui handles login against auth-service
4. Callback receives authorization code
5. Exchange code for tokens (access_token, refresh_token, id_token)
6. Store tokens in Zustand (persisted to localStorage key `logistics-ui-auth`)
7. Axios interceptor attaches Bearer token
8. On 401: attempt refresh; on failure, clear store and redirect to login

### Token claims used

| Claim | Usage |
|-------|-------|
| `sub` | User ID |
| `tenant_id` | Tenant scoping |
| `tenant_slug` | API path parameter |
| `roles` | Sidebar visibility, action gating |
| `email` | User display |
| `name` | User display |

---

## WebSocket (real-time tracking)

**URL**: `wss://logisticsapi.codevertexitsolutions.com/ws/tracking`

### Connection

```typescript
const ws = new WebSocket(
  `${WS_URL}/fleet?token=${accessToken}&tenant=${tenantSlug}`
);
```

### Message types

| Type | Direction | Payload |
|------|-----------|---------|
| `location_update` | Server -> Client | `{ rider_id, latitude, longitude, speed, bearing, timestamp }` |
| `status_update` | Server -> Client | `{ task_id, status, timestamp }` |
| `eta_update` | Server -> Client | `{ task_id, eta_minutes, distance_km }` |
| `ping` | Client -> Server | `{}` (keepalive every 30s) |

### Reconnection strategy

- On disconnect: exponential backoff starting at 1s, max 30s
- On token expiry (4401 close code): refresh token, reconnect
- Max reconnect attempts: 10, then show "connection lost" banner

### Polling fallback

If WebSocket connection fails 3 times consecutively, switch to REST polling:

```
GET /api/v1/{tenant}/tracking/rider/{riderId}/location  (every 5s)
```

---

## Map integration (Leaflet)

**Tile provider**: OpenStreetMap (default), Mapbox (post-MVP)

### Components

| Component | Map layer | Data source |
|-----------|-----------|------------|
| LiveTrackingMap | Rider markers (circle, color by status) | WebSocket `location_update` |
| TaskDetailMap | Pickup marker (green), dropoff marker (red), rider marker (blue) | Task detail + tracking API |
| ZoneEditorMap | Polygon overlay (editable) | Zone config API |

### Marker icons

| Marker | Color | Shape |
|--------|-------|-------|
| Active rider (with task) | Blue | Circle |
| Idle rider (no task) | Gray | Circle |
| Pickup location | Green | Pin |
| Dropoff location | Red | Pin |
| Rider (selected) | Orange | Circle (larger) |

---

## Cross-service redirects

| Trigger | Target | URL pattern |
|---------|--------|-------------|
| "View in cafe portal" link | cafe-website | `https://theurbanloftcafe.com/staff/riders` |
| "View order" link on task | ordering-service | `https://ordersapp.codevertexitsolutions.com/order/{orderId}` |
| Rider self-service link | rider-app | `https://riderapp.codevertexitsolutions.com/{tenantSlug}` |

---

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_LOGISTICS_API_URL` | `https://logisticsapi.codevertexitsolutions.com/api/v1` | Backend API |
| `NEXT_PUBLIC_SSO_URL` | `https://sso.codevertexitsolutions.com` | Auth service |
| `NEXT_PUBLIC_AUTH_UI_URL` | `https://accounts.codevertexitsolutions.com` | Auth UI |
| `NEXT_PUBLIC_SSO_CLIENT_ID` | `logistics-ui` | OIDC client ID |
| `NEXT_PUBLIC_TENANT_SLUG` | `urban-loft` | Canonical tenant |
| `NEXT_PUBLIC_TENANT_ID` | (from auth) | Tenant UUID |
| `NEXT_PUBLIC_WS_URL` | `wss://logisticsapi.codevertexitsolutions.com/ws` | WebSocket |
