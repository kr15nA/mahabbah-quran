# Audit PDF-REPORT-001

## Objective
Implement secure PDF generation for individual student learning reports.

## Work Performed
1. **PDF Library**: Integrated `pdfmake` specifically using the browser build (`pdfmake/build/pdfmake` and `pdfmake/build/vfs_fonts`) to ensure standard fonts (Roboto) are embedded and bypass Turbopack's fs constraints on Vercel Edge/Node environments.
2. **Generator Service**: Implemented `lib/pdf/generator.ts` with A4 portrait styling, mapping the `pdfData` interface directly from database models (including Hafalan, Tahsin, Attendance, and AI comments).
3. **Secure API Endpoint**: Implemented `app/api/learning-reports/[id]/pdf/route.ts`:
   - Validates session and uses `requireReportAccess(id)` directly to strictly ensure identity-based RBAC (Admin, Owner Guru, or Linked Parent).
   - Translates Drizzle query fields to the structured object required by the PDF generator.
   - Converts the `pdfMake.createPdf` output into a Buffer and serves it directly as a binary PDF with `Content-Disposition: attachment`.
4. **UI Integration**:
   - Added Download PDF button to Admin Laporan (`app/admin/laporan/LaporanClient.tsx`).
   - Re-verified existing `app/orang-tua/laporan/[id]/page.tsx` was correctly pre-wired to hit the newly built API.

## Security Constraints Checked
- Relied entirely on the centralized `lib/auth/rbac.ts` logic (`requireReportAccess`).
- Did not rely on query params or client-side roles to bypass authorization.
- Returning 404 for Parents if report is inaccessible, preventing enumeration. 401 on missing session.

## Next Steps
- Continue to any remaining tasks in the pipeline.
