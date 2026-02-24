/**
 * pages/HomePage.jsx - Landing page with relation selection cards
 */
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Moon, Sun, History, Heart } from 'lucide-react'
import { RELATION_THEMES } from '../relationThemes'
import { useTheme } from '../App'

export default function HomePage() {
  const navigate = useNavigate()
  const { isDark, toggle } = useTheme()
  const [hoveredCard, setHoveredCard] = useState(null)

  const handleSelectRelation = (relation) => {
    navigate(`/chat/${relation}`)
  }

  return (
    <div className={`min-h-screen transition-colors duration-500 ${
      isDark
        ? 'bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950'
        : 'bg-gradient-to-br from-rose-50 via-purple-50 to-blue-50'
    }`}>

      {/* Header */}
      <header className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <Heart className="text-rose-400 fill-rose-400" size={28} />
          <span className="font-display text-xl font-bold text-gray-800 dark:text-gray-100">
            Family Companion AI
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/history')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium
              text-gray-600 dark:text-gray-300 hover:bg-white/60 dark:hover:bg-white/10
              border border-gray-200 dark:border-gray-700 transition-all duration-200"
          >
            <History size={16} />
            History
          </button>
          <button
            onClick={toggle}
            className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700
              hover:bg-white/60 dark:hover:bg-white/10 transition-all duration-200"
            aria-label="Toggle dark mode"
          >
            {isDark ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-gray-600" />}
          </button>
        </div>
      </header>

      {/* Hero */}
      <main className="max-w-5xl mx-auto px-6 pt-10 pb-20">
        <div className="text-center mb-14 animate-fade-in">
          <div className="text-6xl mb-4 animate-float">🏡</div>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4 leading-tight">
            Talk to Someone Who{' '}
            <span className="italic text-rose-500 dark:text-rose-400">Truly</span> Cares
          </h1>
          <p className="text-lg text-gray-500 dark:text-gray-400 max-w-xl mx-auto leading-relaxed">
            Choose a family member and experience a conversation filled with real warmth,
            genuine support, and love that feels just like home.
          </p>
        </div>

        {/* Relation Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {Object.values(RELATION_THEMES).map((theme, index) => (
            <RelationCard
              key={theme.id}
              theme={theme}
              isHovered={hoveredCard === theme.id}
              onHover={() => setHoveredCard(theme.id)}
              onLeave={() => setHoveredCard(null)}
              onClick={() => handleSelectRelation(theme.id)}
              delay={index * 80}
            />
          ))}
        </div>

        {/* Footer note */}
        <p className="text-center text-sm text-gray-400 dark:text-gray-600 mt-12">
          Powered by AI • Designed with ❤️ for your emotional wellbeing
        </p>
      </main>
    </div>
  )
}

function RelationCard({ theme, isHovered, onHover, onLeave, onClick, delay }) {
  return (
    <button
      onClick={onClick}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      className={`
        relative overflow-hidden text-left rounded-3xl border-2 p-6 cursor-pointer
        bg-gradient-to-br ${theme.card}
        transition-all duration-300 ease-out
        ${isHovered ? 'scale-105 shadow-2xl border-opacity-60' : 'scale-100 shadow-md'}
        animate-slide-up
      `}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Background glow */}
      <div
        className={`absolute inset-0 opacity-0 transition-opacity duration-300
          bg-gradient-to-br ${theme.gradient}
          ${isHovered ? 'opacity-20' : ''}`}
      />

      {/* Emoji badge */}
      <div className="text-4xl mb-3 transition-transform duration-300"
        style={{ transform: isHovered ? 'scale(1.2) rotate(-5deg)' : 'scale(1)' }}>
        {theme.avatar}
      </div>

      <div className={`text-xs font-bold uppercase tracking-widest mb-1 ${theme.accent}`}>
        {theme.emoji} {theme.label}
      </div>

      <h3 className="font-display text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">
        {theme.tagline}
      </h3>

      <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
        {theme.description}
      </p>

      {/* Arrow */}
      <div className={`mt-5 flex items-center gap-1 text-sm font-semibold ${theme.accent}
        transition-all duration-200 ${isHovered ? 'translate-x-1' : ''}`}>
        Chat now
        <span className="text-base">→</span>
      </div>

      {/* Decorative circle */}
      <div
        className={`absolute -bottom-4 -right-4 w-20 h-20 rounded-full opacity-20
          bg-gradient-to-br ${theme.gradient}
          transition-transform duration-300 ${isHovered ? 'scale-150' : 'scale-100'}`}
      />
    </button>
  )
}
