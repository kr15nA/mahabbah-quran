# AUTHZ-REAL-DATA-VERIFY-001

## 1. Test Methodology
A dedicated server-side test script was executed against the local preview runtime. The script directly queried the underlying Drizzle ORM Neon Database to dynamically fetch **real IDs** of existing users, classes, and students to explicitly test cross-owner IDOR boundaries. 

No hardcoded or nonexistent IDs were used. The script fetched live session cookies and executed authenticated `fetch()` commands.

### Extracted Real Data:
- **Teacher A:** `aldi.solihin@mahabbahquran.id` | Class: `1` | Assigned Student: `1`
- **Teacher B:** `siti.rahmah@mahabbahquran.id` | Class: `2` | Assigned Student: `5`
- **Parent A:** `hendra.wijaya@gmail.com` | Linked Student: `1` | Unlinked Student: `2`

---

## 2. Test Execution Results

### PARENT A (`hendra.wijaya@gmail.com`)
- **Linked student (ID `1`):** `PASS` (Returned 200 OK with correct payload).
- **Existing unrelated student (ID `2`):** `PASS` (Successfully blocked with 403 Forbidden).
- **Student List (`/api/students`):** `PASS` (Parent A list correctly filtered to strictly return *only* the linked child arrays).

### TEACHER A (`aldi.solihin@mahabbahquran.id`)
- **Assigned student (ID `1`):** `PASS` (Returned 200 OK).
- **Existing student assigned to Teacher B (ID `5`):** `PASS` (Successfully blocked with 403 Forbidden).
- **Student List (`/api/students`):** `PASS` (Teacher A list correctly filtered to strictly return *only* students inside Class `1`).

### ATTENDANCE MUTATION IDOR
- **Teacher A + assigned class (`1`) + assigned student (`1`):** `PASS` (Allowed and recorded successfully).
- **Teacher A + assigned class (`1`) + unrelated student (`5`):** `PASS` (Blocked with 403. Teacher A cannot record attendance for a student who exists, but is not in Class `1`).
- **Teacher A + unrelated class (`2`) + unrelated student (`5`):** `PASS` (Blocked with 403. Teacher A cannot record attendance for Teacher B's class).

### LEARNING REPORT MUTATION IDOR
- **Teacher A + own existing student (`1`):** `PASS` (Allowed and draft created).
- **Teacher A + existing unrelated student (`5`):** `PASS` (Blocked with 403. Teacher A cannot create reports for Teacher B's students).

---

## 3. Conclusion
All IDOR and multi-tenant data leakage boundaries successfully passed rigorous integration testing using real, cross-referenced entities. The server-side authorization enforcement behaves perfectly on a Default Deny / Explicit Allow architecture.
