/**
 * components/ChatBubble.jsx - Message bubble components
 */
import React from 'react'
import { EMOTION_LABELS } from '../relationThemes'

/**
 * Single chat message bubble
 */
export function MessageBubble({ message, theme }) {
  const isUser = message.role === 'user'
  const time = message.timestamp
    ? new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : ''

  return (
    <div className={`flex items-end gap-2 animate-slide-up ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      {!isUser && (
        <div className="flex-shrink-0 text-2xl w-9 h-9 flex items-center justify-center
          rounded-full bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700">
          {theme.avatar}
        </div>
      )}

      <div className={`flex flex-col gap-1 max-w-[75%] ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Bubble */}
        <div className={`
          px-4 py-3 rounded-3xl text-sm leading-relaxed shadow-sm
          ${isUser
            ? `${theme.userBubble} rounded-br-sm`
            : `${theme.bubble} rounded-bl-sm`
          }
        `}>
          {message.content}
        </div>

        {/* Metadata row */}
        <div className={`flex items-center gap-2 px-1 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
          <span className="text-xs text-gray-400 dark:text-gray-600">{time}</span>
          {!isUser && message.emotion && message.emotion !== 'neutral' && (
            <span className="text-xs" title={`Emotion: ${message.emotion}`}>
              {EMOTION_LABELS[message.emotion] || ''}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Animated typing indicator while AI is generating
 */
export function TypingIndicator({ theme, relation }) {
  return (
    <div className="flex items-end gap-2 animate-fade-in">
      <div className="flex-shrink-0 text-2xl w-9 h-9 flex items-center justify-center
        rounded-full bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700">
        {theme.avatar}
      </div>
      <div className={`px-5 py-4 rounded-3xl rounded-bl-sm ${theme.bubble} shadow-sm`}>
        <div className="flex items-center gap-1">
          <span className={`typing-dot ${theme.dotColor}`} />
          <span className={`typing-dot ${theme.dotColor}`} />
          <span className={`typing-dot ${theme.dotColor}`} />
        </div>
      </div>
    </div>
  )
}
