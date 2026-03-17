import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { History, LogOut, Brain, User } from 'lucide-react'

const RELATIONS = [
  {
    id: 'mother', label: 'Mother', emoji: '👩',
    tagline: 'A warm embrace in every word',
    description: "Nurturing, caring, always asks if you've eaten. She holds your heart safe.",
    color: '#f43f5e', glow: '#f43f5e40', ring: '#f43f5e',
    bg: 'linear-gradient(135deg, #2d0a14 0%, #1a0a0f 100%)',
  },
  {
    id: 'father', label: 'Father', emoji: '👨',
    tagline: 'Steady guidance, unwavering love',
    description: 'Calm, wise, practical. He gives you strength when you need it most.',
    color: '#3b82f6', glow: '#3b82f640', ring: '#3b82f6',
    bg: 'linear-gradient(135deg, #0a1428 0%, #060d1a 100%)',
  },
  {
    id: 'brother', label: 'Brother', emoji: '🧑',
    tagline: 'Your ride-or-die, forever',
    description: "Funny, loyal, slightly annoying. He'll tease you then have your back.",
    color: '#f97316', glow: '#f9731640', ring: '#f97316',
    bg: 'linear-gradient(135deg, #2d1200 0%, #1a0c00 100%)',
  },
  {
    id: 'sister', label: 'Sister', emoji: '👧',
    tagline: 'Your best friend in family form',
    description: 'Fun, empathetic, emotionally brilliant. She gets you and hypes you up.',
    color: '#a855f7', glow: '#a855f740', ring: '#a855f7',
    bg: 'linear-gradient(135deg, #1a0a2d 0%, #0f0618 100%)',
  },
]

