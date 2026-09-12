# MEDIA-001 — Unified Image / Media Storage

**Task:** MEDIA-001  
**Date:** 2026-09-12  
**Auditor:** Antigravity  
**Branch:** feature/media-001

---

## 1. Implementation Summary

A centralized media service was built to handle profile and student photos securely using Vercel Blob and Sharp for image optimization. Rather than creating isolated upload instances, a single unified architecture processes images, strictly validating user identity and outputting highly optimized WebP images tailored for mobile viewing.

- **Schema Check:** The existing `drizzle/schema.ts` already contained `avatar_url` (users) and `photo_url` (students). No database migrations were created.
- **Service Layer (`lib/media/index.ts`):** Validates dimensions, enforces a 5MB size limit, rejects invalid MIME types, and uses `sharp` to convert and crop images to a uniform 400x400 WebP asset (~20-40KB target).
- **Safe Object Naming:** Client-provided filenames are completely discarded. Object keys are predictably generated (e.g. `users/<id>/<timestamp>-<random>.webp`), preventing traversal and arbitrary overwrite.
- **Garbage Collection:** The service accepts an `oldUrl` parameter, automatically deleting the deprecated Vercel Blob asset during replacement to prevent orphan file accumulation.

---

## 2. API & Authorization Updates

Refactored `app/api/upload/route.ts` to consume the media service natively. It was locked down with strict RBAC:
- Relies on `requireAuth` from `@/lib/auth/rbac` to extract a trusted identity.
- Refuses to let a standard user upload to an `entityId` that is not their own `session.userId` (403 Forbidden).
- Only a `SUPER_ADMIN` may specify an arbitrary user ID or upload to the `students` bucket, safeguarding student records from unauthorized parent/guru tampering.

---

## 3. Storage & Technology Decisions

- **Vercel Blob:** Retained as primary blob store for thumbnails. CDN proximity ensures fast time-to-first-byte (TTFB) for list-heavy views (e.g., Santri and Guru lists).
- **Google Drive:** Explicitly not introduced for avatars. Drive remains an option for future heavy document archiving, not frequent web-facing thumbnail serving.
- **Sharp:** Chosen for rapid, low-memory-footprint conversion.
- **Format:** WebP at quality 80. AVIF was skipped to prevent excessive server CPU usage and ensure broader older-device compatiblity for parents' mobile devices. 400x400 dimension was chosen as the perfect middle ground—crisp enough for detail pages, small enough for list rendering without dual-fetching.

---

## 4. Known Limitations & Constraints

- We skipped creating a smaller (e.g., 48x48) thumbnail layer. Since a 400x400 WebP image routinely falls under 30KB, dual-uploading and dual-storing (thumbnail + detail) would double storage I/O with negligible list-rendering benefits on modern devices.
- Deleting an image will attempt to remove the Vercel Blob. If the blob deletion fails (network error), it silently catches the warning without throwing, prioritizing the database URL replacement (preventing broken images for the user). 

---

**COMMIT:** feat(media): add unified image storage
**BRANCH:** feature/media-001
**TYPECHECK:** PASS
**BUILD:** PASS
**DB TEST:** PASS
**SECURITY:** VERIFIED
**RESPONSIVE CODE:** VERIFIED (Image layout remains completely un-altered; Next/Image config was unaffected).
**VISUAL QA:** PASS 
**REGRESSION:** PASS (Admin Account profile upload fully integrates and succeeds with new pipeline).
**STATUS:** COMPLETE
