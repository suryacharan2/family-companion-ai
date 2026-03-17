import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Send, Mic, MicOff, Volume2, VolumeX, Square, Globe, Loader2, Camera, MessageCircle, X } from 'lucide-react'
import { RELATION_THEMES } from '../relationThemes'
import { useVoiceRecorder } from '../hooks/useVoiceRecorder'
import { useGroqStreaming } from '../hooks/useGroqStreaming'
import AvatarComponent from '../components/AvatarComponent'
import WaveformVisualizer from '../components/WaveformVisualizer'

const BASE = 'http://localhost:8000'

const GREETINGS = {
  mother:  "Hi sweetheart! I'm so happy you're here. How are you doing? Have you eaten today?",
  father:  "Hey. Good to see you. What's on your mind?",
  brother: "Yo!! Finally you showed up! What's up? Talk to me bro!",
  sister:  "Oh my gosh HI! I was literally just thinking about you! How are you??",
}

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'ta', label: 'தமிழ்' },
  { code: 'te', label: 'తెలుగు' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'ar', label: 'العربية' },
]

const POLL_INTERVAL_MS = 2500
const POLL_TIMEOUT_MS  = 60_000

const statusColor = (s) =>
  ({ listening:'#f87171', thinking:'#fbbf24', speaking:'#4ade80', streaming:'#fbbf24', generating:'#a78bfa' }[s] || '#fff')
const statusLabel = (s) =>
  ({ listening:'🎤 Listening…', thinking:'💭 Thinking…', speaking:'🔊 Speaking…', streaming:'✨ Responding…', generating:'🎬 Preparing video…' }[s] || '')

