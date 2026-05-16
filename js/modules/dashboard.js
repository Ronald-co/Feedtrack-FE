// ─── modules/dashboard.js — Dashboard, Feed Switcher & Socket Listeners ──────
import { state }                    from '../config.js';
import { apiFetch }                 from '../utils/api.js';
import { goTo, getTodayString, getCategoryClass, formatDate, showToast } from '../utils/helpers.js';
import { fetchStaff }               from './staff.js';
import {
  initSocket,
  listenToNewFeedback,
  listenToNotifications,
  listenToNotificationRead,
  listenToFeedbackAssigned,
  listenToFeedbackResolved,
} from './socket.js';
// Lazy import to break circular dep: dashboard ↔ complaints
const getComplaints = () => import('./complaints.js');

// ─── Go to Dashboard ─────────────────────────────────────────────────────────
export function goToDashboard() {
  state.activeFeedType = 'complaints';
  document.getElementById('dash-date').textContent = getTodayString();
  if (state.user?._id) startSocketListeners(state.user._id);
  const sel = document.getElementById('feed-type-select');
  if (sel) sel.value = 'complaints';
  document.getElementById('complaint-filter-tabs').style.display = '';
  document.getElementById('dash-stats').style.display = '';
  goTo('screen-dashboard');
  loadComplaints();
  fetchStaff();
}

// ─── Socket Listeners ────────────────────────────────────────────────────────
export function startSocketListeners(userId) {
  initSocket(userId);

  listenToNewFeedback((data) => {
    if (data?.feedback) {
      state.complaints.unshift(data.feedback);
      renderComplaints(state.complaints);
      updateStats();
      showToast('📋 New feedback just came in!');
    } else {
      loadComplaints();
    }
  });

  listenToNotifications((data) =>
    showToast('🔔 ' + (data.message || 'New notification'))
  );

  listenToNotificationRead(() => {});

  listenToFeedbackAssigned(async (data) => {
    if (data?.feedbackId && state.currentComplaint?._id === data.feedbackId) {
      state.currentComplaint.assignedStaff = data.staffName;
      state.currentComplaint.status = 'in-progress';
      const { renderComplaintDetail } = await getComplaints();
      renderComplaintDetail(state.currentComplaint);
    }
    loadComplaints();
    showToast('👤 Complaint assigned to ' + (data.staffName || 'staff'));
  });

  listenToFeedbackResolved(async (data) => {
    if (data?.feedbackId && state.currentComplaint?._id === data.feedbackId) {
      state.currentComplaint.status = 'resolved';
      const { renderComplaintDetail } = await getComplaints();
      renderComplaintDetail(state.currentComplaint);
    }
    loadComplaints();
    showToast('✅ A complaint has been resolved');
  });
}

// ─── Load Complaints ──────────────────────────────────────────────────────────
export async function loadComplaints() {
  if (state.activeFeedType !== 'complaints') return;

  const bizId = state.business?._id;
  if (!bizId || bizId.startsWith('local-')) { renderComplaints([]); return; }

  try {
    const filter = state.activeFilter;
    const path = filter === 'all'
      ? '/feedbacks/complaints'
      : `/feedbacks/complaints/${filter}`;
    const data = await apiFetch(path);
    state.complaints = data.complaints || data.feedbacks || [];
    renderComplaints(state.complaints);
    updateStats();
  } catch (e) {
    console.error('loadComplaints error:', e.message);
    renderComplaints([]);
  }
}

// ─── Stats ────────────────────────────────────────────────────────────────────
export function updateStats() {
  const all   = state.complaints;
  const total = all.length;
  const open  = all.filter(c => c.status === 'open').length;
  const prog  = all.filter(c => c.status === 'in-progress').length;
  const res   = all.filter(c => c.status === 'resolved').length;
  document.getElementById('stat-total').textContent    = total > 0 ? total : '—';
  document.getElementById('stat-open').textContent     = total > 0 ? open  : '—';
  document.getElementById('stat-progress').textContent = total > 0 ? prog  : '—';
  document.getElementById('stat-resolved').textContent = total > 0 ? res   : '—';
}

