/**
 * App.jsx - Root component with routing and dark mode context
 */
import React, { createContext, useContext } from 'react'
import { Routes, Route } from 'react-router-dom'
import { useDarkMode } from './hooks/useDarkMode'
import HomePage from './pages/HomePage'
import ChatPage from './pages/ChatPage'
import HistoryPage from './pages/HistoryPage'

// Global context for dark mode
export const ThemeContext = createContext({})
export const useTheme = () => useContext(ThemeContext)

export default function App() {
  const darkMode = useDarkMode()

  return (
    <ThemeContext.Provider value={darkMode}>
      <div className="min-h-screen font-body transition-colors duration-300">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/chat/:relation" element={<ChatPage />} />
          <Route path="/history" element={<HistoryPage />} />
        </Routes>
      </div>
    </ThemeContext.Provider>
  )
}
