// ─── modules/socket.js — Real-time Socket.IO Connection ─────────────────────
import { SOCKET_URL } from '../config.js';

let _socket = null;
let _socketConnected = false;

export function initSocket(userId) {
  if (!userId) return;
  if (_socket && _socketConnected) return;
  if (typeof io === 'undefined') return;

  _socket = io(SOCKET_URL, {
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
  });

  _socket.on('connect', () => {
    if (!_socketConnected) {
      _socket.emit('join', userId);
      _socketConnected = true;
    }
  });
  _socket.on('disconnect', () => { _socketConnected = false; });
  _socket.on('connect_error', (err) => {
    console.warn('Socket error (real-time disabled):', err.message);
  });
}

export function listenToNotifications(cb)    { if (_socket) _socket.on('new-notification',  cb); }
export function listenToNotificationRead(cb) { if (_socket) _socket.on('notification-read',  cb); }
export function listenToFeedbackAssigned(cb) { if (_socket) _socket.on('feedback-assigned',  cb); }
export function listenToFeedbackResolved(cb) { if (_socket) _socket.on('feedback-resolved',  cb); }
export function listenToNewFeedback(cb)      { if (_socket) _socket.on('new-feedback',        cb); }

export function disconnectSocket() {
  if (_socket) { _socket.disconnect(); _socket = null; _socketConnected = false; }
}
