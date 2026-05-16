// ─── modules/staffDetail.js — Staff Detail Screen ────────────────────────────
import { state }                                from '../config.js';
import { apiFetch }                             from '../utils/api.js';
import { getInitials, formatDate }              from '../utils/helpers.js';
import { getStaffColour }                       from './staffScreen.js';  // single source of truth

// ─── Week boundary helper ─────────────────────────────────────────────────────
function startOfThisWeek() {
  const now  = new Date();
  const day  = now.getDay(); // 0 = Sunday
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
  const mon  = new Date(now.setDate(diff));
  mon.setHours(0, 0, 0, 0);
  return mon.getTime();
}

// ─── Open Staff Detail ────────────────────────────────────────────────────────
export async function openStaffDetail(staffId) {
  const staff = state.staffList.find(s => (s._id || s.id) === staffId);
  if (!staff) return;

  // Deterministic — same name always gives same colour
  const av = getStaffColour(staff.fullname);

  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const detailScreen = document.getElementById('screen-staff-detail');
  if (detailScreen) {
    detailScreen.classList.add('active');
    window.scrollTo(0, 0);
  }

  renderStaffDetailHeader(staff, av);
  await loadStaffFeedback(staff, av);
}

// ─── Render hero header ───────────────────────────────────────────────────────
function renderStaffDetailHeader(staff, av) {
  const initials  = getInitials(staff.fullname);
  const joinedStr = staff.createdAt
    ? `Added ${new Date(staff.createdAt).toLocaleDateString('en-NG', { month: 'short', year: 'numeric' })}`
    : 'Staff member';

  const avatarEl = document.getElementById('sd-avatar');
  avatarEl.textContent = initials;
  // Avatar uses the same bg/text as the list card icon
  avatarEl.style.background = av.bg;
  avatarEl.style.color      = av.text;
  // Hero header tinted to match
  const heroEl = document.getElementById('sd-hero');
  if (heroEl) heroEl.style.background = `color-mix(in srgb, ${av.text} 88%, #000)`;

  document.getElementById('sd-name').textContent      = staff.fullname;
  document.getElementById('sd-meta').textContent      = `${staff.role || 'Staff'} · ${joinedStr}`;
  document.getElementById('sd-firstname').textContent = staff.fullname.split(' ')[0].toUpperCase();

  document.getElementById('sd-badges').innerHTML = `<span class="sd-badge">Loading…</span>`;
}

// ─── Load and process feedback for this staff member ─────────────────────────
async function loadStaffFeedback(staff, av) {
  let allComplaints  = [];
  let allCompliments = [];
  let allSuggestions = [];

  try {
    const [cData, cmData, sData] = await Promise.all([
      apiFetch('/feedbacks/complaints').catch(() => ({ complaints: [] })),
      apiFetch('/feedbacks/compliments').catch(() => ({ compliments: [] })),
      apiFetch('/feedbacks/suggestions').catch(() => ({ suggestions: [] })),
    ]);

    allComplaints  = cData.complaints  || cData.feedbacks   || [];
    allCompliments = cmData.compliments || [];
    allSuggestions = sData.suggestions  || [];
  } catch (err) {
    console.error('loadStaffFeedback error:', err.message);
  }

  const name      = staff.fullname.toLowerCase();
  const firstName = name.split(' ')[0];

  // Filter feedback that mentions this staff member by name
  const mentionsStaff = (item) => {
    const msg = (item.message || '').toLowerCase();
    return msg.includes(firstName) || msg.includes(name) ||
           (item.assignedTo && (item.assignedTo === (staff._id || staff.id)));
  };

  const relatedComplaints  = allComplaints.filter(mentionsStaff);
  const relatedCompliments = allCompliments.filter(mentionsStaff);
  const relatedSuggestions = allSuggestions.filter(mentionsStaff);

  // This-week slices
  const weekStart = startOfThisWeek();
  const thisWeek  = (arr) => arr.filter(i => new Date(i.createdAt).getTime() >= weekStart);

  const weekComplaints  = thisWeek(relatedComplaints);
  const weekCompliments = thisWeek(relatedCompliments);
  const weekSuggestions = thisWeek(relatedSuggestions);

  renderStaffDetailStats(staff, weekComplaints, weekCompliments, weekSuggestions, allComplaints, av);
  renderRecentFeedback(relatedComplaints, relatedCompliments);
}