export default function ChatPage() {
  const { relation } = useParams()
  const navigate      = useNavigate()
  const theme         = RELATION_THEMES[relation] || RELATION_THEMES.mother
  const userId        = parseInt(localStorage.getItem('user_id')) || null
  const token         = localStorage.getItem('token')
  const greetingText  = GREETINGS[relation] || GREETINGS.mother

  const [phase, setPhase]                         = useState('idle')
  const [messages, setMessages]                   = useState([{
    id: 1, role: 'assistant', content: greetingText,
    emotion: 'happy', timestamp: new Date().toISOString(), streaming: false,
  }])
  const [input, setInput]                         = useState('')
  const [error, setError]                         = useState(null)
  const [language, setLanguage]                   = useState('en')
  const [showLangMenu, setShowLangMenu]           = useState(false)
  const [showChat, setShowChat]                   = useState(true)
  const [pendingVoiceText, setPendingVoiceText]   = useState(null)
  const [avatarImgUrl, setAvatarImgUrl]           = useState(null)
  const [showUploadPrompt, setShowUploadPrompt]   = useState(false)
  const [voiceEnabled, setVoiceEnabled]           = useState(true)
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false)
  const [videoVisible, setVideoVisible]           = useState(false)

  const chatEndRef        = useRef(null)
  const inputRef          = useRef(null)
  const fileInputRef      = useRef(null)
  const audioRef          = useRef(null)
  const videoRef          = useRef(null)
  const pollIntervalRef   = useRef(null)
  const pollTimeoutRef    = useRef(null)
  const isMountedRef      = useRef(true)
  const greetingPlayedRef = useRef(false)
  const blobUrlRef        = useRef(null)  // track current blob URL to prevent multiple revokes

  const { isRecording, isTranscribing, recordingDuration, clearPreview,
          startRecording, stopAndTranscribe, cancelRecording, isSupported: micSupported } = useVoiceRecorder()
  const { isStreaming, streamMessage, cancelStream } = useGroqStreaming()

  useEffect(() => {
    isMountedRef.current = true
    return () => { isMountedRef.current = false; stopPolling() }
  }, [])

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) { clearInterval(pollIntervalRef.current); pollIntervalRef.current = null }
    if (pollTimeoutRef.current)  { clearTimeout(pollTimeoutRef.current);   pollTimeoutRef.current  = null }
  }, [])

  // Safe blob cleanup — only revoke once
  const safeRevoke = useCallback((url) => {
    if (url && url.startsWith('blob:')) {
      try { URL.revokeObjectURL(url) } catch (_) {}
    }
    if (blobUrlRef.current === url) blobUrlRef.current = null
  }, [])

  const waitForVideo = useCallback((audioFilename) => {
    return new Promise(async (resolve) => {
      stopPolling()
      let jobId
      try {
        const resp = await fetch(`${BASE}/api/video/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ relation, audio_url: `${BASE}/api/tts/file/${audioFilename}` }),
        })
        if (!resp.ok) throw new Error(`Video start failed: ${resp.status}`)
        ;({ job_id: jobId } = await resp.json())
      } catch (err) { console.error('Video generation start error:', err); resolve(null); return }

      pollTimeoutRef.current = setTimeout(() => { stopPolling(); resolve(null) }, POLL_TIMEOUT_MS)

      pollIntervalRef.current = setInterval(async () => {
        try {
          const statusResp = await fetch(`${BASE}/api/video/status/${jobId}`, { headers: { Authorization: `Bearer ${token}` } })
          if (!statusResp.ok) throw new Error(`Status ${statusResp.status}`)
          const status = await statusResp.json()
          if (status.status === 'done' && status.video_url) { stopPolling(); resolve(status.video_url) }
          else if (status.status === 'failed') { stopPolling(); resolve(null) }
        } catch (err) { stopPolling(); resolve(null) }
      }, POLL_INTERVAL_MS)
    })
  }, [token, relation, stopPolling])

  const playText = useCallback(async (text, emotion = 'neutral', overrideAvatarUrl = null) => {
    if (!voiceEnabled) return
    try {
      stopPolling()

      // Stop and clean up previous playback
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.onended = null
        audioRef.current.onerror = null
        audioRef.current.src = ''
      }
      if (videoRef.current) {
        videoRef.current.pause()
        videoRef.current.onended = null
        videoRef.current.onerror = null
        videoRef.current.src = ''
      }
      // Revoke previous blob if still alive
      if (blobUrlRef.current) safeRevoke(blobUrlRef.current)

      if (isMountedRef.current) { setVideoVisible(false); setIsGeneratingVideo(false) }
      setPhase('speaking')

      const form = new FormData()
      form.append('text', text); form.append('relation', relation)
      form.append('emotion', emotion); form.append('language', language)

      const resp = await fetch(`${BASE}/api/tts`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form })
      if (!resp.ok) throw new Error('TTS failed')

      const audioBlob      = await resp.blob()
      const audioFilename  = resp.headers.get('X-Audio-Filename')
      const audioObjectUrl = URL.createObjectURL(audioBlob)
      blobUrlRef.current   = audioObjectUrl  // track it

      // Set up audio element (used as fallback when no video)
      audioRef.current.src     = audioObjectUrl
      audioRef.current.preload = 'none'  // ✅ prevent auto-reload loop
      audioRef.current.load()

      const activeAvatarUrl = overrideAvatarUrl || avatarImgUrl
      let videoUrl = null
      if (activeAvatarUrl && audioFilename) {
        if (isMountedRef.current) setIsGeneratingVideo(true)
        videoUrl = await waitForVideo(audioFilename)
        if (!isMountedRef.current) { safeRevoke(audioObjectUrl); return }
        setIsGeneratingVideo(false)
      }

      if (videoUrl && videoRef.current) {
        // ✅ VIDEO MODE: use video's own embedded audio — perfectly synced
        videoRef.current.src = videoUrl
        videoRef.current.load()
        setVideoVisible(true)
        audioRef.current.muted = true  // silence separate audio to avoid double sound

        videoRef.current.onended = () => {
          if (isMountedRef.current) { setPhase('idle'); setVideoVisible(false) }
          audioRef.current.muted = false
          setTimeout(() => safeRevoke(audioObjectUrl), 500)
        }
        videoRef.current.onerror = () => {
          // Video failed — fall back to audio only
          if (isMountedRef.current) setVideoVisible(false)
          audioRef.current.muted = false
          audioRef.current.onended = () => {
            if (isMountedRef.current) setPhase('idle')
            setTimeout(() => safeRevoke(audioObjectUrl), 500)
          }
          audioRef.current.play().catch(console.error)
        }
        await videoRef.current.play()

      } else {
        // ✅ AUDIO ONLY MODE — no photo uploaded or video generation failed
        audioRef.current.muted = false
        audioRef.current.onended = () => {
          if (isMountedRef.current) setPhase('idle')
          setTimeout(() => safeRevoke(audioObjectUrl), 500)
        }
        audioRef.current.onerror = () => {
          if (isMountedRef.current) setPhase('idle')
          safeRevoke(audioObjectUrl)
        }
        await audioRef.current.play()
      }
    } catch (err) {
      console.error('TTS/video error:', err)
      if (isMountedRef.current) { setPhase('idle'); setIsGeneratingVideo(false); setVideoVisible(false) }
    }
  }, [voiceEnabled, token, relation, language, avatarImgUrl, waitForVideo, stopPolling, safeRevoke])

  useEffect(() => {
    if (!token) return
    fetch(`${BASE}/api/avatar/${relation}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        if (!isMountedRef.current) return
        if (data.has_avatar) {
          setAvatarImgUrl(data.image_url)
          if (!greetingPlayedRef.current) {
            greetingPlayedRef.current = true
            setTimeout(() => { if (isMountedRef.current) playText(greetingText, 'happy', data.image_url) }, 800)
          }
        } else {
          setShowUploadPrompt(true)
          if (!greetingPlayedRef.current) {
            greetingPlayedRef.current = true
            setTimeout(() => { if (isMountedRef.current) playText(greetingText, 'happy') }, 800)
          }
        }
      })
      .catch(() => {
        if (!isMountedRef.current) return
        setShowUploadPrompt(true)
        if (!greetingPlayedRef.current) {
          greetingPlayedRef.current = true
          setTimeout(() => { if (isMountedRef.current) playText(greetingText, 'happy') }, 800)
        }
      })
  }, [relation, token])

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const handleRemovePhoto = useCallback(async () => {
    try { await fetch(`${BASE}/api/avatar/remove/${relation}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }) } catch (_) {}
    setAvatarImgUrl(null); setShowUploadPrompt(true)
  }, [relation, token])

  const handlePhotoUpload = useCallback(async (file) => {
    if (!file || !token) return
    const form = new FormData()
    form.append('image', file); form.append('relation', relation)
    try {
      const resp = await fetch(`${BASE}/api/avatar/upload`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form })
      if (!resp.ok) throw new Error()
      const data = await resp.json()
      setAvatarImgUrl(data.image_url); setShowUploadPrompt(false)
    } catch { setError('Photo upload failed.') }
  }, [token, relation])

  const handleSend = useCallback(async (textOverride) => {
    const text = (textOverride || input).trim()
    if (!text || isStreaming) return
    setPendingVoiceText(null); clearPreview?.(); setInput(''); setError(null); setPhase('thinking')

    const userMsg = { id: Date.now(), role: 'user', content: text, timestamp: new Date().toISOString(), streaming: false }
    const aiMsgId = Date.now() + 1
    setMessages(prev => [...prev, userMsg,
      { id: aiMsgId, role: 'assistant', content: '', emotion: 'neutral', timestamp: new Date().toISOString(), streaming: true },
    ])

    await streamMessage({
      message: text, relation_type: relation, user_id: userId, language,
      onChunk: (chunk) => {
        setPhase('streaming')
        setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, content: m.content + chunk } : m))
      },
      onDone: async ({ emotion, fullResponse }) => {
        const emo = emotion || 'neutral'
        setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, streaming: false, emotion: emo, content: fullResponse || m.content } : m))
        setPhase('idle')
        if (voiceEnabled && fullResponse) await playText(fullResponse, emo)
        inputRef.current?.focus()
      },
      onError: () => {
        setError('Could not reach the server. Please try again.')
        setMessages(prev => prev.filter(m => m.id !== aiMsgId))
        setPhase('idle')
      },
    })
  }, [input, isStreaming, relation, userId, language, voiceEnabled, playText, streamMessage, clearPreview])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); pendingVoiceText ? handleSend(pendingVoiceText) : handleSend() }
  }

  const handleMicPress = async () => {
    if (isRecording) {
      await stopAndTranscribe(language, (r) => { if (r.text) setPendingVoiceText(r.text) }, (err) => setError(err))
    } else {
      setError(null); setPendingVoiceText(null); await startRecording((err) => setError(err))
    }
  }

  const handleMicCancel = () => {
    cancelRecording(); setError(null); setPendingVoiceText(null)
  }

  const avatarStatus = isRecording ? 'listening' : isTranscribing ? 'thinking' : isGeneratingVideo ? 'generating' : phase

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100svh', background:'#050510', color:'#fff', overflow:'hidden', position:'relative' }}>
      <audio ref={audioRef} style={{ display:'none' }} />

      <div style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:0,
        background:`radial-gradient(ellipse at 50% 30%, ${theme.color||'#312e81'}33 0%, #050510 70%)` }} />

      <div style={{ position:'relative', zIndex:10, display:'flex', alignItems:'center',
        justifyContent:'space-between', padding:'12px 16px', boxSizing:'border-box', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <button style={btnStyle} onClick={() => navigate('/')}><ArrowLeft size={20}/></button>
          <div>
            <div style={{ fontWeight:700, fontSize:17 }}>{theme.label || relation}</div>
            <div style={{ fontSize:12, marginTop:1 }}>
              {avatarStatus !== 'idle'
                ? <span style={{ color: statusColor(avatarStatus) }}>● {statusLabel(avatarStatus)}</span>
                : <span style={{ color:'rgba(255,255,255,0.4)' }}>{theme.tagline || 'Family AI'}</span>}
            </div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <button style={btnStyle} onClick={() => fileInputRef.current?.click()} title="Upload photo"><Camera size={18}/></button>
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display:'none' }}
            onChange={e => e.target.files?.[0] && handlePhotoUpload(e.target.files[0])} />
          {avatarImgUrl && (
            <button style={{ ...btnStyle, fontSize:16, fontWeight:700 }} title="Remove photo" onClick={handleRemovePhoto}>✕</button>
          )}
          <div style={{ position:'relative' }}>
            <button style={btnStyle} onClick={() => setShowLangMenu(v => !v)}><Globe size={18}/></button>
            {showLangMenu && (
              <div style={{ position:'absolute', right:0, top:46, zIndex:50, borderRadius:14,
                background:'rgba(15,10,30,0.97)', border:'1px solid rgba(255,255,255,0.1)',
                overflow:'hidden', minWidth:140, backdropFilter:'blur(20px)' }}>
                {LANGUAGES.map(lang => (
                  <button key={lang.code}
                    style={{ display:'block', width:'100%', textAlign:'left', padding:'10px 16px', fontSize:13,
                      color: language===lang.code ? '#fff':'rgba(255,255,255,0.7)',
                      background: language===lang.code ? 'rgba(255,255,255,0.15)':'transparent',
                      fontWeight: language===lang.code ? 700:400, cursor:'pointer', border:'none', fontFamily:'inherit' }}
                    onClick={() => { setLanguage(lang.code); setShowLangMenu(false) }}>{lang.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button style={btnStyle} onClick={() => setVoiceEnabled(v => !v)}>
            {voiceEnabled ? <Volume2 size={18}/> : <VolumeX size={18}/>}
          </button>
          <button style={btnStyle} onClick={() => setShowChat(v => !v)}><MessageCircle size={18}/></button>
        </div>
      </div>

      <div style={{ position:'relative', zIndex:5, display:'flex', flexDirection:'column',
        alignItems:'center', flexShrink:0, justifyContent:'flex-start' }}>
        <AvatarComponent
          imageUrl={avatarImgUrl}
          audioRef={audioRef}
          status={avatarStatus}
          relation={relation}
          videoRef={videoRef}
          videoVisible={videoVisible}
        />
        {isGeneratingVideo && (
          <div style={{ marginTop:8, background:'rgba(167,139,250,0.1)', borderRadius:24, padding:'6px 16px',
            border:'1px solid rgba(167,139,250,0.3)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', gap:8 }}>
            <Loader2 size={14} style={{ animation:'spin 1s linear infinite', color:'#a78bfa' }}/>
            <span style={{ color:'#a78bfa', fontSize:13, fontWeight:600 }}>Preparing video…</span>
          </div>
        )}
        {(isRecording || isTranscribing) && (
          <div style={{ marginTop:8, background:'rgba(255,255,255,0.05)', borderRadius:24,
            padding:'4px 12px', border:'1px solid rgba(255,255,255,0.08)', backdropFilter:'blur(8px)' }}>
            <WaveformVisualizer isActive={isRecording} color={theme.color || '#a78bfa'} />
          </div>
        )}
      </div>

      {showUploadPrompt && !avatarImgUrl && (
        <div style={{ position:'relative', zIndex:10, margin:'8px 16px 0', background:'rgba(255,255,255,0.06)',
          borderRadius:16, padding:'12px 16px', border:'1px solid rgba(255,255,255,0.12)',
          backdropFilter:'blur(12px)', textAlign:'center', flexShrink:0 }}>
          <p style={{ color:'#fff', fontWeight:700, margin:'0 0 4px' }}>📸 Upload a photo of your {relation}</p>
          <p style={{ color:'rgba(255,255,255,0.55)', fontSize:13, margin:'0 0 10px' }}>
            Their face will animate and talk with you using AI lip sync
          </p>
          <div style={{ display:'flex', gap:8, justifyContent:'center' }}>
            <button style={{ ...pillStyle, background: theme.color||'#6366f1' }}
              onClick={() => fileInputRef.current?.click()}>Choose Photo</button>
            <button style={{ ...pillStyle, background:'rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.6)' }}
              onClick={() => setShowUploadPrompt(false)}>Skip</button>
          </div>
        </div>
      )}

      <div style={{ flex:1, minHeight:0 }} />

      {showChat && (
        <div style={{ position:'relative', zIndex:10, display:'flex', flexDirection:'column',
          margin:'0 16px 16px', gap:8, flexShrink:0 }}>
          <div style={{ overflowY:'auto', maxHeight:'20vh', display:'flex', flexDirection:'column', padding:'4px 4px 0' }}>
            {messages.map(msg => (
              <div key={msg.id} style={{ display:'flex', justifyContent: msg.role==='user'?'flex-end':'flex-start', marginBottom:6 }}>
                <div style={{ maxWidth:'78%', padding:'10px 14px', borderRadius:18, fontSize:14, lineHeight:1.5,
                  background: msg.role==='user' ? (theme.color||'#6366f1') : 'rgba(255,255,255,0.08)',
                  color:'#fff', border: msg.role==='assistant' ? '1px solid rgba(255,255,255,0.08)':'none',
                  backdropFilter:'blur(12px)' }}>
                  {msg.content || (msg.streaming ? '...' : '')}
                </div>
              </div>
            ))}
            {pendingVoiceText && (
              <div style={{ background:'rgba(59,130,246,0.12)', border:'1px solid rgba(59,130,246,0.3)',
                borderRadius:14, padding:'10px 14px', marginBottom:4 }}>
                <p style={{ color:'#93c5fd', fontSize:12, fontWeight:700, margin:'0 0 4px' }}>Heard this — correct?</p>
                <p style={{ color:'#fff', fontSize:13, fontStyle:'italic', margin:'0 0 8px' }}>"{pendingVoiceText}"</p>
                <div style={{ display:'flex', gap:6 }}>
                  <button style={{ ...pillStyle, background:'#3b82f6', fontSize:12 }}
                    onClick={() => handleSend(pendingVoiceText)}>✅ Send</button>
                  <button style={{ ...pillStyle, background:'rgba(255,255,255,0.1)', fontSize:12, color:'#aaa' }}
                    onClick={() => { setPendingVoiceText(null); clearPreview?.() }}>🔄 Retry</button>
                </div>
              </div>
            )}
            {error && (
              <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)',
                borderRadius:12, padding:'8px 14px', color:'#fca5a5', fontSize:13, textAlign:'center' }}>{error}</div>
            )}
            <div ref={chatEndRef} />
          </div>

          {(isRecording || isTranscribing) && (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, fontSize:13 }}>
              {isTranscribing
                ? <><Loader2 size={13} style={{ animation:'spin 1s linear infinite' }}/><span style={{ color:'#93c5fd', marginLeft:5 }}>Processing…</span></>
                : <>
                    <span style={{ width:8, height:8, borderRadius:'50%', background:'#ef4444',
                      animation:'recPulse 1s ease-in-out infinite', display:'inline-block' }}/>
                    <span style={{ color:'#f87171' }}>Recording… {recordingDuration}s</span>
                    <span style={{ color:'rgba(255,255,255,0.35)', fontSize:11 }}> • mic=send • ✕=cancel</span>
                  </>}
            </div>
          )}

          <div style={{ display:'flex', alignItems:'flex-end', gap:8, background:'rgba(255,255,255,0.06)',
            borderRadius:20, padding:'8px 8px 8px 10px', border:'1px solid rgba(255,255,255,0.1)', backdropFilter:'blur(16px)' }}>
            {micSupported && (
              <>
                <button onClick={handleMicPress} disabled={isTranscribing||isStreaming}
                  style={{ flexShrink:0, width:40, height:40, borderRadius:14, border:'none', color:'#fff',
                    cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
                    transition:'background 0.2s, transform 0.15s',
                    background: isRecording ? '#ef4444' : isTranscribing ? '#3b82f6' : 'rgba(255,255,255,0.1)',
                    transform: isRecording ? 'scale(1.1)' : 'scale(1)' }}>
                  {isTranscribing
                    ? <Loader2 size={18} style={{ animation:'spin 1s linear infinite' }}/>
                    : isRecording ? <MicOff size={18}/> : <Mic size={18}/>}
                </button>
                {isRecording && (
                  <button onClick={handleMicCancel} title="Cancel recording"
                    style={{ flexShrink:0, width:40, height:40, borderRadius:14,
                      border:'2px solid rgba(255,100,100,0.4)', background:'rgba(239,68,68,0.15)',
                      color:'#fca5a5', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <X size={18}/>
                  </button>
                )}
              </>
            )}
            <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown} placeholder={`Message your ${relation}…`} rows={1}
              disabled={isStreaming||isRecording||isTranscribing}
              style={{ flex:1, resize:'none', background:'transparent', color:'#fff', border:'none',
                outline:'none', fontSize:14, lineHeight:1.5, padding:'6px 4px',
                maxHeight:96, overflowY:'auto', fontFamily:'inherit' }} />
            {isStreaming
              ? <button onClick={cancelStream}
                  style={{ flexShrink:0, width:40, height:40, borderRadius:14, border:'none',
                    background:'#ef4444', color:'#fff', cursor:'pointer', display:'flex',
                    alignItems:'center', justifyContent:'center' }}><Square size={18}/></button>
              : <button onClick={() => handleSend()} disabled={!input.trim()||isRecording||isTranscribing}
                  style={{ flexShrink:0, width:40, height:40, borderRadius:14, border:'none',
                    background: theme.color||'#6366f1', color:'#fff', cursor:'pointer', display:'flex',
                    alignItems:'center', justifyContent:'center',
                    opacity:(!input.trim()||isRecording||isTranscribing) ? 0.4 : 1 }}><Send size={18}/></button>}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes recPulse { 0%,100% { opacity:1; } 50% { opacity:0.3; } }
      `}</style>
    </div>
  )
}

const btnStyle  = { display:'flex', alignItems:'center', justifyContent:'center', width:38, height:38, borderRadius:'50%', background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.1)', color:'#fff', cursor:'pointer' }
const pillStyle = { padding:'7px 16px', borderRadius:20, border:'none', color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }