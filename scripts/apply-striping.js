const fs = require('fs');
const path = require('path');

const STRIPING_CLASS_I = 'className={`hover:bg-gray-50 transition-colors ${i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}';
const STRIPING_CLASS_IDX = 'className={`hover:bg-gray-50 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}';
const STRIPING_CLASS_INDEX = 'className={`hover:bg-gray-50 transition-colors ${index % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}';

const replacements = [
  {
    file: 'app/admin/absensi/AdminAbsensiClient.tsx',
    search: 'className="hover:bg-gray-50"',
    replace: STRIPING_CLASS_I
  },
  {
    file: 'app/admin/enrollment/EnrollmentClient.tsx',
    search: 'className="hover:bg-gray-50/50 transition-colors"',
    replace: STRIPING_CLASS_I
  },
  {
    file: 'app/admin/hafalan/HafalanClient.tsx',
    search: 'className="hover:bg-gray-50"',
    replace: STRIPING_CLASS_I
  },
  {
    file: 'app/admin/laporan/LaporanClient.tsx',
    search: 'className="hover:bg-gray-50"',
    replace: STRIPING_CLASS_I
  },
  {
    file: 'app/admin/pengguna/UserListClient.tsx',
    search: 'className="hover:bg-gray-50/50 transition"',
    replace: STRIPING_CLASS_IDX
  },
  {
    file: 'app/admin/penilaian/PenilaianClient.tsx',
    search: 'className="hover:bg-gray-50"',
    replace: STRIPING_CLASS_I
  },
  {
    file: 'app/admin/penugasan-guru/AssignmentClient.tsx',
    search: 'className="hover:bg-gray-50/50 transition-colors"',
    replace: STRIPING_CLASS_I
  },
  {
    file: 'app/admin/santri/StudentTableClient.tsx',
    search: "className={idx % 2 === 0 ? 'bg-white' : 'bg-[#FAFAFA]'}",
    replace: STRIPING_CLASS_IDX
  },
  {
    file: 'app/admin/tahsin/TahsinClient.tsx',
    search: 'className="hover:bg-gray-50"',
    replace: STRIPING_CLASS_I
  },
  {
    file: 'app/admin/guru/GuruTableClient.tsx',
    search: "className={idx % 2 === 0 ? 'bg-white' : 'bg-[#FAFAFA]'}",
    replace: STRIPING_CLASS_IDX
  },
  {
    file: 'app/admin/kelas/KelasTableClient.tsx',
    search: "className={idx % 2 === 0 ? 'bg-white' : 'bg-[#FAFAFA]'}",
    replace: STRIPING_CLASS_IDX
  },
  {
    file: 'app/admin/program/ProgramTableClient.tsx',
    search: "className={idx % 2 === 0 ? 'bg-white' : 'bg-[#FAFAFA]'}",
    replace: STRIPING_CLASS_IDX
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
