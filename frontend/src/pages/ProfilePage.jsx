import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const RELATIONS = [
  { id: 'mother',  emoji: '👩', label: 'Mother',  color: '#e91e8c' },
  { id: 'father',  emoji: '👨', label: 'Father',  color: '#1976d2' },
  { id: 'brother', emoji: '👦', label: 'Brother', color: '#388e3c' },
  { id: 'sister',  emoji: '👧', label: 'Sister',  color: '#7b1fa2' },
]

export default function ProfilePage() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [voices, setVoices] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { navigate('/login'); return }

    Promise.all([
      fetch('http://localhost:8000/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      }).then(r => r.json()),
      fetch('http://localhost:8000/api/voice-profile/all', {
        headers: { Authorization: `Bearer ${token}` }
      }).then(r => r.json()),
    ]).then(([userData, voiceData]) => {
      setUser(userData)
      setVoices(voiceData)
    }).catch(() => {
      navigate('/login')
    }).finally(() => setLoading(false))
  }, [])

  function handleLogout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user_id')
    localStorage.removeItem('user_name')
    navigate('/login')
  }

  function formatDate(dateStr) {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', fontFamily: 'sans-serif' }}>
      <p style={{ color: '#999' }}>Loading...</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', fontFamily: 'sans-serif' }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '24px 20px 40px', textAlign: 'center', color: '#fff', position: 'relative' }}>
        <button
          onClick={() => navigate('/')}
          style={{ position: 'absolute', left: 16, top: 20, background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: 10, padding: '8px 14px', cursor: 'pointer', fontSize: 14 }}
        >
          ← Back
        </button>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, margin: '0 auto 12px' }}>
          {user?.name?.[0]?.toUpperCase() || '👤'}
        </div>
        <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700 }}>{user?.name || 'User'}</h1>
        <p style={{ margin: 0, opacity: 0.8, fontSize: 14 }}>{user?.email}</p>
        {user?.created_at && (
          <p style={{ margin: '6px 0 0', opacity: 0.65, fontSize: 12 }}>Member since {formatDate(user.created_at)}</p>
        )}
      </div>

      <div style={{ maxWidth: 480, margin: '-20px auto 0', padding: '0 16px 40px' }}>

        {/* Voice Profiles Card */}
        <div style={{ background: '#fff', borderRadius: 20, padding: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', marginBottom: 16 }}>
          <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: '#111' }}>🎙️ Voice Profiles</h2>
          {RELATIONS.map(rel => {
            const hasVoice = !!voices[rel.id]
            return (
              <div key={rel.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: rel.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                    {rel.emoji}
                  </div>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: '#111' }}>{rel.label}</p>
                    <p style={{ margin: 0, fontSize: 12, color: hasVoice ? '#388e3c' : '#999' }}>
                      {hasVoice ? `✅ ${voices[rel.id].voice_name || 'Voice configured'}` : '⚪ No voice set up'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => navigate(`/voice-setup/${rel.id}`)}
                  style={{ padding: '7px 14px', borderRadius: 10, border: `1.5px solid ${rel.color}`, background: '#fff', color: rel.color, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                >
                  {hasVoice ? 'Change' : 'Set Up'}
                </button>
              </div>
            )
          })}
        </div>

        {/* Account Actions */}
        <div style={{ background: '#fff', borderRadius: 20, padding: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', marginBottom: 16 }}>
          <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: '#111' }}>⚙️ Account</h2>
          <button
            onClick={() => navigate('/history')}
            style={{ width: '100%', padding: '13px', borderRadius: 12, border: '1.5px solid #e0e0e0', background: '#fff', color: '#333', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: 10, textAlign: 'left' }}
          >
            📜 Chat History
          </button>
          <button
            onClick={handleLogout}
            style={{ width: '100%', padding: '13px', borderRadius: 12, border: '1.5px solid #ffcccc', background: '#fff5f5', color: '#c62828', fontSize: 14, fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}
          >
            🚪 Logout
          </button>
        </div>

        {/* App info */}
        <p style={{ textAlign: 'center', fontSize: 12, color: '#bbb', marginTop: 8 }}>
          AI Family Companion • Made with ❤️
        </p>
      </div>
    </div>
  )
}
