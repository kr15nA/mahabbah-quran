'use client'

import { useState } from 'react'
import { Brain, Send, Sparkles } from 'lucide-react'

export default function AdminAIPage() {
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'ai'; text: string }>>([
    {
      role: 'ai',
      text: 'Assalamu\'alaikum! Saya AI Mahabbah Qur\'an (powered by Claude). Silakan tanyakan hal seputar analisis hafalan, kehadiran, atau kinerja santri dan guru.',
    },
  ])
  const [loading, setLoading] = useState(false)

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!question.trim() || loading) return

    const userQ = question
    setQuestion('')
    setMessages((prev) => [...prev, { role: 'user', text: userQ }])
    setLoading(true)

    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: userQ }),
      })
      const json = await res.json()
      setMessages((prev) => [...prev, { role: 'ai', text: json.answer || 'Maaf, gagal memproses analisis.' }])
    } catch {
      setMessages((prev) => [...prev, { role: 'ai', text: 'Terjadi kesalahan jaringan.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#18085A] to-[#4B21A2] p-4 text-white flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#FBBF24] flex items-center justify-center text-[#18085A]">
          <Brain className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-sm">Asisten AI Mahabbah Qur'an</h3>
          <p className="text-[11px] text-gray-300">Claude-Powered Institutional Intelligence</p>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3">
        {messages.map((m, idx) => (
          <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                m.role === 'user'
                  ? 'bg-[#4B21A2] text-white rounded-br-none'
                  : 'bg-[#F0EDF9] text-gray-900 rounded-bl-none border border-purple-100 space-y-1'
              }`}
            >
              {m.text.split('\n').map((line, i) => (
                <p key={i}>{line.replace(/\*\*(.*?)\*\*/g, '$1')}</p>
              ))}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-[#F0EDF9] p-3 rounded-2xl text-xs text-gray-500 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#FBBF24] animate-spin" /> Menganalisis data...
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-3 border-t border-gray-200 flex gap-2">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Tanyakan analisis santri, presensi, atau tren hafalan..."
          className="flex-1 bg-[#F0EDF9] px-4 py-2.5 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#4B21A2]"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-[#4B21A2] hover:bg-[#3a1880] text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm disabled:opacity-50"
        >
          <Send className="w-3.5 h-3.5" /> Kirim
        </button>
      </form>
    </div>
  )
}
