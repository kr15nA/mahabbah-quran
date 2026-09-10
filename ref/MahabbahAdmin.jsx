import { useState, useMemo } from "react"
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from "recharts"
import {
  Home, Users, User, BookOpen, Calendar, FileText, Settings, Bell,
  Search, Plus, Download, BarChart2, Brain, Award, AlertTriangle,
  CheckCircle, ChevronRight, RefreshCw, Star, BookMarked, Layers,
  LogOut, Eye, Edit, Trash2, TrendingUp, Send, Bot, Shield,
  Activity, Filter, X, ChevronDown, Menu, GraduationCap, Sparkles
} from "lucide-react"

// ── Tokens ──────────────────────────────────────────────────────────────────
const C = {
  sidebar: '#18085A',
  sidebarBorder: 'rgba(255,255,255,0.07)',
  navHover: 'rgba(255,255,255,0.07)',
  navActive: 'rgba(251,191,36,0.14)',
  primary: '#4B21A2',
  primaryHover: '#3a1880',
  secondary: '#7B4BD6',
  gold: '#FBBF24',
  bg: '#F0EDF9',
  card: '#FFFFFF',
  text: '#1F1F2E',
  sub: '#4B5563',
  muted: '#9CA3AF',
  border: '#E5E7EB',
  borderStrong: '#D1D5DB',
  success: '#16A34A',
  successBg: '#DCFCE7',
  danger: '#DC2626',
  dangerBg: '#FEE2E2',
  warning: '#D97706',
  warningBg: '#FEF3C7',
  purple50: '#EDE9FE',
}

// ── Seed Data ────────────────────────────────────────────────────────────────
const STUDENTS = [
  { id:1,  ini:'AZ', name:'Ahmad Zaki Ramadhan',   cls:'Kelompok A', prog:'Tahfizh Juz 30', teacher:'Ust. Aldi Solihin',    pct:75, att:92, score:88, status:'active',   col:'#4B21A2' },
  { id:2,  ini:'FA', name:'Fatimah Az-Zahra',       cls:'Kelompok A', prog:'Tahfizh Juz 30', teacher:'Ust. Aldi Solihin',    pct:60, att:88, score:80, status:'active',   col:'#7B4BD6' },
  { id:3,  ini:'YA', name:'Yusuf Al-Amin',          cls:'Kelompok A', prog:'Tahfizh Juz 30', teacher:'Ust. Aldi Solihin',    pct:80, att:93, score:92, status:'active',   col:'#16A34A' },
  { id:4,  ini:'AN', name:'Aisyah Nur Hidayah',     cls:'Kelompok A', prog:'Tahfizh Juz 30', teacher:'Ust. Aldi Solihin',    pct:50, att:85, score:72, status:'active',   col:'#F59E0B' },
  { id:5,  ini:'MR', name:'Muhammad Raihan',        cls:'Kelompok B', prog:'Tahfizh Juz 30', teacher:'Ustadzah Siti Rahmah', pct:65, att:90, score:78, status:'active',   col:'#4B21A2' },
  { id:6,  ini:'KP', name:'Khadijah Putri',         cls:'Kelompok B', prog:'Tahfizh Juz 30', teacher:'Ustadzah Siti Rahmah', pct:70, att:68, score:75, status:'active',   col:'#DC2626' },
  { id:7,  ini:'IH', name:'Ibrahim Hasan',          cls:'Kelompok B', prog:'Tahfizh Juz 30', teacher:'Ustadzah Siti Rahmah', pct:55, att:75, score:70, status:'inactive', col:'#7B4BD6' },
  { id:8,  ini:'MS', name:'Maryam Sholihah',        cls:'Kelompok C', prog:'Tahfizh Juz 29', teacher:'Ust. Ahmad Fauzi',     pct:82, att:95, score:90, status:'active',   col:'#16A34A' },
  { id:9,  ini:'AS', name:'Abdullah Syauqi',        cls:'Kelompok C', prog:'Tahfizh Juz 29', teacher:'Ust. Ahmad Fauzi',     pct:78, att:91, score:85, status:'active',   col:'#4B21A2' },
  { id:10, ini:'FF', name:'Fulan bin Fulan',        cls:'Kelompok C', prog:'Tahfizh Juz 29', teacher:'Ust. Ahmad Fauzi',     pct:40, att:70, score:55, status:'active',   col:'#7B4BD6' },
]

const TEACHERS = [
  { id:1, ini:'AS', name:'Ustadz Aldi Solihin',    email:'aldi.solihin@mahabbahquran.id',  phone:'081234560001', cls:'Kelompok A', students:4, reports:18, col:'#4B21A2' },
  { id:2, ini:'SR', name:'Ustadzah Siti Rahmah',   email:'siti.rahmah@mahabbahquran.id',   phone:'081234560002', cls:'Kelompok B', students:3, reports:15, col:'#7B4BD6' },
  { id:3, ini:'AF', name:'Ustadz Ahmad Fauzi',     email:'ahmad.fauzi@mahabbahquran.id',   phone:'081234560003', cls:'Kelompok C', students:3, reports:14, col:'#16A34A' },
]

const MONTHLY = [
  { m:'Jan', hafalan:45, tahsin:52, score:70 },
  { m:'Feb', hafalan:52, tahsin:55, score:74 },
  { m:'Mar', hafalan:58, tahsin:60, score:77 },
  { m:'Apr', hafalan:63, tahsin:65, score:79 },
  { m:'Mei', hafalan:67, tahsin:68, score:82 },
  { m:'Jun', hafalan:70, tahsin:72, score:84 },
  { m:'Jul', hafalan:73, tahsin:75, score:86 },
  { m:'Agu', hafalan:75, tahsin:78, score:88 },
]

const MONTHLY_ATT = [
  { m:'Jan', hadir:120, izin:8,  sakit:5, alfa:2 },
  { m:'Feb', hadir:118, izin:10, sakit:6, alfa:1 },
  { m:'Mar', hadir:125, izin:6,  sakit:4, alfa:0 },
  { m:'Apr', hadir:122, izin:9,  sakit:3, alfa:1 },
  { m:'Mei', hadir:130, izin:5,  sakit:8, alfa:2 },
  { m:'Jun', hadir:128, izin:7,  sakit:6, alfa:4 },
  { m:'Jul', hadir:135, izin:4,  sakit:3, alfa:3 },
  { m:'Agu', hadir:131, izin:6,  sakit:5, alfa:2 },
]

const AT_RISK = [
  { name:'Aisyah Nur Hidayah', cls:'Kelompok A', issue:'Nilai hafalan < 60 (3 sesi berturut)', status:'Perlu perhatian', sev:'danger' },
  { name:'Khadijah Putri',     cls:'Kelompok B', issue:'Kehadiran bulan ini 68%',              status:'Perlu perhatian', sev:'warning' },
  { name:'Fulan bin Fulan',    cls:'Kelompok C', issue:'Nilai menurun signifikan (55→40)',      status:'Perlu perhatian', sev:'danger' },
]

