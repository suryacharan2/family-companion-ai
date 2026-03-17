import { useRef, useCallback, useState } from 'react'

const BASE = 'http://localhost:8000'

export function useGroqStreaming() {
  const [isStreaming, setIsStreaming] = useState(false)
  const abortRef = useRef(null)

  const streamMessage = useCallback(async ({
    message, relation_type, user_id, language = 'en',
    conversation_history = [], onChunk, onDone, onError,
  }) => {
    if (abortRef.current) abortRef.current.abort()
    abortRef.current = new AbortController()
    setIsStreaming(true)

    let fullResponse = ''
    let emotion = 'neutral'

    try {
      const token = localStorage.getItem('token')
      const resp = await fetch(`${BASE}/api/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message, relation_type, user_id, language, conversation_history }),
        signal: abortRef.current.signal,
      })

      if (!resp.ok) throw new Error(`Server ${resp.status}`)
      if (!resp.body) throw new Error('No stream body')

      const reader = resp.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed.startsWith('data:')) continue
          const raw = trimmed.slice(5).trim()
          if (!raw || raw === '[DONE]') continue
          try {
            const parsed = JSON.parse(raw)
            if (parsed.error) throw new Error(parsed.error)
            if (parsed.chunk) { fullResponse += parsed.chunk; onChunk?.(parsed.chunk) }
            if (parsed.emotion) emotion = parsed.emotion
            if (parsed.done) {
              if (parsed.full_response) fullResponse = parsed.full_response
              onDone?.({ fullResponse, emotion })
              return
            }
          } catch (_) {}
        }
      }

      onDone?.({ fullResponse, emotion })
    } catch (err) {
      if (err.name === 'AbortError') return
      console.error('[useGroqStreaming]', err)
      onError?.(err)
    } finally {
      setIsStreaming(false)
    }
  }, [])

  const cancelStream = useCallback(() => {
    abortRef.current?.abort()
    setIsStreaming(false)
  }, [])

  return { isStreaming, streamMessage, cancelStream }
}