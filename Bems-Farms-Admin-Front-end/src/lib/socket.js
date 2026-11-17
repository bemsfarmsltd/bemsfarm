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

function getCurrentUserMeta() {
  const token = localStorage.getItem('admin_token') || ''
  let role = 'guest'
  try {
    const userStr = localStorage.getItem('admin_user')
    if (userStr) {
      const u = JSON.parse(userStr)
      if (u.role) role = String(u.role).toLowerCase().trim()
    }
  } catch (_) {}
  return { token, role }
}

export function getSocket() {
  const { token, role } = getCurrentUserMeta()
  if (socket) {
    if ((socket.auth?.token || '') !== token) {
      refreshSocketAuth()
    }
    return socket
  }

  const host = getSocketHost()

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
      token,
    },
    auth: {
      token,
    },
  })

  socket.on('connect', () => {
    const { role: currentRole } = getCurrentUserMeta()
    socket.emit('join_room', `role_${currentRole}`)
    if (['superadmin', 'admin', 'manager'].includes(currentRole)) {
      socket.emit('join_room', 'admin_room')
    }
  })

  socket.on('connect_error', (err) => {
    console.warn('[Socket.io] Realtime connection fallback to polling:', err.message)
  })

  return socket
}

export function refreshSocketAuth() {
  if (!socket) return null
  const { token, role } = getCurrentUserMeta()
  socket.auth = { token }
  if (socket.io?.opts) {
    socket.io.opts.query = { role, token }
  }
  if (socket.connected) {
    socket.disconnect()
  }
  socket.connect()
  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
