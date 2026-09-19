# PARENT-FAMILY-DASHBOARD-C2.1 (Selected Child Dashboard) AUDIT

## Goal
Improve the Parent Family Dashboard (Beranda) UX by switching from a multi-child CSS grid of cards to a cleaner Selected Child UX, driven by a canonical `child_id`. This prevents horizontal squeezing and clipped text when multiple children are connected to a single parent.

## UX Architecture
- **ChildDashboardSelector**: A horizontal scrollable strip (chips) rendered at the top of the dashboard if the parent has multiple authorized children. The selected child is prominently highlighted.
- **SelectedChildDashboard**: A full-width, single-column dashboard for the selected child. Sections flow vertically, giving maximum readability to Avatar, Kehadiran, Hafalan, Tahsin, and Laporan. No clipping or truncation.

## Resolution Semantics
- Built on top of C1 `resolveParentChildContext`.
- **0 Children**: Renders empty state.
- **1 Child (no child_id param)**: Auto-resolves and renders that child directly without a selector.
- **Multi-Child (no child_id param)**: Redirects explicitly to `/orang-tua/beranda?child_id=<first_authorized_child>` to provide a deterministic Beranda-specific default without breaking C1 strict semantics.
- **Multi-Child (valid child_id)**: Renders selector and the selected dashboard.
- **Invalid Child**: Safe redirect to clean Beranda.
- **Forbidden Child**: Akses Ditolak.

## Data Fetching & Query Semantics
- **Reused C2 Strategy**: Kept `getFamilyDashboardData` which batches queries for *all* authorized children (1 auth query + 4 metric queries).
- **Reason**: The query count remains exactly 5 whether querying for 1 child or N children. DB load difference for 1-4 typical children is completely negligible. This completely eliminates regression risk on metric calculations.
- **Data Isolation**: The Beranda page extracts exactly one DTO from the batched payload based on the canonical `child_id`. Isolation is guaranteed.

## Canonical Link Propagation
- CTA "Lihat Riwayat Absensi" propagates canonical `?child_id=<selected>`.
- CTA "Lihat Laporan" propagates canonical report ID route.

## Migration
- **NONE** (No schema changes).

## TESTS
- Added `test-parent-selected-dashboard-c21.ts` covering zero-child, single-child auto-resolve, multi-child default, URL stability, isolation, and fallback handling.

## RESPONSIVE
- Tested horizontally down to 375px. 
- Only the selector strip may scroll horizontally (`overflow-x-auto`). The dashboard itself is strictly vertical and fits within the viewport.

## Release Metadata
- **Status**: RELEASED
- **Main Release SHA**: c450cd7d5677dd16dff4373a060b4814bc72c8ea
- **Production Deployed SHA**: c450cd7d5677dd16dff4373a060b4814bc72c8ea
- **Tag**: parent-family-dashboard-c2.1-v1.0.0
- **Production Smoke**: PASS
- **Migration**: NONE
- **Production DB Mutated**: NO
