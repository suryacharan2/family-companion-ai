/**
 * pages/HistoryPage.jsx - View and filter conversation history
 */
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Moon, Sun, RefreshCw, MessageSquare } from 'lucide-react'
import { getHistory } from '../api'
import { RELATION_THEMES, EMOTION_LABELS } from '../relationThemes'
import { useTheme } from '../App'

export default function HistoryPage() {
  const navigate = useNavigate()
  const { isDark, toggle } = useTheme()

  const [conversations, setConversations] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [filterRelation, setFilterRelation] = useState('')

  const fetchHistory = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getHistory({
        relation_type: filterRelation || undefined,
        limit: 100
      })
      setConversations(data.conversations)
      setTotal(data.total)
    } catch (err) {
      setError('Could not load history. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHistory()
  }, [filterRelation])

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDark ? 'bg-gray-950' : 'bg-gray-50'
    }`}>
      {/* Header */}
      <header className={`flex items-center justify-between px-6 py-4 border-b
        ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'} shadow-sm`}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft size={18} className="text-gray-600 dark:text-gray-300" />
          </button>
          <div>
            <h1 className="font-display font-bold text-lg text-gray-900 dark:text-white">
              Conversation History
            </h1>
            <p className="text-xs text-gray-400">{total} total conversations</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchHistory}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={17} className={`text-gray-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={toggle}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {isDark ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-gray-500" />}
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {/* Filter tabs */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          {['', 'mother', 'father', 'brother', 'sister'].map((rel) => {
            const theme = RELATION_THEMES[rel]
            return (
              <button
                key={rel}
                onClick={() => setFilterRelation(rel)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 border-2
                  ${filterRelation === rel
                    ? rel
                      ? `bg-gradient-to-r ${theme?.headerBg} text-white border-transparent shadow-md`
                      : 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-transparent'
                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300'
                  }`}
              >
                {rel ? `${RELATION_THEMES[rel].emoji} ${RELATION_THEMES[rel].label}` : '🗂️ All'}
              </button>
            )
          })}
        </div>

        {/* Content */}
        {error && (
          <div className="text-center text-red-400 bg-red-50 dark:bg-red-950 rounded-2xl p-6 mb-4">
            {error}
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-20 gap-3 text-gray-400">
            <RefreshCw className="animate-spin" size={20} />
            Loading conversations...
          </div>
        )}

        {!loading && conversations.length === 0 && !error && (
          <div className="text-center py-20">
            <MessageSquare size={40} className="mx-auto text-gray-300 dark:text-gray-700 mb-3" />
            <p className="text-gray-400 dark:text-gray-600">No conversations yet.</p>
            <button
              onClick={() => navigate('/')}
              className="mt-4 px-5 py-2 rounded-xl bg-rose-500 text-white text-sm font-medium hover:bg-rose-600"
            >
              Start chatting →
            </button>
          </div>
        )}

        <div className="space-y-4">
          {conversations.map((conv) => {
            const theme = RELATION_THEMES[conv.relation_type]
            return (
              <div
                key={conv.id}
                className={`rounded-2xl border-2 overflow-hidden ${theme?.border || ''} 
                  bg-white dark:bg-gray-900 shadow-sm animate-slide-up`}
              >
                {/* Card header */}
                <div className={`px-4 py-2 bg-gradient-to-r ${theme?.headerBg} flex items-center justify-between`}>
                  <span className="text-white text-sm font-semibold">
                    {theme?.avatar} {theme?.label}
                  </span>
                  <div className="flex items-center gap-2">
                    {conv.emotion && conv.emotion !== 'neutral' && (
                      <span className="text-sm">{EMOTION_LABELS[conv.emotion]}</span>
                    )}
                    <span className="text-white/70 text-xs">
                      {conv.timestamp ? new Date(conv.timestamp).toLocaleDateString() : ''}
                    </span>
                  </div>
                </div>

                {/* Message */}
                <div className="px-4 pt-3 pb-2">
                  <div className="flex gap-2 mb-2">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wide w-12 flex-shrink-0">You</span>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{conv.message}</p>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-xs font-bold uppercase tracking-wide w-12 flex-shrink-0" style={{ color: theme?.hex }}>
                      {conv.relation_type}
                    </span>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{conv.response}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
