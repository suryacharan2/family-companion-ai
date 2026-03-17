import { useState, useRef, useCallback, useEffect } from 'react'

export function useVoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [isSupported, setIsSupported] = useState(false)
  const [previewText, setPreviewText] = useState('')

  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)
  const streamRef = useRef(null)

  useEffect(() => {
    setIsSupported(!!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia))
  }, [])

  const startRecording = useCallback(async (onError) => {
    try {
      setPreviewText('')
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, sampleRate: 16000, echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      })
      streamRef.current = stream
      chunksRef.current = []
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm'
      const recorder = new MediaRecorder(stream, { mimeType })
      recorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunksRef.current.push(e.data) }
      mediaRecorderRef.current = recorder
      recorder.start(100)
      setIsRecording(true)
      setRecordingDuration(0)
      timerRef.current = setInterval(() => { setRecordingDuration(prev => prev + 1) }, 1000)
    } catch (err) {
      const msg = err.name === 'NotAllowedError' ? 'Microphone permission denied.' : `Microphone error: ${err.message}`
      if (onError) onError(msg)
    }
  }, [])

  const stopAndTranscribe = useCallback(async (language, onSuccess, onError) => {
    if (!mediaRecorderRef.current || !isRecording) return
    clearInterval(timerRef.current)
    setIsRecording(false)
    setIsTranscribing(true)
    return new Promise((resolve) => {
      mediaRecorderRef.current.onstop = async () => {
        try {
          if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
          const mimeType = mediaRecorderRef.current.mimeType || 'audio/webm'
          const blob = new Blob(chunksRef.current, { type: mimeType })
          if (blob.size < 1000) {
            setIsTranscribing(false)
            if (onError) onError('Recording too short. Please hold and speak.')
            resolve(); return
          }
          const formData = new FormData()
          formData.append('audio', blob, 'recording.webm')
          formData.append('language', language || 'auto')
          const response = await fetch('http://localhost:8000/api/stt', { method: 'POST', body: formData })
          const data = await response.json()
          if (!response.ok) throw new Error(data.detail || 'Transcription failed')
          if (data.text && data.text.trim()) {
            setPreviewText(data.text)
            if (onSuccess) onSuccess(data)
          } else {
            if (onError) onError(data.detail || 'Could not understand. Please try again.')
          }
        } catch (err) {
          if (onError) onError(`Voice error: ${err.message}`)
        } finally {
          setIsTranscribing(false)
          resolve()
        }
      }
      mediaRecorderRef.current.stop()
    })
  }, [isRecording])

  const cancelRecording = useCallback(() => {
    clearInterval(timerRef.current)
    if (mediaRecorderRef.current && isRecording) mediaRecorderRef.current.stop()
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
    setIsRecording(false)
    setIsTranscribing(false)
    setRecordingDuration(0)
    setPreviewText('')
    chunksRef.current = []
  }, [isRecording])

  const clearPreview = useCallback(() => setPreviewText(''), [])

  return {
    isRecording, isTranscribing, recordingDuration,
    previewText, clearPreview,
    startRecording, stopAndTranscribe, cancelRecording, isSupported,
  }
}