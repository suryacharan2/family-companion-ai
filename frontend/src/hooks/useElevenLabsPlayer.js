/**
 * useElevenLabsPlayer.js
 * 
 * Fetches TTS audio from your FastAPI /api/tts endpoint,
 * plays it via an HTMLAudioElement, and exposes the ref
 * so AvatarComponent can connect the Web Audio analyser.
 * 
 * Returns:
 *   audioRef    — ref to HTMLAudioElement (pass to AvatarComponent)
 *   isPlaying   — boolean
 *   voiceEnabled— boolean
 *   toggleVoice — fn
 *   playText    — async fn(text, emotion?, language?)
 *   stopAudio   — fn
 */
import { useRef, useState, useCallback, useEffect } from 'react'

export function useElevenLabsPlayer(relation, language = 'en') {
  const audioRef     = useRef(null)
  const blobUrlRef   = useRef(null)
  const [isPlaying,    setIsPlaying]    = useState(false)
  const [voiceEnabled, setVoiceEnabled] = useState(true)

  // Create persistent audio element
  useEffect(() => {
    const el = new Audio()
    el.preload = 'auto'
    audioRef.current = el

    const onPlay  = () => setIsPlaying(true)
    const onEnd   = () => setIsPlaying(false)
    const onPause = () => setIsPlaying(false)
    const onError = () => setIsPlaying(false)

    el.addEventListener('play',  onPlay)
    el.addEventListener('ended', onEnd)
    el.addEventListener('pause', onPause)
    el.addEventListener('error', onError)

    return () => {
      el.pause()
      el.removeEventListener('play',  onPlay)
      el.removeEventListener('ended', onEnd)
      el.removeEventListener('pause', onPause)
      el.removeEventListener('error', onError)
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
    }
  }, [])

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    setIsPlaying(false)
  }, [])

  const playText = useCallback(async (text, emotion = 'neutral', lang) => {
    if (!voiceEnabled || !text?.trim()) return
    stopAudio()

    const token = localStorage.getItem('token')
    try {
      const form = new FormData()
      form.append('text',     text)
      form.append('relation', relation)
      form.append('emotion',  emotion)
      form.append('language', lang || language)

      const resp = await fetch('http://localhost:8000/api/tts', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      })

      if (!resp.ok) {
        console.error('[useElevenLabsPlayer] TTS error:', resp.status)
        return
      }

      const buffer = await resp.arrayBuffer()
      const blob   = new Blob([buffer], { type: 'audio/mpeg' })

      // Revoke old blob URL
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
      blobUrlRef.current = URL.createObjectURL(blob)

      const el = audioRef.current
      el.src = blobUrlRef.current
      el.load()

      // Small delay so Web Audio can connect before play event fires
      await new Promise(r => setTimeout(r, 60))
      await el.play()
    } catch (err) {
      console.error('[useElevenLabsPlayer] playText error:', err)
      setIsPlaying(false)
    }
  }, [voiceEnabled, relation, language, stopAudio])

  const toggleVoice = useCallback(() => {
    setVoiceEnabled(v => {
      if (v) stopAudio()
      return !v
    })
  }, [stopAudio])

  return {
    audioRef,
    isPlaying,
    voiceEnabled,
    toggleVoice,
    playText,
    stopAudio,
  }
}
