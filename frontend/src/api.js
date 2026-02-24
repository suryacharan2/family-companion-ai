/**
 * api.js - Centralized API calls to the FastAPI backend
 */
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000, // 30s for AI responses
  headers: { 'Content-Type': 'application/json' },
})

/**
 * Create or retrieve a user session
 * @param {string} name - User's name
 */
export async function createUser(name) {
  const { data } = await api.post('/create-user', { name })
  return data // { id, name, created_at }
}

/**
 * Send a chat message and get AI response
 * @param {Object} params
 * @param {string} params.message - User's message
 * @param {string} params.relation_type - mother | father | brother | sister
 * @param {number|null} params.user_id - Optional user ID
 * @param {Array} params.conversation_history - Prior messages for context
 */
export async function sendMessage({ message, relation_type, user_id = null, conversation_history = [] }) {
  const { data } = await api.post('/chat', {
    message,
    relation_type,
    user_id,
    conversation_history,
  })
  return data // { response, emotion_detected, relation_type, timestamp }
}

/**
 * Get chat history
 * @param {Object} filters
 * @param {number} filters.user_id - Optional user filter
 * @param {string} filters.relation_type - Optional relation filter
 * @param {number} filters.limit - Max results
 * @param {number} filters.offset - Pagination offset
 */
export async function getHistory({ user_id, relation_type, limit = 50, offset = 0 } = {}) {
  const params = { limit, offset }
  if (user_id) params.user_id = user_id
  if (relation_type) params.relation_type = relation_type

  const { data } = await api.get('/history', { params })
  return data // { conversations, total }
}
