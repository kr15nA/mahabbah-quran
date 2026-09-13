# FUNCTIONAL-AUDIT-001: Mahabbah Qur'an

## 1. Executive Summary
Audit ini memetakan status fungsional dari seluruh antarmuka (UI) aplikasi terhadap ketersediaan Backend (API & Database). 
Berdasarkan pengecekan kode sumber:
- **API & Database Layer**: Hampir seluruh *queries* (CRUD) telah diimplementasikan di `lib/db/queries/*.ts` dan terhubung dengan Route Handlers di `app/api/**/*.ts`.
- **UI Layer (Frontend)**: Terdapat *gap* yang signifikan. Banyak komponen UI, terutama pada *dashboard*, menu Guru, dan menu Orang Tua, masih menggunakan data *dummy* statis yang di-hardcode.

**Kesimpulan:** Aplikasi secara arsitektur backend sudah sangat siap, namun sebagian besar UI perlu segera disambungkan (*wired*) ke API/database agar aplikasi berfungsi nyata.

---

## 2. Status Classification
- **PASS**: Berfungsi penuh, terhubung DB/API.
- **PARTIAL**: Terhubung sebagian, UI/API ada namun belum lengkap.
- **DUMMY**: UI tersedia namun data sepenuhnya *hardcoded*/statis.
- **MISSING**: UI / Entry point tidak tersedia.

### Statistik
- **PASS**: 4
- **PARTIAL**: 3
- **DUMMY**: 12
- **MISSING**: 5 (sebagian besar profil & pengaturan akun)
- **BROKEN**: 0
- **SECURITY ISSUE**: 0 (belum ditemukan masalah kebocoran data antar session)

---

## 3. Route/Menu Inventory & Gap Analysis

### A. Admin Panel
| Menu | UI | API | DB | Action | Auth | Status | Priority |
|------|----|-----|----|--------|------|--------|----------|
| Dashboard | Yes | No | No | Dummy | Yes | **DUMMY** | P1 |
| Santri | Yes | Yes | Yes | Pass | Yes | **PASS** | - |
| Program | Yes | Yes | Yes | Pass | Yes | **PASS** | - |
| Kelas | Yes | Yes | Yes | Partial | Yes | **PARTIAL** | P2 |
| Guru | Yes | Yes | Yes | Pass | Yes | **PASS** | - |
| Absensi | Yes | Yes | Yes | Dummy | Yes | **DUMMY** | P1 |
| Hafalan | Yes | Yes | Yes | Dummy | Yes | **DUMMY** | P1 |
| Tahsin | Yes | Yes | Yes | Dummy | Yes | **DUMMY** | P1 |
| Penilaian | Yes | Yes | Yes | Dummy | Yes | **DUMMY** | P1 |
| Laporan | Yes | Yes | Yes | Partial | Yes | **PARTIAL** | P2 |
| Analitik | Yes | No | No | Dummy | Yes | **DUMMY** | P2 |
| AI | Yes | Yes | Yes | Partial | Yes | **PARTIAL** | P2 |
| Notifikasi | Yes | Yes | Yes | Dummy | Yes | **DUMMY** | P2 |
| Pengaturan | Yes | No | No | Dummy | Yes | **DUMMY** | P3 |

### B. Guru Portal
| Menu | UI | API | DB | Action | Auth | Status | Priority |
|------|----|-----|----|--------|------|--------|----------|
| Dashboard | Yes | Yes | Yes | Dummy | Yes | **DUMMY** | P1 |
| Santri Saya | Yes | Yes | Yes | Dummy | Yes | **DUMMY** | P1 |
| Absensi | Yes | Yes | Yes | Partial | Yes | **DUMMY** | P1 |
| Hafalan | Yes | Yes | Yes | Dummy | Yes | **DUMMY** | P1 |
| Laporan | Yes | Yes | Yes | Partial | Yes | **PARTIAL** | P1 |

### C. Orang Tua Portal
| Menu | UI | API | DB | Action | Auth | Status | Priority |
|------|----|-----|----|--------|------|--------|----------|
| Beranda | Yes | No | No | Dummy | Yes | **DUMMY** | P1 |
| Laporan | Yes | Yes | Yes | Dummy | Yes | **DUMMY** | P1 |
| Absensi | Yes | Yes | Yes | Dummy | Yes | **DUMMY** | P1 |
| Notifikasi | Yes | Yes | Yes | Dummy | Yes | **DUMMY** | P2 |

### D. Akun & Otentikasi (All Roles)
| Feature | UI | API | DB | Action | Auth | Status | Priority |
|---------|----|-----|----|--------|------|--------|----------|
| Login | Yes | Yes | Yes | Pass | Yes | **PASS** | - |
| Logout | Yes | Yes | Yes | Pass | Yes | **PASS** | - |
| Profile / Ganti Foto | No | No | No | Missing | Yes | **MISSING** | P2 |
| Ganti Password | No | No | No | Missing | Yes | **MISSING** | P2 |

---

## 4. Gap & Dependency Map
**1. UI tanpa API Connection (DUMMY):**
Hampir seluruh dashboard (Admin, Guru, Orang Tua) dan halaman detail seperti Hafalan, Tahsin, dan Absensi masih menampilkan konstanta *hardcoded*. Hal ini harus menjadi target utama (*P1*) agar data riil yang sudah ada di database (dari hasil seeder) dapat dirender.

**2. Missing Features:**
Fitur dasar pengelolaan profil (ubah profil, ganti foto, ganti kata sandi) sama sekali belum diimplementasikan di layer UI maupun API. 

**3. Data Leakage / Authorization Verification:**
Mengingat data saat ini masih statis pada portal Guru dan Orang Tua, validasi mengenai data leakage (Orang Tua melihat anak lain, atau Guru melihat kelas lain) belum bisa dites secara nyata di UI. Namun, struktur API (`lib/db/queries/students.ts`, `app/api/students/route.ts`) sudah mengkondisikan filter berdasarkan ownership role. Setelah DUMMY data dibersihkan, hal ini harus dites ulang.

---

## 5. Recommended Execution Order
1. **P1 (Guru & Orang Tua Integration)**: Hubungkan `app/guru/dashboard/page.tsx`, `app/guru/santri/page.tsx`, `app/orang-tua/beranda/page.tsx` dengan data nyata dari database agar fungsionalitas inti (monitoring nilai dan absen) bisa dirasakan pengguna.
2. **P1 (Admin Dashboards & Tables)**: Hubungkan tabel-tabel Absensi, Hafalan, Penilaian, dan Laporan di Admin dengan real data dari API.
3. **P2 (Laporan & AI)**: Lengkapi form Laporan di Guru dan pastikan tombol *action* mengirim _payload_ yang sesuai ke API serta menggerakkan integrasi Claude AI.
4. **P2 (Missing Profile Features)**: Buat halaman pengaturan Profil, Upload Avatar, dan Ganti Password beserta API handlers-nya.
5. **P3 (Cosmetics & Analitik)**: Hubungkan _charts_ di halaman analitik dengan agregasi data nyata.