// ─── Render perf stats + bars + attention banner ──────────────────────────────
function renderStaffDetailStats(staff, weekComps, weekComplis, weekSuggs, allComplaints, av) {
  const compCount  = weekComps.length;
  const compliCount = weekComplis.length;
  const suggCount  = weekSuggs.length;

  document.getElementById('sd-comp-count').textContent  = compCount;
  document.getElementById('sd-compli-count').textContent = compliCount;
  document.getElementById('sd-sugg-count').textContent  = suggCount;

  // Bar chart — max scale across both bars
  const maxBar = Math.max(compCount, compliCount, 1);

  const compPct  = Math.round((compCount  / maxBar) * 100);
  const compliPct = Math.round((compliCount / maxBar) * 100);

  document.getElementById('sd-bar-list').innerHTML = `
    <div class="sd-bar-row">
      <span class="sd-bar-icon">😤</span>
      <div class="sd-bar-track">
        <div class="sd-bar-fill" style="width:${compPct}%;background:${av.text}"></div>
      </div>
      <span class="sd-bar-count">${compCount}</span>
    </div>
    <div class="sd-bar-row">
      <span class="sd-bar-icon">😊</span>
      <div class="sd-bar-track">
        <div class="sd-bar-fill" style="width:${compliPct}%;background:${av.text};opacity:0.5"></div>
      </div>
      <span class="sd-bar-count">${compliCount}</span>
    </div>`;

  // Compute team average complaints this week
  const allWeekComps = allComplaints.filter(c => {
    const ts = new Date(c.createdAt).getTime();
    return ts >= startOfThisWeek();
  });
  const teamAvg = state.staffList.length > 0
    ? (allWeekComps.length / state.staffList.length)
    : 0;

  // Attention logic
  const attBox  = document.getElementById('sd-attention-box');
  const attDesc = document.getElementById('sd-attention-desc');
  const badgesEl = document.getElementById('sd-badges');

  const isHighComplaints = compCount >= 5 || (teamAvg > 0 && compCount > teamAvg * 2.5);

  if (isHighComplaints) {
    attBox.classList.remove('hidden');
    const multiplier = teamAvg > 0 ? `${Math.round(compCount / teamAvg)}x the team average. ` : '';
    attDesc.textContent = `${staff.fullname.split(' ')[0]} has ${compCount} complaint${compCount !== 1 ? 's' : ''} this week — ${multiplier}Review recent feedback below.`;

    badgesEl.innerHTML = `
      <span class="sd-badge attention">⚠ Needs Attention</span>
      <span class="sd-badge">${compCount} Complaint${compCount !== 1 ? 's' : ''}</span>
      ${compliCount > 0 ? `<span class="sd-badge green">${compliCount} Compliment${compliCount !== 1 ? 's' : ''}</span>` : ''}`;
  } else {
    attBox.classList.add('hidden');
    badgesEl.innerHTML = `
      ${compCount > 0 ? `<span class="sd-badge">${compCount} Complaint${compCount !== 1 ? 's' : ''}</span>` : ''}
      ${compliCount > 0 ? `<span class="sd-badge green">${compliCount} Compliment${compliCount !== 1 ? 's' : ''}</span>` : ''}
      ${compCount === 0 && compliCount === 0 ? '<span class="sd-badge green">✓ All clear this week</span>' : ''}`;
  }
}

// ─── Render recent feedback list ──────────────────────────────────────────────
function renderRecentFeedback(complaints, compliments) {
  const el = document.getElementById('sd-feedback-list');
  if (!el) return;

  // Merge and sort most recent first, cap at 10
  const merged = [
    ...complaints.map(c  => ({ ...c, _feedType: 'complaint'  })),
    ...compliments.map(c => ({ ...c, _feedType: 'compliment' })),
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 10);

  if (merged.length === 0) {
    el.innerHTML = `
      <div class="empty-state" style="padding:16px 0;">
        <p class="empty-icon" style="font-size:28px;">💬</p>
        <p class="empty-title" style="font-size:15px;">No feedback found</p>
        <p class="empty-desc">No recent feedback mentions this staff member.</p>
      </div>`;
    return;
  }

  el.innerHTML = merged.map(item => {
    const isComplaint  = item._feedType === 'complaint';
    const dotColour    = isComplaint ? 'var(--orange)' : 'var(--green)';
    const typeLabel    = isComplaint ? 'Complaint' : 'Compliment';
    const catName      = ((item.category || item.type || typeLabel)).replace('_', ' ');
    const catDisplay   = catName.charAt(0).toUpperCase() + catName.slice(1);
    const timeStr      = formatDate(item.createdAt);
    const sourceIcon   = item.source === 'whatsapp' ? '📱' : '📋';
    const msg          = (item.message || '').slice(0, 120) + (item.message?.length > 120 ? '…' : '');

    return `
    <div class="sd-feedback-item" onclick="App.openComplaint('${item._id}')">
      <span class="sd-feedback-dot" style="background:${dotColour}"></span>
      <div class="sd-feedback-body">
        <p class="sd-feedback-msg">${msg}</p>
        <div class="sd-feedback-meta">
          <span class="sd-feedback-cat">${catDisplay}</span>
          <span>${sourceIcon} ${typeLabel} · ${timeStr}</span>
        </div>
      </div>
    </div>`;
  }).join('');
}
