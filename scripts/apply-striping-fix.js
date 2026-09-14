const fs = require('fs');
const path = require('path');

const STRIPING_CSS = 'className="hover:bg-gray-50 transition-colors even:bg-gray-50/50 odd:bg-white"';
const STRIPING_CSS_IDX = 'className="hover:bg-gray-50 transition-colors even:bg-gray-50/50 odd:bg-white"';

const replacements = [
  {
    file: 'app/admin/absensi/AdminAbsensiClient.tsx',
    search: 'className={`hover:bg-gray-50 transition-colors ${i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}',
    replace: STRIPING_CSS
  },
  {
    file: 'app/admin/enrollment/EnrollmentClient.tsx',
    search: 'className={`hover:bg-gray-50 transition-colors ${i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}',
    replace: STRIPING_CSS
  },
  {
    file: 'app/admin/hafalan/HafalanClient.tsx',
    search: 'className={`hover:bg-gray-50 transition-colors ${i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}',
    replace: STRIPING_CSS
  },
  {
    file: 'app/admin/laporan/LaporanClient.tsx',
    search: 'className={`hover:bg-gray-50 transition-colors ${i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}',
    replace: STRIPING_CSS
  },
  {
    file: 'app/admin/pengguna/UserListClient.tsx',
    search: 'className={`hover:bg-gray-50 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}',
    replace: STRIPING_CSS_IDX
  },
  {
    file: 'app/admin/penilaian/PenilaianClient.tsx',
    search: 'className={`hover:bg-gray-50 transition-colors ${i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}',
    replace: STRIPING_CSS
  },
  {
    file: 'app/admin/penugasan-guru/AssignmentClient.tsx',
    search: 'className={`hover:bg-gray-50 transition-colors ${i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}',
    replace: STRIPING_CSS
  },
  {
    file: 'app/admin/santri/StudentTableClient.tsx',
    search: 'className={`hover:bg-gray-50 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}',
    replace: STRIPING_CSS_IDX
  },
  {
    file: 'app/admin/tahsin/TahsinClient.tsx',
    search: 'className={`hover:bg-gray-50 transition-colors ${i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}',
    replace: STRIPING_CSS
  },
  {
    file: 'app/admin/guru/GuruTableClient.tsx',
    search: 'className={`hover:bg-gray-50 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}',
    replace: STRIPING_CSS_IDX
  },
  {
    file: 'app/admin/kelas/KelasTableClient.tsx',
    search: 'className={`hover:bg-gray-50 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}',
    replace: STRIPING_CSS_IDX
  },
  {
    file: 'app/admin/program/ProgramTableClient.tsx',
    search: 'className={`hover:bg-gray-50 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}',
    replace: STRIPING_CSS_IDX
  }
];

replacements.forEach(({ file, search, replace }) => {
  const fullPath = path.join(process.cwd(), file);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    content = content.replace(search, replace);
    fs.writeFileSync(fullPath, content);
    console.log(`Updated ${file}`);
  } else {
    console.log(`File not found: ${file}`);
  }
});
