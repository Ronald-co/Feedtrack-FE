// ─── modules/staff.js — Staff CRUD & Rendering ──────────────────────────────
import { state }                from '../config.js';
import { apiFetch }             from '../utils/api.js';
import { showErr, hideErr, getInitials } from '../utils/helpers.js';

// ─── Fetch all staff from API ─────────────────────────────────────────────────
export async function fetchStaff() {
  try {
    const data = await apiFetch('/staff/get-all-staffs');
    state.staffList = data.staffs || [];
    renderStaffList();
    renderSettingsStaffList();
  } catch (err) {
    console.error('fetchStaff error:', err.message);
    state.staffList = [];
    renderStaffList();
    renderSettingsStaffList();
  }
}

// ─── Add staff (onboarding step 2) ───────────────────────────────────────────
export async function addStaffMember() {
  const fullname = document.getElementById('staff-name-input').value.trim();
  const role     = document.getElementById('staff-role-input').value;
  const phoneNumber     = document.getElementById('staff-number-input').value;
  if (!fullname)            { showErr('ob2-err', 'Please enter a staff name.'); return; }
  if (!role || role === '') { showErr('ob2-err', 'Please select a role.'); return; }
  if (!phoneNumber || phoneNumber === '') { showErr('ob2-err', 'Please enter a phone number.'); return; }
  hideErr('ob2-err');
  try {
    const data = await apiFetch('/auth/staff', {
      method: 'POST',
      body: JSON.stringify({ fullname, role, phoneNumber }),
    });
    state.staffList.push(data.data);
    renderStaffList();
    renderSettingsStaffList();
    document.getElementById('staff-name-input').value = '';
    document.getElementById('staff-role-input').value = '';
    document.getElementById('staff-number-input').value = '';
  } catch (err) {
    showErr('ob2-err', err.message || 'Could not add staff. Please try again.');
  }
}

// ─── Remove staff ─────────────────────────────────────────────────────────────
export async function removeStaff(id) {
  try {
    await apiFetch(`/staff/${id}`, { method: 'DELETE' });
    state.staffList = state.staffList.filter(s => (s._id || s.id) !== id);
    renderStaffList();
    renderSettingsStaffList();
  } catch (err) {
    console.error('removeStaff error:', err.message);
  }
}

// ─── Add staff from Settings screen ──────────────────────────────────────────
export async function addStaffFromSettings() {
  const fullname = document.getElementById('settings-staff-name').value.trim();
  const role     = document.getElementById('settings-staff-role').value;
  const phoneNumber     = document.getElementById('settings-staff-number').value;
  if (!fullname)            { showErr('settings-staff-err', 'Please enter a staff name.'); return; }
  if (!role || role === '') { showErr('settings-staff-err', 'Please select a role.'); return; }
  if (!phoneNumber || phoneNumber === '') { showErr('settings-staff-err', 'Please enter a phone number.'); return; }
  hideErr('settings-staff-err');
  try {
    await apiFetch('/auth/staff', {
      method: 'POST',
      body: JSON.stringify({ fullname, role, phoneNumber }),
    });
    await fetchStaff();
    document.getElementById('settings-staff-name').value = '';
    document.getElementById('settings-staff-role').value = '';
    document.getElementById('settings-staff-number').value = '';
    renderSettingsStaffList();
    renderStaffList();
  } catch (err) {
    showErr('settings-staff-err', err.message || 'Could not add staff. Please try again.');
  }
}

// ─── Remove staff from Settings screen ───────────────────────────────────────
export async function removeStaffFromSettings(id) {
  try {
    await apiFetch(`/staff/${id}`, { method: 'DELETE' });
    state.staffList = state.staffList.filter(s => (s._id || s.id) !== id);
    renderSettingsStaffList();
    renderStaffList();
  } catch (err) {
    console.error('removeStaffFromSettings error:', err.message);
  }
}

// ─── Render — onboarding step 2 list ─────────────────────────────────────────
export function renderStaffList() {
  const el = document.getElementById('staff-list');
  if (!el) return;
  if (state.staffList.length === 0) { el.innerHTML = ''; return; }
  el.innerHTML = state.staffList.map(s => {
    const sid = s._id || s.id;
    return `
    <div class="staff-item">
      <div class="staff-avatar">${getInitials(s.fullname)}</div>
      <div class="staff-info">
        <p class="staff-name">${s.fullname}</p>
        <p class="staff-role">${s.role}</p>
        <p class="staff-number">${s.phoneNumber}</p>
      </div>
      <button class="staff-remove" onclick="App.removeStaff('${sid}')">✕</button>
    </div>`;
  }).join('');
}

// ─── Render — settings staff list ────────────────────────────────────────────
export function renderSettingsStaffList() {
  const el = document.getElementById('settings-staff-list');
  if (!el) return;
  if (state.staffList.length === 0) {
    el.innerHTML = '<p style="font-size:13px;color:var(--text2);padding:8px 0;">No staff added yet.</p>';
    return;
  }
  el.innerHTML = state.staffList.map(s => {
    const sid = s._id || s.id;
    return `
    <div class="staff-item">
      <div class="staff-avatar">${getInitials(s.fullname)}</div>
      <div class="staff-info">
        <p class="staff-name">${s.fullname}</p>
        <p class="staff-role">${s.role}</p>
        <p class="staff-number">${s.phoneNumber}</p>
      </div>
      <button class="staff-remove" onclick="App.removeStaffFromSettings('${sid}')">✕</button>
    </div>`;
  }).join('');
}
