/**
 * WaveformVisualizer.jsx
 * Animated waveform shown while user is recording.
 * Pure CSS bars — no canvas, no dependencies.
 */
import React, { useEffect, useRef, useState } from 'react'

export default function WaveformVisualizer({ isActive, color = '#a78bfa', barCount = 20 }) {
  const [heights, setHeights] = useState(() => Array(barCount).fill(0.15))
  const rafRef = useRef(null)
  const analyserRef = useRef(null)
  const dataRef = useRef(null)
  const streamRef = useRef(null)
  const ctxRef = useRef(null)

  useEffect(() => {
    if (!isActive) {
      setHeights(Array(barCount).fill(0.15))
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
      if (ctxRef.current) { try { ctxRef.current.close() } catch (_) {} }
      return
    }

    let running = true

    const startMic = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        streamRef.current = stream
        const ctx = new (window.AudioContext || window.webkitAudioContext)()
        ctxRef.current = ctx
        const source = ctx.createMediaStreamSource(stream)
        const analyser = ctx.createAnalyser()
        analyser.fftSize = 64
        analyser.smoothingTimeConstant = 0.8
        source.connect(analyser)
        analyserRef.current = analyser
        dataRef.current = new Uint8Array(analyser.frequencyBinCount)

        const animate = () => {
          if (!running) return
          analyser.getByteFrequencyData(dataRef.current)
          const newHeights = Array(barCount).fill(0).map((_, i) => {
            const binIndex = Math.floor((i / barCount) * dataRef.current.length)
            const val = dataRef.current[binIndex] / 255
            return Math.max(0.08, val)
          })
          setHeights(newHeights)
          rafRef.current = requestAnimationFrame(animate)
        }
        rafRef.current = requestAnimationFrame(animate)
      } catch (_) {
        // Fallback: fake animated bars if mic permission denied
        const animate = () => {
          if (!running) return
          setHeights(prev => prev.map(() => 0.15 + Math.random() * 0.7))
          rafRef.current = requestAnimationFrame(animate)
        }
        rafRef.current = requestAnimationFrame(animate)
      }
    }

    startMic()

    return () => {
      running = false
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
      if (ctxRef.current) { try { ctxRef.current.close() } catch (_) {} }
    }
  }, [isActive, barCount])

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '3px',
      height: '48px',
      padding: '0 8px',
    }}>
      {heights.map((h, i) => (
        <div
          key={i}
          style={{
            width: '3px',
            height: `${Math.round(h * 44)}px`,
            background: color,
            borderRadius: '2px',
            transition: 'height 0.08s ease-out',
            opacity: isActive ? 0.85 + h * 0.15 : 0.3,
            boxShadow: isActive ? `0 0 6px ${color}88` : 'none',
          }}
        />
      ))}
    </div>
  )
}