const REPORTS = [
  { id:1,  student:'Ahmad Zaki Ramadhan',   teacher:'Ust. Aldi Solihin',    date:'4 Sep 2026', hafalan:"An-Naba' 1-10",     score:88, status:'sent'  },
  { id:2,  student:'Fatimah Az-Zahra',      teacher:'Ust. Aldi Solihin',    date:'4 Sep 2026', hafalan:"'Abasa 9-16",        score:80, status:'sent'  },
  { id:3,  student:'Yusuf Al-Amin',         teacher:'Ust. Aldi Solihin',    date:'4 Sep 2026', hafalan:"An-Nazi'at 16-25",   score:92, status:'sent'  },
  { id:4,  student:'Aisyah Nur Hidayah',    teacher:'Ust. Aldi Solihin',    date:'4 Sep 2026', hafalan:'Al-Mulk 1-10',       score:72, status:'sent'  },
  { id:5,  student:'Muhammad Raihan',       teacher:'Ustadzah Siti Rahmah', date:'4 Sep 2026', hafalan:"Al-Qari'ah 1-7",     score:76, status:'draft' },
  { id:6,  student:'Khadijah Putri',        teacher:'Ustadzah Siti Rahmah', date:'4 Sep 2026', hafalan:'Al-Buruj 1-10',      score:75, status:'sent'  },
  { id:7,  student:'Ibrahim Hasan',         teacher:'Ustadzah Siti Rahmah', date:'4 Sep 2026', hafalan:'At-Takwir 1-8',      score:70, status:'sent'  },
  { id:8,  student:'Maryam Sholihah',       teacher:'Ust. Ahmad Fauzi',     date:'4 Sep 2026', hafalan:'Al-Ghashiyah 1-12',  score:90, status:'sent'  },
  { id:9,  student:'Abdullah Syauqi',       teacher:'Ust. Ahmad Fauzi',     date:'4 Sep 2026', hafalan:'Al-Fajr 1-15',       score:85, status:'sent'  },
  { id:10, student:'Fulan bin Fulan',       teacher:'Ust. Ahmad Fauzi',     date:'3 Sep 2026', hafalan:'Az-Zalzalah 1-8',    score:55, status:'draft' },
]

const NOTIFS = [
  { id:1, icon:'report', title:'4 laporan terkirim — Kelompok A',         body:'Ustadz Aldi Solihin telah mengirim laporan untuk semua santri Kelompok A.', time:'16:42', date:'Kamis, 4 Sep', read:false },
  { id:2, icon:'alert',  title:'Khadijah Putri — kehadiran rendah',       body:'Kehadiran bulan ini 68%, di bawah ambang minimum 70%.', time:'09:15', date:'Kamis, 4 Sep', read:false },
  { id:3, icon:'alert',  title:'Fulan bin Fulan — nilai menurun',         body:'Nilai hafalan 3 sesi terakhir rata-rata 55/100.', time:'08:30', date:'Kamis, 4 Sep', read:false },
  { id:4, icon:'report', title:'Laporan mingguan tersedia',               body:'Ringkasan perkembangan mingguan semua kelas sudah siap ditinjau.', time:'07:00', date:'Kamis, 4 Sep', read:true },
  { id:5, icon:'system', title:'Sistem diperbarui ke versi 1.2.0',        body:'Mahabbah Qur\'an diperbarui. Fitur baru: Analisis AI ditingkatkan.', time:'00:00', date:'Rabu, 3 Sep',  read:true },
]

const AI_QS = [
  'Santri mana yang perlu perhatian khusus bulan ini?',
  'Bagaimana perkembangan hafalan keseluruhan?',
  'Guru mana yang belum menyelesaikan laporan?',
]

const AI_ANS = {
  'Santri mana yang perlu perhatian khusus bulan ini?':
`Berdasarkan data September 2026, terdapat **3 santri** yang memerlukan perhatian:

1. **Aisyah Nur Hidayah** (Kelompok A) — Nilai hafalan di bawah 60 dalam 3 sesi berturut-turut. Skor rata-rata: 58/100. Disarankan tambah sesi muraja'ah.

2. **Khadijah Putri** (Kelompok B) — Kehadiran bulan ini hanya 68%, di bawah ambang 70%. Orang tua perlu segera dihubungi.

3. **Fulan bin Fulan** (Kelompok C) — Tren nilai menurun dari 65 ke 55 dalam 4 minggu. Progress hafalan 40%, terendah di angkatan.`,

  'Bagaimana perkembangan hafalan keseluruhan?':
`Alhamdulillah, perkembangan hafalan menunjukkan tren positif bulan ini:

📈 **Rata-rata hafalan**: 75% (naik +2% dari bulan lalu)
📈 **Rata-rata tahsin**: 78% (stabil)
⭐ **Rata-rata nilai**: 88/100

Kelas terbaik: **Kelompok C** (rata-rata kemajuan 67%). Berprestasi: Maryam Sholihah (82%) dan Yusuf Al-Amin (80%).

Yang perlu didorong: Kelompok A khususnya Aisyah (50%) dan Fatimah (60%).`,

  'Guru mana yang belum menyelesaikan laporan?':
`Status laporan per Kamis 4 September 2026:

✅ **Ustadz Aldi Solihin** — 4/4 santri dilaporkan (100%)
⚠️ **Ustadzah Siti Rahmah** — 2/3 santri dilaporkan (67%). Draft: Muhammad Raihan
⚠️ **Ustadz Ahmad Fauzi** — 2/3 santri dilaporkan (67%). Draft: Fulan bin Fulan

**Rekomendasi**: Kirim pengingat ke Ustadzah Siti Rahmah dan Ustadz Ahmad Fauzi untuk menyelesaikan 2 laporan yang masih draft sebelum pukul 17:00 hari ini.`,
}

// ── Nav items ────────────────────────────────────────────────────────────────
const NAV = [
  { id:'dashboard', label:'Dashboard',   icon:Home },
  { id:'santri',    label:'Data Santri', icon:Users },
  { id:'guru',      label:'Data Guru',   icon:User },
  { id:'program',   label:'Program',     icon:BookOpen },
  { id:'kelas',     label:'Kelas',       icon:Layers },
  { id:'absensi',   label:'Absensi',     icon:Calendar },
  { id:'hafalan',   label:'Hafalan',     icon:BookMarked },
  { id:'tahsin',    label:'Tahsin',      icon:Award },
  { id:'penilaian', label:'Penilaian',   icon:Star },
  { id:'laporan',   label:'Laporan',     icon:FileText },
  { id:'analitik',  label:'Analitik',    icon:BarChart2 },
  { id:'ai',        label:'AI Mahabbah', icon:Brain },
  { id:'notifikasi',label:'Notifikasi',  icon:Bell },
  { id:'pengaturan',label:'Pengaturan',  icon:Settings },
]

// ── Shared primitives ────────────────────────────────────────────────────────
const pct2color = p => p >= 75 ? C.success : p >= 50 ? '#F59E0B' : C.danger

function Ring({ pct, size = 44 }) {
  const r = (size - 6) / 2, circ = 2 * Math.PI * r
  const dash = (Math.min(pct, 100) / 100) * circ
  const col = pct2color(pct)
  return (
    <div style={{ position:'relative', width:size, height:size, flexShrink:0 }}>
      <svg width={size} height={size} style={{ transform:'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#E5E7EB" strokeWidth={4}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={col} strokeWidth={4}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"/>
      </svg>
      <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center',
        justifyContent:'center', fontSize:10, fontWeight:700, color:col }}>
        {pct}%
      </div>
    </div>
  )
}

