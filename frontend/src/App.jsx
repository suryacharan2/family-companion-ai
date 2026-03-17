import React, { useState, createContext, useContext } from 'react'
import MemoryPage from './pages/MemoryPage'
import { Routes, Route, Navigate } from 'react-router-dom'
import HomePage from './pages/HomePage'
import ChatPage from './pages/ChatPage'
import HistoryPage from './pages/HistoryPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import VoiceSetupPage from './pages/VoiceSetupPage'
import ProfilePage from './pages/ProfilePage'

const ThemeContext = createContext({})
export const useTheme = () => useContext(ThemeContext)

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token')
  if (!token) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  const [isDark, setIsDark] = useState(false)
  const toggle = () => setIsDark(d => !d)

  return (
    <ThemeContext.Provider value={{ isDark, toggle }}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
        <Route path="/chat/:relation" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
        <Route path="/voice-setup/:relation" element={<ProtectedRoute><VoiceSetupPage /></ProtectedRoute>} />
        <Route path="/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
        <Route path="/memory" element={<ProtectedRoute><MemoryPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      </Routes>
    </ThemeContext.Provider>
  )
}
