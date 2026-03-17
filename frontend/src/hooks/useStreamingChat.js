import { useState, useRef, useCallback } from 'react'

export function useStreamingChat() {
  const [isStreaming, setIsStreaming] = useState(false)
  const abortRef = useRef(null)

  const streamMessage = useCallback(async ({ message, relation_type, user_id, language, onChunk, onDone, onError }) => {
    setIsStreaming(true)
    abortRef.current = new AbortController()

    try {
      const response = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message,
          relation_type: relation_type,
          user_id: user_id || null,
          language: language || 'en',
          conversation_history: []
        }),
        signal: abortRef.current.signal
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || 'Request failed')
      }

      const fullResponse = data.response || ''
      const emotion = data.emotion_detected || 'neutral'

      if (onChunk) onChunk(fullResponse)
      if (onDone) onDone({ emotion: emotion, fullResponse: fullResponse })

    } catch (err) {
      if (err.name !== 'AbortError') {
        if (onError) onError(err)
      }
    } finally {
      setIsStreaming(false)
    }
  }, [])

  const cancelStream = useCallback(() => {
    if (abortRef.current) abortRef.current.abort()
    setIsStreaming(false)
  }, [])

  return { isStreaming: isStreaming, streamMessage: streamMessage, cancelStream: cancelStream }
}