function Avt({ ini, col = C.primary, size = 36, radius = '50%' }) {
  return (
    <div style={{ width:size, height:size, borderRadius:radius, background:col,
      color:'#fff', fontSize:Math.round(size * 0.33), fontWeight:700,
      display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
      {ini}
    </div>
  )
}

function Bdg({ children, type = 'neutral' }) {
  const map = {
    active:  { bg:C.successBg, c:'#15803D' },
    inactive:{ bg:'#F3F4F6',   c:'#6B7280' },
    draft:   { bg:C.warningBg, c:'#92400E' },
    sent:    { bg:C.purple50,  c:C.primary },
    danger:  { bg:C.dangerBg,  c:C.danger },
    warning: { bg:C.warningBg, c:C.warning },
    neutral: { bg:'#F3F4F6',   c:'#374151' },
  }
  const s = map[type] || map.neutral
  return (
    <span style={{ background:s.bg, color:s.c, fontSize:11, fontWeight:600,
      padding:'3px 10px', borderRadius:20, whiteSpace:'nowrap' }}>
      {children}
    </span>
  )
}

function Card({ children, p = 20, style = {} }) {
  return (
    <div style={{ background:C.card, borderRadius:14, border:`1px solid ${C.border}`,
      padding:p, ...style }}>
      {children}
    </div>
  )
}

function SectionHead({ title, action, actionLabel }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
      <h3 style={{ margin:0, fontSize:15, fontWeight:700, color:C.text }}>{title}</h3>
      {actionLabel && (
        <button onClick={action} style={{ background:'none', border:'none', cursor:'pointer',
          fontSize:13, color:C.primary, fontWeight:600, padding:0 }}>
          {actionLabel} →
        </button>
      )}
    </div>
  )
}

function StatMini({ icon:Icon, label, val, col = C.primary }) {
  return (
    <div style={{ textAlign:'center', flex:1 }}>
      <div style={{ width:40, height:40, borderRadius:10, background:`${col}12`,
        display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 6px' }}>
        <Icon size={18} color={col}/>
      </div>
      <div style={{ fontSize:22, fontWeight:800, color:C.text }}>{val}</div>
      <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>{label}</div>
    </div>
  )
}

// ── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({ active, onNav, unread }) {
  return (
    <div style={{ width:220, background:C.sidebar, display:'flex', flexDirection:'column',
      flexShrink:0, overflowY:'auto', overflowX:'hidden' }}>
      {/* Logo */}
      <div style={{ padding:'24px 20px 16px', borderBottom:`1px solid ${C.sidebarBorder}` }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:38, height:38, borderRadius:10, background:C.gold,
            display:'flex', alignItems:'center', justifyContent:'center' }}>
            <BookOpen size={20} color={C.sidebar}/>
          </div>
          <div>
            <div style={{ color:'#fff', fontWeight:800, fontSize:13, lineHeight:1.2 }}>MAHABBAH</div>
            <div style={{ color:C.gold, fontWeight:700, fontSize:10, letterSpacing:'0.05em' }}>QUR'AN</div>
          </div>
        </div>
        <div style={{ marginTop:10, fontSize:10, color:'rgba(255,255,255,0.4)', lineHeight:1.4 }}>
          Yayasan Rumah Tahfizh<br/>Mahabbah Qur'an Indonesia
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex:1, padding:'8px 8px' }}>
        {NAV.map(({ id, label, icon:Icon }) => {
          const isActive = active === id
          const isBell = id === 'notifikasi'
          return (
            <button key={id} onClick={() => onNav(id)} style={{
              display:'flex', alignItems:'center', gap:10, width:'100%', padding:'9px 12px',
              borderRadius:9, border:'none', cursor:'pointer', marginBottom:2, position:'relative',
              background: isActive ? C.navActive : 'transparent',
              color: isActive ? C.gold : 'rgba(255,255,255,0.65)',
              fontWeight: isActive ? 700 : 400, fontSize:13, textAlign:'left',
              transition:'background 0.15s, color 0.15s',
            }}
              onMouseEnter={e => { if(!isActive) e.currentTarget.style.background = C.navHover }}
              onMouseLeave={e => { if(!isActive) e.currentTarget.style.background = 'transparent' }}>
              <Icon size={16} style={{ flexShrink:0 }}/>
              {label}
              {isBell && unread > 0 && (
                <span style={{ marginLeft:'auto', background:C.danger, color:'#fff',
                  fontSize:10, fontWeight:700, borderRadius:20, padding:'1px 6px', minWidth:18, textAlign:'center' }}>
                  {unread}
                </span>
              )}
              {isActive && (
                <span style={{ marginLeft:'auto', width:4, height:4, borderRadius:'50%', background:C.gold }}/>
              )}
            </button>
          )
        })}
      </nav>

      {/* User footer */}
      <div style={{ padding:'16px 12px', borderTop:`1px solid ${C.sidebarBorder}` }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <Avt ini="AP" col="#FBBF24" size={34} />
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ color:'#fff', fontSize:12, fontWeight:700, truncate:true }}>Admin Pembina</div>
            <div style={{ color:'rgba(255,255,255,0.45)', fontSize:10 }}>Administrator</div>
          </div>
        </div>
        <button style={{ display:'flex', alignItems:'center', gap:8, marginTop:12, width:'100%',
          padding:'8px 10px', borderRadius:8, background:'rgba(255,255,255,0.06)',
          border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.55)',
          fontSize:12, cursor:'pointer' }}>
          <LogOut size={13}/> Keluar
        </button>
      </div>
    </div>
  )
}

// ── Topbar ───────────────────────────────────────────────────────────────────
function Topbar({ page, unread, onNotif }) {
  const titles = { dashboard:'Dashboard', santri:'Data Santri', guru:'Data Guru',
    program:'Program', kelas:'Kelas', absensi:'Absensi', hafalan:'Hafalan',
    tahsin:'Tahsin', penilaian:'Penilaian', laporan:'Laporan',
    analitik:'Analitik', ai:'AI Mahabbah', notifikasi:'Notifikasi', pengaturan:'Pengaturan' }
  return (
    <div style={{ height:60, background:C.card, borderBottom:`1px solid ${C.border}`,
      display:'flex', alignItems:'center', padding:'0 24px', gap:16, flexShrink:0 }}>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:11, color:C.muted }}>Kamis, 4 September 2026</div>
        <div style={{ fontSize:16, fontWeight:700, color:C.text, lineHeight:1.2 }}>
          Assalamu'alaikum, Admin Pembina 👋
        </div>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ position:'relative', background:C.bg, borderRadius:22, padding:'7px 14px',
          display:'flex', alignItems:'center', gap:8 }}>
          <Search size={14} color={C.muted}/>
          <input placeholder="Cari santri..." style={{ border:'none', background:'transparent',
            fontSize:13, color:C.text, outline:'none', width:160 }}/>
        </div>
        <button onClick={onNotif} style={{ position:'relative', background:C.bg, border:'none',
          borderRadius:'50%', width:38, height:38, display:'flex', alignItems:'center',
          justifyContent:'center', cursor:'pointer' }}>
          <Bell size={16} color={C.sub}/>
          {unread > 0 && (
            <span style={{ position:'absolute', top:7, right:7, width:8, height:8,
              background:C.danger, borderRadius:'50%', border:'2px solid white' }}/>
          )}
        </button>
        <Avt ini="AP" col={C.gold} size={36} />
      </div>
    </div>
  )
}

