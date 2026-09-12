# UI-SHELL-001-CORRECTION-PLAN

## Existing Orang Tua Layout
The current `app/orang-tua/layout.tsx` acts as a hardcoded mobile application frame. 
- It forces a `max-w-md` (448px) container centered on the screen, surrounded by a gray background.
- It includes a fixed top header (`#18085A`) with logo and logout button.
- It includes a fixed bottom navigation bar containing 4 primary items.
- It does not have responsive behavior for desktops/tablets (the frame simply remains small and centered).
- It does not use `AppShell`.

## Existing Mobile Navigation
Currently, Mahabbah Qur'an has two isolated mobile patterns:
1. **Drawer/Hamburger Pattern:** Just implemented via `AppShell` for Admin (and accidentally applied to Guru). Uses an off-canvas left sidebar on `<768px` viewports.
2. **Bottom Navigation Pattern:** Hardcoded inside `/orang-tua/layout.tsx`. Does not support "More/Lainnya" flyouts if items exceed 5.

## Proposed Shared Shell Architecture
We will update `components/layout/AppShell.tsx` to support a `variant` prop determining the layout architecture:

```tsx
type AppShellProps = {
  variant?: 'admin' | 'portal'; // Defaults to 'admin'
  // ... existing props
}
```

### 1. `variant="admin"` (For `/admin`)
- **`<768px`**: Mobile topbar with a Hamburger button triggering an off-canvas drawer. 
- **`768px – 1023px` (Tablet)**: The sidebar renders inline but is **collapsed by default**. The hamburger/toggle button expands it. It is NOT an off-canvas drawer.
- **`>=1024px` (Desktop)**: The sidebar renders inline (expanded by default, remembers user preference via `localStorage`).

### 2. `variant="portal"` (For `/guru` and `/orang-tua`)
- **`<768px`**: Render a mobile topbar and a **Fixed Bottom Navigation Bar**. 
  - If `navItems.length <= 5`, render all items evenly.
  - If `navItems.length > 5`, render the first 4 items, plus a 5th "Lainnya" (More) button that opens a bottom sheet or simple dropdown menu containing the remaining items.
- **`>=768px`**: Responsive desktop fallback. To avoid recreating a completely new top-nav layout, we will use the **collapsed sidebar** (icon + tooltip) on desktop/tablet, providing a full-width main content area.

## How Guru and Orang Tua Can Share Mobile Portal Navigation
Both Guru and Orang Tua will wrap their pages in `<AppShell variant="portal" />`. 
By passing their respective `NAV` arrays and `topbar` node overrides:
- The bottom navigation bar will dynamically map the `navItems`.
- Because Guru currently has exactly 5 items (`Dashboard, Santri Saya, Absensi, Hafalan, Laporan`), it fits perfectly without triggering "Lainnya".
- Because Orang Tua currently has exactly 4 items, it fits perfectly.
- The constraint logic will be built so future additions seamlessly nest into the "Lainnya" drawer.

## Breakpoint Behavior
We will adjust the Tailwind CSS breakpoint strategies inside `AppShell.tsx`:
- `md:` (768px) and `lg:` (1024px) will be heavily utilized to distinguish between mobile bottom nav, tablet collapsed sidebars, and desktop expanded sidebars.
- Hydration guards (`isMounted`) will ensure CSS media queries govern the initial SSR paint, preventing layout shift.

## Files That Need Modification
- `components/layout/AppShell.tsx` (Add `variant` logic, bottom nav, tablet layout adjustments).
- `app/guru/layout.tsx` (Switch `AppShell` prop to `variant="portal"`).
- `app/orang-tua/layout.tsx` (Strip out `max-w-md` hardcoded HTML and wrap with `AppShell variant="portal"`).
- `app/admin/layout.tsx` (Pass `variant="admin"` explicitly or rely on default).

## Files Intentionally Untouched
- ALL page-level content (`page.tsx`) across Admin, Guru, and Orang Tua.
- ALL API endpoints, Queries, Auth hooks, and RBAC middleware.
- The core business functionality remains completely isolated from this layout orchestrator.

## Accessibility Considerations
- The Bottom Navigation bar will implement standard accessible roles (`role="navigation"`).
- The "Lainnya" popup (if implemented) will trap focus securely, respond to the Escape key, and provide `aria-expanded` and `aria-controls`.
- Sidebar toggling for the Tablet Admin view will maintain `aria-expanded`.

## Hydration / LocalStorage Considerations
- We must respect SSR boundaries. The bottom nav versus sidebar distinction is purely visual/CSS-driven until JS hydrates. 
- For `variant="portal"`, the DOM will render BOTH the bottom navigation (`md:hidden`) AND the sidebar (`hidden md:flex`). This guarantees 100% hydration-safe UI without flashing incorrect layouts on page load.
- LocalStorage logic (`mq_sidebar_collapsed`) will specifically apply only when `variant="admin"`. In `variant="portal"`, the sidebar will be permanently collapsed on tablet/desktop to match modern portal designs.
