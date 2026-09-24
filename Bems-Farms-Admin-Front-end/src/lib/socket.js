import { io } from 'socket.io-client'

let socket = null

export function getSocketHost() {
  const envApi = import.meta.env.VITE_API_URL
  if (envApi && envApi.startsWith('http')) {
    // Strip trailing /api or /api/
    return envApi.replace(/\/api\/?$/, '')
  }
  if (import.meta.env.DEV) {
    // In local dev, backend runs on port 5000
    return 'http://localhost:5000'
  }
  // Default production API host
  return 'https://api.bemsfarms.com'
}

export function getSocket() {
  if (socket) return socket

  const host = getSocketHost()
  const token = localStorage.getItem('admin_token')
  let role = 'admin'
  try {
    const userStr = localStorage.getItem('admin_user')
    if (userStr) {
      const u = JSON.parse(userStr)
      if (u.role) role = u.role
    }
  } catch (_) {}

  socket = io(host, {
    transports: ['websocket', 'polling'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
    query: {
      role,
      token: token || '',
    },
    auth: {
      token: token || '',
    },
  })

  socket.on('connect', () => {
    // Join standard admin room
    socket.emit('join_room', 'admin_room')
  })

  socket.on('connect_error', (err) => {
    console.warn('[Socket.io] Realtime connection fallback to polling:', err.message)
  })

  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
