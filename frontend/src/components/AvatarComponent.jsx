import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useAudioAnalyzer } from '../hooks/useAudioAnalyzer'

const THEMES = {
  mother:  { primary: '#f472b6', glow: '#f472b688', ring: '#ec4899', emoji: '👩' },
  father:  { primary: '#60a5fa', glow: '#60a5fa88', ring: '#3b82f6', emoji: '👨' },
  brother: { primary: '#34d399', glow: '#34d39988', ring: '#10b981', emoji: '🧑' },
  sister:  { primary: '#a78bfa', glow: '#a78bfa88', ring: '#8b5cf6', emoji: '👧' },
}

const STATUS_CONFIG = {
  idle:      { label: '',              color: 'transparent', pulse: false },
  listening: { label: '🎤 Listening…', color: '#ef4444',    pulse: true  },
  thinking:  { label: '💭 Thinking…',  color: '#f59e0b',    pulse: true  },
  speaking:  { label: '🔊 Speaking…',  color: '#22c55e',    pulse: true  },
  streaming: { label: '✨ Responding…',color: '#f59e0b',    pulse: true  },
  generating:{ label: '🎬 Preparing…', color: '#a78bfa',    pulse: true  },
}

const AVATAR_SIZE = 260

export default function AvatarComponent({
  imageUrl,
  audioRef,
  status = 'idle',
  relation = 'mother',
  theme: themeProp,
  videoRef,
  videoVisible,
}) {
  const theme = themeProp || THEMES[relation] || THEMES.mother
  const statusCfg = STATUS_CONFIG[status] || STATUS_CONFIG.idle

  const [breathY,     setBreathY]     = useState(0)
  const [breathScale, setBreathScale] = useState(1)
  const [ringOpacity, setRingOpacity] = useState(0)

  const breathRef = useRef(null)

  useEffect(() => {
    let t = 0
    const animate = () => {
      t += 0.012
      setBreathY(Math.sin(t) * 4)
      setBreathScale(1 + Math.sin(t * 0.9) * 0.006)
      breathRef.current = requestAnimationFrame(animate)
    }
    breathRef.current = requestAnimationFrame(animate)
    return () => { if (breathRef.current) cancelAnimationFrame(breathRef.current) }
  }, [])

  useEffect(() => {
    setRingOpacity(status !== 'idle' ? 1 : 0)
  }, [status])

  const ringColor = useMemo(() => ({
    idle:       'transparent',
    listening:  '#ef4444',
    thinking:   '#f59e0b',
    streaming:  '#f59e0b',
    speaking:   theme.primary,
    generating: '#a78bfa',
  }[status] || 'transparent'), [status, theme.primary])

  return (
    <div style={{ position:'relative', width:AVATAR_SIZE, height:AVATAR_SIZE, display:'flex', alignItems:'center', justifyContent:'center' }}>

      {/* Glow ring */}
      <div style={{
        position:'absolute', inset:'-10px', borderRadius:'50%',
        pointerEvents:'none', zIndex:10,
        boxShadow: `0 0 0 3px ${ringColor}, 0 0 50px 14px ${ringColor}55`,
        opacity: ringOpacity,
        transition: 'opacity 0.4s ease, box-shadow 0.3s ease',
        animation: statusCfg.pulse ? 'ringPulse 1.5s ease-in-out infinite' : 'none',
      }} />

      {/* Static photo — always visible */}
      <div style={{
        width: AVATAR_SIZE, height: AVATAR_SIZE,
        borderRadius: '50%', overflow: 'hidden',
        position: 'relative', willChange: 'transform',
        transform: `translateY(${breathY}px) scale(${breathScale})`,
        transition: 'transform 0.05s linear',
      }}>
        {imageUrl ? (
          <div style={{ width:'100%', height:'100%', position:'relative', borderRadius:'50%', overflow:'hidden' }}>
            <img
              src={imageUrl} alt="avatar" draggable={false}
              style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'center top', display:'block', borderRadius:'50%', userSelect:'none', pointerEvents:'none' }}
            />
            <div style={{ position:'absolute', inset:0, borderRadius:'50%', background:'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.45) 100%)', pointerEvents:'none' }} />
          </div>
        ) : (
          <div style={{ width:'100%', height:'100%', borderRadius:'50%', overflow:'hidden', background:'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <span style={{ fontSize: 120, userSelect:'none', lineHeight:1 }}>{theme.emoji}</span>
          </div>
        )}
      </div>

      {/* Video overlay — sits exactly on top of photo, same size */}
      {videoRef && (
        <div style={{
          position:'absolute',
          top:0, left:0,
          width: AVATAR_SIZE, height: AVATAR_SIZE,
          borderRadius:'50%', overflow:'hidden',
          zIndex:5,
          visibility: videoVisible ? 'visible' : 'hidden',
          pointerEvents: 'none',
        }}>
          <video
            ref={videoRef}
            playsInline
            style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'center center' }}
          />
        </div>
      )}

      {/* Status badge */}
      {status !== 'idle' && (
        <div style={{
          position:'absolute', bottom:'-44px', left:'50%', transform:'translateX(-50%)',
          padding:'5px 14px', borderRadius:'20px', fontSize:'13px', fontWeight:'600',
          whiteSpace:'nowrap', display:'flex', alignItems:'center',
          backdropFilter:'blur(8px)', letterSpacing:'0.02em',
          background:`${ringColor}22`, border:`1px solid ${ringColor}66`, color:ringColor,
        }}>
          <span style={{ display:'inline-block', width:7, height:7, borderRadius:'50%', background:ringColor, marginRight:6, animation:'dotPulse 1s ease-in-out infinite' }} />
          {statusCfg.label}
        </div>
      )}

      <style>{`
        @keyframes ringPulse { 0%,100% { opacity:0.85; } 50% { opacity:1; } }
        @keyframes dotPulse  { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.5; transform:scale(0.75); } }
      `}</style>
    </div>
  )
}