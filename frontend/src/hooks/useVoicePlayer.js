import { useState, useRef, useCallback, useEffect } from 'react'

export function useVoicePlayer(relation, language) {
  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef(null)
  const currentRelationRef = useRef(relation)

  // Track current relation — stop audio if relation changes
  useEffect(() => {
    currentRelationRef.current = relation
    return () => {
      // Cleanup when component unmounts or relation changes
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ''
        audioRef.current = null
      }
      setIsPlaying(false)
    }
  }, [relation])

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
      audioRef.current = null
    }
    setIsPlaying(false)
  }, [])

  const playText = useCallback(async (text, emotionOverride) => {
    if (!voiceEnabled || !text?.trim()) return

    // Stop any currently playing audio first
    stopAudio()

    const token = localStorage.getItem('token')
    try {
      const form = new FormData()
      form.append('text', text)
      form.append('relation', currentRelationRef.current)
      form.append('emotion', emotionOverride || 'neutral')
      form.append('language', language || 'en')

      const resp = await fetch('http://localhost:8000/api/tts', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      })

      if (!resp.ok) return

      const blob = await resp.blob()
      const url = URL.createObjectURL(blob)

      // Stop again in case another call came in while fetching
      stopAudio()

      const audio = new Audio(url)
      audioRef.current = audio
      setIsPlaying(true)

      audio.onended = () => {
        URL.revokeObjectURL(url)
        setIsPlaying(false)
        audioRef.current = null
      }
      audio.onerror = () => {
        setIsPlaying(false)
        audioRef.current = null
      }

      await audio.play()
    } catch (e) {
      setIsPlaying(false)
      audioRef.current = null
    }
  }, [voiceEnabled, language, stopAudio])

  const toggleVoice = useCallback(() => {
    if (voiceEnabled) stopAudio()
    setVoiceEnabled(v => !v)
  }, [voiceEnabled, stopAudio])

  return { voiceEnabled, toggleVoice, playText, stopAudio, isPlaying }
}