/**
 * pages/ChatPage.jsx - Main chat interface with AI family member
 */
import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Send, Mic, MicOff, Volume2, VolumeX,
  Moon, Sun, Smile, History
} from 'lucide-react'
import { RELATION_THEMES, EMOTION_LABELS } from '../relationThemes'
import { sendMessage } from '../api'
import { useSpeech } from '../hooks/useSpeech'
import { useTheme } from '../App'
import { MessageBubble, TypingIndicator } from '../components/ChatBubble'

// Greeting messages per relation
const GREETINGS = {
  mother: "Hi sweetheart! 🌸 I'm so happy you're here. How are you doing? Have you eaten today?",
  father: "Hey. Good to see you. What's on your mind?",
  brother: "Yo!! Finally you showed up 😄 What's up? Talk to me bro!",
  sister: "Oh my gosh HI! I was literally just thinking about you! 🥰 How are you??"
}

export default function ChatPage() {
  const { relation } = useParams()
  const navigate = useNavigate()
  const { isDark, toggle } = useTheme()
  const theme = RELATION_THEMES[relation] || RELATION_THEMES.mother

  const [messages, setMessages] = useState([
    {
      id: Date.now(),
      role: 'assistant',
      content: GREETINGS[relation] || GREETINGS.mother,
      emotion: 'happy',
      timestamp: new Date().toISOString()
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const chatEndRef = useRef(null)
  const inputRef = useRef(null)

  const {
    isListening, isSpeaking, voiceEnabled, setVoiceEnabled,
    isSupported, startListening, stopListening, speak, stopSpeaking
  } = useSpeech()

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  // Build conversation history for context
  const getHistory = () =>
    messages.slice(-10).map(m => ({ message: m.content, response: m.content, role: m.role }))

  const handleSend = useCallback(async (textOverride) => {
    const text = (textOverride || input).trim()
    if (!text || isLoading) return

    setInput('')
    setError(null)

    const userMsg = {
      id: Date.now(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMsg])
    setIsLoading(true)

    try {
      const history = getHistory()
      const response = await sendMessage({
        message: text,
        relation_type: relation,
        conversation_history: history
      })

      const aiMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        content: response.response,
        emotion: response.emotion_detected,
        timestamp: response.timestamp
      }

      setMessages(prev => [...prev, aiMsg])

      // Speak the response if voice is enabled
      if (voiceEnabled) {
        speak(response.response, relation)
      }
    } catch (err) {
      setError('Could not reach the server. Please try again.')
      console.error(err)
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }, [input, isLoading, relation, voiceEnabled, speak])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleMicToggle = () => {
    if (isListening) {
      stopListening()
    } else {
      startListening(
        (transcript) => handleSend(transcript),
        (err) => setError(`Mic error: ${err}`)
      )
    }
  }

  const handleVoiceToggle = () => {
    if (isSpeaking) stopSpeaking()
    setVoiceEnabled(v => !v)
  }

  return (
    <div className={`flex flex-col h-screen transition-colors duration-300 ${
      isDark ? 'bg-gray-950' : 'bg-gray-50'
    }`}>

      {/* ── HEADER ── */}
      <header className={`flex items-center justify-between px-4 py-3 bg-gradient-to-r ${theme.headerBg} shadow-lg`}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-xl bg-white/20 hover:bg-white/30 transition-colors text-white"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="text-3xl">{theme.avatar}</div>
          <div>
            <div className="font-display font-bold text-white text-lg leading-tight">
              {theme.label}
            </div>
            <div className="text-white/80 text-xs">{theme.tagline}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Voice toggle */}
          <button
            onClick={handleVoiceToggle}
            title={voiceEnabled ? 'Voice on' : 'Voice off'}
            className="p-2 rounded-xl bg-white/20 hover:bg-white/30 transition-colors text-white"
          >
            {voiceEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>

          {/* History */}
          <button
            onClick={() => navigate('/history')}
            className="p-2 rounded-xl bg-white/20 hover:bg-white/30 transition-colors text-white"
          >
            <History size={18} />
          </button>

          {/* Dark mode */}
          <button
            onClick={toggle}
            className="p-2 rounded-xl bg-white/20 hover:bg-white/30 transition-colors text-white"
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      {/* ── CHAT MESSAGES ── */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 chat-scroll">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} theme={theme} />
        ))}

        {isLoading && <TypingIndicator theme={theme} relation={relation} />}

        {error && (
          <div className="text-center text-sm text-red-400 bg-red-50 dark:bg-red-950 px-4 py-2 rounded-xl mx-auto max-w-sm">
            {error}
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* ── INPUT AREA ── */}
      <div className={`px-4 py-4 border-t ${theme.border} ${
        isDark ? 'bg-gray-900' : 'bg-white'
      } shadow-lg`}>
        {isListening && (
          <div className="flex items-center justify-center gap-2 mb-3 text-sm font-medium text-red-500">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            Listening... speak now
          </div>
        )}

        <div className="flex items-end gap-3 max-w-3xl mx-auto">
          {/* Mic button */}
          {isSupported && (
            <button
              onClick={handleMicToggle}
              className={`flex-shrink-0 p-3 rounded-2xl transition-all duration-200 font-medium
                ${isListening
                  ? 'bg-red-500 text-white animate-pulse scale-110'
                  : `${theme.button} opacity-80 hover:opacity-100`
                }`}
              title={isListening ? 'Stop listening' : 'Start voice input'}
            >
              {isListening ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
          )}

          {/* Text input */}
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Message your ${relation}...`}
              rows={1}
              disabled={isLoading}
              className={`w-full resize-none rounded-2xl px-4 py-3 text-sm
                border-2 ${theme.border} outline-none
                bg-gray-50 dark:bg-gray-800
                text-gray-900 dark:text-gray-100
                placeholder-gray-400 dark:placeholder-gray-500
                transition-all duration-200
                focus:ring-2 ${theme.inputFocus} focus:ring-offset-0
                disabled:opacity-60 disabled:cursor-not-allowed
                max-h-32 overflow-y-auto
              `}
              style={{ lineHeight: '1.5' }}
            />
          </div>

          {/* Send button */}
          <button
            onClick={() => handleSend()}
            disabled={isLoading || !input.trim()}
            className={`flex-shrink-0 p-3 rounded-2xl transition-all duration-200 font-medium
              ${theme.button} disabled:opacity-40 disabled:cursor-not-allowed
              hover:scale-105 active:scale-95 shadow-md`}
          >
            <Send size={20} />
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-2">
          Press Enter to send • Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}
