/* ═══════════════════════════════════════
   GUESTPULSE — socket.js
   Real-time connection via Socket.io
   Handles live notifications, complaint
   updates and feedback events
═══════════════════════════════════════ */

const SOCKET_URL = 'https://guestpulse-1t6f.onrender.com'; // ← update to match API base URL when backend deploys

let socket = null;
let isConnected = false;

// ─── Initialize Socket ────────────────────────────────────────
// Called after login with the logged-in user's ID
export function initSocket(userId) {
  if (!userId) return;

  // Don't create duplicate connections
  if (socket && isConnected) return;

  socket = io(SOCKET_URL, {
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
  });

  socket.on('connect', () => {
    console.log('GuestPulse socket connected:', socket.id);
    if (!isConnected) {
      socket.emit('join', userId);
      isConnected = true;
    }
  });

  socket.on('disconnect', (reason) => {
    console.log('GuestPulse socket disconnected:', reason);
    isConnected = false;
  });

  socket.on('connect_error', (err) => {
    // Fail silently — app still works without real-time
    console.warn('Socket connection error (real-time disabled):', err.message);
  });
}

// ─── Event Listeners ─────────────────────────────────────────

// Fires when a new notification comes in
export function listenToNotifications(callback) {
  if (!socket) return;
  socket.on('new-notification', callback);
}

// Fires when a notification is marked as read
export function listenToNotificationRead(callback) {
  if (!socket) return;
  socket.on('notification-read', callback);
}

// Fires when a complaint is assigned to a staff member
export function listenToFeedbackAssigned(callback) {
  if (!socket) return;
  socket.on('feedback-assigned', callback);
}

// Fires when a complaint is resolved
export function listenToFeedbackResolved(callback) {
  if (!socket) return;
  socket.on('feedback-resolved', callback);
}

// Fires when a brand new complaint/feedback arrives
export function listenToNewFeedback(callback) {
  if (!socket) return;
  socket.on('new-feedback', callback);
}

// ─── Disconnect ───────────────────────────────────────────────
// Called on logout to cleanly close the connection
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
    isConnected = false;
    console.log('GuestPulse socket disconnected on logout');
  }
}
