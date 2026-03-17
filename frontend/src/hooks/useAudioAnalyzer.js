/**
 * useAudioAnalyzer.js
 * Web Audio API analyser — detects amplitude and drives mouth animation.
 * Works with any HTMLAudioElement or AudioBuffer source.
 */
import { useRef, useCallback, useEffect } from 'react'

export function useAudioAnalyzer() {
  const audioCtxRef = useRef(null)
  const analyserRef = useRef(null)
  const sourceRef = useRef(null)
  const rafRef = useRef(null)
  const dataArrayRef = useRef(null)

  // Ensure AudioContext exists (must be created after user gesture)
  const getCtx = useCallback(() => {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)()
    }
    return audioCtxRef.current
  }, [])

  /**
   * Connect an HTMLAudioElement to the analyser.
   * Returns a cleanup function.
   */
  const connectAudioElement = useCallback((audioEl) => {
    const ctx = getCtx()

    // Disconnect previous source
    if (sourceRef.current) {
      try { sourceRef.current.disconnect() } catch (_) {}
    }

    const source = ctx.createMediaElementSource(audioEl)
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 256
    analyser.smoothingTimeConstant = 0.75

    source.connect(analyser)
    analyser.connect(ctx.destination)

    sourceRef.current = source
    analyserRef.current = analyser
    dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount)

    if (ctx.state === 'suspended') ctx.resume()

    return () => {
      try { source.disconnect() } catch (_) {}
      try { analyser.disconnect() } catch (_) {}
    }
  }, [getCtx])

  /**
   * Get current mouth amplitude (0–1).
   * Call this inside a requestAnimationFrame loop.
   */
  const getAmplitude = useCallback(() => {
    if (!analyserRef.current || !dataArrayRef.current) return 0
    analyserRef.current.getByteFrequencyData(dataArrayRef.current)
    // Focus on speech frequency range (roughly bins 2–12 for 256 fft at 44100hz)
    const slice = dataArrayRef.current.slice(2, 14)
    const avg = slice.reduce((a, b) => a + b, 0) / slice.length
    return Math.min(avg / 180, 1) // normalize to 0–1
  }, [])

  /**
   * Start a rAF loop, calling onFrame(amplitude) each frame.
   * Returns a stop function.
   */
  const startLoop = useCallback((onFrame) => {
    let running = true
    const loop = () => {
      if (!running) return
      const amp = getAmplitude()
      onFrame(amp)
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => {
      running = false
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [getAmplitude])

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close()
      }
    }
  }, [])

  return { connectAudioElement, getAmplitude, startLoop }
}
