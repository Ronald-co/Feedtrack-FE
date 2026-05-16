// ─── modules/staffScreen.js — Dedicated Staff Management Screen ──────────────
import { state }                        from '../config.js';
import { apiFetch }                     from '../utils/api.js';
import { showErr, hideErr, getInitials, showToast } from '../utils/helpers.js';

// ─── Colour palette — 4 options, picked deterministically by name hash ────────
export const STAFF_COLOURS = [
  { bg: 'var(--blue-lt)',   text: 'var(--blue)'   },
  { bg: 'var(--green-lt)',  text: 'var(--green)'  },
  { bg: 'var(--purple-lt)', text: 'var(--purple)' },
  { bg: 'var(--orange-lt)', text: 'var(--orange)' },
];

// Same name → same colour, every time, regardless of list order
export function getStaffColour(fullname) {
  const str  = (fullname || '').toLowerCase().trim();
  let   hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
    hash = hash >>> 0;  // keep unsigned 32-bit
  }
  return STAFF_COLOURS[hash % STAFF_COLOURS.length];
}

// ─── Active filter state ──────────────────────────────────────────────────────
let activeRoleFilter = 'all';

// ─── Navigate to Staff Screen ─────────────────────────────────────────────────
export async function goToStaffScreen() {
  activeRoleFilter = 'all';

  // Reset filter tabs
  document.querySelectorAll('#staff-screen-filter-tabs .filter-tab')
    .forEach(b => b.classList.remove('active'));
  const allTab = document.querySelector('#staff-screen-filter-tabs [data-role="all"]');
  if (allTab) allTab.classList.add('active');

  // Reset search
  const searchEl = document.getElementById('staff-screen-search');
  if (searchEl) searchEl.value = '';

  // Reset nav links
  document.querySelectorAll('.app-topbar .nav-link').forEach(b => b.classList.remove('active'));
  const staffNav = document.querySelector('.nav-link[data-screen="screen-staff"]');
  if (staffNav) staffNav.classList.add('active');

  hideErr('staff-screen-err');

  const screenEls = document.querySelectorAll('.screen');
  screenEls.forEach(s => s.classList.remove('active'));
  const staffScreen = document.getElementById('screen-staff');
  if (staffScreen) {
    staffScreen.classList.add('active');
    window.scrollTo(0, 0);
  }

  await loadStaffScreen();
}

// ─── Load staff from API and render ──────────────────────────────────────────
export async function loadStaffScreen() {
  try {
    const data = await apiFetch('/staff/get-all-staffs');
    state.staffList = data.staffs || [];
  } catch (err) {
    console.error('loadStaffScreen error:', err.message);
    state.staffList = [];
  }
  renderStaffScreen();
  updateStaffStats();
}

// ─── Render the staff list ────────────────────────────────────────────────────
export function renderStaffScreen() {
  const el = document.getElementById('staff-screen-list');
  if (!el) return;

  const search = (document.getElementById('staff-screen-search')?.value || '').toLowerCase().trim();

  let filtered = state.staffList.filter(s => {
    const matchRole   = activeRoleFilter === 'all' ||
                        (s.role || '').toLowerCase() === activeRoleFilter;
    const matchSearch = !search ||
                        (s.fullname || '').toLowerCase().includes(search) ||
                        (s.role    || '').toLowerCase().includes(search);
    return matchRole && matchSearch;
  });

  if (filtered.length === 0) {
    el.innerHTML = `
      <div class="empty-state">
        <p class="empty-icon">👥</p>
        <p class="empty-title">No staff found</p>
        <p class="empty-desc">${search || activeRoleFilter !== 'all'
          ? 'Try a different filter or search term.'
          : 'Add your first staff member below.'}</p>
      </div>`;
    return;
  }

  el.innerHTML = filtered.map((s, i) => {
    const sid        = s._id || s.id;
    const initials   = getInitials(s.fullname);
    const colour     = getStaffColour(s.fullname);  // one source of truth
    const complaints = s.complaintCount || 0;

    let perfDot = '';
    if (complaints === 0) {
      perfDot = `<span class="staff-perf-dot dot-green" title="No complaints"></span>`;
    } else if (complaints <= 2) {
      perfDot = `<span class="staff-perf-dot dot-orange" title="${complaints} complaint(s)"></span>`;
    } else {
      perfDot = `<span class="staff-perf-dot dot-red" title="${complaints} complaint(s)"></span>`;
    }

    return `
    <div class="staff-item" data-id="${sid}"
         style="cursor:pointer;"
         onclick="App.openStaffDetail('${sid}')">
      <div class="staff-avatar"
           style="background:${colour.bg};color:${colour.text}">
        ${initials}
      </div>
      <div class="staff-info">
        <p class="staff-name">${s.fullname}</p>
        <div class="staff-role-meta">
          <span class="staff-role-badge"
                style="background:${colour.bg};color:${colour.text}">
            ${s.role || 'Staff'}
          </span>
          ${complaints > 0
            ? `<span class="staff-complaint-tag">${complaints} complaint${complaints !== 1 ? 's' : ''}</span>`
            : ''}
          ${perfDot}
        </div>
      </div>
      <button class="staff-remove"
              onclick="event.stopPropagation();App.removeStaffFromScreen('${sid}')"
              title="Remove staff member">✕</button>
    </div>`;
  }).join('');
}

