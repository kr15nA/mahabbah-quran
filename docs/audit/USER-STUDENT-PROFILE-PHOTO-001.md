# Audit: USER-STUDENT-PROFILE-PHOTO-001

## 1. Schema & Migration
- `users.avatar_url`: Retained existing schema definition.
- `students.photo_url`: Retained existing schema definition.
- Migration: **NONE**. No `drizzle-kit push` or new migration files were generated. Production schema remains unmodified.

## 2. Storage & Media Processing
- **Storage Provider**: Vercel Blob (via `@vercel/blob`).
- **Profile Photo Processing**: 
  - Standardized to `512x512` resolution.
  - Formatted as `WebP` at `82` quality.
  - Automatically rotated to strip EXIF orientation.
  - Uses `fit: 'cover'` and `position: 'center'` (square crop).
  - Validation ensures `max 5 MB` limit.
  - Rejects non-image mime types, requiring explicit JPEG/PNG/WebP magic byte support via Sharp decode.
- **Global Media Defaults**: Unchanged. Existing calls to `uploadOptimizedImage` will retain the original `400x400` default behavior.

## 3. Authorization (RBAC)
- **User Avatar (`users.avatar_url`)**: 
  - Domain Action: `uploadUserAvatar` and `removeUserAvatar`.
  - Self-Upload / Self-Remove: **PASS**.
  - Other-User: **DENIED** (Enforced through the `actorUserId` bounded context in the session API).
- **Student Photo (`students.photo_url`)**:
  - Domain Action: `uploadStudentPhotoAction` and `removeStudentPhotoAction`.
  - Admin (with `system.user.manage`): **PASS**.
  - Guru / Parent / Student-Self / Soft-deleted Student: **DENIED**. Enforced natively via the API Action boundary leveraging `requirePermission('system.user.manage')`.

## 4. Blob Lifecycle & Atomic Audit Logging
- **Managed Deletion**: To prevent orphan blobs, existing blobs managed by the platform are safely removed (`cleanupPrevious`) only when verified as `.vercel-blob.com` URLs (`isManagedBlobUrl`).
- **Audit Logging**: 
  - Implemented cleanly within DB transactions (e.g. `txDb.transaction`).
  - Safe payload footprint mapping only abstract state changes: `{ hadAvatar: boolean, hasAvatar: boolean }` and `{ hadPhoto: boolean, hasPhoto: boolean }`.
  - The literal Vercel Blob URL string is explicitly NOT stored in the `audit_logs` metadata to prevent DB leakages.

## 5. Display Surfaces & Avatar Component
- A unified `<ProfileAvatar>` component encapsulates the display logic (handling sizing, image resolution, loading state, and robust text-initials fallback logic).
- Layout semantics enforce proper role boundaries:
  - Admin, Guru, Parent, and Santri app shells rely explicitly on `users.avatar_url` (via `userProfile.avatarUrl`).
  - List and Detail views inside Admin, Guru, and Parent portals map strictly to `students.photo_url` when dealing with learners.
- At no point does a parent’s account avatar replace a child’s profile photo, nor does a user's avatar mask their student identity when functioning in a multi-context capability.

## 6. Multi-Context Isolation
- Isolation verified successfully via test suite.
- An update to the User Account Avatar (`users.avatar_url`) leaves the Learner Photo (`students.photo_url`) strictly unmodified.
- Deletions are similarly isolated.

## 7. Performance & Query Patterns
- Evaluated List and Tabular queries (e.g. `Admin Student List`, `Guru Santri List`).
- Data grids use pre-aggregated queries joining `photo_url` directly onto `StudentRow`.
- **N+1 Issue Check**: NO. No cascading network fetches per-student for photo extraction occur.

## 8. Legacy Upload Route
- `/api/upload`: **PRESERVED**. Unrelated internal features still utilize the general purpose `api/upload` endpoint. 

## 9. Testing & Regressions
- Profile Photo Domain Tests: **PASS**
- Multi Context A/B/C Regressions: **PASS**
- Tasmi Regressions: **PASS**
- RBAC Regressions: **PASS**
- Guardian Model Regressions: **PASS**
- Quran Surah Master Regressions: **PASS**
- Student/Parent Domain Regressions: **PASS**
- User Profile Regressions: **PASS**

**Status**: RELEASED
**Main Release SHA**: f154a51599b377b805367f68367855e9abd4dd7b
**Production Deployed SHA**: f154a51599b377b805367f68367855e9abd4dd7b
**Tag**: user-student-profile-photo-v1.0.0
**Migration**: NONE
**User Avatar**: RELEASED
**Student Photo**: RELEASED
**Vercel Blob**: RELEASED
**Profile Processing**: 512x512 WebP quality 82
**Existing Media Default**: 400x400 unchanged
**User/Student photo isolation**: VERIFIED
**Production Blob UAT**: PASS
**Parent edit Student photo**: DENIED
**Guru edit Student photo**: DENIED
**Student self-edit Student photo**: DENIED
