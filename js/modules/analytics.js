// ─── modules/analytics.js — Analytics Data & Rendering ──────────────────────
import { state }                from '../config.js';
import { apiFetch }             from '../utils/api.js';
import { getInitials, getCategoryBarColor } from '../utils/helpers.js';

// ─── Filter Button Handler ────────────────────────────────────────────────────
export async function setAnalyticsFilter(filter, btn) {
  document.querySelectorAll('[data-afilter]').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  await loadAnalyticsData(filter);
}

// ─── Load & Filter Analytics Data ────────────────────────────────────────────
export async function loadAnalyticsData(filter = 'all') {
  try {
    const data = await apiFetch('/feedbacks/complaints');
    let complaints = data.complaints || [];

    const now = Date.now();
    if (filter === 'today') {
      complaints = complaints.filter(c =>
        new Date(c.createdAt).toDateString() === new Date().toDateString()
      );
    } else if (filter === 'week') {
      const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
      complaints = complaints.filter(c => new Date(c.createdAt).getTime() >= weekAgo);
    } else if (filter === 'month') {
      const monthAgo = now - 30 * 24 * 60 * 60 * 1000;
      complaints = complaints.filter(c => new Date(c.createdAt).getTime() >= monthAgo);
    }
    // 'all' — no filter applied

    renderAnalytics(complaints);
  } catch (e) {
    console.error('loadAnalyticsData error:', e.message);
    renderAnalytics([]);
  }
}

// ─── Render Analytics ────────────────────────────────────────────────────────
export function renderAnalytics(complaints = state.complaints) {
  const total    = complaints.length;
  const resolved = complaints.filter(c => c.status === 'resolved').length;
  const overdue  = complaints.filter(c =>
    c.status === 'open' && c.createdAt &&
    (Date.now() - new Date(c.createdAt)) > 86400000
  ).length;
  const rate = total > 0 ? Math.round((resolved / total) * 100) : 0;

  // Summary cards
  document.getElementById('a-total').textContent       = total > 0 ? total : '—';
  document.getElementById('a-total-sub').textContent   = total > 0 ? 'complaints recorded' : 'No data yet';
  document.getElementById('a-rate').textContent        = total > 0 ? `${rate}%` : '—';
  document.getElementById('a-rate-sub').textContent    = total > 0 ? '↑ resolution rate' : 'No data yet';
  document.getElementById('a-avg').textContent         = '—';
  document.getElementById('a-avg-sub').textContent     = 'Target: <60min';
  document.getElementById('a-overdue').textContent     = total > 0 ? overdue : '—';
  document.getElementById('a-overdue-sub').textContent = overdue > 0
    ? 'Need attention'
    : (total > 0 ? 'All good ✓' : 'No data yet');

  // Category bars
  const catCounts = {};
  complaints.forEach(c => {
    const key   = (c.category || c.type || 'other').replace('_', ' ');
    const label = key.charAt(0).toUpperCase() + key.slice(1);
    catCounts[label] = (catCounts[label] || 0) + 1;
  });
  const cats     = Object.entries(catCounts).sort((a, b) => b[1] - a[1]);
  const maxCount = cats[0]?.[1] || 1;
  const catEl    = document.getElementById('category-bars');
  catEl.innerHTML = cats.length === 0
    ? '<div class="empty-state" style="padding:16px 0;"><p class="empty-desc">No data yet</p></div>'
    : cats.map(([cat, count]) => `
        <div class="cat-bar-row">
          <span class="cat-bar-name">${cat}</span>
          <div class="cat-bar-track">
            <div class="cat-bar-fill" style="width:${(count / maxCount) * 100}%;background:${getCategoryBarColor(cat)}"></div>
          </div>
          <span class="cat-bar-count">${count}</span>
        </div>`).join('');

  // Resolution rate bar
  document.getElementById('res-fill').style.width      = `${rate}%`;
  document.getElementById('res-pct-label').textContent  = `${rate}%`;
  document.getElementById('res-mid-label').textContent  = total > 0
    ? `${resolved} of ${total} resolved`
    : '0 of 0 resolved';

  // Staff complaint count
  const staffCounts = {};
  complaints.forEach(c => {
    if (c.assignedTo) {
      const name = typeof c.assignedTo === 'object'
        ? c.assignedTo.fullname
        : state.staffList.find(s => (s._id || s.id) === c.assignedTo)?.fullname || c.assignedTo;
      if (name) staffCounts[name] = (staffCounts[name] || 0) + 1;
    }
  });

  const staffEntries = Object.entries(staffCounts).sort((a, b) => b[1] - a[1]);
  const staffEl      = document.getElementById('staff-complaint-list');

  if (staffEntries.length === 0) {
    staffEl.innerHTML = state.staffList.length === 0
      ? '<div class="empty-state" style="padding:16px 0;"><p class="empty-desc">No staff complaint data yet</p></div>'
      : state.staffList.map(s => `
          <div class="staff-complaint-item">
            <div class="staff-avatar">${getInitials(s.fullname)}</div>
            <div class="staff-info">
              <p class="staff-name">${s.fullname}</p>
              <p class="staff-role">${s.role}</p>
            </div>
            <span class="staff-complaint-count low">0</span>
          </div>`).join('');
  } else {
    staffEl.innerHTML = staffEntries.map(([name, count]) => {
      const s   = state.staffList.find(x => x.fullname === name || (x._id || x.id) === name) || { role: '' };
      const cls = count >= 4 ? 'high' : count >= 2 ? 'mid' : 'low';
      return `
        <div class="staff-complaint-item">
          <div class="staff-avatar">${getInitials(name)}</div>
          <div class="staff-info">
            <p class="staff-name">${name}</p>
            <p class="staff-role">${s.role}</p>
          </div>
          <span class="staff-complaint-count ${cls}">${count}</span>
        </div>`;
    }).join('');
  }
}