// ── Dashboard page ───────────────────────────────────────────────────────────
function DashboardPage({ onNav }) {
  const [aiQ, setAiQ] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiAns, setAiAns] = useState(null)

  function askAI(q) {
    setAiQ(q); setAiLoading(true); setAiAns(null)
    setTimeout(() => { setAiLoading(false); setAiAns(AI_ANS[q]) }, 1200)
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      {/* KPI Row */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:14 }}>
        {[
          { icon:Users,       label:'Total Santri',       val:150,   sub:'Terdaftar',  col:'#4B21A2' },
          { icon:CheckCircle, label:'Santri Aktif',        val:143,   sub:'Bulan ini',  col:'#16A34A' },
          { icon:User,        label:'Guru Tahfizh',        val:18,    sub:'Mengajar',   col:'#7B4BD6' },
          { icon:Layers,      label:'Kelas Aktif',         val:12,    sub:'Program',    col:'#F59E0B' },
          { icon:Activity,    label:'Kehadiran Bulan Ini', val:'92%', sub:'Rata-rata',  col:'#0EA5E9' },
        ].map(({ icon:Icon, label, val, sub, col }) => (
          <Card key={label} p={18} style={{ display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ width:48, height:48, borderRadius:12, background:`${col}15`,
              display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Icon size={22} color={col}/>
            </div>
            <div>
              <div style={{ fontSize:24, fontWeight:800, color:C.text, lineHeight:1 }}>{val}</div>
              <div style={{ fontSize:12, color:C.muted, marginTop:3 }}>{label}</div>
              <div style={{ fontSize:11, color:col, fontWeight:600, marginTop:1 }}>{sub}</div>
            </div>
          </Card>
        ))}
      </div>

      {/* Charts row */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
        <Card>
          <SectionHead title="Perkembangan Hafalan" actionLabel="Detail" action={() => onNav('analitik')}/>
          <div style={{ display:'flex', gap:16, marginBottom:12 }}>
            {[['●','Hafalan','#4B21A2'],['●','Tahsin','#FBBF24'],['●','Nilai','#16A34A']].map(([dot,l,c]) => (
              <div key={l} style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:C.muted }}>
                <span style={{ color:c, fontSize:14 }}>{dot}</span>{l}
              </div>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={MONTHLY} margin={{ top:5, right:5, bottom:0, left:-20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6"/>
              <XAxis dataKey="m" tick={{ fontSize:11, fill:C.muted }}/>
              <YAxis domain={[0,100]} tick={{ fontSize:11, fill:C.muted }}/>
              <Tooltip contentStyle={{ fontSize:12, borderRadius:8, border:`1px solid ${C.border}` }}/>
              <Line dataKey="hafalan" stroke="#4B21A2" strokeWidth={2.5} dot={false}/>
              <Line dataKey="tahsin"  stroke="#FBBF24" strokeWidth={2.5} dot={false}/>
              <Line dataKey="score"   stroke="#16A34A" strokeWidth={2.5} dot={false}/>
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <SectionHead title="Kehadiran Santri" actionLabel="Detail" action={() => onNav('absensi')}/>
          <div style={{ display:'flex', gap:16, marginBottom:12 }}>
            {[['Hadir','#4B21A2'],['Izin','#FBBF24'],['Sakit','#F59E0B'],['Alfa','#DC2626']].map(([l,c]) => (
              <div key={l} style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:C.muted }}>
                <span style={{ display:'inline-block', width:10, height:10, background:c, borderRadius:2 }}/>
                {l}
              </div>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={MONTHLY_ATT} margin={{ top:5, right:5, bottom:0, left:-20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6"/>
              <XAxis dataKey="m" tick={{ fontSize:11, fill:C.muted }}/>
              <YAxis tick={{ fontSize:11, fill:C.muted }}/>
              <Tooltip contentStyle={{ fontSize:12, borderRadius:8, border:`1px solid ${C.border}` }}/>
              <Bar dataKey="hadir" fill="#4B21A2" radius={[3,3,0,0]}/>
              <Bar dataKey="izin"  fill="#FBBF24" radius={[3,3,0,0]}/>
              <Bar dataKey="sakit" fill="#F59E0B" radius={[3,3,0,0]}/>
              <Bar dataKey="alfa"  fill="#DC2626" radius={[3,3,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Report status + At-risk + AI */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1.4fr 1.2fr', gap:14 }}>
        {/* Report status */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <Card>
            <SectionHead title="Status Laporan Guru" actionLabel="Lihat" action={() => onNav('laporan')}/>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {[
                { icon:CheckCircle, label:'Sudah dikirim',   val:16, col:C.success },
                { icon:RefreshCw,   label:'Menunggu review', val:2,  col:C.warning },
                { icon:X,           label:'Belum dibuat',    val:0,  col:C.muted },
              ].map(({ icon:Icon, label, val, col }) => (
                <div key={label} style={{ display:'flex', alignItems:'center', gap:10,
                  padding:'10px 12px', background:C.bg, borderRadius:10 }}>
                  <Icon size={16} color={col}/>
                  <span style={{ flex:1, fontSize:12, color:C.sub }}>{label}</span>
                  <span style={{ fontSize:18, fontWeight:800, color:col }}>{val}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <SectionHead title="Statistik Cepat"/>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              {[
                { label:'Hafalan', val:'75%', col:'#4B21A2' },
                { label:'Tahsin',  val:'78%', col:'#7B4BD6' },
                { label:'Kehadiran', val:'92%', col:'#16A34A' },
                { label:'Nilai Rata', val:'88', col:'#FBBF24' },
              ].map(({ label, val, col }) => (
                <div key={label} style={{ background:C.bg, borderRadius:10, padding:'12px 10px', textAlign:'center' }}>
                  <div style={{ fontSize:22, fontWeight:800, color:col }}>{val}</div>
                  <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>{label}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* At-risk table */}
        <Card>
          <SectionHead title="Santri Perlu Perhatian" actionLabel="Lihat Semua" action={() => onNav('santri')}/>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {AT_RISK.map((r, i) => (
              <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:12,
                padding:'12px 14px', borderRadius:10, border:`1px solid ${r.sev==='danger' ? '#FCA5A5' : '#FCD34D'}`,
                background: r.sev==='danger' ? '#FFF5F5' : '#FFFBEB' }}>
                <AlertTriangle size={16} color={r.sev==='danger' ? C.danger : C.warning} style={{ marginTop:1, flexShrink:0 }}/>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:C.text }}>{r.name}</div>
                  <div style={{ fontSize:11, color:C.muted, marginTop:1 }}>{r.cls}</div>
                  <div style={{ fontSize:11, color:r.sev==='danger' ? C.danger : C.warning, marginTop:4 }}>{r.issue}</div>
                </div>
                <Bdg type={r.sev}>{r.status}</Bdg>
              </div>
            ))}
            <button onClick={() => onNav('santri')} style={{ display:'flex', alignItems:'center',
              justifyContent:'center', gap:6, width:'100%', padding:'10px', borderRadius:10,
              background:C.purple50, border:`1px dashed ${C.secondary}`, color:C.primary,
              fontSize:12, fontWeight:600, cursor:'pointer', marginTop:4 }}>
              <Eye size={14}/> Lihat semua santri
            </button>
          </div>
        </Card>

        {/* AI panel */}
        <Card style={{ background:'linear-gradient(160deg,#18085A 0%,#2D1080 100%)',
          border:'none', display:'flex', flexDirection:'column' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
            <div style={{ width:32, height:32, borderRadius:8, background:C.gold,
              display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Brain size={16} color={C.sidebar}/>
            </div>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:'#fff' }}>Analisis dengan AI</div>
              <div style={{ fontSize:10, color:'rgba(255,255,255,0.45)' }}>Powered by Claude</div>
            </div>
          </div>

          {!aiAns && !aiLoading && (
            <div style={{ display:'flex', flexDirection:'column', gap:7, flex:1 }}>
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.45)', marginBottom:4 }}>
                Pertanyaan cepat:
              </div>
              {AI_QS.map(q => (
                <button key={q} onClick={() => askAI(q)} style={{
                  background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)',
                  borderRadius:9, padding:'10px 12px', color:'rgba(255,255,255,0.8)',
                  fontSize:11, cursor:'pointer', textAlign:'left', lineHeight:1.4,
                  transition:'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.14)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}>
                  {q}
                </button>
              ))}
            </div>
          )}

          {aiLoading && (
            <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:12 }}>
              <div style={{ display:'flex', gap:5 }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{ width:8, height:8, borderRadius:'50%', background:C.gold,
                    animation:`pulse 1s ease-in-out ${i*0.2}s infinite alternate` }}/>
                ))}
              </div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.45)' }}>Sedang menganalisis...</div>
            </div>
          )}

          {aiAns && (
            <div style={{ flex:1, display:'flex', flexDirection:'column', gap:8 }}>
              <div style={{ fontSize:10, color:C.gold, fontWeight:600, background:'rgba(251,191,36,0.12)',
                padding:'4px 8px', borderRadius:6, display:'inline-block' }}>
                {aiQ.length > 40 ? aiQ.slice(0,40)+'…' : aiQ}
              </div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.8)', lineHeight:1.6,
                flex:1, overflowY:'auto', maxHeight:180 }}>
                {aiAns.split('\n').map((line, i) => (
                  <div key={i} style={{ marginBottom: line === '' ? 6 : 0 }}>
                    {line.replace(/\*\*(.*?)\*\*/g, '$1')}
                  </div>
                ))}
              </div>
              <button onClick={() => { setAiAns(null); setAiQ(null) }}
                style={{ background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)',
                borderRadius:8, padding:'8px', color:'rgba(255,255,255,0.6)', fontSize:11, cursor:'pointer' }}>
                ← Kembali ke pertanyaan
              </button>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

// ── Data Santri page ─────────────────────────────────────────────────────────
function DataSantriPage() {
  const [search, setSearch] = useState('')
  const [filterProg, setFilterProg] = useState('all')
  const [filterCls, setFilterCls] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const PER = 6

  const filtered = useMemo(() => {
    return STUDENTS.filter(s => {
      const q = search.toLowerCase()
      if (q && !s.name.toLowerCase().includes(q)) return false
      if (filterProg !== 'all' && s.prog !== filterProg) return false
      if (filterCls !== 'all' && s.cls !== filterCls) return false
      if (filterStatus !== 'all' && s.status !== filterStatus) return false
      return true
    })
  }, [search, filterProg, filterCls, filterStatus])

  const total = filtered.length
  const pages = Math.ceil(total / PER)
  const slice = filtered.slice((page-1)*PER, page*PER)

  const sel = { border:`1px solid ${C.border}`, borderRadius:8, padding:'8px 10px',
    fontSize:13, color:C.text, background:C.card, outline:'none', cursor:'pointer' }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <Card p={16}>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, flex:1, minWidth:180,
            background:C.bg, borderRadius:8, padding:'8px 12px' }}>
            <Search size={14} color={C.muted}/>
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Cari nama santri..." style={{ border:'none', background:'transparent',
              fontSize:13, color:C.text, outline:'none', flex:1 }}/>
          </div>
          <select value={filterProg} onChange={e => { setFilterProg(e.target.value); setPage(1) }} style={sel}>
            <option value="all">Semua Program</option>
            <option value="Tahfizh Juz 30">Tahfizh Juz 30</option>
            <option value="Tahfizh Juz 29">Tahfizh Juz 29</option>
            <option value="Tahsin Dasar">Tahsin Dasar</option>
          </select>
          <select value={filterCls} onChange={e => { setFilterCls(e.target.value); setPage(1) }} style={sel}>
            <option value="all">Semua Kelas</option>
            <option value="Kelompok A">Kelompok A</option>
            <option value="Kelompok B">Kelompok B</option>
            <option value="Kelompok C">Kelompok C</option>
          </select>
          <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1) }} style={sel}>
            <option value="all">Semua Status</option>
            <option value="active">Aktif</option>
            <option value="inactive">Non-aktif</option>
          </select>
          <button onClick={() => setShowModal(true)} style={{ display:'flex', alignItems:'center',
            gap:7, background:C.primary, color:'#fff', border:'none', borderRadius:9,
            padding:'8px 16px', fontSize:13, fontWeight:700, cursor:'pointer' }}>
            <Plus size={15}/> Tambah Santri
          </button>
        </div>
      </Card>

      <Card p={0}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ background:C.bg, borderBottom:`1px solid ${C.border}` }}>
              {['Santri','Program','Kelas','Guru','Progress','Kehadiran','Status','Aksi'].map(h => (
                <th key={h} style={{ padding:'12px 16px', textAlign:'left', fontSize:12,
                  fontWeight:700, color:C.muted, whiteSpace:'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slice.map((s, i) => (
              <tr key={s.id} style={{ borderBottom:`1px solid ${C.border}`,
                background: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                <td style={{ padding:'14px 16px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <Avt ini={s.ini} col={s.col} size={34}/>
                    <div>
                      <div style={{ fontSize:13, fontWeight:600, color:C.text }}>{s.name}</div>
                      <div style={{ fontSize:11, color:C.muted }}>ID: {String(s.id).padStart(4,'0')}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding:'14px 16px', fontSize:12, color:C.sub }}>{s.prog}</td>
                <td style={{ padding:'14px 16px', fontSize:12, color:C.sub }}>{s.cls}</td>
                <td style={{ padding:'14px 16px', fontSize:12, color:C.sub, maxWidth:120, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{s.teacher}</td>
                <td style={{ padding:'14px 16px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <Ring pct={s.pct} size={36}/>
                    <div style={{ flex:1, minWidth:60 }}>
                      <div style={{ height:4, background:'#E5E7EB', borderRadius:4, overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${s.pct}%`,
                          background:pct2color(s.pct), borderRadius:4, transition:'width 0.5s' }}/>
                      </div>
                    </div>
                  </div>
                </td>
                <td style={{ padding:'14px 16px' }}>
                  <div style={{ fontSize:14, fontWeight:700,
                    color: s.att >= 80 ? C.success : s.att >= 70 ? C.warning : C.danger }}>
                    {s.att}%
                  </div>
                </td>
                <td style={{ padding:'14px 16px' }}>
                  <Bdg type={s.status}>{s.status === 'active' ? 'Aktif' : 'Non-aktif'}</Bdg>
                </td>
                <td style={{ padding:'14px 16px' }}>
                  <div style={{ display:'flex', gap:6 }}>
                    {[Eye, Edit, Trash2].map((Icon, j) => (
                      <button key={j} style={{ width:28, height:28, borderRadius:7,
                        background: j === 2 ? C.dangerBg : C.purple50,
                        border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <Icon size={13} color={j === 2 ? C.danger : C.primary}/>
                      </button>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
          padding:'14px 20px', borderTop:`1px solid ${C.border}` }}>
          <span style={{ fontSize:13, color:C.muted }}>
            Menampilkan {Math.min((page-1)*PER+1, total)}–{Math.min(page*PER, total)} dari {total} santri
          </span>
          <div style={{ display:'flex', gap:6 }}>
            <button disabled={page === 1} onClick={() => setPage(p => p-1)}
              style={{ padding:'6px 14px', borderRadius:8, border:`1px solid ${C.border}`,
              background: page === 1 ? C.bg : C.card, cursor: page === 1 ? 'default' : 'pointer',
              fontSize:12, color: page === 1 ? C.muted : C.text }}>← Sebelumnya</button>
            {Array.from({ length:pages }, (_,i) => i+1).map(p => (
              <button key={p} onClick={() => setPage(p)}
                style={{ width:32, height:32, borderRadius:8,
                border: p === page ? 'none' : `1px solid ${C.border}`,
                background: p === page ? C.primary : C.card,
                color: p === page ? '#fff' : C.text, fontSize:12, cursor:'pointer', fontWeight: p === page ? 700 : 400 }}>
                {p}
              </button>
            ))}
            <button disabled={page === pages} onClick={() => setPage(p => p+1)}
              style={{ padding:'6px 14px', borderRadius:8, border:`1px solid ${C.border}`,
              background: page === pages ? C.bg : C.card, cursor: page === pages ? 'default' : 'pointer',
              fontSize:12, color: page === pages ? C.muted : C.text }}>Berikutnya →</button>
          </div>
        </div>
      </Card>

      {/* Add student modal */}
      {showModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)',
          display:'flex', alignItems:'center', justifyContent:'center', zIndex:999 }}>
          <Card p={28} style={{ width:480, maxWidth:'90vw', position:'relative' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <h3 style={{ margin:0, fontSize:17, fontWeight:800, color:C.text }}>Tambah Santri Baru</h3>
              <button onClick={() => setShowModal(false)} style={{ background:C.bg, border:'none',
                borderRadius:8, width:32, height:32, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <X size={16} color={C.muted}/>
              </button>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              {[['Nama Lengkap','text','Ahmad Zaki...'],['Nama Panggilan','text','Ahmad'],
                ['Jenis Kelamin','select',null],['Tanggal Lahir','date',null],
                ['Tanggal Masuk','date',null],['Kelas','select',null]].map(([label, type, ph], i) => (
                <div key={i} style={{ display:'flex', flexDirection:'column', gap:5 }}>
                  <label style={{ fontSize:12, fontWeight:600, color:C.sub }}>{label}</label>
                  {type === 'select' ? (
                    <select style={{ ...sel, width:'100%' }}>
                      {label === 'Jenis Kelamin' ? (
                        <><option>Laki-laki</option><option>Perempuan</option></>
                      ) : (
                        <><option>Kelompok A</option><option>Kelompok B</option><option>Kelompok C</option></>
                      )}
                    </select>
                  ) : (
                    <input type={type} placeholder={ph || ''}
                      style={{ ...sel, width:'100%', boxSizing:'border-box' }}/>
                  )}
                </div>
              ))}
            </div>
            <div style={{ display:'flex', gap:10, marginTop:20 }}>
              <button onClick={() => setShowModal(false)}
                style={{ flex:1, padding:'11px', borderRadius:9, border:`1px solid ${C.border}`,
                background:C.card, color:C.sub, fontSize:13, fontWeight:600, cursor:'pointer' }}>
                Batal
              </button>
              <button onClick={() => setShowModal(false)}
                style={{ flex:1, padding:'11px', borderRadius:9, border:'none',
                background:C.primary, color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer' }}>
                Simpan Santri
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

// ── Data Guru page ────────────────────────────────────────────────────────────
function DataGuruPage() {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <Card p={16}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, background:C.bg,
            borderRadius:8, padding:'8px 12px', flex:1, maxWidth:280 }}>
            <Search size={14} color={C.muted}/>
            <input placeholder="Cari guru..." style={{ border:'none', background:'transparent',
              fontSize:13, color:C.text, outline:'none', width:'100%' }}/>
          </div>
          <button style={{ display:'flex', alignItems:'center', gap:7, background:C.primary, color:'#fff',
            border:'none', borderRadius:9, padding:'8px 16px', fontSize:13, fontWeight:700, cursor:'pointer' }}>
            <Plus size={15}/> Tambah Guru
          </button>
        </div>
      </Card>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16 }}>
        {TEACHERS.map(t => (
          <Card key={t.id} p={22}>
            <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:16, paddingBottom:16, borderBottom:`1px solid ${C.border}` }}>
              <Avt ini={t.ini} col={t.col} size={52} radius={14}/>
              <div>
                <div style={{ fontSize:15, fontWeight:700, color:C.text }}>{t.name}</div>
                <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>{t.email}</div>
                <div style={{ fontSize:12, color:C.muted }}>{t.phone}</div>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, textAlign:'center' }}>
              {[['Kelas', t.cls, t.col],['Santri', t.students, '#16A34A'],['Laporan', t.reports, '#F59E0B']].map(([l,v,c]) => (
                <div key={l} style={{ background:C.bg, borderRadius:10, padding:'12px 8px' }}>
                  <div style={{ fontSize:18, fontWeight:800, color:c }}>{v}</div>
                  <div style={{ fontSize:10, color:C.muted, marginTop:2 }}>{l}</div>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', gap:8, marginTop:14 }}>
              <button style={{ flex:1, padding:'9px', borderRadius:9, border:`1px solid ${C.border}`,
                background:C.card, color:C.primary, fontSize:12, fontWeight:600, cursor:'pointer' }}>
                Lihat Detail
              </button>
              <button style={{ flex:1, padding:'9px', borderRadius:9, border:'none',
                background:C.primary, color:'#fff', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                Kelola Kelas
              </button>
            </div>
          </Card>
        ))}
      </div>
      <Card>
        <SectionHead title="Aktivitas Guru Minggu Ini"/>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ background:C.bg }}>
              {['Guru','Kelas','Santri Hadir','Laporan Terkirim','Laporan Draft','Rata-rata Nilai'].map(h => (
                <th key={h} style={{ padding:'11px 14px', textAlign:'left', fontSize:11,
                  fontWeight:700, color:C.muted }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              ['Ust. Aldi Solihin',   'Kelompok A', '4/4 (100%)', 18, 0, 83],
              ['Ustadzah Siti Rahmah','Kelompok B', '3/3 (100%)', 12, 1, 74],
              ['Ust. Ahmad Fauzi',    'Kelompok C', '3/3 (100%)', 11, 1, 77],
            ].map(([name, cls, att, sent, draft, score], i) => (
              <tr key={i} style={{ borderBottom:`1px solid ${C.border}` }}>
                <td style={{ padding:'12px 14px', fontSize:13, fontWeight:600, color:C.text }}>{name}</td>
                <td style={{ padding:'12px 14px', fontSize:12, color:C.sub }}>{cls}</td>
                <td style={{ padding:'12px 14px', fontSize:12, color:C.success, fontWeight:600 }}>{att}</td>
                <td style={{ padding:'12px 14px' }}><Bdg type="sent">{sent} terkirim</Bdg></td>
                <td style={{ padding:'12px 14px' }}>{draft > 0 ? <Bdg type="draft">{draft} draft</Bdg> : <span style={{ fontSize:12, color:C.muted }}>—</span>}</td>
                <td style={{ padding:'12px 14px', fontSize:14, fontWeight:700, color:C.primary }}>{score}/100</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

// ── Laporan page ──────────────────────────────────────────────────────────────
function LaporanPage() {
  const [filterStatus, setFilterStatus] = useState('all')
  const filtered = filterStatus === 'all' ? REPORTS : REPORTS.filter(r => r.status === filterStatus)
  const sel = { border:`1px solid ${C.border}`, borderRadius:8, padding:'8px 12px',
    fontSize:13, color:C.text, background:C.card, outline:'none', cursor:'pointer' }
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 }}>
        {[
          { label:'Total Laporan',    val:REPORTS.length, icon:FileText, col:'#4B21A2' },
          { label:'Sudah Terkirim',   val:REPORTS.filter(r=>r.status==='sent').length, icon:CheckCircle, col:'#16A34A' },
          { label:'Masih Draft',      val:REPORTS.filter(r=>r.status==='draft').length, icon:RefreshCw, col:'#D97706' },
        ].map(({ label, val, icon:Icon, col }) => (
          <Card key={label} p={18} style={{ display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ width:44, height:44, borderRadius:12, background:`${col}15`,
              display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Icon size={20} color={col}/>
            </div>
            <div>
              <div style={{ fontSize:26, fontWeight:800, color:C.text }}>{val}</div>
              <div style={{ fontSize:12, color:C.muted }}>{label}</div>
            </div>
          </Card>
        ))}
      </div>

      <Card p={16}>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={sel}>
            <option value="all">Semua Status</option>
            <option value="sent">Terkirim</option>
            <option value="draft">Draft</option>
          </select>
          <button style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px',
            borderRadius:8, border:`1px solid ${C.border}`, background:C.card,
            fontSize:13, color:C.sub, cursor:'pointer' }}>
            <Download size={14}/> Export
          </button>
          <span style={{ marginLeft:'auto', fontSize:12, color:C.muted }}>
            {filtered.length} laporan ditemukan
          </span>
        </div>
      </Card>

      <Card p={0}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ background:C.bg, borderBottom:`1px solid ${C.border}` }}>
              {['Santri','Guru','Tanggal','Hafalan Terakhir','Nilai','Status','Aksi'].map(h => (
                <th key={h} style={{ padding:'12px 16px', textAlign:'left', fontSize:12, fontWeight:700, color:C.muted }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr key={r.id} style={{ borderBottom:`1px solid ${C.border}`, background: i%2===0?'#fff':'#FAFAFA' }}>
                <td style={{ padding:'13px 16px', fontSize:13, fontWeight:600, color:C.text }}>{r.student}</td>
                <td style={{ padding:'13px 16px', fontSize:12, color:C.sub, maxWidth:130, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.teacher}</td>
                <td style={{ padding:'13px 16px', fontSize:12, color:C.sub }}>{r.date}</td>
                <td style={{ padding:'13px 16px', fontSize:12, color:C.sub }}>{r.hafalan}</td>
                <td style={{ padding:'13px 16px' }}>
                  <span style={{ fontSize:15, fontWeight:800,
                    color: r.score >= 85 ? C.success : r.score >= 70 ? C.warning : C.danger }}>
                    {r.score}
                  </span>
                  <span style={{ fontSize:11, color:C.muted }}>/100</span>
                </td>
                <td style={{ padding:'13px 16px' }}>
                  <Bdg type={r.status}>{r.status === 'sent' ? 'Terkirim' : 'Draft'}</Bdg>
                </td>
                <td style={{ padding:'13px 16px' }}>
                  <div style={{ display:'flex', gap:6 }}>
                    <button style={{ width:28, height:28, borderRadius:7, background:C.purple50,
                      border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <Eye size={13} color={C.primary}/>
                    </button>
                    <button style={{ width:28, height:28, borderRadius:7, background:C.bg,
                      border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <Download size={13} color={C.muted}/>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

// ── Analitik page ─────────────────────────────────────────────────────────────
function AnalitikPage() {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
        <Card>
          <SectionHead title="Tren Perkembangan 8 Bulan"/>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={MONTHLY} margin={{ top:5, right:5, bottom:0, left:-20 }}>
              <defs>
                <linearGradient id="ghafalan" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4B21A2" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#4B21A2" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="gtahsin" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FBBF24" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#FBBF24" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6"/>
              <XAxis dataKey="m" tick={{ fontSize:11, fill:C.muted }}/>
              <YAxis domain={[0,100]} tick={{ fontSize:11, fill:C.muted }}/>
              <Tooltip contentStyle={{ fontSize:12, borderRadius:8 }}/>
              <Legend wrapperStyle={{ fontSize:12 }}/>
              <Area type="monotone" dataKey="hafalan" stroke="#4B21A2" fill="url(#ghafalan)" strokeWidth={2} name="Hafalan %"/>
              <Area type="monotone" dataKey="tahsin"  stroke="#FBBF24" fill="url(#gtahsin)"  strokeWidth={2} name="Tahsin %"/>
              <Line dataKey="score" stroke="#16A34A" strokeWidth={2} dot={false} name="Nilai Rata"/>
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <SectionHead title="Distribusi Kehadiran"/>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={MONTHLY_ATT} margin={{ top:5, right:5, bottom:0, left:-20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6"/>
              <XAxis dataKey="m" tick={{ fontSize:11, fill:C.muted }}/>
              <YAxis tick={{ fontSize:11, fill:C.muted }}/>
              <Tooltip contentStyle={{ fontSize:12, borderRadius:8 }}/>
              <Legend wrapperStyle={{ fontSize:12 }}/>
              <Bar dataKey="hadir" fill="#4B21A2" stackId="a" name="Hadir" radius={[0,0,0,0]}/>
              <Bar dataKey="izin"  fill="#FBBF24" stackId="a" name="Izin"/>
              <Bar dataKey="sakit" fill="#F59E0B" stackId="a" name="Sakit"/>
              <Bar dataKey="alfa"  fill="#DC2626" stackId="a" name="Alfa" radius={[3,3,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card>
        <SectionHead title="Performa Santri — Overview"/>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ background:C.bg }}>
              {['Santri','Program','Progress','Kehadiran','Nilai Rata','Trend','Status'].map(h => (
                <th key={h} style={{ padding:'11px 16px', textAlign:'left', fontSize:11, fontWeight:700, color:C.muted }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {STUDENTS.map((s,i) => {
              const trend = s.pct >= 75 ? '▲' : s.pct >= 50 ? '→' : '▼'
              const trendCol = s.pct >= 75 ? C.success : s.pct >= 50 ? C.warning : C.danger
              return (
                <tr key={s.id} style={{ borderBottom:`1px solid ${C.border}`, background:i%2===0?'#fff':'#FAFAFA' }}>
                  <td style={{ padding:'13px 16px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <Avt ini={s.ini} col={s.col} size={30}/>
                      <span style={{ fontSize:13, fontWeight:600, color:C.text }}>{s.name}</span>
                    </div>
                  </td>
                  <td style={{ padding:'13px 16px', fontSize:12, color:C.sub }}>{s.prog}</td>
                  <td style={{ padding:'13px 16px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ width:80, height:6, background:'#E5E7EB', borderRadius:3, overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${s.pct}%`, background:pct2color(s.pct), borderRadius:3 }}/>
                      </div>
                      <span style={{ fontSize:12, fontWeight:700, color:pct2color(s.pct) }}>{s.pct}%</span>
                    </div>
                  </td>
                  <td style={{ padding:'13px 16px', fontSize:13, fontWeight:700, color:s.att>=80?C.success:s.att>=70?C.warning:C.danger }}>{s.att}%</td>
                  <td style={{ padding:'13px 16px', fontSize:14, fontWeight:800, color:C.primary }}>{s.score}</td>
                  <td style={{ padding:'13px 16px', fontSize:16, fontWeight:800, color:trendCol }}>{trend}</td>
                  <td style={{ padding:'13px 16px' }}><Bdg type={s.status}>{s.status==='active'?'Aktif':'Non-aktif'}</Bdg></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

// ── AI Mahabbah page ──────────────────────────────────────────────────────────
function AIPage() {
  const [messages, setMessages] = useState([
    { role:'ai', text:'Assalamu\'alaikum, Admin Pembina! Saya AI Mahabbah, asisten cerdas Anda untuk menganalisis data pembelajaran dan memberikan rekomendasi. Apa yang ingin Anda ketahui hari ini?' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  function send(text) {
    if (!text.trim() || loading) return
    const userMsg = { role:'user', text }
    setMessages(m => [...m, userMsg])
    setInput('')
    setLoading(true)
    setTimeout(() => {
      const ans = AI_ANS[text] ||
        `Terima kasih atas pertanyaan Anda tentang "${text.slice(0,40)}...". Berdasarkan data terkini, semua santri menunjukkan perkembangan yang baik. Rata-rata kehadiran 92% dan rata-rata nilai 88/100. Saya sarankan fokus pada santri yang memerlukan perhatian khusus seperti Aisyah dan Khadijah untuk sesi bulan ini.`
      setMessages(m => [...m, { role:'ai', text:ans }])
      setLoading(false)
    }, 1200)
  }

  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr', gap:16, alignItems:'start' }}>
      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        <Card p={20} style={{ background:'linear-gradient(160deg,#18085A 0%,#2D1080 100%)', border:'none' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
            <div style={{ width:42, height:42, borderRadius:12, background:C.gold,
              display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Brain size={22} color={C.sidebar}/>
            </div>
            <div>
              <div style={{ fontSize:15, fontWeight:800, color:'#fff' }}>AI Mahabbah</div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.45)' }}>Powered by Claude Sonnet</div>
            </div>
          </div>
          <p style={{ fontSize:12, color:'rgba(255,255,255,0.6)', margin:'0 0 14px', lineHeight:1.6 }}>
            Asisten kecerdasan buatan untuk analisis pembelajaran dan rekomendasi berbasis data santri.
          </p>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {['Analisis','Real-time','Bahasa Indonesia'].map(t => (
              <span key={t} style={{ background:'rgba(251,191,36,0.15)', color:C.gold,
                fontSize:10, fontWeight:700, padding:'3px 9px', borderRadius:20 }}>{t}</span>
            ))}
          </div>
        </Card>

        <Card>
          <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:10 }}>Pertanyaan Cepat</div>
          {AI_QS.map(q => (
            <button key={q} onClick={() => send(q)} style={{
              width:'100%', textAlign:'left', padding:'11px 13px', borderRadius:9,
              border:`1px solid ${C.border}`, background:C.bg, marginBottom:8,
              fontSize:12, color:C.sub, cursor:'pointer', lineHeight:1.5 }}>
              {q}
            </button>
          ))}
        </Card>

        <Card>
          <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:10 }}>Kemampuan AI</div>
          {[
            [CheckCircle, 'Analisis performa santri', C.success],
            [CheckCircle, 'Deteksi santri at-risk', C.success],
            [CheckCircle, 'Laporan naratif otomatis', C.success],
            [CheckCircle, 'Saran untuk orang tua', C.success],
            [CheckCircle, 'Ringkasan mingguan', C.success],
          ].map(([Icon, text, col], i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
              <Icon size={14} color={col}/><span style={{ fontSize:12, color:C.sub }}>{text}</span>
            </div>
          ))}
        </Card>
      </div>

      <Card p={0} style={{ display:'flex', flexDirection:'column', height:580 }}>
        <div style={{ padding:'16px 20px', borderBottom:`1px solid ${C.border}`,
          display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:10, height:10, borderRadius:'50%', background:C.success }}/>
          <span style={{ fontSize:13, fontWeight:700, color:C.text }}>AI Mahabbah</span>
          <span style={{ fontSize:11, color:C.success, marginLeft:4 }}>Online</span>
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:'20px', display:'flex', flexDirection:'column', gap:14 }}>
          {messages.map((m, i) => (
            <div key={i} style={{ display:'flex', gap:10, flexDirection: m.role==='user' ? 'row-reverse' : 'row' }}>
              {m.role === 'ai' && (
                <div style={{ width:32, height:32, borderRadius:'50%', background:C.primary,
                  display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Brain size={14} color='#fff'/>
                </div>
              )}
              <div style={{ maxWidth:'78%',
                background: m.role==='user' ? C.primary : C.bg,
                color: m.role==='user' ? '#fff' : C.text,
                borderRadius: m.role==='user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                padding:'12px 16px', fontSize:13, lineHeight:1.6 }}>
                {m.text.split('\n').map((line, j) => (
                  <div key={j} style={{ marginBottom: line===''?6:0 }}>
                    {line.replace(/\*\*(.*?)\*\*/g, '$1')}
                  </div>
                ))}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display:'flex', gap:10 }}>
              <div style={{ width:32, height:32, borderRadius:'50%', background:C.primary,
                display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Brain size={14} color='#fff'/>
              </div>
              <div style={{ background:C.bg, borderRadius:'14px 14px 14px 4px', padding:'14px 18px' }}>
                <div style={{ display:'flex', gap:5 }}>
                  {[0,1,2].map(j => (
                    <div key={j} style={{ width:8, height:8, borderRadius:'50%', background:C.muted,
                      animation:`bounce 0.8s ease-in-out ${j*0.15}s infinite alternate` }}/>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={{ padding:'14px 16px', borderTop:`1px solid ${C.border}` }}>
          <div style={{ display:'flex', gap:10 }}>
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send(input)}
              placeholder="Tanya sesuatu tentang data santri..."
              style={{ flex:1, padding:'11px 16px', borderRadius:25, border:`1.5px solid ${C.border}`,
              fontSize:13, color:C.text, outline:'none', background:C.bg }}/>
            <button onClick={() => send(input)} style={{ width:44, height:44, borderRadius:'50%',
              background:C.primary, border:'none', cursor:'pointer',
              display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Send size={16} color='#fff'/>
            </button>
          </div>
        </div>
      </Card>
    </div>
  )
}

// ── Notifikasi page ───────────────────────────────────────────────────────────
function NotifikasiPage() {
  const [items, setItems] = useState(NOTIFS)
  function markAll() { setItems(n => n.map(x => ({ ...x, read:true }))) }
  function markRead(id) { setItems(n => n.map(x => x.id===id ? { ...x, read:true } : x)) }
  const unread = items.filter(n => !n.read).length

  const iconMap = {
    report: { Icon:FileText, col:'#4B21A2', bg:'#EDE9FE' },
    alert:  { Icon:AlertTriangle, col:'#D97706', bg:'#FEF3C7' },
    system: { Icon:Settings, col:'#6B7280', bg:'#F3F4F6' },
  }

  return (
    <div style={{ maxWidth:720 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div>
          <span style={{ fontSize:14, color:C.muted }}>
            {unread > 0 ? `${unread} notifikasi belum dibaca` : 'Semua notifikasi sudah dibaca'}
          </span>
        </div>
        {unread > 0 && (
          <button onClick={markAll} style={{ background:'none', border:'none', cursor:'pointer',
            fontSize:13, color:C.primary, fontWeight:600 }}>Tandai semua dibaca</button>
        )}
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {items.map(n => {
          const { Icon, col, bg } = iconMap[n.icon] || iconMap.system
          return (
            <div key={n.id} onClick={() => markRead(n.id)} style={{
              background: n.read ? C.card : `${C.purple50}80`,
              border: `1px solid ${n.read ? C.border : '#C4B5FD'}`,
              borderRadius:12, padding:'16px 18px', cursor:'pointer',
              display:'flex', gap:14, alignItems:'flex-start',
              transition:'background 0.15s' }}>
              <div style={{ width:40, height:40, borderRadius:12, background:bg,
                display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Icon size={18} color={col}/>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
                  <div style={{ fontSize:14, fontWeight: n.read ? 500 : 700, color:C.text }}>
                    {n.title}
                  </div>
                  {!n.read && (
                    <div style={{ width:8, height:8, borderRadius:'50%', background:C.primary, flexShrink:0, marginTop:5 }}/>
                  )}
                </div>
                <div style={{ fontSize:13, color:C.sub, marginTop:4, lineHeight:1.5 }}>{n.body}</div>
                <div style={{ fontSize:11, color:C.muted, marginTop:6 }}>
                  {n.date} · {n.time}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Placeholder for unbuilt pages ─────────────────────────────────────────────
function PlaceholderPage({ id }) {
  const label = NAV.find(n => n.id === id)?.label || id
  return (
    <Card p={48} style={{ textAlign:'center', maxWidth:460, margin:'40px auto' }}>
      <div style={{ width:72, height:72, borderRadius:20, background:C.purple50,
        display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
        <Settings size={32} color={C.primary}/>
      </div>
      <div style={{ fontSize:18, fontWeight:800, color:C.text, marginBottom:8 }}>{label}</div>
      <div style={{ fontSize:14, color:C.muted, lineHeight:1.6 }}>
        Halaman ini sedang dalam pengembangan. Akan segera tersedia pada versi berikutnya.
      </div>
      <div style={{ marginTop:20, display:'flex', gap:6, justifyContent:'center' }}>
        {['Phase 2','Coming Soon'].map(t => (
          <span key={t} style={{ background:C.purple50, color:C.primary, fontSize:11,
            fontWeight:700, padding:'4px 12px', borderRadius:20 }}>{t}</span>
        ))}
      </div>
    </Card>
  )
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function MahabbahAdmin() {
  const [page, setPage] = useState('dashboard')
  const [notifItems, setNotifItems] = useState(NOTIFS)
  const unread = notifItems.filter(n => !n.read).length

  const BUILT = ['dashboard','santri','guru','laporan','analitik','ai','notifikasi']

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        body, html { margin: 0; padding: 0; }
        @keyframes bounce {
          from { transform: translateY(0); opacity: 0.4; }
          to   { transform: translateY(-6px); opacity: 1; }
        }
        @keyframes pulse {
          from { opacity: 0.4; transform: scale(0.8); }
          to   { opacity: 1; transform: scale(1.2); }
        }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #D1D5DB; border-radius: 4px; }
        select, input, button { font-family: inherit; }
      `}</style>

      <div style={{ display:'flex', height:'100vh', overflow:'hidden',
        background:C.bg, fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
        minWidth:960 }}>

        <Sidebar active={page} onNav={setPage} unread={unread}/>

        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>
          <Topbar page={page} unread={unread} onNotif={() => setPage('notifikasi')}/>

          <main style={{ flex:1, overflowY:'auto', padding:'24px 28px' }}>
            {page === 'dashboard'  && <DashboardPage onNav={setPage}/>}
            {page === 'santri'     && <DataSantriPage/>}
            {page === 'guru'       && <DataGuruPage/>}
            {page === 'laporan'    && <LaporanPage/>}
            {page === 'analitik'   && <AnalitikPage/>}
            {page === 'ai'         && <AIPage/>}
            {page === 'notifikasi' && <NotifikasiPage/>}
            {!BUILT.includes(page) && <PlaceholderPage id={page}/>}
          </main>
        </div>
      </div>
    </>
  )
}
