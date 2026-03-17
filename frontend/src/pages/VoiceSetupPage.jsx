import React, { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

const RELATION_INFO = {
  mother:  { emoji: '👩', label: 'Mother',  color: '#e91e8c' },
  father:  { emoji: '👨', label: 'Father',  color: '#1976d2' },
  brother: { emoji: '👦', label: 'Brother', color: '#388e3c' },
  sister:  { emoji: '👧', label: 'Sister',  color: '#7b1fa2' },
}

const STEPS = [
  { num: 1, title: 'Go to ElevenLabs', desc: 'Open elevenlabs.io and log in or create a free account', link: 'https://elevenlabs.io' },
  { num: 2, title: 'Click "Voices" in the sidebar', desc: 'Then click "Add a new voice" button' },
  { num: 3, title: 'Choose "Instant Voice Clone"', desc: 'Upload a clear 1-minute recording of your family member speaking. Works best with clear audio, no background noise.' },
  { num: 4, title: 'Name the voice and save', desc: 'After saving, open the voice settings and copy the Voice ID (a string of letters and numbers).' },
  { num: 5, title: 'Paste the Voice ID below', desc: 'The Voice ID looks like: abc123def456xyz789' },
]

export default function VoiceSetupPage() {
  const { relation } = useParams()
  const navigate = useNavigate()
  const info = RELATION_INFO[relation] || RELATION_INFO.mother

  const [voiceId, setVoiceId] = useState('')
  const [voiceName, setVoiceName] = useState('')
  const [loading, setLoading] = useState(false)
  const [testing, setTesting] = useState(false)
  const [error, setError] = useState('')
  const [testDone, setTestDone] = useState(false)

  async function testVoice() {
    if (!voiceId.trim()) return
    setTesting(true)
    setError('')
    try {
      const token = localStorage.getItem('token')
      await fetch('http://localhost:8000/api/voice-profile/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ relation_type: relation, voice_id: voiceId.trim(), voice_name: voiceName || info.label }),
      })
      const form = new FormData()
      form.append('text', `Hello! I am your ${info.label}. It is so good to hear from you!`)
      form.append('relation', relation)
      form.append('emotion', 'happy')
      form.append('language', 'en')
      const resp = await fetch('http://localhost:8000/api/tts', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      })
      if (!resp.ok) throw new Error('Voice test failed. Check your Voice ID.')
      const blob = await resp.blob()
      new Audio(URL.createObjectURL(blob)).play()
      setTestDone(true)
    } catch (e) {
      setError(e.message)
    } finally {
      setTesting(false)
    }
  }

  async function handleSave() {
    if (!voiceId.trim()) { setError('Please enter a Voice ID'); return }
    setLoading(true)
    setError('')
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('http://localhost:8000/api/voice-profile/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ relation_type: relation, voice_id: voiceId.trim(), voice_name: voiceName || info.label }),
      })
      if (!res.ok) throw new Error('Failed to save voice')
      navigate(`/chat/${relation}`)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', fontFamily: 'sans-serif' }}>
      <div style={{ background: info.color, padding: '32px 24px', textAlign: 'center', color: '#fff' }}>
        <div style={{ fontSize: 64 }}>{info.emoji}</div>
        <h1 style={{ margin: '8px 0 4px', fontSize: 24, fontWeight: 700 }}>Set Up {info.label}'s Voice</h1>
        <p style={{ margin: 0, opacity: 0.85, fontSize: 14 }}>Clone your {info.label.toLowerCase()}'s real voice using ElevenLabs</p>
      </div>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '24px 16px' }}>
        {STEPS.map(step => (
          <div key={step.num} style={{ display: 'flex', gap: 16, background: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: info.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
              {step.num}
            </div>
            <div>
              <p style={{ margin: '0 0 4px', fontWeight: 600, fontSize: 14, color: '#111' }}>{step.title}</p>
              <p style={{ margin: 0, fontSize: 12, color: '#666' }}>{step.desc}</p>
              {step.link && (
                <a href={step.link} target="_blank" rel="noreferrer"
                  style={{ display: 'inline-block', marginTop: 8, padding: '6px 14px', background: '#111', color: '#fff', borderRadius: 8, fontSize: 12, textDecoration: 'none' }}>
                  Open ElevenLabs →
                </a>
              )}
            </div>
          </div>
        ))}

        <div style={{ background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginTop: 8 }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 6 }}>
              Voice ID <span style={{ color: 'red' }}>*</span>
            </label>
            <input type="text" value={voiceId} onChange={e => setVoiceId(e.target.value)}
              placeholder="e.g. abc123def456xyz789"
              style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '2px solid #ddd', fontSize: 13, fontFamily: 'monospace', boxSizing: 'border-box', outline: 'none' }} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 6 }}>Voice Label (optional)</label>
            <input type="text" value={voiceName} onChange={e => setVoiceName(e.target.value)}
              placeholder="e.g. Amma's voice"
              style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '2px solid #ddd', fontSize: 13, boxSizing: 'border-box', outline: 'none' }} />
          </div>

          {error && <div style={{ background: '#fff0f0', border: '1px solid #ffcccc', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#c00', marginBottom: 12 }}>{error}</div>}
          {testDone && <div style={{ background: '#f0fff4', border: '1px solid #aaffcc', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#080', marginBottom: 12 }}>✅ Voice sounds good! Save it below.</div>}

          <button onClick={testVoice} disabled={!voiceId.trim() || testing}
            style={{ width: '100%', padding: 12, borderRadius: 10, border: `2px solid ${info.color}`, background: '#fff', color: info.color, fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: 10, opacity: (!voiceId.trim() || testing) ? 0.4 : 1 }}>
            {testing ? 'Playing test...' : '🔊 Test Voice'}
          </button>

          <button onClick={handleSave} disabled={!voiceId.trim() || loading}
            style={{ width: '100%', padding: 14, borderRadius: 10, border: 'none', background: info.color, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', marginBottom: 10, opacity: (!voiceId.trim() || loading) ? 0.4 : 1 }}>
            {loading ? 'Saving...' : `✅ Save & Chat with ${info.label}`}
          </button>

          <button onClick={() => navigate(`/chat/${relation}`)}
            style={{ width: '100%', padding: 10, borderRadius: 10, border: 'none', background: 'transparent', color: '#999', fontSize: 13, cursor: 'pointer' }}>
            Skip for now (use default voice)
          </button>
        </div>
      </div>
    </div>
  )
}
