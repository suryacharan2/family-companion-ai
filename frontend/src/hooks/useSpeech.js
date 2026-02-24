/**
 * hooks/useSpeech.js - Web Speech API integration
 * Handles both voice recognition (input) and speech synthesis (output)
 */
import { useState, useRef, useCallback } from 'react'

export function useSpeech() {
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const recognitionRef = useRef(null)
  const synthRef = useRef(window.speechSynthesis)

  const isSupported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window

  /**
   * Start microphone voice recognition
   * @param {function} onResult - Callback with transcript string
   * @param {function} onError - Callback with error
   */
  const startListening = useCallback((onResult, onError) => {
    if (!isSupported) {
      onError?.('Speech recognition not supported in this browser')
      return
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.lang = 'en-US'
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.onstart = () => setIsListening(true)
    recognition.onend = () => setIsListening(false)
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript
      onResult(transcript)
    }
    recognition.onerror = (event) => {
      setIsListening(false)
      onError?.(event.error)
    }

    recognitionRef.current = recognition
    recognition.start()
  }, [isSupported])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
    setIsListening(false)
  }, [])

  /**
   * Speak text aloud using Speech Synthesis
   * @param {string} text - Text to speak
   * @param {string} relation - Relation type to adjust voice
   */
  const speak = useCallback((text, relation = 'mother') => {
    if (!voiceEnabled || !synthRef.current) return

    synthRef.current.cancel() // Stop any current speech

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.95
    utterance.pitch = relation === 'mother' || relation === 'sister' ? 1.2 : 0.9
    utterance.volume = 1

    // Try to get a matching voice
    const voices = synthRef.current.getVoices()
    const femaleVoice = voices.find(v => v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('samantha'))
    const maleVoice = voices.find(v => v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('daniel'))

    if (relation === 'mother' || relation === 'sister') {
      if (femaleVoice) utterance.voice = femaleVoice
    } else {
      if (maleVoice) utterance.voice = maleVoice
    }

    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)

    synthRef.current.speak(utterance)
  }, [voiceEnabled])

  const stopSpeaking = useCallback(() => {
    synthRef.current?.cancel()
    setIsSpeaking(false)
  }, [])

  return {
    isListening,
    isSpeaking,
    voiceEnabled,
    setVoiceEnabled,
    isSupported,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
  }
}
