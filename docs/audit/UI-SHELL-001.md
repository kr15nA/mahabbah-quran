# UI-SHELL-001 AUDIT (CORRECTED)

## Shell Architecture Implemented
The Mahabbah Qur'an platform utilizes a single, highly flexible `AppShell.tsx` component that drives the layout of all three user roles (Admin, Guru, Orang Tua) based on a `variant` prop.

### 1. `variant="admin"`
- **`<768px` (Mobile):** Off-canvas drawer (sidebar hidden `-translate-x-full`). Toggled via Topbar Hamburger Menu.
- **`768px – 1023px` (Tablet):** Inline collapsed sidebar (`w-[72px]`). Expands dynamically when toggled.
- **`>=1024px` (Desktop):** Inline expanded sidebar (`w-64`). Collapses dynamically when toggled. LocalStorage (`mq_sidebar_collapsed`) remembers this state.

### 2. `variant="portal"` (Guru & Orang Tua)
- **`<768px` (Mobile):** Mobile-first application paradigm. The sidebar is completely hidden (`hidden md:flex`). Primary navigation sits in a fixed **Bottom Navigation Bar**. If navigation items exceed 5, it automatically truncates to 4 and generates a "Lainnya" (More) accessible bottom sheet dropdown.
- **`>=768px` (Tablet/Desktop):** Responsive fallback using the permanently collapsed icon-only sidebar (`w-[72px]`). No toggle button is rendered, maximizing horizontal space for main content.

## Files Changed
1. **Modified:** `components/layout/AppShell.tsx`
   - Added `variant` prop (`'admin' | 'portal'`).
   - Implemented bottom navigation bar logic with "Lainnya" sheet.
   - Refined tailwind breakpoint strategies (`md:`, `lg:`).
2. **Modified:** `app/admin/layout.tsx`
   - Set `<AppShell variant="admin">`.
3. **Modified:** `app/guru/layout.tsx`
   - Set `<AppShell variant="portal">`.
4. **Modified:** `app/orang-tua/layout.tsx`
   - Completely stripped out the hardcoded mobile frame (`max-w-md`).
   - Integrated `<AppShell variant="portal">`.

## Accessibility
- Added explicit `aria-label`, `aria-hidden`, `aria-expanded`, and `aria-controls` attributes across both the Drawer and Bottom Sheet components.
- Collapsed navigation items display high-contrast tooltips triggering on both `group-hover` and `group-focus-within`.
- Escape key listener correctly closes both the mobile drawer and the "Lainnya" menu.
- Focus rings (`focus:ring-[#FBBF24]` and `focus:ring-[#4B21A2]`) implemented universally across interactable icons.

## Mobile Safety
- For `variant="portal"`, the `<main>` tag receives dynamic `pb-24` padding, ensuring the fixed bottom navigation bar does not obscure content.
- Uses `env(safe-area-inset-bottom)` to push the Bottom Nav and Bottom Sheet cleanly above iOS home indicators.

## Hydration Safety
- Hydration guards (`isMounted`) protect localStorage parsing and window property reading.
- For `variant="portal"`, CSS media queries (`hidden md:flex` on sidebar, `md:hidden` on bottom nav) dictate UI state *before* hydration kicks in. This ensures absolute stability without visual flashing upon page load.

## Local Test Matrix
| Resolution | Device Class | Result |
| :--- | :--- | :--- |
| **1440x900** | Desktop Large | PASS. Admin toggle collapses properly. Portal shows compact icon bar. |
| **1280x800** | Desktop Standard | PASS. |
| **1024x768** | Tablet Landscape | PASS. |
| **768x1024** | Tablet Portrait | PASS. Admin sidebar remains inline (collapsed by default). |
| **430x932** | Mobile Large | PASS. Admin uses Drawer. Portal uses Bottom Nav. No horizontal overflow. |
| **390x844** | Mobile Standard | PASS. |
| **360x800** | Mobile Small | PASS. Topbar text truncates safely. |

## Regressions
- Verified all requested routes for Admin, Guru, and Orang Tua.
- Active states successfully carry over.
- Business logic / Database interaction entirely untouched.
- TypeScript strictly enforces `AppShellProps`, passing build validation flawlessly.
