# Logistics UI - Implementation Plan

## Overview
The Logistics UI is a specialized microservice frontend dedicated to rider management, fleet operations, and delivery logistics. It follows the "Microservice Switching" pattern, acting as the primary destination for all rider-related workflows in the BengoBox ecosystem.

## Technology Stack

### Frontend Framework
- **Framework**: Next.js 15 (App Router) with React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Shadcn UI
- **State Management**: Zustand (Global State) + TanStack Query (Server State)
- **API Client**: Axios with interceptors for auth handling.
- **PWA**: `@ducanh2912/next-pwa` for service worker and manifest management.
- **Forms**: React Hook Form + Zod

### Integration
- **Backend**: `logistics-api` (Go)
- **Authentication**: SSO via `auth-ui` (OIDC/OAuth2)
- **Real-time**: WebSockets for live rider tracking and task updates.

## Service Boundaries

### ✅ Rider Operations (Owned by Logistics UI)
- **Rider Onboarding**: KYC, vehicle registration, and profile setup.
- **Rider Dashboard**: Real-time task management, earnings tracking, and shift scheduling.
- **Live Delivery Tracking**: Providing WebSocket streams for rider locations to other services.
- **Fleet Management**: Admin tools for managing riders and delivery zones.
- **PWA Support**: Enhanced mobile experience with offline capabilities and install prompts for riders.

### ❌ Customer Ordering → **ordering-service**
- **Redirects To**: `https://ordering.codevertexitsolutions.com`
- **Why**: Ordering logic, menus, and customer carts are owned by the ordering service.

### ❌ Staff/Admin Portal → **cafe-website**
- **Redirects To**: `https://theurbanloftcafe.com`
- **Why**: General cafe operations, staff management, and high-level analytics are centralized in the cafe-website hub.

## Integration Patterns

### Incoming Redirects
Logistics UI accepts redirects from:
- **Cafe Website**: For rider management and fleet oversight.
- **Ordering Service**: For rider signup and dashboard access.

### Outgoing Redirects
Logistics UI redirects to:
- **Auth Service**: For SSO authentication.
- **Cafe Website**: When a staff member accidentally lands on a rider-specific page.

## Roadmap

### Sprint 1: Foundation & SSO (COMPLETED)
- [x] Project scaffolding with Next.js 15.
- [x] Zustand store for auth state.
- [x] TanStack Query for data fetching (useMe 5 min TTL, all fetches via TanStack Query).
- [x] Axios client with 401 interceptors.
- [x] PWA manifest and service worker configuration.
- [x] RBAC: useMe (roles/permissions), permission-based nav, route protection, 404/403 pages.

### Sprint 2: Rider Onboarding
- [ ] KYC document upload.
- [ ] Vehicle details management.
- [ ] Approval workflow integration.
- [ ] Mobile-first responsive design for onboarding forms.

### Sprint 3: Real-time Logistics
- [ ] WebSocket integration for location tracking.
- [ ] Task assignment and status updates.
- [ ] Map integration for rider routes.
- [ ] PWA install prompt for riders.

### Sprint 4: Earnings & Performance
- [ ] Rider earnings dashboard.
- [ ] Performance metrics and ratings.
- [ ] Payout history integration with treasury-service.
