import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type LinkedUser = {
  id: number
  fullName: string
  email: string | null
  role: string
  isActive: boolean
}

type UserLinkCandidate = {
  id: number
  fullName: string
  email: string | null
  role: string
  alreadyLinked: boolean
}

type AkunTabProps = {
  studentId: number
  initialLinkedUser: LinkedUser | null
}

export default function AkunTab({ studentId, initialLinkedUser }: AkunTabProps) {
  const router = useRouter()
  const [linkedUser, setLinkedUser] = useState<LinkedUser | null>(initialLinkedUser)
  
  // Modals state
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false)
  const [isUnlinkModalOpen, setIsUnlinkModalOpen] = useState(false)
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<UserLinkCandidate[]>([])
  const [isSearching, setIsSearching] = useState(false)
  
  // Operation state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    
    if (queryTooShort(searchQuery)) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/identity/search-users?q=${encodeURIComponent(searchQuery)}`)
        if (res.ok) {
          const data = await res.json()
          setSearchResults(data.results || [])
        }
      } catch (err) {
        console.error(err)
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    }
  }, [searchQuery])

  function queryTooShort(q: string) {
    return !q || q.trim().length < 2
  }

  async function handleUnlink() {
    setIsSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/identity/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operation: 'unlink', studentId })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal melepaskan akun')
      
      setLinkedUser(null)
      setIsUnlinkModalOpen(false)
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleLink(targetUserId: number) {
    setIsSubmitting(true)
    setError('')
    try {
      const operation = linkedUser ? 'relink' : 'link'
      const body: any = { operation, studentId }
      if (operation === 'link') {
        body.userId = targetUserId
      } else {
        body.newUserId = targetUserId
      }

      const res = await fetch('/api/identity/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal menghubungkan akun')
      
      const linkedCandidate = searchResults.find(u => u.id === targetUserId)
      if (linkedCandidate) {
        setLinkedUser({
          ...linkedCandidate,
          isActive: true
        })
      }
      
      setIsLinkModalOpen(false)
      setSearchQuery('')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Identitas Diri (Self-Learner)</h3>
          <p className="text-sm text-gray-500 mt-1">
            Menghubungkan akun pengguna ini sebagai profil belajar santri. Santri dapat melihat rapot dan progres belajarnya sendiri.
          </p>
        </div>
      </div>

      <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="text-sm font-medium text-gray-700">Status Akun:</div>
          {linkedUser ? (
            <span className="px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm font-bold border border-green-200">
              Terhubung
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full bg-gray-200 text-gray-700 text-sm font-bold border border-gray-300">
              Belum Terhubung
            </span>
          )}
        </div>

        {linkedUser ? (
          <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-bold text-gray-900 text-lg">{linkedUser.fullName}</p>
                <p className="text-gray-500 text-sm mb-3">{linkedUser.email || 'Tidak ada email'}</p>
                <div className="flex gap-2">
                  <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-100">
                    Role Legacy: {linkedUser.role}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${linkedUser.isActive ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                    {linkedUser.isActive ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setError('')
                    setIsLinkModalOpen(true)
                  }}
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50"
                >
                  Ganti Akun
                </button>
                <button
                  onClick={() => {
                    setError('')
                    setIsUnlinkModalOpen(true)
                  }}
                  className="px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg text-sm font-semibold hover:bg-red-50"
                >
                  Lepaskan Akun
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">Belum ada akun yang terhubung dengan profil santri ini.</p>
            <button
              onClick={() => {
                setError('')
                setIsLinkModalOpen(true)
              }}
              className="px-6 py-2 bg-[#4B21A2] text-white rounded-lg font-semibold hover:bg-[#3D1A8A] transition-colors"
            >
              Hubungkan Akun
            </button>
          </div>
        )}
      </div>

      {/* Unlink Modal */}
      {isUnlinkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Lepaskan Akun?</h3>
            <p className="text-gray-600 text-sm mb-6">
              Apakah Anda yakin ingin melepaskan akun <strong>{linkedUser?.fullName}</strong> dari profil santri ini?
              Data akademik santri tetap tersimpan. Akun login pengguna juga tidak dihapus.
            </p>
            
            {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">{error}</div>}

            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setIsUnlinkModalOpen(false)}
                disabled={isSubmitting}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200"
              >
                Batal
              </button>
              <button 
                onClick={handleUnlink}
                disabled={isSubmitting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Memproses...' : 'Ya, Lepaskan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Link/Relink Modal */}
      {isLinkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-xl w-full p-6 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                {linkedUser ? 'Ganti Akun Terhubung' : 'Hubungkan Akun Santri'}
              </h3>
              <button 
                onClick={() => setIsLinkModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">{error}</div>}

            <div className="mb-4">
              <input
                type="text"
                placeholder="Cari nama atau email..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4B21A2] focus:border-[#4B21A2] outline-none"
              />
            </div>

            <div className="overflow-y-auto flex-1 min-h-[300px]">
              {isSearching ? (
                <div className="text-center text-gray-500 py-8">Mencari pengguna...</div>
              ) : queryTooShort(searchQuery) ? (
                <div className="text-center text-gray-500 py-8">Ketik minimal 2 karakter untuk mencari akun.</div>
              ) : searchResults.length === 0 ? (
                <div className="text-center text-gray-500 py-8">Tidak ada pengguna yang cocok.</div>
              ) : (
                <div className="space-y-3">
                  {searchResults.map(user => (
                    <div key={user.id} className="flex justify-between items-center p-4 border border-gray-200 rounded-lg">
                      <div>
                        <p className="font-bold text-gray-900">{user.fullName}</p>
                        <p className="text-sm text-gray-500">{user.email || 'Tidak ada email'}</p>
                        {user.alreadyLinked && (
                          <span className="inline-block mt-1 text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded font-medium">
                            Sudah terhubung ke santri lain
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleLink(user.id)}
                        disabled={isSubmitting || user.alreadyLinked}
                        className={`px-4 py-2 rounded-lg font-semibold text-sm ${
                          user.alreadyLinked 
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-[#4B21A2] text-white hover:bg-[#3D1A8A]'
                        }`}
                      >
                        Pilih
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
