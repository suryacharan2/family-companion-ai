/**
 * MemoryPage.jsx — View, edit, add, and delete AI memories
 */
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Brain, Trash2, RefreshCw, Plus, Check, X, Pencil } from 'lucide-react'

const RELATIONS = [
  { id: 'mother',  label: 'Mother',  emoji: '👩', color: '#f43f5e' },
  { id: 'father',  label: 'Father',  emoji: '👨', color: '#3b82f6' },
  { id: 'brother', label: 'Brother', emoji: '🧑', color: '#f97316' },
  { id: 'sister',  label: 'Sister',  emoji: '👧', color: '#a855f7' },
]

const BASE = 'http://localhost:8000'

export default function MemoryPage() {
  const navigate = useNavigate()
  const token = localStorage.getItem('token')

  const [activeTab,   setActiveTab]   = useState('mother')
  const [memories,    setMemories]    = useState({})
  const [loading,     setLoading]     = useState(false)
  const [toast,       setToast]       = useState(null)
  const [editingKey,  setEditingKey]  = useState(null)
  const [editVal,     setEditVal]     = useState('')
  const [showAdd,     setShowAdd]     = useState(false)
  const [newKey,      setNewKey]      = useState('')
  const [newVal,      setNewVal]      = useState('')
  const [saving,      setSaving]      = useState(false)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2500)
  }

  const fetchMemories = async (relation) => {
    setLoading(true)
    try {
      const r = await fetch(`${BASE}/api/memory/${relation}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await r.json()
      setMemories(prev => ({ ...prev, [relation]: data.memories || [] }))
    } catch {
      showToast('Could not load memories.', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token) fetchMemories(activeTab)
    setEditingKey(null)
    setShowAdd(false)
  }, [activeTab])

  const handleDelete = async (factKey) => {
    try {
      await fetch(`${BASE}/api/memory/${activeTab}/${encodeURIComponent(factKey)}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      })
      setMemories(prev => ({
        ...prev,
        [activeTab]: (prev[activeTab] || []).filter(m => m.fact_key !== factKey),
      }))
      showToast('Memory deleted')
    } catch { showToast('Delete failed.', 'error') }
  }

  const startEdit = (mem) => {
    setEditingKey(mem.fact_key)
    setEditVal(mem.fact_value)
    setShowAdd(false)
  }

  const saveEdit = async (factKey) => {
    if (!editVal.trim()) return
    setSaving(true)
    try {
      await fetch(`${BASE}/api/memory/${activeTab}/${encodeURIComponent(factKey)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ fact_value: editVal.trim() }),
      })
      setMemories(prev => ({
        ...prev,
        [activeTab]: (prev[activeTab] || []).map(m =>
          m.fact_key === factKey ? { ...m, fact_value: editVal.trim() } : m
        ),
      }))
      setEditingKey(null)
      showToast('Memory updated ✓')
    } catch { showToast('Update failed.', 'error') }
    finally { setSaving(false) }
  }

  const handleAdd = async () => {
    const key = newKey.trim().toLowerCase().replace(/\s+/g, '_')
    const val = newVal.trim()
    if (!key || !val) return
    setSaving(true)
    try {
      await fetch(`${BASE}/api/memory/${activeTab}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ fact_key: key, fact_value: val }),
      })
      setMemories(prev => ({
        ...prev,
        [activeTab]: [...(prev[activeTab] || []), { fact_key: key, fact_value: val, confidence: 1.0 }],
      }))
      setNewKey(''); setNewVal(''); setShowAdd(false)
      showToast('Memory added ✓')
    } catch { showToast('Add failed.', 'error') }
    finally { setSaving(false) }
  }

  const activeRelation = RELATIONS.find(r => r.id === activeTab)
  const currentMemories = memories[activeTab] || []

  return (
    <div style={s.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@300;400;500;600&display=swap');
        @keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin   { to { transform: rotate(360deg); } }
        input::placeholder, textarea::placeholder { color: rgba(255,255,255,0.22); }
        input:focus, textarea:focus { outline: none; border-color: rgba(255,255,255,0.25) !important; }
      `}</style>

      <header style={s.header}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <button style={s.iconBtn} onClick={() => navigate('/')}><ArrowLeft size={18}/></button>
          <Brain size={18} style={{ color:'#a855f7' }}/>
          <span style={s.headerTitle}>AI Memory</span>
        </div>
        <button style={s.refreshBtn} onClick={() => fetchMemories(activeTab)}>
          <RefreshCw size={13} style={{ marginRight:5, animation: loading ? 'spin 0.8s linear infinite' : 'none' }}/>
          Refresh
        </button>
      </header>

      <main style={s.main}>
        <div style={{ animation:'fadeUp 0.4s ease both', marginBottom:28 }}>
          <h1 style={s.title}>What Your Family Remembers</h1>
          <p style={s.subtitle}>
            The AI learns about you over conversations. Edit, add, or delete any memory — it directly affects how the AI talks to you.
          </p>
        </div>

        <div style={s.tabs}>
          {RELATIONS.map(rel => (
            <button key={rel.id} onClick={() => setActiveTab(rel.id)} style={{
              ...s.tab,
              background: activeTab===rel.id ? `${rel.color}20` : 'transparent',
              border: `1px solid ${activeTab===rel.id ? rel.color+'60' : 'rgba(255,255,255,0.08)'}`,
              color: activeTab===rel.id ? rel.color : 'rgba(255,255,255,0.5)',
            }}>
              <span style={{ fontSize:18 }}>{rel.emoji}</span>
              <span style={{ fontWeight: activeTab===rel.id ? 600 : 400 }}>{rel.label}</span>
              {memories[rel.id] !== undefined && (
                <span style={{ background: activeTab===rel.id ? rel.color : 'rgba(255,255,255,0.1)', color: activeTab===rel.id ? '#fff' : 'rgba(255,255,255,0.4)', borderRadius:20, padding:'1px 8px', fontSize:11, fontWeight:700 }}>
                  {memories[rel.id].length}
                </span>
              )}
            </button>
          ))}
        </div>

        {toast && (
          <div style={{ ...s.toast, background: toast.type==='error' ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)', borderColor: toast.type==='error' ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)', color: toast.type==='error' ? '#fca5a5' : '#4ade80' }}>
            {toast.msg}
          </div>
        )}

        <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:16 }}>
          <button style={{ ...s.addBtn, background: showAdd ? 'rgba(255,255,255,0.08)' : `${activeRelation?.color}20`, borderColor: showAdd ? 'rgba(255,255,255,0.15)' : `${activeRelation?.color}50`, color: showAdd ? 'rgba(255,255,255,0.5)' : activeRelation?.color }}
            onClick={() => { setShowAdd(v => !v); setEditingKey(null) }}>
            <Plus size={14} style={{ marginRight:6 }}/>
            {showAdd ? 'Cancel' : 'Add Memory'}
          </button>
        </div>

        {showAdd && (
          <div style={{ ...s.addForm, borderColor:`${activeRelation?.color}30`, animation:'fadeUp 0.3s ease both' }}>
            <p style={{ color:'rgba(255,255,255,0.5)', fontSize:13, margin:'0 0 14px' }}>
              💡 Add anything you want the AI to remember — your job, hobby, nickname, anything.
            </p>
            <div style={{ display:'flex', gap:10, marginBottom:10, flexWrap:'wrap' }}>
              <div style={{ flex:'1 1 160px' }}>
                <label style={s.label}>Memory Label</label>
                <input value={newKey} onChange={e => setNewKey(e.target.value)} placeholder="e.g. favorite_food" style={s.input}/>
              </div>
              <div style={{ flex:'2 1 240px' }}>
                <label style={s.label}>Value</label>
                <input value={newVal} onChange={e => setNewVal(e.target.value)} placeholder="e.g. I love biryani" style={s.input} onKeyDown={e => e.key==='Enter' && handleAdd()}/>
              </div>
            </div>
            <button onClick={handleAdd} disabled={!newKey.trim()||!newVal.trim()||saving}
              style={{ ...s.saveBtn, background: activeRelation?.color, opacity:(!newKey.trim()||!newVal.trim()||saving)?0.4:1 }}>
              {saving ? 'Saving…' : '✓ Save Memory'}
            </button>
          </div>
        )}

        {loading ? (
          <div style={s.center}>
            <div style={{ width:28, height:28, borderRadius:'50%', border:`2px solid ${activeRelation?.color}`, borderTopColor:'transparent', animation:'spin 0.8s linear infinite' }}/>
            <span style={{ color:'rgba(255,255,255,0.35)', marginLeft:12 }}>Loading…</span>
          </div>
        ) : currentMemories.length === 0 && !showAdd ? (
          <div style={s.empty}>
            <div style={{ fontSize:52, marginBottom:14 }}>{activeRelation?.emoji}</div>
            <p style={{ color:'rgba(255,255,255,0.35)', fontSize:15 }}>
              No memories yet. Chat with your {activeRelation?.label.toLowerCase()} or add one manually above.
            </p>
          </div>
        ) : (
          <div style={s.grid}>
            {currentMemories.map((mem, i) => (
              <div key={mem.fact_key} style={{ ...s.card, borderColor:`${activeRelation?.color}25`, animation:`fadeUp 0.4s ease ${i*0.04}s both` }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                  <span style={{ fontSize:10, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color: activeRelation?.color }}>
                    {mem.fact_key.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}
                  </span>
                  <div style={{ display:'flex', gap:4 }}>
                    <button style={s.actionBtn} onClick={() => startEdit(mem)} title="Edit"><Pencil size={12}/></button>
                    <button style={{ ...s.actionBtn, color:'#f87171' }} onClick={() => handleDelete(mem.fact_key)} title="Delete"><Trash2 size={12}/></button>
                  </div>
                </div>

                {editingKey === mem.fact_key ? (
                  <div>
                    <textarea value={editVal} onChange={e => setEditVal(e.target.value)} rows={3}
                      style={{ ...s.input, resize:'vertical', width:'100%', marginBottom:8 }} autoFocus/>
                    <div style={{ display:'flex', gap:6 }}>
                      <button onClick={() => saveEdit(mem.fact_key)} disabled={saving}
                        style={{ ...s.saveBtn, background:activeRelation?.color, fontSize:12, padding:'6px 14px' }}>
                        <Check size={12} style={{ marginRight:4 }}/>{saving?'…':'Save'}
                      </button>
                      <button onClick={() => setEditingKey(null)}
                        style={{ ...s.saveBtn, background:'rgba(255,255,255,0.08)', fontSize:12, padding:'6px 14px' }}>
                        <X size={12} style={{ marginRight:4 }}/>Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p style={{ fontSize:14, color:'rgba(255,255,255,0.72)', lineHeight:1.55, margin:0 }}>{mem.fact_value}</p>
                )}

                {mem.confidence !== undefined && editingKey !== mem.fact_key && (
                  <div style={{ marginTop:10, height:2, background:'rgba(255,255,255,0.06)', borderRadius:2, overflow:'hidden' }}>
                    <div style={{ width:`${Math.round(mem.confidence*100)}%`, height:'100%', background:activeRelation?.color, borderRadius:2 }}/>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

const s = {
  root: { minHeight:'100vh', background:'#04030a', color:'#fff', fontFamily:"'DM Sans',sans-serif" },
  header: { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 24px', borderBottom:'1px solid rgba(255,255,255,0.06)', backdropFilter:'blur(10px)', position:'sticky', top:0, zIndex:10, background:'rgba(4,3,10,0.92)' },
  headerTitle: { fontFamily:"'Playfair Display',serif", fontSize:18, fontWeight:700 },
  iconBtn: { display:'flex', alignItems:'center', justifyContent:'center', width:36, height:36, borderRadius:'50%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'#fff', cursor:'pointer' },
  refreshBtn: { display:'flex', alignItems:'center', padding:'6px 14px', borderRadius:10, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.5)', fontSize:13, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" },
  main: { maxWidth:860, margin:'0 auto', padding:'32px 24px 60px' },
  title: { fontFamily:"'Playfair Display',serif", fontSize:28, fontWeight:700, margin:'0 0 10px' },
  subtitle: { color:'rgba(255,255,255,0.42)', fontSize:14, lineHeight:1.65, fontWeight:300 },
  tabs: { display:'flex', gap:10, marginBottom:20, flexWrap:'wrap' },
  tab: { display:'flex', alignItems:'center', gap:8, padding:'8px 16px', borderRadius:12, cursor:'pointer', fontSize:14, fontFamily:"'DM Sans',sans-serif", transition:'all 0.2s' },
  toast: { padding:'10px 16px', borderRadius:10, border:'1px solid', fontSize:13, marginBottom:16, display:'inline-block' },
  addBtn: { display:'flex', alignItems:'center', padding:'8px 16px', borderRadius:12, border:'1px solid', cursor:'pointer', fontSize:13, fontWeight:600, fontFamily:"'DM Sans',sans-serif", transition:'all 0.2s' },
  addForm: { background:'rgba(255,255,255,0.04)', border:'1px solid', borderRadius:16, padding:'18px 20px', marginBottom:20 },
  label: { display:'block', fontSize:11, color:'rgba(255,255,255,0.35)', fontWeight:600, letterSpacing:'0.08em', marginBottom:6, textTransform:'uppercase' },
  input: { width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, padding:'9px 12px', color:'#fff', fontSize:13, fontFamily:"'DM Sans',sans-serif", boxSizing:'border-box' },
  saveBtn: { display:'inline-flex', alignItems:'center', padding:'8px 18px', borderRadius:10, border:'none', color:'#fff', fontWeight:600, fontSize:13, cursor:'pointer', fontFamily:"'DM Sans',sans-serif", transition:'opacity 0.2s' },
  grid: { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(250px, 1fr))', gap:14 },
  card: { background:'rgba(255,255,255,0.04)', border:'1px solid', borderRadius:14, padding:'14px 16px' },
  actionBtn: { background:'none', border:'none', color:'rgba(255,255,255,0.25)', cursor:'pointer', padding:5, borderRadius:6, display:'flex', alignItems:'center', transition:'color 0.15s' },
  center: { display:'flex', alignItems:'center', justifyContent:'center', padding:'60px 0' },
  empty: { textAlign:'center', padding:'60px 20px' },
}