export default function HomePage() {
  const navigate = useNavigate()
  const [hovered, setHovered] = useState(null)
  const [visible, setVisible] = useState(false)
  const [userName, setUserName] = useState('')
  const canvasRef = useRef(null)

  useEffect(() => {
    setVisible(true)
    setUserName(localStorage.getItem('user_name') || '')
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let animId
    const stars = Array.from({ length: 120 }, () => ({
      x: Math.random() * canvas.offsetWidth,
      y: Math.random() * canvas.offsetHeight,
      r: Math.random() * 1.2 + 0.3,
      o: Math.random() * 0.5 + 0.1,
    }))
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight }
    resize()
    window.addEventListener('resize', resize)
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      stars.forEach(s => {
        s.o += (Math.random() - 0.5) * 0.02
        s.o = Math.max(0.05, Math.min(0.6, s.o))
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${s.o})`; ctx.fill()
      })
      animId = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize) }
  }, [])

  const handleLogout = () => { localStorage.clear(); navigate('/login') }

  return (
    <div style={s.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=DM+Sans:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
        @keyframes floatHeart { 0%,100% { transform:translateY(0px) rotate(-4deg); } 50% { transform:translateY(-10px) rotate(4deg); } }
        @keyframes shimmer { 0% { background-position:-200% center; } 100% { background-position:200% center; } }
        @keyframes cardIn { from { opacity:0; transform:translateY(32px) scale(0.96); } to { opacity:1; transform:translateY(0) scale(1); } }
        .relation-card:hover .card-arrow { transform: translateX(4px); }
        .nav-btn:hover { background: rgba(255,255,255,0.1) !important; color: #fff !important; }
      `}</style>

      <canvas ref={canvasRef} style={s.canvas} />
      <div style={{ ...s.ambientGlow, background:'radial-gradient(ellipse at 20% 50%, #f43f5e18 0%, transparent 60%)' }} />
      <div style={{ ...s.ambientGlow, background:'radial-gradient(ellipse at 80% 20%, #3b82f618 0%, transparent 60%)' }} />
      <div style={{ ...s.ambientGlow, background:'radial-gradient(ellipse at 60% 80%, #a855f715 0%, transparent 60%)' }} />

      {/* Header */}
      <header style={{ ...s.header, opacity:visible?1:0, transform:visible?'none':'translateY(-10px)', transition:'opacity 0.6s ease, transform 0.6s ease' }}>
        <div style={s.logo}>
          <span style={s.logoHeart}>♥</span>
          <span style={s.logoText}>Family Companion</span>
        </div>
        <div style={s.headerRight}>
          <button className="nav-btn" style={s.headerBtn} onClick={() => navigate('/history')}>
            <History size={15} style={{ marginRight:6 }}/> History
          </button>
          <button className="nav-btn" style={s.headerBtn} onClick={() => navigate('/memory')}>
            <Brain size={15} style={{ marginRight:6 }}/> Memory
          </button>
          <button className="nav-btn" style={s.headerBtn} onClick={() => navigate('/profile')}>
            <User size={15} style={{ marginRight:6 }}/> Profile
          </button>
          <button className="nav-btn" style={{ ...s.headerBtn, color:'#f87171', borderColor:'#f8717130' }} onClick={handleLogout}>
            <LogOut size={15} style={{ marginRight:6 }}/> Logout
          </button>
        </div>
      </header>

      {/* Main */}
      <main style={s.main}>
        <div style={{ ...s.hero, opacity:visible?1:0, animation:visible?'fadeUp 0.8s ease 0.1s both':'none' }}>
          <div style={s.heroEmoji}>💝</div>
          <h1 style={s.heroTitle}>
            Talk to Someone Who <span style={s.heroItalic}>Truly</span> Cares
          </h1>
          {userName && <p style={s.heroSub}>Welcome back, <strong style={{ color:'#fff' }}>{userName}</strong></p>}
          <p style={s.heroDesc}>
            Choose a family member and experience conversation filled with real warmth, genuine support, and love that feels just like home.
          </p>
        </div>

        <div style={s.cardsGrid}>
          {RELATIONS.map((rel, i) => (
            <RelationCard key={rel.id} rel={rel} index={i} visible={visible}
              hovered={hovered===rel.id}
              onHover={() => setHovered(rel.id)}
              onLeave={() => setHovered(null)}
              onClick={() => navigate(`/chat/${rel.id}`)} />
          ))}
        </div>

        <p style={s.footer}>Powered by Groq · ElevenLabs · Whisper &nbsp;·&nbsp; Made with ♥ for your wellbeing</p>
      </main>
    </div>
  )
}

function RelationCard({ rel, index, visible, hovered, onHover, onLeave, onClick }) {
  return (
    <button className="relation-card" onClick={onClick} onMouseEnter={onHover} onMouseLeave={onLeave}
      style={{
        ...s.card,
        background: rel.bg,
        boxShadow: hovered
          ? `0 0 0 1.5px ${rel.ring}60, 0 20px 60px ${rel.glow}, 0 8px 32px rgba(0,0,0,0.5)`
          : '0 0 0 1px rgba(255,255,255,0.06), 0 4px 24px rgba(0,0,0,0.4)',
        transform: hovered ? 'translateY(-6px) scale(1.02)' : 'translateY(0) scale(1)',
        animation: visible ? `cardIn 0.6s ease ${0.2 + index*0.1}s both` : 'none',
      }}>
      <div style={{ position:'absolute', top:0, left:'20%', right:'20%', height:'1px', background:`linear-gradient(90deg, transparent, ${rel.color}80, transparent)`, opacity:hovered?1:0, transition:'opacity 0.3s' }} />
      <div style={{ fontSize:52, marginBottom:16, lineHeight:1, filter:hovered?`drop-shadow(0 0 12px ${rel.color})`:'none', transition:'filter 0.3s, transform 0.3s', transform:hovered?'scale(1.15)':'scale(1)' }}>
        {rel.emoji}
      </div>
      <div style={{ fontSize:11, fontWeight:600, letterSpacing:'0.15em', textTransform:'uppercase', color:rel.color, marginBottom:8, fontFamily:"'DM Sans',sans-serif" }}>
        {rel.label}
      </div>
      <h3 style={{ fontFamily:"'Playfair Display',serif", fontSize:19, fontWeight:700, color:'#fff', margin:'0 0 10px', lineHeight:1.3 }}>
        {rel.tagline}
      </h3>
      <p style={{ fontSize:13, color:'rgba(255,255,255,0.5)', lineHeight:1.6, margin:'0 0 20px', fontFamily:"'DM Sans',sans-serif" }}>
        {rel.description}
      </p>
      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
        <span style={{ fontSize:13, fontWeight:600, color:rel.color, fontFamily:"'DM Sans',sans-serif" }}>Start talking</span>
        <span className="card-arrow" style={{ color:rel.color, fontSize:16, transition:'transform 0.2s ease', display:'inline-block' }}>→</span>
      </div>
      <div style={{ position:'absolute', bottom:-20, right:-20, width:80, height:80, borderRadius:'50%', background:`radial-gradient(circle, ${rel.color}25, transparent 70%)`, transition:'transform 0.3s', transform:hovered?'scale(2)':'scale(1)' }} />
    </button>
  )
}

