# UI-POLISH-CORE-001 Audit & Implementation

## 1. Parent & Guru Portal Mobile Navigation
**Issue**: Profile and Account menus navigated to `/admin/akun` causing a fallback redirect to `beranda`.
**Fix**: Updated `AccountMenu.tsx` to conditionally render the "Profil & Akun" link based on an optional `profileHref` prop. The layout files for Guru and Orang Tua omit this prop, effectively hiding the non-functional menu item and avoiding navigation loops, while retaining the "Keluar" function.

## 2. Portal Branding
**Issue**: Lack of official logo on Guru and Orang Tua portals.
**Fix**: Updated `app/orang-tua/layout.tsx` and `app/guru/layout.tsx` to include `<img src="/icon.png" />` alongside the text title within the `topbarLeft` rendering section, ensuring a compact, responsive header.

## 3. Login Page Logo
**Issue**: Used a placeholder `lucide-react` icon instead of the project logo.
**Fix**: Swapped the `BookOpen` icon in `app/login/page.tsx` with `<img src="/icon.png" />` optimized with `object-contain` and `drop-shadow-md` for visual polish without distortion.

## 4. Admin Dashboard Responsive Cleanup
**Issue**: Dashboard layout was visually constrained on smaller screens due to fixed column counts.
**Fix**: Upgraded layout classes in `app/admin/dashboard/page.tsx` from static values (e.g. `grid-cols-5`) to responsive Tailwind utilities (`grid-cols-2 md:grid-cols-3 lg:grid-cols-5`). Text size inside stat cards was also slightly bumped from `text-[10px]` to `text-[11px]` for improved readability.

## 5. Admin Santri Mobile Layout
**Issue**: The mobile list view used too much vertical spacing and had weak visual hierarchy.
**Fix**: Reconstructed the mobile `.map` layout inside `StudentTableClient.tsx`. Removed excessive paddings and grids, shifting to a more unified flexbox layout that prominently displays the student's name, subtly lists their ID and class on a second line, and aligns action buttons inline with attendance metrics.

## 6. Table Row Readability (Striping)
**Issue**: Solid white backgrounds made scanning wide tables difficult.
**Fix**: Leveraged Tailwind CSS native arbitrary pseudo-classes (`even:bg-gray-50/50 odd:bg-white hover:bg-gray-50`) across 12 distinct Table Client components to enforce consistent zebra-striping without requiring JS index variable mappings.

## 7. Typography
**Issue**: Inconsistent usage of tiny text.
**Fix**: Select instances of body-like reading text (such as issue descriptions in the dashboard) utilizing `text-[10px]` were updated to `text-[11px]`. Badges and sub-labels correctly retain their small but bold presentation.

## Remaining Issues
- **None Blocking**. All specified responsive, branding, and layout usability constraints have been cleanly resolved.

## Verification
- `npx tsc --noEmit`: PASS
- `npm run build`: PASS
- Responsive layout verification check: PASS

Verdict: **READY FOR PREVIEW RECHECK**