// ─── Render Complaints List ───────────────────────────────────────────────────
export function renderComplaints(list) {
  if (state.activeFeedType !== 'complaints') return;

  const el = document.getElementById('complaints-list');
  if (!el) return;
  const search   = document.getElementById('search-input')?.value?.toLowerCase() || '';
  const filtered = search
    ? list.filter(c =>
        (c.message || '').toLowerCase().includes(search) ||
        (c.type    || '').toLowerCase().includes(search))
    : list;

  if (filtered.length === 0) {
    el.innerHTML = `
      <div class="empty-state">
        <p class="empty-icon">📭</p>
        <p class="empty-title">No complaints yet</p>
        <p class="empty-desc">When guests scan your QR code and submit feedback, complaints will appear here.</p>
      </div>`;
    return;
  }

  el.innerHTML = filtered.map(c => {
    const catName   = (c.category || c.type || 'other').replace('_', ' ');
    const catClass  = getCategoryClass(catName);
    const status    = c.status || 'open';
    const isOverdue = status === 'open' && c.createdAt &&
                      (Date.now() - new Date(c.createdAt)) > 86400000;
    const via       = c.source || 'QR Form';
    return `
    <div class="complaint-card ${catClass}" onclick="App.openComplaint('${c._id}')">
      <div class="card-top">
        <span class="cat-badge">${catName.toUpperCase()}</span>
        <span class="status-badge ${status}">
          ${status === 'in-progress' ? 'In Progress' : status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
        ${isOverdue ? '<span class="overdue-badge">OVERDUE</span>' : ''}
      </div>
      <p class="card-msg">${c.message || ''}</p>
      <div class="card-bottom">
        <span class="card-meta">
          ${via === 'whatsapp' ? '📱 WhatsApp' : '📋 QR Form'} · ${formatDate(c.createdAt)}
        </span>
        <span class="card-view">View →</span>
      </div>
    </div>`;
  }).join('');
}

// ─── Search & Filter ──────────────────────────────────────────────────────────
export function filterComplaints() { renderComplaints(state.complaints); }

export function setFilter(filter, btn) {
  state.activeFilter = filter;
  document.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  loadComplaints();
}

// ─── Feed Type Switcher (Complaints / Compliments / Suggestions) ──────────────
export async function switchFeedType(type) {
  state.activeFeedType = type;
  const title      = document.getElementById('dash-feed-title');
  const filterTabs = document.getElementById('complaint-filter-tabs');
  const statsRow   = document.getElementById('dash-stats');
  const searchBox  = document.querySelector('.search-box');

  document.getElementById('complaints-list').innerHTML = '';

  if (type === 'complaints') {
    title.textContent        = 'Complaints';
    filterTabs.style.display = '';
    statsRow.style.display   = '';
    searchBox.style.display  = '';
    loadComplaints();

  } else if (type === 'compliments') {
    title.textContent        = 'Compliments';
    filterTabs.style.display = 'none';
    statsRow.style.display   = 'none';
    searchBox.style.display  = '';
    await loadComplimentsOrSuggestions('compliments');

  } else if (type === 'suggestions') {
    title.textContent        = 'Suggestions';
    filterTabs.style.display = 'none';
    statsRow.style.display   = 'none';
    searchBox.style.display  = '';
    await loadComplimentsOrSuggestions('suggestions');
  }
}

async function loadComplimentsOrSuggestions(type) {
  const el = document.getElementById('complaints-list');
  el.innerHTML = `<div class="empty-state"><p class="empty-icon">⏳</p><p class="empty-title">Loading...</p></div>`;
  try {
    const data  = await apiFetch(`/feedbacks/${type}`);
    const items = data.compliments || data.suggestions || [];
    if (items.length === 0) {
      const label = type === 'compliments' ? 'compliments' : 'suggestions';
      el.innerHTML = `
        <div class="empty-state">
          <p class="empty-icon">${type === 'compliments' ? '😊' : '💡'}</p>
          <p class="empty-title">No ${label} yet</p>
          <p class="empty-desc">When guests submit ${label} via your QR code they will appear here.</p>
        </div>`;
      return;
    }
    el.innerHTML = items.map(c => {
      const emoji = type === 'compliments' ? '😊' : '💡';
      const label = type === 'compliments' ? 'Compliment' : 'Suggestion';
      return `
      <div class="complaint-card c-other" style="cursor:default;">
        <div class="card-top">
          <span class="cat-badge">${label.toUpperCase()}</span>
          <span class="status-badge open">${emoji}</span>
        </div>
        <p class="card-msg">${c.message || ''}</p>
        <div class="card-bottom">
          <span class="card-meta">📋 QR Form · ${formatDate(c.createdAt)}</span>
          <span class="card-meta">${c.guestName || 'Anonymous'}</span>
        </div>
      </div>`;
    }).join('');
  } catch (e) {
    el.innerHTML = `<div class="empty-state"><p class="empty-icon">⚠️</p><p class="empty-title">Could not load data</p></div>`;
  }
}