// ─── Update summary stats ─────────────────────────────────────────────────────
function updateStaffStats() {
  const total      = state.staffList.length;
  const totalComps = state.staffList.reduce((acc, s) => acc + (s.complaintCount || 0), 0);

  const roleCounts = {};
  state.staffList.forEach(s => {
    const r = (s.role || 'other').toLowerCase();
    roleCounts[r] = (roleCounts[r] || 0) + 1;
  });
  const topRole = Object.entries(roleCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';

  const totalEl = document.getElementById('ss-total');
  const compsEl = document.getElementById('ss-complaints');
  const roleEl  = document.getElementById('ss-top-role');

  if (totalEl) totalEl.textContent = total > 0 ? total : '—';
  if (compsEl) compsEl.textContent = totalComps > 0 ? totalComps : '—';
  if (roleEl)  roleEl.textContent  = total > 0
    ? topRole.charAt(0).toUpperCase() + topRole.slice(1)
    : '—';
}

// ─── Set role filter tab ──────────────────────────────────────────────────────
export function setStaffRoleFilter(role, btn) {
  activeRoleFilter = role;
  document.querySelectorAll('#staff-screen-filter-tabs .filter-tab')
    .forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderStaffScreen();
}

// ─── Search handler ───────────────────────────────────────────────────────────
export function searchStaffScreen() {
  renderStaffScreen();
}

// ─── Add staff from screen ────────────────────────────────────────────────────
export async function addStaffFromScreen() {
  const nameEl = document.getElementById('ss-staff-name');
  const roleEl = document.getElementById('ss-staff-role');
  const btnEl  = document.getElementById('ss-add-btn');

  const fullname = nameEl?.value.trim();
  const role     = roleEl?.value;

  hideErr('staff-screen-err');

  if (!fullname) { showErr('staff-screen-err', 'Please enter a staff name.'); return; }
  if (!role)     { showErr('staff-screen-err', 'Please select a role.');       return; }

  if (btnEl) { btnEl.disabled = true; btnEl.textContent = 'Adding…'; }

  try {
    const data = await apiFetch('/auth/staff', {
      method: 'POST',
      body:   JSON.stringify({ fullname, role }),
    });

    state.staffList.push(data.data);
    if (nameEl) nameEl.value = '';
    if (roleEl) roleEl.value = '';

    renderStaffScreen();
    updateStaffStats();
    showToast(`✅ ${fullname} added successfully`);
  } catch (err) {
    showErr('staff-screen-err', err.message || 'Could not add staff. Please try again.');
  } finally {
    if (btnEl) { btnEl.disabled = false; btnEl.textContent = '+ Add Staff Member'; }
  }
}

// ─── Remove staff from screen ─────────────────────────────────────────────────
export async function removeStaffFromScreen(id) {
  try {
    await apiFetch(`/staff/${id}`, { method: 'DELETE' });
    state.staffList = state.staffList.filter(s => (s._id || s.id) !== id);
    renderStaffScreen();
    updateStaffStats();
    showToast('Staff member removed');
  } catch (err) {
    console.error('removeStaffFromScreen error:', err.message);
    showToast('⚠️ Could not remove staff member');
  }
}