const s = {
  root: { minHeight:'100vh', background:'#04030a', color:'#fff', position:'relative', overflow:'hidden', fontFamily:"'DM Sans',sans-serif" },
  canvas: { position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none', zIndex:0 },
  ambientGlow: { position:'absolute', inset:0, pointerEvents:'none', zIndex:0 },
  header: { position:'relative', zIndex:10, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'20px 32px', borderBottom:'1px solid rgba(255,255,255,0.05)', backdropFilter:'blur(10px)' },
  logo: { display:'flex', alignItems:'center', gap:10 },
  logoHeart: { fontSize:22, color:'#f43f5e', animation:'floatHeart 3s ease-in-out infinite', display:'inline-block' },
  logoText: { fontFamily:"'Playfair Display',serif", fontSize:18, fontWeight:700, color:'#fff', letterSpacing:'-0.01em' },
  headerRight: { display:'flex', alignItems:'center', gap:8 },
  headerBtn: { display:'flex', alignItems:'center', padding:'7px 14px', borderRadius:10, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.6)', fontSize:13, fontWeight:500, cursor:'pointer', fontFamily:"'DM Sans',sans-serif", transition:'background 0.2s, color 0.2s' },
  main: { position:'relative', zIndex:5, maxWidth:1100, margin:'0 auto', padding:'40px 24px 60px' },
  hero: { textAlign:'center', marginBottom:52 },
  heroEmoji: { fontSize:56, marginBottom:16, animation:'floatHeart 4s ease-in-out infinite', display:'inline-block' },
  heroTitle: { fontFamily:"'Playfair Display',serif", fontSize:'clamp(32px,5vw,52px)', fontWeight:900, color:'#fff', margin:'0 0 12px', lineHeight:1.15, letterSpacing:'-0.02em' },
  heroItalic: { fontStyle:'italic', color:'#f43f5e', background:'linear-gradient(90deg,#f43f5e,#f97316,#f43f5e)', backgroundSize:'200% auto', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', animation:'shimmer 3s linear infinite' },
  heroSub: { fontSize:15, color:'rgba(255,255,255,0.5)', margin:'0 0 12px', fontWeight:300 },
  heroDesc: { fontSize:16, color:'rgba(255,255,255,0.45)', maxWidth:500, margin:'0 auto', lineHeight:1.7, fontWeight:300 },
  cardsGrid: { display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(230px,1fr))', gap:20 },
  card: { position:'relative', overflow:'hidden', textAlign:'left', borderRadius:20, padding:'28px 24px', cursor:'pointer', border:'none', transition:'transform 0.3s ease, box-shadow 0.3s ease', willChange:'transform' },
  footer: { textAlign:'center', marginTop:48, fontSize:12, color:'rgba(255,255,255,0.2)', letterSpacing:'0.05em' },
}