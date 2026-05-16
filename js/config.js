// ─── config.js — API URLs & App State ───────────────────────────────────────

export const API = window.location.hostname === 'localhost'
  ? 'http://localhost:5000/api/v1'
  : 'https://feedtrack-be.onrender.com/api/v1';

export const SOCKET_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:5000'
  : 'https://feedtrack-be.onrender.com';

export const state = {
  user:               JSON.parse(localStorage.getItem('gp_user')     || 'null'),
  business:           JSON.parse(localStorage.getItem('gp_business') || 'null'),
  staffList:          [],
  complaints:         [],
  currentComplaint:   null,
  currentStaff:       null,
  activeFilter:       'all',
  feedbackBusinessId: null,
  feedbackType:       'complaint',
  activeFeedType:     'complaints',
};
